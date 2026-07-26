import DashboardNav from "@/components/DashboardNav";
import CoachNav from "@/components/coach/CoachNav";
import InvitationsPageView from "@/components/coach/InvitationsPageView";
import { getCoachContext } from "@/lib/coachContext";

export default async function InvitationsPage() {
  const { session, canManageRoles, roleLabel } = await getCoachContext();

  return (
    <main className="min-h-screen bg-ink">
      <DashboardNav name={session.name} roleLabel={roleLabel} settingsHref="/dashboard/coach/settings" />
      <CoachNav />
      <InvitationsPageView coachName={session.name} canManageRoles={canManageRoles} />
    </main>
  );
}
