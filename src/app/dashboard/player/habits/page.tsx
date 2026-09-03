import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import ServerDashboardNav from "@/components/ServerDashboardNav";
import PlayerSubNav from "@/components/player/PlayerSubNav";
import HabitsTracker from "@/components/player/HabitsTracker";
import { getUserPreferences } from "@/lib/userPreferences";

export default async function HabitsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "PLAYER") redirect("/dashboard/coach");
  const preferences = await getUserPreferences(session.sub);

  return (
    <main className="min-h-screen bg-ink">
      <ServerDashboardNav name={session.name} locale={preferences.locale} />
      <PlayerSubNav locale={preferences.locale} />
      <HabitsTracker locale={preferences.locale} />
    </main>
  );
}
