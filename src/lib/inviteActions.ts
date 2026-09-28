import { db, mergeSiblingSqliteDatabases } from "@/lib/db";
import {
  inviteRoleToTeamRole,
  normalizeInviteEmail,
  normalizeInvitePhone,
  normalizeInviteToken,
} from "@/lib/invites";

const inviteInclude = {
  coach: { select: { name: true } },
  team: { select: { name: true } },
} as const;

/**
 * Resolve an invite even when chat apps truncate a character, change case,
 * or wrap the token in extra punctuation.
 */
export async function findInviteByToken(rawToken: string) {
  const token = normalizeInviteToken(rawToken);
  if (!token) return null;

  const exact = await db.invite.findUnique({
    where: { token },
    include: inviteInclude,
  });
  if (exact) return exact;

  await mergeSiblingSqliteDatabases();
  const afterMerge = await db.invite.findUnique({
    where: { token },
    include: inviteInclude,
  });
  if (afterMerge) return afterMerge;

  const matches = await db.invite.findMany({
    where: {
      OR: [{ token: { startsWith: token } }, { token: { endsWith: token } }],
    },
    include: inviteInclude,
    orderBy: { createdAt: "desc" },
    take: 8,
  });
  const lowered = token.toLowerCase();
  const unique = matches.filter((row) => {
    const value = row.token.toLowerCase();
    return value === lowered || value.startsWith(lowered) || lowered.startsWith(value);
  });
  if (unique.length === 1) return unique[0];
  const pending = unique.filter((row) => !row.revoked && !row.usedAt);
  if (pending.length === 1) return pending[0];

  try {
    const rawHits = await db.$queryRaw<{ token: string }[]>`
      SELECT token FROM "Invite"
      WHERE token = ${token} OR lower(token) = lower(${token}) OR token LIKE ${`${token}%`}
      LIMIT 5
    `;
    if (rawHits.length === 1) {
      return db.invite.findUnique({ where: { token: rawHits[0].token }, include: inviteInclude });
    }
  } catch (error) {
    console.error("[invite] raw lookup failed", error);
  }
  return null;
}

export async function findUserByInviteContact(email?: string | null, phone?: string | null) {
  const normalizedEmail = normalizeInviteEmail(email);
  const normalizedPhone = normalizeInvitePhone(phone);
  const or = [
    ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
    ...(normalizedPhone ? [{ phone: normalizedPhone }, { phone: normalizedPhone.replace(/^\+/, "") }] : []),
  ];
  if (or.length === 0) return null;
  return db.user.findFirst({
    where: { OR: or },
    select: { id: true, name: true, email: true, phone: true, role: true, coachId: true, locale: true },
  });
}

export async function consumeInvite(inviteId: string, userId: string) {
  const invite = await db.invite.findUniqueOrThrow({ where: { id: inviteId } });
  const nextUseCount = Number(invite.useCount ?? 0) + 1;
  const maxUses = Number(invite.maxUses ?? 1) || 1;
  return db.invite.update({
    where: { id: inviteId },
    data: {
      useCount: { increment: 1 },
      usedAt: nextUseCount >= maxUses ? new Date() : null,
      acceptedUserId: userId,
    },
  });
}

export async function addUserToInvitedTeam(
  userId: string,
  invite: { teamId: string | null; coachId: string; role: string }
) {
  const accountRole = invite.role === "COACH" ? "COACH" : invite.role === "ASSISTANT" ? "ASSISTANT" : "PLAYER";
  await db.user.update({
    where: { id: userId },
    data: {
      coachId: invite.coachId,
      ...(accountRole === "PLAYER" || accountRole === "ASSISTANT" ? { role: accountRole } : {}),
    },
  });
  if (!invite.teamId) return;
  await db.teamMember.upsert({
    where: { teamId_userId: { teamId: invite.teamId, userId } },
    update: { role: inviteRoleToTeamRole(invite.role) },
    create: {
      teamId: invite.teamId,
      userId,
      role: inviteRoleToTeamRole(invite.role),
    },
  });
}
