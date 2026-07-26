import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { requireTeamMembership, teamRoleLabel } from "@/lib/teamContext";

export async function GET(_: Request, { params }: { params: { teamId: string } }) {
  const session = await getSession();
  if (!session || session.role === "PLAYER") {
    return NextResponse.json({ error: "Coaches only" }, { status: 403 });
  }

  const membership = await requireTeamMembership(session.sub, params.teamId);
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
