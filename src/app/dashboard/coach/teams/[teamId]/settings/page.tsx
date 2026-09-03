import { notFound } from "next/navigation";
import ServerDashboardNav from "@/components/ServerDashboardNav";
import CoachNav from "@/components/coach/CoachNav";
import CoachSettingsView from "@/components/coach/CoachSettingsView";
import { loadCoachSettings } from "@/lib/coachSettingsData";

export const dynamic = "force-dynamic";

export default async function TeamSettingsPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const model = await loadCoachSettings(teamId);
  if (!model) notFound();

  return (
    <main className="min-h-screen bg-ink">
      <ServerDashboardNav name={model.session.name} locale={model.locale} settingsHref="/dashboard/coach/settings" />
      <CoachNav locale={model.locale} />
      <CoachSettingsView model={model} />
    </main>
  );
}
