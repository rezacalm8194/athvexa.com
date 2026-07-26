import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { requireTeamMembership, TEAM_COOKIE } from "@/lib/teamContext";

export async function POST(_: Request, { params }: { params: { teamId: string } }) {
  const session = await getSession();
  if (!session || session.role === "PLAYER") {
    return NextResponse.json({ error: "Coaches only" }, { status: 403 });
  }

  const membership = await requireTeamMembership(session.sub, params.teamId);
  if (!membership) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const response = NextResponse.json({ ok: true, team: membership.team });
  response.cookies.set(TEAM_COOKIE, params.teamId, { path: "/", sameSite: "lax" });
  return response;
}
