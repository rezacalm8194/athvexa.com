import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db, ensureDatabase } from "@/lib/db";
import { buildInviteUrl, inviteStatus } from "@/lib/invites";
import { getTeamOwnerId } from "@/lib/teamContext";

const schema = z.object({ action: z.enum(["revoke", "regenerate"]) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session || (session.role !== "COACH" && session.role !== "ASSISTANT")) {
    return NextResponse.json({ error: "Coaches only" }, { status: 403 });
  }

  await ensureDatabase();

  const teamOwnerId = await getTeamOwnerId(session.sub);

  const invite = await db.invite.findUnique({ where: { id } });
  if (!invite || invite.coachId !== teamOwnerId) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  if (parsed.data.action === "revoke") {
    if (invite.usedAt) {
      return NextResponse.json({ error: "Accepted invitations cannot be revoked" }, { status: 400 });
    }
    const updated = await db.invite.update({ where: { id: invite.id }, data: { revoked: true } });
    return NextResponse.json({
      id: updated.id,
      status: inviteStatus(updated),
    });
  }

  if (invite.usedAt) {
    return NextResponse.json({ error: "Accepted invitations cannot be regenerated" }, { status: 400 });
  }

  if ((invite.role === "ASSISTANT" || invite.role === "COACH") && session.role !== "COACH") {
    return NextResponse.json({ error: "Only the head coach can invite an assistant coach" }, { status: 403 });
  }

  // Regenerate: retire the old link and mint a fresh one with the same role.
  await db.invite.update({ where: { id: invite.id }, data: { revoked: true } });
  const fresh = await db.invite.create({
    data: {
      token: nanoid(12),
      coachId: teamOwnerId,
      teamId: invite.teamId,
      role: invite.role,
      email: invite.email,
      phone: invite.phone,
      maxUses: invite.maxUses,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
    },
  });

  return NextResponse.json({
    id: fresh.id,
    role: fresh.role,
    url: buildInviteUrl(fresh.token, req),
    status: inviteStatus(fresh),
    createdAt: fresh.createdAt,
    expiresAt: fresh.expiresAt,
    usedAt: fresh.usedAt,
    maxUses: fresh.maxUses,
    useCount: fresh.useCount,
  });
}
