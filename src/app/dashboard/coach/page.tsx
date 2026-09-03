import ServerDashboardNav from "@/components/ServerDashboardNav";
import CoachNav from "@/components/coach/CoachNav";
import CoachDashboardView from "@/components/coach/CoachDashboardView";
import { getCoachContext } from "@/lib/coachContext";
import { getUserPreferences } from "@/lib/userPreferences";

export default async function CoachDashboardPage() {
  const { session, team, canManageRoles } = await getCoachContext();
  const { locale } = await getUserPreferences(session.sub);

  return (
    <main className="min-h-screen bg-ink">
      <ServerDashboardNav name={session.name} locale={locale} settingsHref="/dashboard/coach/settings" />
      <CoachNav locale={locale} />
      <CoachDashboardView coachName={session.name} teamName={team?.name ?? null} canManageRoles={canManageRoles} locale={locale} />
    </main>
  );
}
