import DashboardNav from "@/components/DashboardNav";
import CoachNav from "@/components/coach/CoachNav";
import AssessmentsPageView from "@/components/coach/AssessmentsPageView";
import { getCoachContext } from "@/lib/coachContext";

export default async function AssessmentsPage() {
  const { session, roleLabel } = await getCoachContext();

  return (
    <main className="min-h-screen bg-ink">
      <DashboardNav name={session.name} roleLabel={roleLabel} settingsHref="/dashboard/coach/settings" />
      <CoachNav />
      <AssessmentsPageView />
    </main>
  );
}
