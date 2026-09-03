import { NextResponse } from "next/server";
import { coachPlayerProfileHref } from "@/lib/coachRoutes";
import { getSession } from "@/lib/session";
import { db, ensureDatabase } from "@/lib/db";
import { inviteStatus } from "@/lib/invites";
import { getCurrentTeamMembership, getTeamOwnerId, listRosterPlayers } from "@/lib/teamContext";
import { getTeamWorkspaceByCoachId } from "@/lib/teamWorkspace";

function statusFor(score: number, readinessThreshold: number) {
  if (score >= 80) return { label: "Excellent", tone: "good" as const };
  if (score >= 60) return { label: "Ready", tone: "good" as const };
  if (score >= readinessThreshold) return { label: "Fatigued", tone: "warn" as const };
  return { label: "Needs attention", tone: "bad" as const };
}

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "COACH" && session.role !== "ASSISTANT")) {
    return NextResponse.json({ error: "Coaches only" }, { status: 403 });
  }

  await ensureDatabase();
  const { ensureRezaDemoRoster } = await import("@/lib/seedTestRoster");
  await ensureRezaDemoRoster({ coachId: session.sub }).catch((error) => {
    console.error("[overview] demo roster seed skipped", error);
  });

  const teamOwnerId = await getTeamOwnerId(session.sub);
  const membership = await getCurrentTeamMembership(session.sub);
  const workspace = await getTeamWorkspaceByCoachId(teamOwnerId);

  const date = new Date().toISOString().slice(0, 10);
  const rosterPlayers = await listRosterPlayers(teamOwnerId, membership?.teamId);

  const rosterIds = rosterPlayers.map((player) => player.id);

  const [players, invites, recentLogs, assistantActivity, assignments] = await Promise.all([
    rosterIds.length
      ? db.user.findMany({
          where: { id: { in: rosterIds } },
          select: {
            id: true,
            name: true,
            dailyLogs: { where: { date }, select: { score: true } },
          },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    db.invite.findMany({ where: { coachId: teamOwnerId } }),
    rosterIds.length
      ? db.dailyLog.findMany({
          where: { playerId: { in: rosterIds } },
          orderBy: { updatedAt: "desc" },
          take: 8,
          select: {
            id: true,
            score: true,
            date: true,
            updatedAt: true,
            player: { select: { id: true, name: true } },
          },
        })
      : Promise.resolve([]),
    workspace.assistantActivityVisible && session.role === "COACH"
      ? db.notification.findMany({
          where: { userId: session.sub, type: "ASSISTANT_ACTIVITY" },
          orderBy: { createdAt: "desc" },
          take: 8,
          select: { id: true, title: true, description: true, actionHref: true, createdAt: true },
        })
      : Promise.resolve([]),
    rosterIds.length
      ? db.programAssignment.findMany({
          where: { playerId: { in: rosterIds }, program: { status: "ACTIVE" } },
          orderBy: { assignedAt: "desc" },
          select: { playerId: true, program: { select: { id: true, name: true } } },
        })
      : Promise.resolve([]),
  ]);

  const activeProgramByPlayer = new Map<string, { id: string; name: string }>();
  for (const assignment of assignments) {
    if (!activeProgramByPlayer.has(assignment.playerId)) {
      activeProgramByPlayer.set(assignment.playerId, assignment.program);
    }
  }

  const enriched = players.map((p) => {
    const today = p.dailyLogs[0];
    const loggedToday = Boolean(today);
    const score = today?.score ?? 0;
    const { tone, label } = statusFor(score, workspace.readinessThreshold);
    const needsAttention = !loggedToday || tone === "bad";
    const program = activeProgramByPlayer.get(p.id) ?? null;
    return {
      id: p.id,
      name: p.name,
      loggedToday,
      score,
      tone,
      label,
      needsAttention,
      activeProgram: program,
      profileHref: coachPlayerProfileHref(p.id),
    };
  });

  const activePlayers = players.length;
  const pendingInvitations = invites.filter((i) => inviteStatus(i) === "pending").length;
  const reportsToday = enriched.filter((p) => p.loggedToday).length;
  const playersNeedingAttention = enriched.filter((p) => p.needsAttention);

  return NextResponse.json({
    kpis: {
      activePlayers,
      pendingInvitations,
      reportsToday,
      needsAttention: playersNeedingAttention.length,
    },
    playersNeedingAttention: playersNeedingAttention.slice(0, 6),
    playerSummaries: enriched,
    recentActivity: [
      ...recentLogs.map((log) => ({
        id: log.id,
        kind: "CHECK_IN" as const,
        playerId: log.player.id,
        playerName: log.player.name,
        actionHref: coachPlayerProfileHref(log.player.id),
        score: log.score,
        date: log.date,
        updatedAt: log.updatedAt,
        tone: statusFor(log.score, workspace.readinessThreshold).tone,
      })),
      ...assistantActivity.map((activity) => ({
        id: activity.id,
        kind: "ASSISTANT_ACTIVITY" as const,
        title: activity.title,
        description: activity.description,
        actionHref: activity.actionHref,
        updatedAt: activity.createdAt,
        tone: "neutral" as const,
      })),
    ]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 8),
  });
}
