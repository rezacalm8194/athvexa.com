import { redirect } from "next/navigation";
import DashboardNav from "@/components/DashboardNav";
import CoachNav from "@/components/coach/CoachNav";
import TeamsPageView from "@/components/coach/TeamsPageView";
import { getSession } from "@/lib/session";

export default async function CoachTeamsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "PLAYER") redirect("/dashboard/player");

  return (
    <main className="min-h-screen bg-ink">
      <DashboardNav
        name={session.name}
        roleLabel={session.role === "COACH" ? "Coach" : "Assistant coach"}
        settingsHref="/dashboard/coach/settings"
      />
      <CoachNav />
      <TeamsPageView />
    </main>
  );
}
