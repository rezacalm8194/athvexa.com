import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db, ensureDatabase } from "@/lib/db";
import { buildInviteUrl } from "@/lib/invites";
import { getCurrentTeamMembership, getTeamOwnerId } from "@/lib/teamContext";
import { notifyOwnerOfAssistantAction } from "@/lib/notifications";
import { rosterUsage } from "@/lib/teamWorkspace";

const schema = z.object({
  role: z.enum(["PLAYER", "ASSISTANT", "COACH"]).default("PLAYER"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().trim().regex(/^\+?[1-9]\d{7,14}$/, "Enter a valid mobile number with country code").optional().or(z.literal("")),
  expiresInDays: z.number().int().min(1).max(90).optional(),
  expiresAt: z.string().datetime().optional(),
  maxUses: z.number().int().min(1).max(100).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "COACH" && session.role !== "ASSISTANT")) {
    return NextResponse.json({ error: "Coaches only" }, { status: 403 });
  }

  await ensureDatabase();

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid invitation details" }, { status: 400 });
  }
  const role = parsed.data.role;
  const email = parsed.data.email || null;
  const phone = parsed.data.phone || null;
  const expiresAt = parsed.data.expiresAt
    ? new Date(parsed.data.expiresAt)
    : new Date(Date.now() + 1000 * 60 * 60 * 24 * (parsed.data.expiresInDays ?? 14));

  if (expiresAt.getTime() <= Date.now() + 5 * 60 * 1000) {
    return NextResponse.json({ error: "Expiration must be at least 5 minutes in the future" }, { status: 400 });
  }
  if (expiresAt.getTime() > Date.now() + 366 * 24 * 60 * 60 * 1000) {
    return NextResponse.json({ error: "Expiration cannot be more than one year away" }, { status: 400 });
  }

  // Only the head coach can bring on another assistant coach.
  if ((role === "ASSISTANT" || role === "COACH") && session.role !== "COACH") {
    return NextResponse.json(
      { error: "Only the head coach can invite coaching staff" },
      { status: 403 }
    );
  }

  // Invites always attach to the team's head coach, even when an assistant
  // is the one sending them — so new members land on the same roster.
  const teamOwnerId = await getTeamOwnerId(session.sub);

  const membership = await getCurrentTeamMembership(session.sub);
  if (!membership || membership.team.coachId !== teamOwnerId) {
    return NextResponse.json(
      { error: "Set up your team before inviting players or assistants" },
      { status: 400 }
    );
  }

  if (role === "PLAYER") {
    const roster = await rosterUsage(teamOwnerId);
    if (roster.remaining < 1) {
      return NextResponse.json(
        { error: `Roster is full (${roster.used}/${roster.capacity} players).` },
        { status: 400 }
      );
    }
  }

  const invite = await db.invite.create({
    data: {
      token: nanoid(12),
      coachId: teamOwnerId,
      teamId: membership.teamId,
      role,
      email,
      phone,
      maxUses: role === "PLAYER" ? (parsed.data.maxUses ?? 1) : 1,
      expiresAt,
    },
  });

  await notifyOwnerOfAssistantAction({
    actorRole: session.role,
    actorName: session.name,
    ownerId: teamOwnerId,
    title: "Assistant invited a player",
    description: "created a new player invitation.",
    actionHref: "/dashboard/coach/invitations",
    relatedId: invite.id,
  });

  return NextResponse.json({
    id: invite.id,
    url: buildInviteUrl(invite.token, req),
    role: invite.role,
    email: invite.email,
    phone: invite.phone,
    maxUses: invite.maxUses,
    useCount: invite.useCount,
    createdAt: invite.createdAt,
    expiresAt: invite.expiresAt,
  });
}
