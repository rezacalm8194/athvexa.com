import { getCoachContext } from "@/lib/coachContext";
import { db } from "@/lib/db";
import { getCurrentTeamMembership, requireTeamMembership } from "@/lib/teamContext";
import { parseTeamWorkspace, rosterUsage } from "@/lib/teamWorkspace";
import { getCoachNotificationPrefs, getUserPreferences } from "@/lib/userPreferences";
import { roleLabel, teamRoleLabel } from "@/lib/i18n";

export async function loadCoachSettings(teamId?: string) {
  const { session, team: fallbackTeam, canManageRoles } = await getCoachContext();
  const { locale } = await getUserPreferences(session.sub);
  const notificationPrefs = await getCoachNotificationPrefs(session.sub);
  const membership = teamId
    ? await requireTeamMembership(session.sub, teamId)
    : await getCurrentTeamMembership(session.sub);
  if (teamId && !membership) return null;

  const team = membership?.team ?? fallbackTeam;
  const workspace = parseTeamWorkspace(team);
  const [staffMembers, playerCount] = await Promise.all([
    team
      ? db.teamMember.findMany({
          where: { teamId: team.id, role: { not: "PLAYER" } },
          include: { user: { select: { id: true, name: true, email: true, phone: true } } },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
    team?.coachId ? rosterUsage(team.coachId).then((roster) => roster.used) : Promise.resolve(0),
  ]);

  return {
    session,
    locale,
    team,
    membership,
    workspace,
    staffMembers,
    playerCount,
    canManageRoles,
    canEditWorkspace: session.role === "COACH" || membership?.role === "OWNER" || membership?.role === "HEAD_COACH",
    notificationPrefs,
    roleLabel: membership ? teamRoleLabel(membership.role, locale) : roleLabel(session.role, locale),
    canEditProfile:
      session.role === "ASSISTANT" ||
      canManageRoles ||
      membership?.role === "OWNER" ||
      membership?.role === "HEAD_COACH",
  };
}

export type CoachSettingsModel = NonNullable<Awaited<ReturnType<typeof loadCoachSettings>>>;
