import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db, ensureDatabase } from "@/lib/db";
import { buildInviteUrl, inviteStatus } from "@/lib/invites";

const schema = z.object({ action: z.enum(["revoke", "regenerate"]) });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || (session.role !== "COACH" && session.role !== "ASSISTANT")) {
    return NextResponse.json({ error: "Coaches only" }, { status: 403 });
  }

  await ensureDatabase();

  let teamOwnerId = session.sub;
  if (session.role === "ASSISTANT") {
    const me = await db.user.findUnique({ where: { id: session.sub }, select: { coachId: true } });
    teamOwnerId = me?.coachId ?? session.sub;
  }

  const invite = await db.invite.findUnique({ where: { id: params.id } });
  if (!invite || invite.coachId !== teamOwnerId) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  if (parsed.data.action === "revoke") {
    const updated = await db.invite.update({ where: { id: invite.id }, data: { revoked: true } });
    return NextResponse.json({
      id: updated.id,
      status: inviteStatus(updated),
    });
  }

  // Regenerate: retire the old link and mint a fresh one with the same role.
  await db.invite.update({ where: { id: invite.id }, data: { revoked: true } });
  const fresh = await db.invite.create({
    data: {
      token: nanoid(12),
      coachId: teamOwnerId,
      role: invite.role,
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
  });
}
