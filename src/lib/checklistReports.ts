import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

type Schedule = { enabled: boolean; everyDays: number; lastSentAt: Date | null };
const key = (date: Date) => date.toISOString().slice(0, 10);

export async function getChecklistSchedule(coachId: string): Promise<Schedule> {
  const rows = await db.$queryRawUnsafe<Array<{ enabled: boolean | number; everyDays: number; lastSentAt: Date | null }>>(
    `SELECT "enabled", "everyDays", "lastSentAt" FROM "ChecklistReportSchedule" WHERE "coachId" = ?`, coachId
  );
  const row = rows[0];
  return { enabled: row ? Boolean(row.enabled) : false, everyDays: row?.everyDays ?? 7, lastSentAt: row?.lastSentAt ?? null };
}

export async function saveChecklistSchedule(coachId: string, enabled: boolean, everyDays: number) {
  await db.$executeRawUnsafe(`INSERT INTO "ChecklistReportSchedule" ("coachId","enabled","everyDays","updatedAt") VALUES (?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT("coachId") DO UPDATE SET "enabled"=excluded."enabled", "everyDays"=excluded."everyDays", "updatedAt"=CURRENT_TIMESTAMP`, coachId, enabled ? 1 : 0, everyDays);
  return getChecklistSchedule(coachId);
}

export async function deliverDueChecklistReport(coachId: string) {
  const schedule = await getChecklistSchedule(coachId);
  if (!schedule.enabled) return false;
  const days = Math.min(Math.max(schedule.everyDays, 1), 30);
  const now = new Date();
  if (schedule.lastSentAt && now.getTime() - new Date(schedule.lastSentAt).getTime() < days * 86_400_000) return false;
  const from = new Date(now); from.setDate(from.getDate() - days + 1);
  const players = await db.user.findMany({ where: { coachId, role: "PLAYER" }, select: { id: true, name: true } });
  for (const player of players) {
    const logs = await db.dailyLog.findMany({ where: { playerId: player.id, date: { gte: key(from), lte: key(now) } }, include: { tasks: true } });
    const tasks = logs.flatMap((log) => log.tasks);
    const done = tasks.filter((task) => task.done);
    const sleep = logs.filter((log) => log.sleepHours != null).map((log) => log.sleepHours as number);
    const water = logs.filter((log) => log.waterLiters != null).map((log) => log.waterLiters as number);
    const body = `گزارش خودکار چک‌لیست ${player.name}\nبازه: ${key(from)} تا ${key(now)}\nتکمیل چک‌لیست: ${done.length} از ${tasks.length}\nموارد انجام‌شده: ${done.map((task) => task.label).join("، ") || "ثبت نشده"}\nخواب: ${sleep.length ? (sleep.reduce((a,b) => a+b,0) / sleep.length).toFixed(1) + " ساعت" : "ثبت نشده"}\nآب: ${water.length ? water.reduce((a,b) => a+b,0).toFixed(1) + " لیتر" : "ثبت نشده"}`;
    const conversation = await db.messageConversation.upsert({ where: { coachId_playerId: { coachId, playerId: player.id } }, update: { updatedAt: now }, create: { coachId, playerId: player.id } });
    const message = await db.message.create({ data: { conversationId: conversation.id, senderId: player.id, body, contextType: "DAILY_CHECK_IN", contextLabel: "Checklist report", contextHref: "/dashboard/coach/reports" } });
    await createNotification({ userId: coachId, title: `Checklist report: ${player.name}`, description: `${done.length}/${tasks.length} tasks completed.`, type: "CHECKLIST_REPORT", actionHref: `/dashboard/messages?conversationId=${conversation.id}`, relatedId: message.id, dedupeKey: `checklist-report:${coachId}:${player.id}:${key(now)}` });
  }
  await db.$executeRawUnsafe(`UPDATE "ChecklistReportSchedule" SET "lastSentAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP WHERE "coachId" = ?`, coachId);
  return true;
}
