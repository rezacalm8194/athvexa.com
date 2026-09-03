import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { db, ensureDatabase } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getAccessibleTeams, TEAM_COOKIE, teamRoleLabel } from "@/lib/teamContext";

const teamSchema = z.object({
  name: z.string().trim().min(2, "Team name is too short").max(80, "Team name is too long"),
  sport: z.string().trim().max(60).optional().or(z.literal("")),
  ageGroup: z.string().trim().max(40).optional().or(z.literal("")),
  season: z.string().trim().max(60).optional().or(z.literal("")),
  country: z.string().trim().max(60).optional().or(z.literal("")),
  timeZone: z.string().trim().max(80).optional().or(z.literal("")),
  logo: z.string().trim().max(500).optional().or(z.literal("")),
  units: z.enum(["METRIC", "IMPERIAL"]).default("METRIC"),
  defaultLanguage: z.enum(["en", "fa"]).optional(),
});

function clean(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role === "PLAYER") {
    return NextResponse.json({ error: "Coaches only" }, { status: 403 });
  }

  await ensureDatabase();
  const memberships = await getAccessibleTeams(session.sub);
  const teamIds = memberships.map((membership) => membership.teamId);

  const [memberCounts, legacyPlayerCounts, legacyStaffCounts] = await Promise.all([
    db.teamMember.groupBy({
      by: ["teamId", "role"],
      where: { teamId: { in: teamIds } },
      _count: { _all: true },
    }),
    db.user.groupBy({
      by: ["coachId"],
      where: {
        role: "PLAYER",
        coachId: { in: memberships.map((membership) => membership.team.coachId).filter(Boolean) as string[] },
      },
      _count: { _all: true },
    }),
    db.user.groupBy({
      by: ["coachId"],
      where: {
        role: "ASSISTANT",
        coachId: { in: memberships.map((membership) => membership.team.coachId).filter(Boolean) as string[] },
      },
      _count: { _all: true },
    }),
  ]);

  const legacyPlayersByCoach = new Map(legacyPlayerCounts.map((row) => [row.coachId, row._count._all]));
  const legacyStaffByCoach = new Map(legacyStaffCounts.map((row) => [row.coachId, row._count._all]));
  const memberCountFor = (teamId: string, role: string) =>
    memberCounts.filter((row) => row.teamId === teamId && row.role === role).reduce((sum, row) => sum + row._count._all, 0);

  const cookieValue = (await cookies()).get(TEAM_COOKIE)?.value;
  const currentTeamId = memberships.find((membership) => membership.teamId === cookieValue)?.teamId ?? memberships[0]?.teamId ?? null;
  const teams = memberships.map((membership) => {
    const legacyPlayerCount = membership.team.coachId ? legacyPlayersByCoach.get(membership.team.coachId) ?? 0 : 0;
    const legacyStaffCount = membership.team.coachId ? legacyStaffByCoach.get(membership.team.coachId) ?? 0 : 0;
    return {
      id: membership.team.id,
      name: membership.team.name,
      sport: membership.team.sport,
      ageGroup: membership.team.ageGroup,
      season: membership.team.season,
      country: membership.team.country,
      timeZone: membership.team.timeZone,
      logo: membership.team.logo,
      units: membership.team.units,
      defaultLanguage: membership.team.defaultLanguage,
      role: membership.role,
      roleLabel: teamRoleLabel(membership.role),
      playerCount: Math.max(memberCountFor(membership.teamId, "PLAYER"), legacyPlayerCount),
      staffCount: Math.max(
        memberCounts.filter((row) => row.teamId === membership.teamId && row.role !== "PLAYER").reduce((sum, row) => sum + row._count._all, 0),
        legacyStaffCount + 1
      ),
    };
  });

  return NextResponse.json({
    teams,
    currentTeamId,
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "COACH") {
    return NextResponse.json({ error: "Only coaches can create teams" }, { status: 403 });
  }

  await ensureDatabase();
  const body = await req.json().catch(() => null);
  const parsed = teamSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid team details" }, { status: 400 });
  }

  const data = parsed.data;
  const owner = await db.user.findUnique({ where: { id: session.sub }, select: { locale: true, timeZone: true } });
  const team = await db.team.create({
    data: {
      name: data.name,
      sport: clean(data.sport),
      ageGroup: clean(data.ageGroup),
      season: clean(data.season),
      country: clean(data.country),
      timeZone: clean(data.timeZone) ?? owner?.timeZone ?? undefined,
      logo: clean(data.logo),
      units: data.units,
      defaultLanguage: data.defaultLanguage ?? owner?.locale ?? "en",
      coachId: session.sub,
      members: {
        create: { userId: session.sub, role: "OWNER" },
      },
    },
  });

  const response = NextResponse.json({ team });
  response.cookies.set(TEAM_COOKIE, team.id, { path: "/", sameSite: "lax" });
  return response;
}
