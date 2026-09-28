import { NextResponse } from "next/server";
import { db, ensureDatabase, getDatabaseUrl } from "@/lib/db";
import { findInviteByToken } from "@/lib/inviteActions";
import { inviteStatus, isInviteRedeemable } from "@/lib/invites";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const rawToken = (await params).token;
  await ensureDatabase();
  const invite = await findInviteByToken(rawToken);
  const status = invite ? inviteStatus(invite) : "missing";
  const session = await getSession();

  console.info("[invite/public] lookup", {
    rawToken,
    found: Boolean(invite),
    status,
    database: getDatabaseUrl(),
  });

  const headers = { "Cache-Control": "private, no-store, max-age=0, must-revalidate" };

  if (!invite || !isInviteRedeemable(invite)) {
    return NextResponse.json(
      { ok: false, status, token: rawToken, database: getDatabaseUrl() },
      { headers }
    );
  }

  const role = invite.role === "COACH" ? "COACH" : invite.role === "ASSISTANT" ? "ASSISTANT" : "PLAYER";
  const teamLabel = invite.team?.name ?? invite.coach.name;
  const alreadyMember = Boolean(
    session &&
      invite.teamId &&
      (await db.teamMember.findUnique({ where: { teamId_userId: { teamId: invite.teamId, userId: session.sub } } }))
  );

  return NextResponse.json(
    {
      ok: true,
      status,
      token: invite.token,
      role,
      teamLabel,
      isStaff: role === "ASSISTANT" || role === "COACH",
      signedIn: Boolean(session),
      sessionRole: session?.role ?? null,
      alreadyMember,
    },
    { headers }
  );
}
