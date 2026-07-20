import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db, ensureDatabase } from "@/lib/db";
import { buildInviteUrl, inviteStatus } from "@/lib/invites";

export async function GET(req: NextRequest) {
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

  const invites = await db.invite.findMany({
    where: { coachId: teamOwnerId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({
    invites: invites.map((invite) => ({
      id: invite.id,
      role: invite.role,
      url: buildInviteUrl(invite.token, req),
      status: inviteStatus(invite),
      createdAt: invite.createdAt,
      expiresAt: invite.expiresAt,
      usedAt: invite.usedAt,
    })),
  });
}
