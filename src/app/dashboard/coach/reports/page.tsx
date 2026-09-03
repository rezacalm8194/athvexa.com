import ServerDashboardNav from "@/components/ServerDashboardNav";
import CoachNav from "@/components/coach/CoachNav";
import ReportsPageView from "@/components/coach/ReportsPageView";
import { getCoachContext } from "@/lib/coachContext";
import { getUserPreferences } from "@/lib/userPreferences";

export default async function ReportsPage() {
  const { session } = await getCoachContext();
  const { locale } = await getUserPreferences(session.sub);

  return (
    <main className="min-h-screen bg-ink">
      <ServerDashboardNav name={session.name} locale={locale} settingsHref="/dashboard/coach/settings" />
      <CoachNav locale={locale} />
      <ReportsPageView locale={locale} />
    </main>
  );
}
