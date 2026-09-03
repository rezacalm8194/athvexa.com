import { cookies } from "next/headers";
import { db, ensureDatabase } from "@/lib/db";

export const TEAM_COOKIE = "athvexa_team";

export const TEAM_ROLES = [
  "OWNER",
  "HEAD_COACH",
  "ASSISTANT_COACH",
  "ANALYST",
  "PHYSIO",
  "PLAYER",
] as const;

export type TeamRole = (typeof TEAM_ROLES)[number];

export function isTeamRole(value: string): value is TeamRole {
  return TEAM_ROLES.includes(value as TeamRole);
}

export function teamRoleLabel(role: string) {
  return role
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function getTeamOwnerId(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { coachId: true } });
  return user?.coachId ?? userId;
}

export async function ensureLegacyTeamMemberships(userId: string) {
  await ensureDatabase();

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, coachId: true },
  });
  if (!user) return;

  if (user.role === "COACH") {
    const teams = await db.team.findMany({ where: { coachId: user.id }, select: { id: true } });
    await Promise.all(
      teams.map((team) =>
        db.teamMember.upsert({
          where: { teamId_userId: { teamId: team.id, userId: user.id } },
          update: { role: "OWNER" },
          create: { teamId: team.id, userId: user.id, role: "OWNER" },
        })
      )
    );
    return;
  }

  if (user.coachId) {
    const teams = await db.team.findMany({ where: { coachId: user.coachId }, select: { id: true } });
    const role = user.role === "ASSISTANT" ? "ASSISTANT_COACH" : "PLAYER";
    await Promise.all(
      teams.map((team) =>
        db.teamMember.upsert({
          where: { teamId_userId: { teamId: team.id, userId: user.id } },
          update: { role },
          create: { teamId: team.id, userId: user.id, role },
        })
      )
    );
  }
}

export async function getAccessibleTeams(userId: string) {
  await ensureLegacyTeamMemberships(userId);
  return db.teamMember.findMany({
    where: { userId },
    include: { team: true },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });
}

export async function listRosterPlayers(teamOwnerId: string, teamId?: string | null) {
  const [byCoach, members] = await Promise.all([
    db.user.findMany({
      where: { coachId: teamOwnerId, role: "PLAYER" },
      select: { id: true, name: true, email: true, phone: true },
      orderBy: { name: "asc" },
    }),
    teamId
      ? db.teamMember.findMany({
          where: { teamId, role: "PLAYER" },
          select: { user: { select: { id: true, name: true, email: true, phone: true } } },
        })
      : Promise.resolve([]),
  ]);

  const map = new Map<string, { id: string; name: string; email: string | null; phone: string | null }>();
  for (const player of byCoach) map.set(player.id, player);
  for (const member of members) {
    if (member.user) map.set(member.user.id, member.user);
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getCurrentTeamMembership(userId: string) {
  const memberships = await getAccessibleTeams(userId);
  if (memberships.length === 0) return null;

  const cookieTeamId = (await cookies()).get(TEAM_COOKIE)?.value;
  return memberships.find((membership) => membership.teamId === cookieTeamId) ?? memberships[0];
}

export async function requireTeamMembership(userId: string, teamId: string) {
  await ensureLegacyTeamMemberships(userId);
  return db.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
    include: { team: true },
  });
}
