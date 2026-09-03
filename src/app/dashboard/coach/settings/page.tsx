import ServerDashboardNav from "@/components/ServerDashboardNav";
import CoachNav from "@/components/coach/CoachNav";
import CoachSettingsView from "@/components/coach/CoachSettingsView";
import { loadCoachSettings } from "@/lib/coachSettingsData";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const model = await loadCoachSettings();
  if (!model) return null;

  return (
    <main className="min-h-screen bg-ink">
      <ServerDashboardNav name={model.session.name} locale={model.locale} settingsHref="/dashboard/coach/settings" />
      <CoachNav locale={model.locale} />
      <CoachSettingsView model={model} />
    </main>
  );
}
