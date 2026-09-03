import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db, ensureDatabase } from "@/lib/db";
import { getCurrentTeamMembership, getTeamOwnerId } from "@/lib/teamContext";

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

  const teamOwnerId = await getTeamOwnerId(session.sub);
  const membership = await getCurrentTeamMembership(session.sub);

  const team = await db.team
    .findFirst({
      where: { coachId: teamOwnerId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        sport: true,
        ageGroup: true,
        season: true,
        country: true,
        timeZone: true,
        units: true,
        defaultLanguage: true,
        dailyReminderEnabled: true,
        readinessThreshold: true,
        sleepThresholdHours: true,
        programVisibility: true,
        assistantActivityVisible: true,
        rosterCapacity: true,
        coachId: true,
        createdAt: true,
      },
    })
    .catch((error) => {
      console.error("Coach team lookup failed", error);
      return null;
    });

  if (!team && session.role === "COACH" && process.env.NODE_ENV !== "production") {
    redirect("/dashboard/coach/teams");
  }

  return {
    session,
    team,
    canManageRoles: session.role === "COACH" && membership?.role !== "ASSISTANT_COACH",
    roleLabel: membership?.role === "HEAD_COACH" ? "Coach" : session.role === "COACH" ? "Coach" : "Assistant coach",
  };
}
