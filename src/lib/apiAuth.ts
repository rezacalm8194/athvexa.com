import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db, ensureDatabase } from "@/lib/db";

/**
 * Shared guard for coach-scoped API routes. Confirms the caller is a coach
 * or assistant, resolves the head coach's id (assistants share the head
 * coach's team/data), and returns everything a route needs to safely scope
 * its queries. Never trusts a coachId/teamId sent by the client.
 */
export async function requireCoachApi() {
  const session = await getSession();
  if (!session || (session.role !== "COACH" && session.role !== "ASSISTANT")) {
    return {
      error: NextResponse.json({ error: "Coaches only" }, { status: 403 }),
    } as const;
  }

  await ensureDatabase();

  let teamOwnerId = session.sub;
  if (session.role === "ASSISTANT") {
    const me = await db.user.findUnique({ where: { id: session.sub }, select: { coachId: true } });
    teamOwnerId = me?.coachId ?? session.sub;
  }

  return { session, teamOwnerId, error: null } as const;
}
