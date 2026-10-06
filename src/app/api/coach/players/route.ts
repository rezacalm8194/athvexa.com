import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { db, ensureDatabase } from "@/lib/db";
import { normalizeInviteEmail, normalizeInvitePhone } from "@/lib/invites";
import { notifyOwnerOfAssistantAction } from "@/lib/notifications";
import { getCurrentTeamMembership, getTeamOwnerId } from "@/lib/teamContext";
import { rosterUsage } from "@/lib/teamWorkspace";
import { readinessStatus } from "@/lib/readiness";

const createSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().trim().max(32).optional().or(z.literal("")),
});

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
        phone: true,
        managedByCoach: true,
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
        phone: player.phone,
        managedByCoach: Boolean(player.managedByCoach),
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
          phone: true,
          role: true,
          managedByCoach: true,
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
      phone: p.phone,
      managedByCoach: Boolean(p.managedByCoach),
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

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "COACH" && session.role !== "ASSISTANT")) {
    return NextResponse.json({ error: "Coaches only" }, { status: 403 });
  }

  await ensureDatabase();

  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid player details" }, { status: 400 });
  }

  const name = parsed.data.name;
  const email = normalizeInviteEmail(parsed.data.email);
  let phone: string | null = null;
  if (parsed.data.phone) {
    phone = normalizeInvitePhone(parsed.data.phone);
    if (!phone) {
      return NextResponse.json(
        { error: "Enter a valid mobile number, for example 09351108194 or +989351108194" },
        { status: 400 }
      );
    }
  }

  const teamOwnerId = await getTeamOwnerId(session.sub);
  const membership = await getCurrentTeamMembership(session.sub);
  const team = membership?.team.coachId === teamOwnerId ? membership.team : null;

  const roster = await rosterUsage(teamOwnerId);
  if (roster.remaining < 1) {
    return NextResponse.json(
      { error: `Roster is full (${roster.used}/${roster.capacity} players).` },
      { status: 400 }
    );
  }

  if (email) {
    const existingEmail = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (existingEmail) {
      return NextResponse.json(
        { error: "An account with this email already exists. Invite that player instead." },
        { status: 409 }
      );
    }
  }
  if (phone) {
    const existingPhone = await db.user.findUnique({ where: { phone }, select: { id: true } });
    if (existingPhone) {
      return NextResponse.json(
        { error: "An account with this phone number already exists. Invite that player instead." },
        { status: 409 }
      );
    }
  }

  const locale = team?.defaultLanguage === "fa" ? "fa" : "en";
  const player = await db.user.create({
    data: {
      name,
      email,
      phone,
      passwordHash: await hashPassword(randomBytes(32).toString("hex")),
      role: "PLAYER",
      coachId: teamOwnerId,
      locale,
      timeZone: team?.timeZone ?? null,
      managedByCoach: true,
    },
    select: { id: true, name: true, email: true, phone: true, managedByCoach: true },
  });

  if (team) {
    await db.teamMember.upsert({
      where: { teamId_userId: { teamId: team.id, userId: player.id } },
      update: { role: "PLAYER" },
      create: { teamId: team.id, userId: player.id, role: "PLAYER" },
    });
  }

  await notifyOwnerOfAssistantAction({
    actorRole: session.role,
    actorName: session.name,
    ownerId: teamOwnerId,
    title: "Assistant added a player",
    description: `added ${player.name} to the roster.`,
    actionHref: "/dashboard/coach/players",
    relatedId: player.id,
  });

  return NextResponse.json({ player }, { status: 201 });
}
