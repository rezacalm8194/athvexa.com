import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import DashboardNav from "@/components/DashboardNav";
import PlayerSubNav from "@/components/player/PlayerSubNav";
import TrainingProgramView from "@/components/player/TrainingProgramView";

export default async function TrainingPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "PLAYER") redirect("/dashboard/coach");

  return (
    <main className="min-h-screen bg-ink">
      <DashboardNav name={session.name} roleLabel="Player" />
      <PlayerSubNav />
      <TrainingProgramView />
    </main>
  );
}
