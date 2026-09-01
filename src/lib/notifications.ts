import { coachPlayerProfileHref } from "@/lib/coachRoutes";
import { db } from "@/lib/db";

export type NotificationInput = {
  userId: string;
  title: string;
  description: string;
  type: string;
  actionHref?: string | null;
  relatedId?: string | null;
  dedupeKey?: string | null;
};

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export async function createNotification(input: NotificationInput) {
  const data = {
    userId: input.userId,
    title: input.title,
    description: input.description,
    type: input.type,
    actionHref: input.actionHref ?? null,
    relatedId: input.relatedId ?? null,
    dedupeKey: input.dedupeKey ?? null,
  };

  if (data.dedupeKey) {
    return db.notification.upsert({
      where: { dedupeKey: data.dedupeKey },
      update: {},
      create: data,
    });
  }

  return db.notification.create({ data });
}

export async function createManyNotifications(items: NotificationInput[]) {
  for (const item of items) {
    await createNotification(item);
  }
}

export async function notifyOwnerOfAssistantAction({
  actorRole,
  actorName,
  ownerId,
  title,
  description,
  actionHref,
  relatedId,
}: {
  actorRole: string;
  actorName: string;
  ownerId: string;
  title: string;
  description: string;
  actionHref?: string | null;
  relatedId?: string | null;
}) {
  if (actorRole !== "ASSISTANT") return null;

  return createNotification({
    userId: ownerId,
    title,
    description: `${actorName} ${description}`,
    type: "ASSISTANT_ACTIVITY",
    actionHref,
    relatedId,
  });
}

export async function ensurePlayerReminderNotifications(userId: string) {
  const date = todayKey();
  const log = await db.dailyLog.findUnique({
    where: { playerId_date: { playerId: userId, date } },
    select: { id: true, score: true, sleepHours: true, fatigue: true, soreness: true, mood: true },
  });
  const hasCheckIn = Boolean(log && [log.sleepHours, log.fatigue, log.soreness, log.mood].some((value) => value != null));
  if (!hasCheckIn) {
    await createNotification({
      userId,
      title: "Complete today's check-in",
      description: "Log your readiness, sleep, fatigue, soreness, and mood for today.",
      type: "CHECK_IN_REMINDER",
      actionHref: "/dashboard/player/check-in",
      dedupeKey: `player-check-in-reminder:${userId}:${date}`,
    });
  }

  const weekday = new Intl.DateTimeFormat("en", { weekday: "long" }).format(new Date());
  const assignment = await db.programAssignment.findFirst({
    where: {
      playerId: userId,
      program: {
        status: "ACTIVE",
        sessions: { some: { day: weekday } },
      },
    },
    include: { program: { include: { sessions: { where: { day: weekday }, take: 1 } } } },
  });
  const session = assignment?.program.sessions[0];
  if (session) {
    await createNotification({
      userId,
      title: "Today's training session",
      description: `${session.title} is scheduled for today.`,
      type: "TRAINING_REMINDER",
      actionHref: "/dashboard/player/training",
      relatedId: session.id,
      dedupeKey: `training-reminder:${userId}:${session.id}:${date}`,
    });
  }
}

export async function ensureCoachReminderNotifications(coachId: string, recipientId = coachId) {
  const date = todayKey();
  const players = await db.user.findMany({
    where: { coachId, role: "PLAYER" },
    select: { id: true, name: true, dailyLogs: { where: { date }, select: { id: true } } },
  });

  for (const player of players) {
    if (player.dailyLogs.length === 0) {
      await createNotification({
        userId: recipientId,
        title: "Player has not checked in today",
        description: `${player.name} has not completed today's check-in.`,
        type: "PLAYER_NO_CHECK_IN",
        actionHref: coachPlayerProfileHref(player.id),
        relatedId: player.id,
        dedupeKey: `coach-no-check-in:${recipientId}:${player.id}:${date}`,
      });
    }
  }
}
