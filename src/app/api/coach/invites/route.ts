import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db, ensureDatabase } from "@/lib/db";
import { buildInviteUrl, inviteStatus, type InviteStatus } from "@/lib/invites";

const ROLE_FILTERS = ["all", "PLAYER", "ASSISTANT"] as const;
const STATUS_FILTERS = ["all", "pending", "accepted", "expired", "revoked"] as const;

type RoleFilter = (typeof ROLE_FILTERS)[number];
type StatusFilter = (typeof STATUS_FILTERS)[number];

function readRoleFilter(value: string | null): RoleFilter {
  return ROLE_FILTERS.includes(value as RoleFilter) ? (value as RoleFilter) : "all";
}

function readStatusFilter(value: string | null): StatusFilter {
  return STATUS_FILTERS.includes(value as StatusFilter) ? (value as StatusFilter) : "all";
}

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

  const roleFilter = readRoleFilter(req.nextUrl.searchParams.get("role"));
  const statusFilter = readStatusFilter(req.nextUrl.searchParams.get("status"));
  const search = req.nextUrl.searchParams.get("search")?.trim().toLowerCase() ?? "";

  const [allInvites, invites] = await Promise.all([
    db.invite.findMany({
      where: { coachId: teamOwnerId },
      select: { usedAt: true, revoked: true, expiresAt: true },
    }),
    db.invite.findMany({
      where: {
        coachId: teamOwnerId,
        ...(roleFilter !== "all" ? { role: roleFilter } : {}),
      },
      include: {
        acceptedUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const kpis = allInvites.reduce<Record<InviteStatus, number>>(
    (counts, invite) => {
      counts[inviteStatus(invite)] += 1;
      return counts;
    },
    { pending: 0, accepted: 0, expired: 0, revoked: 0 }
  );

  const filteredInvites = invites.filter((invite) => {
    const status = inviteStatus(invite);
    const matchesStatus = statusFilter === "all" || status === statusFilter;
    const acceptedUserText = `${invite.acceptedUser?.name ?? ""} ${invite.acceptedUser?.email ?? ""}`.toLowerCase();
    const matchesSearch = !search || acceptedUserText.includes(search);
    return matchesStatus && matchesSearch;
  });

  return NextResponse.json({
    invites: filteredInvites.map((invite) => ({
      id: invite.id,
      role: invite.role,
      url: buildInviteUrl(invite.token, req),
      status: inviteStatus(invite),
      createdAt: invite.createdAt,
      expiresAt: invite.expiresAt,
      usedAt: invite.usedAt,
      acceptedUser: invite.acceptedUser
        ? {
            id: invite.acceptedUser.id,
            name: invite.acceptedUser.name,
            email: invite.acceptedUser.email,
          }
        : null,
    })),
    kpis,
    filters: {
      role: roleFilter,
      status: statusFilter,
      search,
    },
  });
}
