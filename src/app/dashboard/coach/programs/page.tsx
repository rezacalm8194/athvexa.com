import ServerDashboardNav from "@/components/ServerDashboardNav";
import CoachNav from "@/components/coach/CoachNav";
import ProgramsPageView from "@/components/coach/ProgramsPageView";
import { getCoachContext } from "@/lib/coachContext";
import { getUserPreferences } from "@/lib/userPreferences";
import { t } from "@/lib/i18n";

export default async function ProgramsPage() {
  const { session, team } = await getCoachContext();
  const { locale } = await getUserPreferences(session.sub);

  return (
    <main className="min-h-screen bg-ink">
      <ServerDashboardNav name={session.name} locale={locale} settingsHref="/dashboard/coach/settings" />
      <CoachNav locale={locale} />
      <div className="mx-auto max-w-[1280px] px-6 py-8">
        <div className="mb-6">
          <div className="eyebrow">{team?.name ?? t(locale, "coach.teamFallback")}</div>
          <h1 className="font-display text-3xl font-extrabold tracking-wide text-white">{t(locale, "coach.programs.title")}</h1>
          <p className="mt-1 text-sm text-smoke-3">{t(locale, "coach.programs.subtitle")}</p>
        </div>
        <ProgramsPageView />
      </div>
    </main>
  );
}
