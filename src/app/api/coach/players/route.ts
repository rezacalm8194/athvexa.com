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

  // An assistant coach shares the head coach's roster, not their own.
  let teamOwnerId = session.sub;
  if (session.role === "ASSISTANT") {
    const me = await db.user.findUnique({ where: { id: session.sub }, select: { coachId: true } });
    teamOwnerId = me?.coachId ?? session.sub;
  }

  const date = new Date().toISOString().slice(0, 10);

  const members = await db.user.findMany({
    where: { coachId: teamOwnerId, role: { in: ["PLAYER", "ASSISTANT"] } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      dailyLogs: { where: { date }, select: { score: true } },
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  const roster = members.map((p) => {
    if (p.role === "ASSISTANT") {
      return {
        id: p.id,
        name: p.name,
        email: p.email,
        role: p.role as "ASSISTANT",
        score: 0,
        loggedToday: false,
        label: "Assistant coach",
        tone: "good" as const,
      };
    }
    const today = p.dailyLogs[0];
    const score = today?.score ?? 0;
    return {
      id: p.id,
      name: p.name,
      email: p.email,
      role: p.role as "PLAYER",
      score,
      loggedToday: Boolean(today),
      ...statusFor(score),
    };
  });

  // Only the head coach can reassign roles — keeps assistants from promoting themselves or others.
  return NextResponse.json({ players: roster, canManageRoles: session.role === "COACH" });
}
