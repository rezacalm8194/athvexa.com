import { redirect } from "next/navigation";
import ServerDashboardNav from "@/components/ServerDashboardNav";
import CoachNav from "@/components/coach/CoachNav";
import TeamsPageView from "@/components/coach/TeamsPageView";
import { getSession } from "@/lib/session";
import { getUserPreferences } from "@/lib/userPreferences";

export default async function CoachTeamsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "PLAYER") redirect("/dashboard/player");
  const { locale } = await getUserPreferences(session.sub);

  return (
    <main className="min-h-screen bg-ink">
      <ServerDashboardNav name={session.name} locale={locale} settingsHref="/dashboard/coach/settings" />
      <CoachNav locale={locale} />
      <TeamsPageView />
    </main>
  );
}
