import { NextResponse } from "next/server";
import { db, ensureDatabase } from "@/lib/db";
import { getSession } from "@/lib/session";
import {
  ensureCoachReminderNotifications,
  ensurePlayerReminderNotifications,
  repairLegacyCoachPlayerNotificationLinks,
} from "@/lib/notifications";
import { getTeamOwnerId } from "@/lib/teamContext";
import { getCoachNotificationPrefs, hiddenNotificationTypes } from "@/lib/userPreferences";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  await ensureDatabase();
  if (session.role === "PLAYER") {
    await ensurePlayerReminderNotifications(session.sub);
  } else {
    await ensureCoachReminderNotifications(await getTeamOwnerId(session.sub), session.sub);
    await repairLegacyCoachPlayerNotificationLinks(session.sub);
  }

  const hiddenTypes = hiddenNotificationTypes(await getCoachNotificationPrefs(session.sub));
  const where = {
    userId: session.sub,
    ...(hiddenTypes.length ? { type: { notIn: hiddenTypes } } : {}),
  };

  const [notifications, unreadCount] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.notification.count({ where: { ...where, readAt: null } }),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}
