import DashboardNav from "@/components/DashboardNav";
import CoachNav from "@/components/coach/CoachNav";
import ComingSoonSection from "@/components/coach/ComingSoonSection";
import { ClipboardCheckIcon } from "@/components/icons";
import { getCoachContext } from "@/lib/coachContext";

export default async function AssessmentsPage() {
  const { session, roleLabel } = await getCoachContext();

  return (
    <main className="min-h-screen bg-ink">
      <DashboardNav name={session.name} roleLabel={roleLabel} settingsHref="/dashboard/coach/settings" />
      <CoachNav />
      <ComingSoonSection
        icon={ClipboardCheckIcon}
        title="Assessments"
        description="Run fitness and skill assessments and track player progress over time — coming soon."
      />
    </main>
  );
}
