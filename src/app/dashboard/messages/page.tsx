import { redirect } from "next/navigation";
import DashboardNav from "@/components/DashboardNav";
import CoachNav from "@/components/coach/CoachNav";
import MessagesPageView from "@/components/messages/MessagesPageView";
import PlayerSubNav from "@/components/player/PlayerSubNav";
import { getSession } from "@/lib/session";

export default async function MessagesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const roleLabel = session.role === "PLAYER" ? "Player" : session.role === "ASSISTANT" ? "Assistant coach" : "Coach";

  return (
    <main className="min-h-screen bg-ink">
      <DashboardNav
        name={session.name}
        roleLabel={roleLabel}
        settingsHref={session.role === "PLAYER" ? undefined : "/dashboard/coach/settings"}
      />
      {session.role === "PLAYER" ? <PlayerSubNav /> : <CoachNav />}
      <MessagesPageView role={session.role as "COACH" | "ASSISTANT" | "PLAYER"} />
    </main>
  );
}
