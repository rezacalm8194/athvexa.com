import DashboardNav from "@/components/DashboardNav";
import CoachNav from "@/components/coach/CoachNav";
import CoachDashboardView from "@/components/coach/CoachDashboardView";
import { getCoachContext } from "@/lib/coachContext";

export default async function CoachDashboardPage() {
  const { session, team, canManageRoles, roleLabel } = await getCoachContext();

  return (
    <main className="min-h-screen bg-ink">
      <DashboardNav name={session.name} roleLabel={roleLabel} settingsHref="/dashboard/coach/settings" />
      <CoachNav />
      <CoachDashboardView coachName={session.name} teamName={team?.name ?? null} canManageRoles={canManageRoles} />
    </main>
  );
}
