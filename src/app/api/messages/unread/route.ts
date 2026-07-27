import { NextResponse } from "next/server";
import { db, ensureDatabase } from "@/lib/db";
import { getSession } from "@/lib/session";
import { isCoachRole } from "@/lib/messages";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ unreadCount: 0 });

  await ensureDatabase();
  const conversationWhere =
    session.role === "PLAYER" ? { playerId: session.sub } : isCoachRole(session.role) ? { coachId: session.sub } : null;

  if (!conversationWhere) return NextResponse.json({ unreadCount: 0 });

  const unreadCount = await db.message.count({
    where: {
      senderId: { not: session.sub },
      readAt: null,
      conversation: conversationWhere,
    },
  });

  return NextResponse.json({ unreadCount });
}
