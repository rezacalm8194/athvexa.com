import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db, ensureDatabase } from "@/lib/db";
import { inviteStatus } from "@/lib/invites";

function statusFor(score: number) {
  if (score >= 80) return { label: "Excellent", tone: "good" as const };
  if (score >= 60) return { label: "Ready", tone: "good" as const };
  if (score >= 40) return { label: "Fatigued", tone: "warn" as const };
  return { label: "Needs attention", tone: "bad" as const };
}

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "COACH" && session.role !== "ASSISTANT")) {
    return NextResponse.json({ error: "Coaches only" }, { status: 403 });
  }

  await ensureDatabase();

  let teamOwnerId = session.sub;
  if (session.role === "ASSISTANT") {
    const me = await db.user.findUnique({ where: { id: session.sub }, select: { coachId: true } });
    teamOwnerId = me?.coachId ?? session.sub;
  }

  const date = new Date().toISOString().slice(0, 10);

  const [players, invites, recentLogs] = await Promise.all([
    db.user.findMany({
      where: { coachId: teamOwnerId, role: "PLAYER" },
      select: {
        id: true,
        name: true,
        dailyLogs: { where: { date }, select: { score: true } },
      },
    }),
    db.invite.findMany({ where: { coachId: teamOwnerId } }),
    db.dailyLog.findMany({
      where: { player: { coachId: teamOwnerId } },
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: {
        id: true,
        score: true,
        date: true,
        updatedAt: true,
        player: { select: { id: true, name: true } },
      },
    }),
  ]);

  const enriched = players.map((p) => {
    const today = p.dailyLogs[0];
    const loggedToday = Boolean(today);
    const score = today?.score ?? 0;
    const { tone, label } = statusFor(score);
    const needsAttention = !loggedToday || tone === "bad";
    return { id: p.id, name: p.name, loggedToday, score, tone, label, needsAttention };
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
    recentActivity: recentLogs.map((log) => ({
      id: log.id,
      playerId: log.player.id,
      playerName: log.player.name,
      score: log.score,
      date: log.date,
      updatedAt: log.updatedAt,
      tone: statusFor(log.score).tone,
    })),
  });
}
