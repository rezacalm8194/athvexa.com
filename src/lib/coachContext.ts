import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db, ensureDatabase } from "@/lib/db";

/**
 * Shared guard for every page under /dashboard/coach/*: confirms the
 * session belongs to a coach or assistant, resolves the head coach's
 * team (assistants share the head coach's roster), and redirects a
 * fresh head coach to team setup if they haven't named a team yet.
 */
export async function getCoachContext() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "PLAYER") redirect("/dashboard/player");

  await ensureDatabase();

  let teamOwnerId = session.sub;
  if (session.role === "ASSISTANT") {
    const me = await db.user.findUnique({ where: { id: session.sub }, select: { coachId: true } });
    teamOwnerId = me?.coachId ?? session.sub;
  }

  const team = await db.team.findFirst({
    where: { coachId: teamOwnerId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, sport: true, coachId: true, createdAt: true },
  });

  if (!team && session.role === "COACH") {
    redirect("/dashboard/coach/teams");
  }

  return {
    session,
    team,
    canManageRoles: session.role === "COACH",
    roleLabel: session.role === "COACH" ? "Coach" : "Assistant coach",
  };
}
