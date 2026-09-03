import { db } from "@/lib/db";
import { inviteRoleToTeamRole, normalizeInviteEmail, normalizeInvitePhone } from "@/lib/invites";

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
  const nextUseCount = invite.useCount + 1;
  return db.invite.update({
    where: { id: inviteId },
    data: {
      useCount: { increment: 1 },
      usedAt: nextUseCount >= invite.maxUses ? new Date() : null,
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
