import { NextResponse } from "next/server";
import { z } from "zod";
import { db, ensureDatabase } from "@/lib/db";
import { getSession } from "@/lib/session";
import { createNotification } from "@/lib/notifications";
import {
  canAccessConversation,
  getMessageContacts,
  isCoachRole,
  normalizeMessageContext,
  resolveConversationPair,
} from "@/lib/messages";

const sendSchema = z.object({
  conversationId: z.string().optional(),
  recipientId: z.string().optional(),
  body: z.string().trim().min(1).max(2000),
  contextType: z.string().optional(),
});

function otherParticipantName(conversation: {
  coachId: string;
  playerId: string;
  coach: { name: string };
  player: { name: string };
}, userId: string) {
  return conversation.playerId === userId ? conversation.coach.name : conversation.player.name;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  await ensureDatabase();
  const where = session.role === "PLAYER" ? { playerId: session.sub } : isCoachRole(session.role) ? { coachId: session.sub } : null;
  if (!where) return NextResponse.json({ error: "Messaging is only available to coaches and players" }, { status: 403 });

  const [conversations, contacts] = await Promise.all([
    db.messageConversation.findMany({
      where,
      include: {
        coach: { select: { id: true, name: true } },
        player: { select: { id: true, name: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
        _count: {
          select: {
            messages: {
              where: {
                senderId: { not: session.sub },
                readAt: null,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    getMessageContacts(session),
  ]);

  const items = conversations.map((conversation) => {
    const lastMessage = conversation.messages[0] ?? null;
    return {
      id: conversation.id,
      playerName: conversation.player.name,
      participantName: otherParticipantName(conversation, session.sub),
      lastMessage: lastMessage?.body ?? "",
      lastMessageTime: lastMessage?.createdAt ?? conversation.updatedAt,
      unreadCount: conversation._count.messages,
    };
  });

  return NextResponse.json({
    conversations: items,
    contacts,
    unreadCount: items.reduce((sum, item) => sum + item.unreadCount, 0),
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  await ensureDatabase();
  const parsed = sendSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Message text is required" }, { status: 400 });

  let pair: { coachId: string; playerId: string } | null = null;
  let conversationId = parsed.data.conversationId;

  if (conversationId) {
    const conversation = await canAccessConversation(session, conversationId);
    if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    pair = { coachId: conversation.coachId, playerId: conversation.playerId };
  } else if (parsed.data.recipientId) {
    pair = await resolveConversationPair(session, parsed.data.recipientId);
  }

  if (!pair) return NextResponse.json({ error: "You cannot message that user" }, { status: 403 });

  const conversation = await db.messageConversation.upsert({
    where: { coachId_playerId: pair },
    update: { updatedAt: new Date() },
    create: pair,
    include: {
      coach: { select: { id: true, name: true } },
      player: { select: { id: true, name: true } },
    },
  });
  conversationId = conversation.id;

  const context = normalizeMessageContext(parsed.data.contextType);
  const message = await db.message.create({
    data: {
      conversationId,
      senderId: session.sub,
      body: parsed.data.body,
      contextType: context?.type ?? null,
      contextLabel: context?.label ?? null,
      contextHref: context?.href ?? null,
    },
  });

  await db.messageConversation.update({ where: { id: conversationId }, data: { updatedAt: message.createdAt } });

  const recipientId = session.sub === conversation.playerId ? conversation.coachId : conversation.playerId;
  await createNotification({
    userId: recipientId,
    title: `New message from ${session.name}`,
    description: parsed.data.body.length > 120 ? `${parsed.data.body.slice(0, 117)}...` : parsed.data.body,
    type: "MESSAGE_RECEIVED",
    actionHref: `/dashboard/messages?conversationId=${conversationId}`,
    relatedId: message.id,
  });

  return NextResponse.json({ conversationId, message }, { status: 201 });
}
