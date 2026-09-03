import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireTeamMembership } from "@/lib/teamContext";

const STAFF_ROLES = ["HEAD_COACH", "ASSISTANT_COACH", "ANALYST", "PHYSIO"] as const;

const patchSchema = z.object({
  role: z.enum(STAFF_ROLES),
});

function canManageStaff(sessionRole: string, membershipRole: string) {
  return sessionRole === "COACH" && membershipRole !== "ASSISTANT_COACH";
}

function serialize(member: {
  id: string;
  role: string;
  createdAt: Date;
  user: { id: string; name: string; email: string | null; phone: string | null; role: string };
}) {
  return {
    id: member.id,
    role: member.role,
    createdAt: member.createdAt,
    user: member.user,
  };
}

export async function GET(_: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const session = await getSession();
  if (!session || session.role === "PLAYER") {
    return NextResponse.json({ error: "Coaches only" }, { status: 403 });
  }

  const membership = await requireTeamMembership(session.sub, teamId);
  if (!membership) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const members = await db.teamMember.findMany({
    where: { teamId, role: { not: "PLAYER" } },
    include: { user: { select: { id: true, name: true, email: true, phone: true, role: true } } },
    orderBy: [{ createdAt: "asc" }],
  });

  return NextResponse.json({ members: members.map(serialize), roles: STAFF_ROLES });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const session = await getSession();
  if (!session || session.role === "PLAYER") {
    return NextResponse.json({ error: "Coaches only" }, { status: 403 });
  }

  const membership = await requireTeamMembership(session.sub, teamId);
  if (!membership) return NextResponse.json({ error: "Team not found" }, { status: 404 });
  if (!canManageStaff(session.role, membership.role)) {
    return NextResponse.json({ error: "Only the head coach can change staff roles" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.extend({ memberId: z.string().min(1) }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid staff role" }, { status: 400 });

  const target = await db.teamMember.findFirst({
    where: { id: parsed.data.memberId, teamId },
    include: { user: { select: { id: true, name: true, email: true, phone: true, role: true } } },
  });
  if (!target || target.role === "PLAYER") {
    return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
  }
  if (target.role === "OWNER") {
    return NextResponse.json({ error: "The owner role cannot be changed" }, { status: 400 });
  }

  const updated = await db.teamMember.update({
    where: { id: target.id },
    data: { role: parsed.data.role },
    include: { user: { select: { id: true, name: true, email: true, phone: true, role: true } } },
  });

  return NextResponse.json({ member: serialize(updated) });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const session = await getSession();
  if (!session || session.role === "PLAYER") {
    return NextResponse.json({ error: "Coaches only" }, { status: 403 });
  }

  const membership = await requireTeamMembership(session.sub, teamId);
  if (!membership) return NextResponse.json({ error: "Team not found" }, { status: 404 });
  if (!canManageStaff(session.role, membership.role)) {
    return NextResponse.json({ error: "Only the head coach can remove staff" }, { status: 403 });
  }

  const memberId = req.nextUrl.searchParams.get("memberId")?.trim();
  if (!memberId) return NextResponse.json({ error: "Staff member is required" }, { status: 400 });

  const target = await db.teamMember.findFirst({ where: { id: memberId, teamId } });
  if (!target || target.role === "PLAYER") {
    return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
  }
  if (target.role === "OWNER" || target.userId === session.sub) {
    return NextResponse.json({ error: "You cannot remove this member" }, { status: 400 });
  }

  await db.teamMember.delete({ where: { id: target.id } });
  const otherTeams = await db.teamMember.count({ where: { userId: target.userId, role: { not: "PLAYER" } } });
  if (otherTeams === 0) {
    await db.user.update({ where: { id: target.userId }, data: { coachId: null } });
  }

  return NextResponse.json({ ok: true });
}
