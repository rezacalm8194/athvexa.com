import DashboardNav from "@/components/DashboardNav";
import CoachNav from "@/components/coach/CoachNav";
import ReportsPageView from "@/components/coach/ReportsPageView";
import { getCoachContext } from "@/lib/coachContext";

export default async function ReportsPage() {
  const { session, roleLabel } = await getCoachContext();

  return (
    <main className="min-h-screen bg-ink">
      <DashboardNav name={session.name} roleLabel={roleLabel} settingsHref="/dashboard/coach/settings" />
      <CoachNav />
      <ReportsPageView />
    </main>
  );
}
