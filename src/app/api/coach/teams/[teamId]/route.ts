import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireTeamMembership, teamRoleLabel } from "@/lib/teamContext";
import { notifyOwnerOfAssistantAction } from "@/lib/notifications";

const updateSchema = z.object({
  name: z.string().trim().min(2, "Team name is too short").max(80, "Team name is too long"),
  sport: z.string().trim().max(60).optional().or(z.literal("")),
  ageGroup: z.string().trim().max(40).optional().or(z.literal("")),
  season: z.string().trim().max(60).optional().or(z.literal("")),
  country: z.string().trim().max(60).optional().or(z.literal("")),
  timeZone: z.string().trim().max(80).optional().or(z.literal("")),
  logo: z.string().trim().max(500).optional().or(z.literal("")),
  units: z.enum(["METRIC", "IMPERIAL"]).optional(),
  defaultLanguage: z.string().trim().min(2).max(12).optional(),
});

function clean(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function canEditTeam(sessionRole: string, membershipRole: string) {
  return sessionRole === "COACH" || sessionRole === "ASSISTANT" || membershipRole === "OWNER" || membershipRole === "HEAD_COACH";
}

export async function GET(_: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const session = await getSession();
  if (!session || session.role === "PLAYER") {
    return NextResponse.json({ error: "Coaches only" }, { status: 403 });
  }

  const membership = await requireTeamMembership(session.sub, teamId);
  if (!membership) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  return NextResponse.json({
    team: {
      ...membership.team,
      role: membership.role,
      roleLabel: teamRoleLabel(membership.role),
    },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const session = await getSession();
  if (!session || session.role === "PLAYER") {
    return NextResponse.json({ error: "Coaches only" }, { status: 403 });
  }

  const membership = await requireTeamMembership(session.sub, teamId);
  if (!membership) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }
  if (!canEditTeam(session.role, membership.role)) {
    return NextResponse.json({ error: "You do not have permission to edit this team" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid team details" }, { status: 400 });
  }

  const data = parsed.data;
  const team = await db.team.update({
    where: { id: teamId },
    data: {
      name: data.name,
      sport: clean(data.sport),
      ageGroup: clean(data.ageGroup),
      season: clean(data.season),
      country: clean(data.country),
      timeZone: clean(data.timeZone),
      ...(data.logo !== undefined ? { logo: clean(data.logo) } : {}),
      units: data.units ?? membership.team.units ?? "METRIC",
      defaultLanguage: data.defaultLanguage ?? membership.team.defaultLanguage ?? "en",
    },
  });

  if (membership.team.coachId) {
    await notifyOwnerOfAssistantAction({
      actorRole: session.role,
      actorName: session.name,
      ownerId: membership.team.coachId,
      title: "Assistant updated team settings",
      description: `updated the operational settings for “${team.name}”.`,
      actionHref: `/dashboard/coach/teams/${team.id}/settings`,
      relatedId: team.id,
    });
  }

  return NextResponse.json({ team });
}
