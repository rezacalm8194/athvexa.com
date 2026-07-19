import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import DashboardNav from "@/components/DashboardNav";
import RosterView from "@/components/coach/RosterView";

export default async function CoachDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "PLAYER") redirect("/dashboard/player");

  return (
    <main className="min-h-screen bg-ink">
      <DashboardNav name={session.name} roleLabel={session.role === "COACH" ? "Coach" : "Assistant coach"} />
      <RosterView coachName={session.name} />
    </main>
  );
}
