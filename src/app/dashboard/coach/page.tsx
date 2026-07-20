import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db, ensureDatabase } from "@/lib/db";
import DashboardNav from "@/components/DashboardNav";
import RosterView from "@/components/coach/RosterView";

export default async function CoachDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "PLAYER") redirect("/dashboard/player");

  await ensureDatabase();

  // An assistant shares the head coach's team, so look up who that is.
  let teamOwnerId = session.sub;
  if (session.role === "ASSISTANT") {
    const me = await db.user.findUnique({ where: { id: session.sub }, select: { coachId: true } });
    teamOwnerId = me?.coachId ?? session.sub;
  }

  const team = await db.team.findUnique({ where: { coachId: teamOwnerId } });

  // A head coach must name their team before doing anything else.
  if (!team && session.role === "COACH") {
    redirect("/dashboard/coach/team/new");
  }

  return (
    <main className="min-h-screen bg-ink">
      <DashboardNav name={session.name} roleLabel={session.role === "COACH" ? "Coach" : "Assistant coach"} />
      <RosterView coachName={session.name} teamName={team?.name ?? null} />
    </main>
  );
}
