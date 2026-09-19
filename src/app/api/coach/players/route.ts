import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db, ensureDatabase } from "@/lib/db";
import { getCurrentTeamMembership, getTeamOwnerId } from "@/lib/teamContext";
import { readinessStatus } from "@/lib/readiness";

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "COACH" && session.role !== "ASSISTANT")) {
    return NextResponse.json({ error: "Coaches only" }, { status: 403 });
  }

  await ensureDatabase();
  const date = new Date().toISOString().slice(0, 10);
  const membership = await getCurrentTeamMembership(session.sub);
  if (!membership) {
    // Before the first team exists, players belong directly to their coach.
    // Keep them visible in the roster instead of presenting an empty state.
    const teamOwnerId = await getTeamOwnerId(session.sub);
    const players = await db.user.findMany({
      where: { coachId: teamOwnerId, role: "PLAYER" },
      select: {
        id: true,
        name: true,
        email: true,
        dailyLogs: {
          orderBy: { date: "desc" },
          take: 1,
          select: { date: true, score: true },
        },
        programAssignments: {
          where: { program: { status: "ACTIVE" } },
          orderBy: { assignedAt: "desc" },
          take: 1,
          include: { program: { select: { id: true, name: true } } },
        },
      },
      orderBy: { name: "asc" },
    });
    const roster = players.map((player) => {
      const latest = player.dailyLogs[0];
      const score = latest?.score ?? 0;
      return {
        id: player.id,
        name: player.name,
        email: player.email,
        role: "PLAYER" as const,
        joinedAt: null,
        latestReadiness: latest?.score ?? null,
        latestCheckIn: latest?.date ?? null,
        activeProgram: player.programAssignments[0]?.program
          ? { id: player.programAssignments[0].program.id, name: player.programAssignments[0].program.name }
          : null,
        score,
        loggedToday: latest?.date === date,
        ...readinessStatus(score),
      };
    });
    return NextResponse.json({ players: roster, canManageRoles: session.role === "COACH" });
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
      ...readinessStatus(score),
    };
  });

  // Only the head coach can reassign roles — keeps assistants from promoting themselves or others.
  return NextResponse.json({ players: roster, canManageRoles: session.role === "COACH" });
}
