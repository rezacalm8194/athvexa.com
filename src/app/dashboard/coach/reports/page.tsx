import DashboardNav from "@/components/DashboardNav";
import CoachNav from "@/components/coach/CoachNav";
import ComingSoonSection from "@/components/coach/ComingSoonSection";
import { BarChartIcon } from "@/components/icons";
import { getCoachContext } from "@/lib/coachContext";

export default async function ReportsPage() {
  const { session, roleLabel } = await getCoachContext();

  return (
    <main className="min-h-screen bg-ink">
      <DashboardNav name={session.name} roleLabel={roleLabel} settingsHref="/dashboard/coach/settings" />
      <CoachNav />
      <ComingSoonSection
        icon={BarChartIcon}
        title="Reports"
        description="Team-wide readiness, workload and trend reports — coming soon."
      />
    </main>
  );
}
