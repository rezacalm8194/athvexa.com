import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, ensureDatabase } from "@/lib/db";
import { getSession } from "@/lib/session";
import { createNotification, todayKey } from "@/lib/notifications";
import { getTeamWorkspaceByCoachId } from "@/lib/teamWorkspace";
import { deliverDueChecklistReport } from "@/lib/checklistReports";

const checkInSchema = z.object({
  readiness: z.number({ invalid_type_error: "Readiness is required." }).int("Readiness must be a whole number.").min(1, "Readiness must be at least 1.").max(10, "Readiness must be 10 or less."),
  sleepHours: z.number({ invalid_type_error: "Sleep hours are required." }).min(0, "Sleep hours cannot be negative.").max(24, "Sleep hours must be 24 or less."),
  fatigue: z.number({ invalid_type_error: "Fatigue is required." }).int("Fatigue must be a whole number.").min(1, "Fatigue must be from 1 to 5.").max(5, "Fatigue must be from 1 to 5."),
  soreness: z.number({ invalid_type_error: "Muscle soreness is required." }).int("Muscle soreness must be a whole number.").min(1, "Muscle soreness must be from 1 to 5.").max(5, "Muscle soreness must be from 1 to 5."),
  mood: z.number({ invalid_type_error: "Mood is required." }).int("Mood must be a whole number.").min(1, "Mood must be from 1 to 5.").max(5, "Mood must be from 1 to 5."),
  bodyWeight: z.number().min(20, "Body weight looks too low.").max(400, "Body weight looks too high.").nullable().optional(),
  notes: z.string().max(2000, "Notes must be 2000 characters or fewer.").optional(),
});

function serializeLog(log: {
  id: string;
  date: string;
  score: number;
  sleepHours: number | null;
  fatigue: number | null;
  soreness: number | null;
  mood: number | null;
  bodyWeight: number | null;
  notes: string | null;
  updatedAt: Date;
}) {
  return {
    id: log.id,
    date: log.date,
    readiness: log.score > 0 ? Math.max(1, Math.min(10, Math.round(log.score / 10))) : null,
    score: log.score,
    sleepHours: log.sleepHours,
    fatigue: log.fatigue,
    soreness: log.soreness,
    mood: log.mood,
    bodyWeight: log.bodyWeight,
    notes: log.notes,
    updatedAt: log.updatedAt,
  };
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "PLAYER") {
    return NextResponse.json({ error: "Players only" }, { status: 403 });
  }

  await ensureDatabase();
  const date = todayKey();
  const log = await db.dailyLog.findUnique({
    where: { playerId_date: { playerId: session.sub, date } },
    select: {
      id: true,
      date: true,
      score: true,
      sleepHours: true,
      fatigue: true,
      soreness: true,
      mood: true,
      bodyWeight: true,
      notes: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ date, checkIn: log ? serializeLog(log) : null });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "PLAYER") {
    return NextResponse.json({ error: "Players only" }, { status: 403 });
  }

  await ensureDatabase();
  const body = await req.json().catch(() => null);
  const parsed = checkInSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check-in data is invalid." }, { status: 400 });
  }

  const date = todayKey();
  const data = {
    score: parsed.data.readiness * 10,
    sleepHours: parsed.data.sleepHours,
    fatigue: parsed.data.fatigue,
    soreness: parsed.data.soreness,
    mood: parsed.data.mood,
    bodyWeight: parsed.data.bodyWeight ?? null,
    notes: parsed.data.notes?.trim() || null,
  };

  const log = await db.dailyLog.upsert({
    where: { playerId_date: { playerId: session.sub, date } },
    update: data,
    create: { playerId: session.sub, date, ...data },
    select: {
      id: true,
      date: true,
      score: true,
      sleepHours: true,
      fatigue: true,
      soreness: true,
      mood: true,
      bodyWeight: true,
      notes: true,
      updatedAt: true,
    },
  });

  const player = await db.user.findUnique({ where: { id: session.sub }, select: { name: true, coachId: true } });
  if (player?.coachId) {
    await deliverDueChecklistReport(player.coachId);
    const workspace = await getTeamWorkspaceByCoachId(player.coachId);
    await createNotification({
      userId: player.coachId,
      title: "Player submitted check-in",
      description: `${player.name} submitted today's check-in.`,
      type: "PLAYER_CHECK_IN_SUBMITTED",
      actionHref: "/dashboard/coach/reports",
      relatedId: log.id,
      dedupeKey: `check-in-submitted:${player.coachId}:${session.sub}:${date}`,
    });
    if (data.score < workspace.readinessThreshold) {
      await createNotification({
        userId: player.coachId,
        title: "Player readiness is low",
        description: `${player.name}'s readiness is ${data.score}/100 today.`,
        type: "PLAYER_LOW_READINESS",
        actionHref: "/dashboard/coach/reports",
        relatedId: log.id,
        dedupeKey: `low-readiness:${player.coachId}:${session.sub}:${date}`,
      });
    }
  }

  return NextResponse.json({ checkIn: serializeLog(log), message: "Today's check-in has been saved." });
}
