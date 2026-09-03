import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireTeamMembership } from "@/lib/teamContext";
import { parseTeamWorkspace } from "@/lib/teamWorkspace";

const schema = z.object({
  dailyReminderEnabled: z.boolean().optional(),
  readinessThreshold: z.number().int().min(10).max(90).optional(),
  sleepThresholdHours: z.number().min(3).max(12).optional(),
  programVisibility: z.enum(["ACTIVE_ONLY", "ALL"]).optional(),
  assistantActivityVisible: z.boolean().optional(),
  rosterCapacity: z.number().int().min(5).max(500).optional(),
});

function canEdit(sessionRole: string, membershipRole: string) {
  return sessionRole === "COACH" || membershipRole === "OWNER" || membershipRole === "HEAD_COACH";
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const session = await getSession();
  if (!session || session.role === "PLAYER") {
    return NextResponse.json({ error: "Coaches only" }, { status: 403 });
  }

  const membership = await requireTeamMembership(session.sub, teamId);
  if (!membership) return NextResponse.json({ error: "Team not found" }, { status: 404 });
  if (!canEdit(session.role, membership.role)) {
    return NextResponse.json({ error: "You do not have permission to update workspace settings" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid workspace settings" }, { status: 400 });
  }
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "No settings to update" }, { status: 400 });
  }

  const team = await db.team.update({
    where: { id: teamId },
    data: parsed.data,
    select: {
      dailyReminderEnabled: true,
      readinessThreshold: true,
      sleepThresholdHours: true,
      programVisibility: true,
      assistantActivityVisible: true,
      rosterCapacity: true,
    },
  });

  return NextResponse.json({ workspace: parseTeamWorkspace(team) });
}
