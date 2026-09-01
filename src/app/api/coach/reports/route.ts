import { NextRequest, NextResponse } from "next/server";
import { requireCoachApi } from "@/lib/apiAuth";
import { coachPlayerProfileHref } from "@/lib/coachRoutes";
import { db } from "@/lib/db";

const RANGE_VALUES = ["week", "month", "custom"] as const;
type RangeValue = (typeof RANGE_VALUES)[number];
type OverallStatus = "Good" | "Watch" | "Attention" | "No data";

function toKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function mondayOf(date: Date) {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(date.getDate() + days);
  return next;
}

function parseDateKey(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function resolveRange(req: NextRequest) {
  const rangeParam = req.nextUrl.searchParams.get("range");
  const range: RangeValue = RANGE_VALUES.includes(rangeParam as RangeValue) ? (rangeParam as RangeValue) : "week";
  const today = startOfToday();

  if (range === "custom") {
    const parsedFrom = parseDateKey(req.nextUrl.searchParams.get("from"));
    const parsedTo = parseDateKey(req.nextUrl.searchParams.get("to"));
    const from = parsedFrom ?? addDays(today, -6);
    const to = parsedTo ?? today;
    if (from > to) return { range, from: toKey(to), to: toKey(from) };
    return { range, from: toKey(from), to: toKey(to) };
  }

  if (range === "month") {
    return { range, from: toKey(addDays(today, -29)), to: toKey(today) };
  }

  return { range, from: toKey(mondayOf(today)), to: toKey(today) };
}

function average(values: Array<number | null | undefined>) {
  const valid = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (valid.length === 0) return null;
  return Math.round((valid.reduce((sum, value) => sum + value, 0) / valid.length) * 10) / 10;
}

function round(value: number | null) {
  return value == null ? null : Math.round(value * 10) / 10;
}

function dateKeysBetween(from: string, to: string) {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  const keys: string[] = [];
  for (let cur = start; cur <= end; cur = addDays(cur, 1)) {
    keys.push(toKey(cur));
  }
  return keys;
}

function statusFromSignals({
  hasData,
  readiness,
  sleep,
  fatigue,
  soreness,
  assessmentChange,
}: {
  hasData: boolean;
  readiness: number | null;
  sleep: number | null;
  fatigue: number | null;
  soreness: number | null;
  assessmentChange: number | null;
}): OverallStatus {
  if (!hasData) return "No data";
  if (
    (readiness != null && readiness < 40) ||
    (sleep != null && sleep < 6) ||
    (fatigue != null && fatigue >= 4) ||
    (soreness != null && soreness >= 4)
  ) {
    return "Attention";
  }
  if (
    (assessmentChange != null && assessmentChange <= -10) ||
    (readiness != null && readiness >= 40 && readiness <= 59) ||
    (sleep != null && sleep >= 6 && sleep <= 7)
  ) {
    return "Watch";
  }
  return "Good";
}

export async function GET(req: NextRequest) {
  const auth = await requireCoachApi();
  if (auth.error) return auth.error;

  const { teamOwnerId } = auth;
  const { range, from, to } = resolveRange(req);
  const requestedPlayerId = req.nextUrl.searchParams.get("playerId")?.trim() ?? "";

  const allPlayers = await db.user.findMany({
    where: { coachId: teamOwnerId, role: "PLAYER" },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  const selectedPlayer = requestedPlayerId ? allPlayers.find((player) => player.id === requestedPlayerId) : null;
  if (requestedPlayerId && !selectedPlayer) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }
  const scopedPlayers = selectedPlayer ? [selectedPlayer] : allPlayers;
  const playerIds = scopedPlayers.map((player) => player.id);
  const allPlayerIds = allPlayers.map((player) => player.id);
  const today = toKey(startOfToday());

  if (allPlayers.length === 0) {
    return NextResponse.json({
      filters: { range, from, to, playerId: selectedPlayer?.id ?? "all" },
      players: [],
      kpis: { averageReadiness: null, playersCheckedIn: 0, averageSleep: null, playersRequiringAttention: 0 },
      teamOverview: {
        activePlayers: 0,
        checkInRate: 0,
        averageReadiness: null,
        averageSleep: null,
        averageFatigue: null,
        averageSoreness: null,
      },
      attentionPlayers: [],
      playerProgress: [],
      trendData: dateKeysBetween(from, to).map((date) => ({ date, averageReadiness: null, checkIns: 0 })),
    });
  }

  const [rangeLogs, todayLogs, assessments, assignments] = await Promise.all([
    db.dailyLog.findMany({
      where: { playerId: { in: playerIds }, date: { gte: from, lte: to } },
      select: {
        playerId: true,
        date: true,
        score: true,
        sleepHours: true,
        fatigue: true,
        soreness: true,
        updatedAt: true,
      },
      orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
    }),
    db.dailyLog.findMany({
      where: { playerId: { in: playerIds }, date: today },
      select: { playerId: true, score: true, sleepHours: true, fatigue: true, soreness: true },
    }),
    db.assessment.findMany({
      where: { coachId: teamOwnerId, playerId: { in: playerIds } },
      select: { id: true, playerId: true, type: true, score: true, date: true, createdAt: true },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    db.programAssignment.findMany({
      where: { playerId: { in: playerIds }, player: { coachId: teamOwnerId } },
      select: {
        playerId: true,
        assignedAt: true,
        program: {
          select: {
            id: true,
            name: true,
            status: true,
            startDate: true,
            endDate: true,
            sessions: {
              select: {
                id: true,
                progress: { select: { playerId: true, status: true, completedAt: true } },
              },
            },
          },
        },
      },
      orderBy: { assignedAt: "desc" },
    }),
  ]);

  const logsByPlayer = new Map<string, typeof rangeLogs>();
  for (const log of rangeLogs) {
    logsByPlayer.set(log.playerId, [...(logsByPlayer.get(log.playerId) ?? []), log]);
  }

  const todayByPlayer = new Map(todayLogs.map((log) => [log.playerId, log]));
  const assessmentsByPlayer = new Map<string, typeof assessments>();
  for (const assessment of assessments) {
    assessmentsByPlayer.set(assessment.playerId, [...(assessmentsByPlayer.get(assessment.playerId) ?? []), assessment]);
  }

  const programStatusByPlayer = new Map<string, string>();
  const activeProgramByPlayer = new Map<string, (typeof assignments)[number]>();
  for (const assignment of assignments) {
    const current = programStatusByPlayer.get(assignment.playerId);
    const status = assignment.program.status;
    if (!current || status === "ACTIVE" || (status === "DRAFT" && current === "ARCHIVED")) {
      programStatusByPlayer.set(assignment.playerId, status);
    }
    if (status === "ACTIVE" && !activeProgramByPlayer.has(assignment.playerId)) {
      activeProgramByPlayer.set(assignment.playerId, assignment);
    }
  }

  const uniqueCheckedPlayers = new Set(rangeLogs.map((log) => log.playerId));
  const totalPossibleCheckIns = Math.max(playerIds.length * dateKeysBetween(from, to).length, 1);
  const checkInRate = Math.round((rangeLogs.length / totalPossibleCheckIns) * 100);

  const attentionPlayers = scopedPlayers
    .map((player) => {
      const todayLog = todayByPlayer.get(player.id);
      let reason = "";
      if (!todayLog) reason = "No check-in today";
      else if (todayLog.score < 40) reason = "Readiness below 40";
      else if (todayLog.sleepHours != null && todayLog.sleepHours < 6) reason = "Sleep below 6 hours";
      else if (todayLog.fatigue != null && todayLog.fatigue >= 4) reason = "High fatigue";
      else if (todayLog.soreness != null && todayLog.soreness >= 4) reason = "High soreness";

      return reason
        ? {
            id: player.id,
            name: player.name,
            reason,
            readiness: todayLog?.score ?? null,
            sleep: todayLog?.sleepHours ?? null,
            fatigue: todayLog?.fatigue ?? null,
            soreness: todayLog?.soreness ?? null,
            profileHref: coachPlayerProfileHref(player.id),
          }
        : null;
    })
    .filter((player): player is NonNullable<typeof player> => Boolean(player));

  const playerProgress = scopedPlayers.map((player) => {
    const logs = logsByPlayer.get(player.id) ?? [];
    const latestLog = logs[0] ?? null;
    const avgReadiness = average(logs.map((log) => log.score));
    const avgSleep = average(logs.map((log) => log.sleepHours));
    const playerAssessments = assessmentsByPlayer.get(player.id) ?? [];
    const latestAssessment = playerAssessments[0] ?? null;
    const previousAssessment = playerAssessments[1] ?? null;
    const assessmentChange = latestAssessment && previousAssessment ? latestAssessment.score - previousAssessment.score : null;
    const hasData = logs.length > 0 || latestAssessment != null;
    const activeProgram = activeProgramByPlayer.get(player.id);
    const totalProgramSessions = activeProgram?.program.sessions.length ?? 0;
    const completedProgramSessions =
      activeProgram?.program.sessions.filter((session) =>
        session.progress.some((progress) => progress.playerId === player.id && progress.status === "COMPLETED")
      ).length ?? 0;
    return {
      id: player.id,
      name: player.name,
      email: player.email,
      latestReadiness: latestLog?.score ?? null,
      sleep: latestLog?.sleepHours ?? null,
      fatigue: latestLog?.fatigue ?? null,
      soreness: latestLog?.soreness ?? null,
      averageReadiness: avgReadiness,
      averageSleep: avgSleep,
      latestAssessment: latestAssessment
        ? {
            id: latestAssessment.id,
            type: latestAssessment.type,
            score: latestAssessment.score,
            date: latestAssessment.date,
          }
        : null,
      previousAssessment: previousAssessment
        ? {
            id: previousAssessment.id,
            type: previousAssessment.type,
            score: previousAssessment.score,
            date: previousAssessment.date,
          }
        : null,
      assessmentChange,
      activeProgram: activeProgram
        ? {
            id: activeProgram.program.id,
            name: activeProgram.program.name,
            startDate: activeProgram.program.startDate,
            endDate: activeProgram.program.endDate,
            assignedAt: activeProgram.assignedAt,
            completedSessions: completedProgramSessions,
            remainingSessions: Math.max(totalProgramSessions - completedProgramSessions, 0),
            progress: totalProgramSessions > 0 ? Math.round((completedProgramSessions / totalProgramSessions) * 100) : 0,
          }
        : null,
      hasActiveAssignment: Boolean(activeProgram),
      programStatus: programStatusByPlayer.get(player.id) ?? "Unassigned",
      overallStatus: statusFromSignals({
        hasData,
        readiness: latestLog?.score ?? null,
        sleep: latestLog?.sleepHours ?? null,
        fatigue: latestLog?.fatigue ?? null,
        soreness: latestLog?.soreness ?? null,
        assessmentChange,
      }),
      profileHref: coachPlayerProfileHref(player.id),
      assessmentHref: latestAssessment ? `/dashboard/coach/assessments?assessmentId=${latestAssessment.id}` : null,
    };
  });

  const trendData = dateKeysBetween(from, to).map((date) => {
    const logs = rangeLogs.filter((log) => log.date === date);
    return {
      date,
      averageReadiness: average(logs.map((log) => log.score)),
      checkIns: logs.length,
    };
  });

  return NextResponse.json({
    filters: { range, from, to, playerId: selectedPlayer?.id ?? "all" },
    players: allPlayers,
    kpis: {
      averageReadiness: round(average(rangeLogs.map((log) => log.score))),
      playersCheckedIn: uniqueCheckedPlayers.size,
      averageSleep: round(average(rangeLogs.map((log) => log.sleepHours))),
      playersRequiringAttention: attentionPlayers.length,
    },
    teamOverview: {
      activePlayers: requestedPlayerId ? scopedPlayers.length : allPlayerIds.length,
      checkInRate,
      averageReadiness: round(average(rangeLogs.map((log) => log.score))),
      averageSleep: round(average(rangeLogs.map((log) => log.sleepHours))),
      averageFatigue: round(average(rangeLogs.map((log) => log.fatigue))),
      averageSoreness: round(average(rangeLogs.map((log) => log.soreness))),
    },
    attentionPlayers,
    playerProgress,
    trendData,
  });
}
