import { NextResponse } from "next/server";
import { db, ensureDatabase } from "@/lib/db";
import { getSession } from "@/lib/session";
import { ensureCoachReminderNotifications, ensurePlayerReminderNotifications } from "@/lib/notifications";
import { getTeamOwnerId } from "@/lib/teamContext";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  await ensureDatabase();
  if (session.role === "PLAYER") {
    await ensurePlayerReminderNotifications(session.sub);
  } else {
    await ensureCoachReminderNotifications(await getTeamOwnerId(session.sub), session.sub);
  }

  const [notifications, unreadCount] = await Promise.all([
    db.notification.findMany({
      where: { userId: session.sub },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.notification.count({ where: { userId: session.sub, readAt: null } }),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}
