import { NextResponse } from "next/server";
import { db, ensureDatabase } from "@/lib/db";
import { getSession } from "@/lib/session";
import { canAccessConversation } from "@/lib/messages";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  await ensureDatabase();
  const conversation = await canAccessConversation(session, params.id);
  if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

  await db.message.updateMany({
    where: {
      conversationId: conversation.id,
      senderId: { not: session.sub },
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  const fresh = await db.messageConversation.findUnique({
    where: { id: conversation.id },
    include: {
      coach: { select: { id: true, name: true, role: true } },
      player: { select: { id: true, name: true, role: true } },
      messages: { orderBy: { createdAt: "asc" }, take: 200 },
    },
  });

  if (!fresh) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

  return NextResponse.json({
    conversation: {
      id: fresh.id,
      coach: fresh.coach,
      player: fresh.player,
      messages: fresh.messages.map((message) => ({
        id: message.id,
        senderId: message.senderId,
        body: message.body,
        contextType: message.contextType,
        contextLabel: message.contextLabel,
        contextHref: message.contextHref,
        readAt: message.readAt,
        createdAt: message.createdAt,
        isMine: message.senderId === session.sub,
      })),
    },
  });
}
