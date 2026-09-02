import ServerDashboardNav from "@/components/ServerDashboardNav";
import CoachNav from "@/components/coach/CoachNav";
import InvitationsPageView from "@/components/coach/InvitationsPageView";
import { getCoachContext } from "@/lib/coachContext";
import { getUserPreferences } from "@/lib/userPreferences";

export default async function InvitationsPage() {
  const { session, canManageRoles } = await getCoachContext();
  const { locale } = await getUserPreferences(session.sub);

  return (
    <main className="min-h-screen bg-ink">
      <ServerDashboardNav name={session.name} locale={locale} settingsHref="/dashboard/coach/settings" />
      <CoachNav locale={locale} />
      <InvitationsPageView coachName={session.name} canManageRoles={canManageRoles} />
    </main>
  );
}
