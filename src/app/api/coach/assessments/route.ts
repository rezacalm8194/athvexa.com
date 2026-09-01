import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCoachApi } from "@/lib/apiAuth";
import { ASSESSMENT_TYPES } from "@/lib/assessmentTypes";
import { previousScoresById } from "@/lib/assessmentPrevious";
import { createNotification, notifyOwnerOfAssistantAction } from "@/lib/notifications";

const assessmentSchema = z.object({
  playerId: z.string().min(1, "Player is required"),
  type: z.enum(ASSESSMENT_TYPES),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD"),
  score: z.number({ invalid_type_error: "Score must be a number" }).finite(),
  notes: z.string().max(3000).nullable().optional(),
});

function monthRange(month: string | null) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return null;
  const [year, monthNum] = month.split("-").map(Number);
  const next = monthNum === 12 ? `${year + 1}-01` : `${year}-${String(monthNum + 1).padStart(2, "0")}`;
  return { gte: month, lt: next };
}

function thisMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

async function ensurePlayerBelongsToCoach(playerId: string, teamOwnerId: string) {
  const player = await db.user.findFirst({
    where: { id: playerId, coachId: teamOwnerId, role: "PLAYER" },
    select: { id: true },
  });
  return Boolean(player);
}

export async function GET(req: NextRequest) {
  const auth = await requireCoachApi();
  if (auth.error) return auth.error;
  const { teamOwnerId } = auth;

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search")?.trim() ?? "";
  const type = searchParams.get("type") ?? "all";
  const month = searchParams.get("month");
  const requestedPlayerId = searchParams.get("playerId")?.trim() ?? "";
  const range = monthRange(month);
  const currentMonth = monthRange(thisMonthKey())!;

  const players = await db.user.findMany({
    where: { coachId: teamOwnerId, role: "PLAYER" },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
  const playerIds = players.map((p) => p.id);
  const requestedPlayer = requestedPlayerId ? players.find((player) => player.id === requestedPlayerId) : null;
  if (requestedPlayerId && !requestedPlayer) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const searchedPlayers = players.filter((player) => {
    if (requestedPlayerId && player.id !== requestedPlayerId) return false;
    if (!search) return true;
    const value = search.toLocaleLowerCase();
    return player.name.toLocaleLowerCase().includes(value) || (player.email ?? "").toLocaleLowerCase().includes(value);
  });
  const searchedPlayerIds = searchedPlayers.map((player) => player.id);
  const emptyKpis = {
    totalPlayers: players.length,
    totalAssessments: 0,
    assessmentsThisMonth: 0,
    playersAssessed: 0,
    playersNotAssessed: players.length,
  };

  if (playerIds.length === 0) {
    return NextResponse.json({
      players,
      playersSummary: [],
      assessments: [],
      kpis: emptyKpis,
      types: ASSESSMENT_TYPES,
    });
  }

  const where = {
    coachId: teamOwnerId,
    playerId: { in: searchedPlayerIds },
    ...(type !== "all" && ASSESSMENT_TYPES.includes(type as (typeof ASSESSMENT_TYPES)[number]) ? { type } : {}),
    ...(range ? { date: range } : {}),
  };

  const historySelect = {
    id: true,
    playerId: true,
    type: true,
    date: true,
    createdAt: true,
    score: true,
  } as const;

  const [assessments, history] = await Promise.all([
    searchedPlayerIds.length === 0
      ? Promise.resolve([])
      : db.assessment.findMany({
          where,
          include: { player: { select: { id: true, name: true, email: true } } },
          orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        }),
    db.assessment.findMany({
      where: { coachId: teamOwnerId, playerId: { in: playerIds } },
      select: historySelect,
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const previousById = previousScoresById(assessments, history);
  const assessedPlayerIds = new Set(history.map((row) => row.playerId));
  const matchingAssessmentPlayerIds = new Set(assessments.map((row) => row.playerId));
  const hasAssessmentFilters = type !== "all" || Boolean(range);
  const countByPlayer = new Map<string, number>();
  const latestByPlayer = new Map<string, { id: string; type: string; date: string; score: number }>();
  if (hasAssessmentFilters) {
    for (const assessment of assessments) {
      countByPlayer.set(assessment.playerId, (countByPlayer.get(assessment.playerId) ?? 0) + 1);
      if (!latestByPlayer.has(assessment.playerId)) {
        latestByPlayer.set(assessment.playerId, assessment);
      }
    }
  } else {
    for (const assessment of history) {
      countByPlayer.set(assessment.playerId, (countByPlayer.get(assessment.playerId) ?? 0) + 1);
      latestByPlayer.set(assessment.playerId, assessment);
    }
  }

  const playersSummary = searchedPlayers
    .filter((player) => !hasAssessmentFilters || matchingAssessmentPlayerIds.has(player.id))
    .map((player) => {
      const latest = latestByPlayer.get(player.id) ?? null;
      const neverAssessed = !assessedPlayerIds.has(player.id);
      return {
        id: player.id,
        name: player.name,
        email: player.email ?? "",
        latestAssessment: latest
          ? { id: latest.id, type: latest.type, date: latest.date, score: latest.score }
          : null,
        count: countByPlayer.get(player.id) ?? 0,
        neverAssessed,
        needsAssessment: neverAssessed,
      };
    });

  const totalAssessments = history.length;
  const thisMonthCount = history.filter((assessment) => assessment.date >= currentMonth.gte && assessment.date < currentMonth.lt).length;

  return NextResponse.json({
    players,
    playersSummary,
    assessments: assessments.map((assessment) => {
      const previousScore = previousById.get(assessment.id) ?? null;
      return {
        id: assessment.id,
        player: assessment.player,
        playerId: assessment.playerId,
        type: assessment.type,
        date: assessment.date,
        score: assessment.score,
        previousScore,
        change: previousScore == null ? null : Number((assessment.score - previousScore).toFixed(2)),
        notes: assessment.notes,
        createdAt: assessment.createdAt,
        updatedAt: assessment.updatedAt,
      };
    }),
    kpis: {
      totalPlayers: players.length,
      totalAssessments,
      assessmentsThisMonth: thisMonthCount,
      playersAssessed: assessedPlayerIds.size,
      playersNotAssessed: Math.max(players.length - assessedPlayerIds.size, 0),
    },
    types: ASSESSMENT_TYPES,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireCoachApi();
  if (auth.error) return auth.error;
  const { teamOwnerId, session } = auth;

  const body = await req.json().catch(() => null);
  const parsed = assessmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid assessment data" }, { status: 400 });
  }

  const belongs = await ensurePlayerBelongsToCoach(parsed.data.playerId, teamOwnerId);
  if (!belongs) return NextResponse.json({ error: "Player is not in your team" }, { status: 403 });

  const assessment = await db.assessment.create({
    data: {
      coachId: teamOwnerId,
      playerId: parsed.data.playerId,
      type: parsed.data.type,
      date: parsed.data.date,
      score: parsed.data.score,
      notes: parsed.data.notes?.trim() || null,
    },
  });

  await createNotification({
    userId: parsed.data.playerId,
    title: "New assessment added",
    description: `${parsed.data.type} assessment recorded: ${parsed.data.score}.`,
    type: "ASSESSMENT_ADDED",
    actionHref: "/dashboard/player",
    relatedId: assessment.id,
  });

  await notifyOwnerOfAssistantAction({
    actorRole: session.role,
    actorName: session.name,
    ownerId: teamOwnerId,
    title: "Assistant added an assessment",
    description: `recorded a ${parsed.data.type} assessment (${parsed.data.score}).`,
    actionHref: `/dashboard/coach/assessments?assessmentId=${encodeURIComponent(assessment.id)}`,
    relatedId: assessment.id,
  });

  return NextResponse.json({ id: assessment.id }, { status: 201 });
}
