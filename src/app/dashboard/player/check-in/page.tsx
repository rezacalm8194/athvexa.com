import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import DashboardNav from "@/components/DashboardNav";
import PlayerSubNav from "@/components/player/PlayerSubNav";
import DailyCheckInForm from "@/components/player/DailyCheckInForm";

export default async function CheckInPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "PLAYER") redirect("/dashboard/coach");

  return (
    <main className="min-h-screen bg-ink">
      <DashboardNav name={session.name} roleLabel="Player" />
      <PlayerSubNav />
      <DailyCheckInForm />
    </main>
  );
}
