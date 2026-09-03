import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireTeamMembership } from "@/lib/teamContext";

const schema = z.object({
  action: z.enum(["revoke-invites", "archive", "delete"]),
});

function isOwner(sessionRole: string, membershipRole: string) {
  return sessionRole === "COACH" && membershipRole !== "ASSISTANT_COACH";
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const session = await getSession();
  if (!session || session.role === "PLAYER") {
    return NextResponse.json({ error: "Coaches only" }, { status: 403 });
  }

  const membership = await requireTeamMembership(session.sub, teamId);
  if (!membership) return NextResponse.json({ error: "Team not found" }, { status: 404 });
  if (!isOwner(session.role, membership.role)) {
    return NextResponse.json({ error: "Only the head coach can run these actions" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  if (parsed.data.action === "revoke-invites") {
    const result = await db.invite.updateMany({
      where: { teamId, revoked: false, usedAt: null },
      data: { revoked: true },
    });
    return NextResponse.json({ ok: true, revoked: result.count });
  }

  if (parsed.data.action === "archive") {
    await db.team.update({
      where: { id: teamId },
      data: { name: membership.team.name.startsWith("[Archived] ") ? membership.team.name : `[Archived] ${membership.team.name}` },
    });
    return NextResponse.json({ ok: true });
  }

  await db.team.delete({ where: { id: teamId } });
  return NextResponse.json({ ok: true, redirect: "/dashboard/coach/teams" });
}
