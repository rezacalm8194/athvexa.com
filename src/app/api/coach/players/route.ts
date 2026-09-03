import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db, ensureDatabase } from "@/lib/db";
import { getCurrentTeamMembership } from "@/lib/teamContext";

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

  await ensureDatabase();
  const { ensureRezaDemoRoster } = await import("@/lib/seedTestRoster");
  await ensureRezaDemoRoster({ coachId: session.sub }).catch((error) => {
    console.error("[players] demo roster seed skipped", error);
  });

  const date = new Date().toISOString().slice(0, 10);
  const membership = await getCurrentTeamMembership(session.sub);
  if (!membership) {
    return NextResponse.json({ error: "Select or create a team before viewing players" }, { status: 400 });
  }

  const members = await db.teamMember.findMany({
    where: { teamId: membership.teamId, role: "PLAYER" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          dailyLogs: {
            orderBy: { date: "desc" },
            take: 1,
            select: { date: true, score: true, createdAt: true },
          },
          programAssignments: {
            where: { program: { status: "ACTIVE" } },
            orderBy: { assignedAt: "desc" },
            take: 1,
            include: { program: { select: { id: true, name: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const roster = members.map((member) => {
    const p = member.user;
    const today = p.dailyLogs[0];
    const score = today?.score ?? 0;
    return {
      id: p.id,
      name: p.name,
      email: p.email,
      role: "PLAYER" as const,
      joinedAt: member.createdAt,
      latestReadiness: today?.score ?? null,
      latestCheckIn: today?.date ?? null,
      activeProgram: p.programAssignments[0]?.program
        ? {
            id: p.programAssignments[0].program.id,
            name: p.programAssignments[0].program.name,
          }
        : null,
      score,
      loggedToday: today?.date === date,
      ...statusFor(score),
    };
  });

  // Only the head coach can reassign roles — keeps assistants from promoting themselves or others.
  return NextResponse.json({ players: roster, canManageRoles: session.role === "COACH" });
}
