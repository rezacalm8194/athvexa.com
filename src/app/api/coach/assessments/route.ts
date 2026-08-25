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
  score: z.number().int().min(0).max(100),
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
  const range = monthRange(month);
  const currentMonth = monthRange(thisMonthKey())!;

  const players = await db.user.findMany({
    where: { coachId: teamOwnerId, role: "PLAYER" },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
  const playerIds = players.map((p) => p.id);

  const where = {
    coachId: teamOwnerId,
    playerId: { in: playerIds },
    ...(type !== "all" && ASSESSMENT_TYPES.includes(type as (typeof ASSESSMENT_TYPES)[number]) ? { type } : {}),
    ...(range ? { date: range } : {}),
    ...(search
      ? {
          player: {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          },
        }
      : {}),
  };

  const historySelect = {
    id: true,
    playerId: true,
    type: true,
    date: true,
    createdAt: true,
    score: true,
  } as const;

  const [assessments, totalAssessments, thisMonthCount, history] = await Promise.all([
    db.assessment.findMany({
      where,
      include: { player: { select: { id: true, name: true, email: true } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    db.assessment.count({ where: { coachId: teamOwnerId, playerId: { in: playerIds } } }),
    db.assessment.count({ where: { coachId: teamOwnerId, playerId: { in: playerIds }, date: currentMonth } }),
    db.assessment.findMany({
      where: { coachId: teamOwnerId, playerId: { in: playerIds } },
      select: historySelect,
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const previousById = previousScoresById(assessments, history);
  const assessedPlayers = new Set(history.map((row) => row.playerId)).size;

  return NextResponse.json({
    players,
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
        change: previousScore == null ? null : assessment.score - previousScore,
        notes: assessment.notes,
        createdAt: assessment.createdAt,
        updatedAt: assessment.updatedAt,
      };
    }),
    kpis: {
      totalAssessments,
      assessmentsThisMonth: thisMonthCount,
      playersAssessed: assessedPlayers,
      playersNotAssessed: Math.max(players.length - assessedPlayers, 0),
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
    description: `${parsed.data.type} assessment recorded: ${parsed.data.score}/100.`,
    type: "ASSESSMENT_ADDED",
    actionHref: "/dashboard/player",
    relatedId: assessment.id,
  });

  await notifyOwnerOfAssistantAction({
    actorRole: session.role,
    actorName: session.name,
    ownerId: teamOwnerId,
    title: "Assistant added an assessment",
    description: `recorded a ${parsed.data.type} assessment (${parsed.data.score}/100).`,
    actionHref: "/dashboard/coach/assessments",
    relatedId: assessment.id,
  });

  return NextResponse.json({ id: assessment.id }, { status: 201 });
}
