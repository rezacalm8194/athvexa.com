import DashboardNav from "@/components/DashboardNav";
import CoachNav from "@/components/coach/CoachNav";
import ComingSoonSection from "@/components/coach/ComingSoonSection";
import { ClipboardListIcon } from "@/components/icons";
import { getCoachContext } from "@/lib/coachContext";

export default async function ProgramsPage() {
  const { session, roleLabel } = await getCoachContext();

  return (
    <main className="min-h-screen bg-ink">
      <DashboardNav name={session.name} roleLabel={roleLabel} settingsHref="/dashboard/coach/settings" />
      <CoachNav />
      <ComingSoonSection
        icon={ClipboardListIcon}
        title="Training programs"
        description="Build and assign structured training programs to your players — coming soon."
      />
    </main>
  );
}
