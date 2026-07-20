import DashboardNav from "@/components/DashboardNav";
import CoachNav from "@/components/coach/CoachNav";
import ComingSoonSection from "@/components/coach/ComingSoonSection";
import { SettingsIcon } from "@/components/icons";
import { getCoachContext } from "@/lib/coachContext";

export default async function SettingsPage() {
  const { session, roleLabel } = await getCoachContext();

  return (
    <main className="min-h-screen bg-ink">
      <DashboardNav name={session.name} roleLabel={roleLabel} settingsHref="/dashboard/coach/settings" />
      <CoachNav />
      <ComingSoonSection
        icon={SettingsIcon}
        title="Settings"
        description="Team profile, notification preferences and account settings — coming soon."
      />
    </main>
  );
}
