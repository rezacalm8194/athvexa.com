import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

function dateKey(date: Date) { return date.toISOString().slice(0, 10); }

export async function deliverDueChecklistReport(coachId: string) {
  const coach = await db.user.findUnique({
    where: { id: coachId },
    select: { checklistReportEnabled: true, checklistReportEveryDays: true, checklistReportLastSentAt: true },
  });
  if (!coach?.checklistReportEnabled) return false;
  const everyDays = Math.min(Math.max(coach.checklistReportEveryDays, 1), 30);
  const now = new Date();
  if (coach.checklistReportLastSentAt && now.getTime() - coach.checklistReportLastSentAt.getTime() < everyDays * 86_400_000) return false;
  const from = new Date(now); from.setDate(from.getDate() - everyDays + 1);
  const players = await db.user.findMany({ where: { coachId, role: "PLAYER" }, select: { id: true, name: true } });
  for (const player of players) {
    const logs = await db.dailyLog.findMany({
      where: { playerId: player.id, date: { gte: dateKey(from), lte: dateKey(now) } },
      include: { tasks: { orderBy: { order: "asc" } } }, orderBy: { date: "asc" },
    });
    const tasks = logs.flatMap((log) => log.tasks);
    if (logs.length === 0 && tasks.length === 0) continue;
    const completed = tasks.filter((task) => task.done);
    const water = logs.filter((log) => log.waterLiters != null).map((log) => log.waterLiters as number);
    const sleep = logs.filter((log) => log.sleepHours != null).map((log) => log.sleepHours as number);
    const readiness = logs.filter((log) => log.score > 0).map((log) => log.score);
    const fatigue = logs.filter((log) => log.fatigue != null).map((log) => log.fatigue as number);
    const soreness = logs.filter((log) => log.soreness != null).map((log) => log.soreness as number);
    const body = `گزارش خودکار چک‌لیست ${player.name} (${dateKey(from)} تا ${dateKey(now)})\n` +
      `تکمیل چک‌لیست: ${completed.length} از ${tasks.length}\n` +
      `موارد انجام‌شده: ${completed.map((task) => task.label).join("، ") || "ثبت نشده"}\n` +
      `میانگین خواب: ${sleep.length ? (sleep.reduce((a, b) => a + b, 0) / sleep.length).toFixed(1) + " ساعت" : "ثبت نشده"}\n` +
      `آب مصرفی: ${water.length ? water.reduce((a, b) => a + b, 0).toFixed(1) + " لیتر" : "ثبت نشده"}\n` +
      `میانگین آمادگی: ${readiness.length ? (readiness.reduce((a, b) => a + b, 0) / readiness.length).toFixed(0) + "/100" : "ثبت نشده"} · خستگی: ${fatigue.length ? (fatigue.reduce((a, b) => a + b, 0) / fatigue.length).toFixed(1) : "ثبت نشده"} · کوفتگی: ${soreness.length ? (soreness.reduce((a, b) => a + b, 0) / soreness.length).toFixed(1) : "ثبت نشده"}`;
    const conversation = await db.messageConversation.upsert({ where: { coachId_playerId: { coachId, playerId: player.id } }, update: { updatedAt: now }, create: { coachId, playerId: player.id } });
    const message = await db.message.create({ data: { conversationId: conversation.id, senderId: player.id, body, contextType: "DAILY_CHECK_IN", contextLabel: "Automatic checklist report", contextHref: "/dashboard/coach/reports" } });
    await createNotification({ userId: coachId, title: `Checklist report: ${player.name}`, description: `${completed.length}/${tasks.length} checklist items completed.`, type: "CHECKLIST_REPORT", actionHref: `/dashboard/messages?conversationId=${conversation.id}`, relatedId: message.id, dedupeKey: `checklist-report:${coachId}:${player.id}:${dateKey(now)}` });
  }
  await db.user.update({ where: { id: coachId }, data: { checklistReportLastSentAt: now } });
  return true;
}
