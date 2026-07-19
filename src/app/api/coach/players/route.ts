import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

function statusFor(score: number) {
  if (score >= 80) return { label: "Excellent", tone: "good" as const };
  if (score >= 60) return { label: "Ready", tone: "good" as const };
  if (score >= 40) return { label: "Fatigued", tone: "warn" as const };
  return { label: "Needs attention", tone: "bad" as const };
}

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "COACH" && session.role !== "ASSISTANT")) {
    return NextResponse.json({ error: "Coaches only" }, { status: 403 });
  }
  const date = new Date().toISOString().slice(0, 10);

  const players = await db.user.findMany({
    where: { coachId: session.sub, role: "PLAYER" },
    select: {
      id: true,
      name: true,
      email: true,
      dailyLogs: { where: { date }, select: { score: true, sleepHours: true, waterLiters: true } },
    },
    orderBy: { name: "asc" },
  });

  const roster = players.map((p) => {
    const today = p.dailyLogs[0];
    const score = today?.score ?? 0;
    return {
      id: p.id,
      name: p.name,
      email: p.email,
      score,
      loggedToday: Boolean(today),
      ...statusFor(score),
    };
  });

  return NextResponse.json({ players: roster });
}
