import { db } from "@/lib/db";
import { t, type Locale } from "@/lib/i18n";
import { addUserToInvitedTeam, consumeInvite, findUserByInviteContact } from "@/lib/inviteActions";
import { MESSAGE_CONTEXTS } from "@/lib/messages";
import { createNotification } from "@/lib/notifications";
import { getUserPreferences } from "@/lib/userPreferences";

async function playerLocale(userId: string): Promise<Locale> {
  const { locale } = await getUserPreferences(userId);
  return locale;
}

export async function sendCoachToPlayerMessage({
  coachId,
  playerId,
  senderId,
  body,
  contextType,
}: {
  coachId: string;
  playerId: string;
  senderId: string;
  body: string;
  contextType?: keyof typeof MESSAGE_CONTEXTS;
}) {
  const conversation = await db.messageConversation.upsert({
    where: { coachId_playerId: { coachId, playerId } },
    update: { updatedAt: new Date() },
    create: { coachId, playerId },
  });

  const context = contextType ? MESSAGE_CONTEXTS[contextType] : null;
  const message = await db.message.create({
    data: {
      conversationId: conversation.id,
      senderId,
      body,
      contextType: contextType ?? null,
      contextLabel: context?.label ?? null,
      contextHref: context?.href ?? null,
    },
  });

  await db.messageConversation.update({
    where: { id: conversation.id },
    data: { updatedAt: message.createdAt },
  });

  return { conversation, message };
}

export async function notifyPlayerOfTeamInvite({
  playerId,
  coachId,
  senderId,
  coachName,
  teamName,
}: {
  playerId: string;
  coachId: string;
  senderId?: string;
  coachName: string;
  teamName: string;
}) {
  const locale = await playerLocale(playerId);
  const title = t(locale, "notifications.types.teamInvite.title");
  const description = t(locale, "notifications.types.teamInvite.body", { coach: coachName, team: teamName });
  const existingConversation = await db.messageConversation.findUnique({
    where: { coachId_playerId: { coachId, playerId } },
    select: { id: true, messages: { where: { contextType: "TEAM_INVITE" }, take: 1, select: { id: true } } },
  });
  const conversation =
    existingConversation && existingConversation.messages.length > 0
      ? existingConversation
      : (await sendCoachToPlayerMessage({
          coachId,
          playerId,
          senderId: senderId ?? coachId,
          body: description,
          contextType: "TEAM_INVITE",
        })).conversation;

  await createNotification({
    userId: playerId,
    title,
    description,
    type: "TEAM_INVITE",
    actionHref: `/dashboard/messages?conversationId=${conversation.id}`,
    relatedId: conversation.id,
    dedupeKey: `team-invite:${coachId}:${playerId}`,
  });
}

export async function notifyPlayerOfProgramAssignment({
  playerId,
  coachId,
  coachName,
  programId,
  programName,
  isNew,
}: {
  playerId: string;
  coachId: string;
  coachName: string;
  programId: string;
  programName: string;
  isNew: boolean;
}) {
  const locale = await playerLocale(playerId);
  const type = isNew ? "PROGRAM_ASSIGNED" : "PROGRAM_UPDATED";
  const title = t(locale, isNew ? "notifications.types.programAssigned.title" : "notifications.types.programUpdated.title");
  const description = t(
    locale,
    isNew ? "notifications.types.programAssigned.body" : "notifications.types.programUpdated.body",
    { program: programName, coach: coachName }
  );

  if (isNew) {
    const dedupeKey = `program-assigned:${programId}:${playerId}`;
    const alreadyNotified = await db.notification.findUnique({ where: { dedupeKey }, select: { id: true } });
    let conversationId: string | null = null;
    if (!alreadyNotified) {
      const { conversation } = await sendCoachToPlayerMessage({
        coachId,
        playerId,
        senderId: coachId,
        body: description,
        contextType: "PROGRAM",
      });
      conversationId = conversation.id;
    }
    await createNotification({
      userId: playerId,
      title,
      description,
      type,
      actionHref: conversationId ? `/dashboard/messages?conversationId=${conversationId}` : "/dashboard/player/training",
      relatedId: programId,
      dedupeKey,
    });
    return;
  }

  await createNotification({
    userId: playerId,
    title,
    description,
    type,
    actionHref: "/dashboard/player/training",
    relatedId: programId,
  });
}

export async function deliverInviteToExistingUser({
  invite,
  actorId,
  actorName,
  teamName,
}: {
  invite: {
    id: string;
    email: string | null;
    phone: string | null;
    role: string;
    teamId: string | null;
    coachId: string;
  };
  actorId: string;
  actorName: string;
  teamName: string;
}) {
  const existing = await findUserByInviteContact(invite.email, invite.phone);
  if (!existing || invite.role !== "PLAYER" || existing.role !== "PLAYER") {
    return { notified: false, joined: false, userId: existing?.id ?? null };
  }

  const alreadyMember = invite.teamId
    ? Boolean(
        await db.teamMember.findUnique({
          where: { teamId_userId: { teamId: invite.teamId, userId: existing.id } },
        })
      )
    : existing.coachId === invite.coachId;

  if (!alreadyMember) {
    await addUserToInvitedTeam(existing.id, invite);
    await consumeInvite(invite.id, existing.id);
  }

  await notifyPlayerOfTeamInvite({
    playerId: existing.id,
    coachId: invite.coachId,
    senderId: actorId,
    coachName: actorName,
    teamName,
  });

  return { notified: true, joined: !alreadyMember, userId: existing.id };
}
