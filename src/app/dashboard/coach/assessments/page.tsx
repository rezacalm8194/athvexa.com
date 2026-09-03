import ServerDashboardNav from "@/components/ServerDashboardNav";
import CoachNav from "@/components/coach/CoachNav";
import AssessmentsPageView from "@/components/coach/AssessmentsPageView";
import { getCoachContext } from "@/lib/coachContext";
import { getUserPreferences } from "@/lib/userPreferences";

export default async function AssessmentsPage() {
  const { session } = await getCoachContext();
  const { locale } = await getUserPreferences(session.sub);

  return (
    <main className="min-h-screen bg-ink">
      <ServerDashboardNav name={session.name} locale={locale} settingsHref="/dashboard/coach/settings" />
      <CoachNav locale={locale} />
      <AssessmentsPageView locale={locale} />
    </main>
  );
}
