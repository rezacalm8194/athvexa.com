import { db } from "@/lib/db";
import { getAccessibleTeams } from "@/lib/teamContext";

export type MessageSession = {
  sub: string;
  role: string;
  name: string;
};

export const MESSAGE_CONTEXTS = {
  TRAINING_SESSION: {
    label: "Training session",
    href: "/dashboard/player/training",
  },
  ASSESSMENT: {
    label: "Assessment",
    href: "/dashboard/coach/assessments",
  },
  DAILY_CHECK_IN: {
    label: "Daily check-in",
    href: "/dashboard/player/check-in",
  },
  PROGRAM: {
    label: "Program",
    href: "/dashboard/player/training",
  },
} as const;

export function isCoachRole(role: string) {
  return role === "COACH" || role === "ASSISTANT";
}

export async function getCoachOwnerId(userId: string, role: string) {
  if (role !== "ASSISTANT") return userId;
  const user = await db.user.findUnique({ where: { id: userId }, select: { coachId: true } });
  return user?.coachId ?? userId;
}

export async function getMessageContacts(session: MessageSession) {
  if (session.role === "PLAYER") {
    const memberships = await getAccessibleTeams(session.sub);
    const coachIds = new Set<string>();
    const teamIds = memberships.map((membership) => membership.teamId);
    if (teamIds.length > 0) {
      const members = await db.teamMember.findMany({
        where: {
          teamId: { in: teamIds },
          role: { in: ["OWNER", "HEAD_COACH", "ASSISTANT_COACH"] },
          userId: { not: session.sub },
        },
        select: { userId: true },
      });
      members.forEach((member) => coachIds.add(member.userId));
    }

    const legacyPlayer = await db.user.findUnique({ where: { id: session.sub }, select: { coachId: true } });
    if (legacyPlayer?.coachId) coachIds.add(legacyPlayer.coachId);

    const coaches = await db.user.findMany({
      where: { id: { in: Array.from(coachIds) }, role: { in: ["COACH", "ASSISTANT"] } },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    });

    return coaches.map((coach) => ({
      id: coach.id,
      name: coach.name,
      role: coach.role as "COACH" | "ASSISTANT",
      roleLabel: coach.role === "ASSISTANT" ? "Assistant coach" : "Coach",
    }));
  }

  if (!isCoachRole(session.role)) return [];

  const teamOwnerId = await getCoachOwnerId(session.sub, session.role);
  const players = await db.user.findMany({
    where: { coachId: teamOwnerId, role: "PLAYER" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return players.map((player) => ({
    id: player.id,
    name: player.name,
    role: "PLAYER" as const,
    roleLabel: "Player",
  }));
}

export async function canAccessConversation(session: MessageSession, conversationId: string) {
  const conversation = await db.messageConversation.findUnique({
    where: { id: conversationId },
    include: {
      coach: { select: { id: true, name: true, role: true } },
      player: { select: { id: true, name: true, role: true, coachId: true } },
    },
  });
  if (!conversation) return null;

  if (session.role === "PLAYER") {
    return conversation.playerId === session.sub ? conversation : null;
  }

  if (!isCoachRole(session.role)) return null;
  const teamOwnerId = await getCoachOwnerId(session.sub, session.role);
  const ownsRoster = conversation.player.coachId === teamOwnerId;
  const isConversationCoach = conversation.coachId === session.sub;
  const isHeadCoachConversation = conversation.coachId === teamOwnerId;
  return ownsRoster && (isConversationCoach || isHeadCoachConversation) ? conversation : null;
}

export async function resolveConversationPair(session: MessageSession, recipientId: string) {
  const recipient = await db.user.findUnique({
    where: { id: recipientId },
    select: { id: true, name: true, role: true, coachId: true },
  });
  if (!recipient) return null;

  if (session.role === "PLAYER") {
    if (!isCoachRole(recipient.role)) return null;
    const contacts = await getMessageContacts(session);
    if (!contacts.some((contact) => contact.id === recipient.id)) return null;
    return { coachId: recipient.id, playerId: session.sub };
  }

  if (!isCoachRole(session.role) || recipient.role !== "PLAYER") return null;
  const teamOwnerId = await getCoachOwnerId(session.sub, session.role);
  if (recipient.coachId !== teamOwnerId) return null;
  return { coachId: session.sub, playerId: recipient.id };
}

export function normalizeMessageContext(type?: unknown) {
  if (typeof type !== "string") return null;
  if (!Object.prototype.hasOwnProperty.call(MESSAGE_CONTEXTS, type)) return null;
  const context = MESSAGE_CONTEXTS[type as keyof typeof MESSAGE_CONTEXTS];
  return { type, ...context };
}
