import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, ensureDatabase } from "@/lib/db";
import { getSession } from "@/lib/session";
import { addUserToInvitedTeam, consumeInvite, findInviteByToken } from "@/lib/inviteActions";
import { isInviteRedeemable } from "@/lib/invites";
import { notifyPlayerOfTeamInvite } from "@/lib/playerInbox";

const schema = z.object({ token: z.string().min(1) });

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  await ensureDatabase();
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invite token is required" }, { status: 400 });

  const invite = await findInviteByToken(parsed.data.token);
  if (!isInviteRedeemable(invite)) {
    return NextResponse.json({ error: "This invite link has expired or already been used" }, { status: 400 });
  }

  if (invite.role !== "PLAYER" || session.role !== "PLAYER") {
    return NextResponse.json({ error: "This invitation is not for your account type" }, { status: 403 });
  }

  const alreadyMember = invite.teamId
    ? Boolean(await db.teamMember.findUnique({ where: { teamId_userId: { teamId: invite.teamId, userId: session.sub } } }))
    : false;

  if (!alreadyMember) {
    await addUserToInvitedTeam(session.sub, invite);
    await consumeInvite(invite.id, session.sub);
    await notifyPlayerOfTeamInvite({
      playerId: session.sub,
      coachId: invite.coachId,
      senderId: invite.coachId,
      coachName: invite.coach.name,
      teamName: invite.team?.name ?? invite.coach.name,
    });
  }

  return NextResponse.json({ ok: true, alreadyMember, href: "/dashboard/player" });
}
