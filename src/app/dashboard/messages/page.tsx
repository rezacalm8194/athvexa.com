import { redirect } from "next/navigation";
import ServerDashboardNav from "@/components/ServerDashboardNav";
import CoachNav from "@/components/coach/CoachNav";
import MessagesPageView from "@/components/messages/MessagesPageView";
import PlayerSubNav from "@/components/player/PlayerSubNav";
import { getSession } from "@/lib/session";
import { getUserPreferences } from "@/lib/userPreferences";

export default async function MessagesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const { locale } = await getUserPreferences(session.sub);

  return (
    <main className="min-h-screen bg-ink">
      <ServerDashboardNav
        name={session.name}
        locale={locale}
        settingsHref={session.role === "PLAYER" ? undefined : "/dashboard/coach/settings"}
      />
      {session.role === "PLAYER" ? <PlayerSubNav locale={locale} /> : <CoachNav locale={locale} />}
      <MessagesPageView role={session.role as "COACH" | "ASSISTANT" | "PLAYER"} locale={locale} />
    </main>
  );
}
