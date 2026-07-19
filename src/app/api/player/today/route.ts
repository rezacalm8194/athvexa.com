import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

function todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function computeScore(log: {
  sleepHours: number | null;
  waterLiters: number | null;
  energy: number | null;
  fatigue: number | null;
  soreness: number | null;
  mood: number | null;
  stress: number | null;
  sleepQuality: number | null;
}) {
  // Simple, transparent readiness formula for Phase 1 — replace with a
  // coach-tunable model in Phase 2.
  const sleep = Math.min(((log.sleepHours ?? 0) / 8) * 25, 25);
  const water = Math.min(((log.waterLiters ?? 0) / 3) * 15, 15);
  const wellness = [log.energy, 6 - (log.fatigue ?? 0), 6 - (log.soreness ?? 0), log.mood, 6 - (log.stress ?? 0), log.sleepQuality]
    .filter((v): v is number => v != null)
    .reduce((sum, v) => sum + v, 0);
  const wellnessMax = 30; // 6 metrics * 5
  const wellnessScore = wellnessMax ? (wellness / wellnessMax) * 60 : 0;
  return Math.round(Math.min(sleep + water + wellnessScore, 100));
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "PLAYER") {
    return NextResponse.json({ error: "Players only" }, { status: 403 });
  }
  const date = todayKey();

  let log = await db.dailyLog.findUnique({
    where: { playerId_date: { playerId: session.sub, date } },
    include: { tasks: { orderBy: { order: "asc" } } },
  });

  if (!log) {
    log = await db.dailyLog.create({
      data: {
        playerId: session.sub,
        date,
        tasks: {
          create: [
            { label: "Weigh-in", order: 0 },
            { label: "Breakfast + supplements", order: 1 },
            { label: "Football training", order: 2 },
            { label: "Gym session", order: 3 },
            { label: "Recovery & stretch", order: 4 },
          ],
        },
      },
      include: { tasks: { orderBy: { order: "asc" } } },
    });
  }

  const note = await db.coachNote.findUnique({ where: { playerId_date: { playerId: session.sub, date } } });

  return NextResponse.json({ log, coachMessage: note?.message ?? null });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "PLAYER") {
    return NextResponse.json({ error: "Players only" }, { status: 403 });
  }
  const date = todayKey();
  const body = await req.json().catch(() => ({}));

  const allowed = ["sleepHours", "waterLiters", "energy", "fatigue", "soreness", "mood", "stress", "sleepQuality"] as const;
  const data: Record<string, number> = {};
  for (const key of allowed) {
    if (typeof body[key] === "number") data[key] = body[key];
  }

  const existing = await db.dailyLog.upsert({
    where: { playerId_date: { playerId: session.sub, date } },
    update: data,
    create: { playerId: session.sub, date, ...data },
  });

  const score = computeScore(existing);
  const updated = await db.dailyLog.update({
    where: { id: existing.id },
    data: { score },
    include: { tasks: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ log: updated });
}
