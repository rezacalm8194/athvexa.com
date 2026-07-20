import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db, ensureDatabase } from "@/lib/db";
import { buildInviteUrl } from "@/lib/invites";

const schema = z.object({
  role: z.enum(["PLAYER", "ASSISTANT"]).default("PLAYER"),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "COACH" && session.role !== "ASSISTANT")) {
    return NextResponse.json({ error: "Coaches only" }, { status: 403 });
  }

  await ensureDatabase();

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  const role = parsed.success ? parsed.data.role : "PLAYER";

  // Only the head coach can bring on another assistant coach.
  if (role === "ASSISTANT" && session.role !== "COACH") {
    return NextResponse.json(
      { error: "Only the head coach can invite an assistant coach" },
      { status: 403 }
    );
  }

  // Invites always attach to the team's head coach, even when an assistant
  // is the one sending them — so new members land on the same roster.
  let teamOwnerId = session.sub;
  if (session.role === "ASSISTANT") {
    const me = await db.user.findUnique({ where: { id: session.sub }, select: { coachId: true } });
    teamOwnerId = me?.coachId ?? session.sub;
  }

  const team = await db.team.findUnique({ where: { coachId: teamOwnerId } });
  if (!team) {
    return NextResponse.json(
      { error: "Set up your team before inviting players or assistants" },
      { status: 400 }
    );
  }

  const invite = await db.invite.create({
    data: {
      token: nanoid(12),
      coachId: teamOwnerId,
      role,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14), // 14 days
    },
  });

  return NextResponse.json({
    id: invite.id,
    url: buildInviteUrl(invite.token, req),
    role: invite.role,
    createdAt: invite.createdAt,
    expiresAt: invite.expiresAt,
  });
}
