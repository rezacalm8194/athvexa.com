import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import DashboardNav from "@/components/DashboardNav";
import PlayerSubNav from "@/components/player/PlayerSubNav";
import TodayDashboard from "@/components/player/TodayDashboard";

export default async function PlayerDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "PLAYER") redirect("/dashboard/coach");

  return (
    <main className="min-h-screen bg-ink">
      <DashboardNav name={session.name} roleLabel="Player" />
      <PlayerSubNav />
      <TodayDashboard playerName={session.name} />
    </main>
  );
}
