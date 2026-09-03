import { NextResponse } from "next/server";
import { db, ensureDatabase } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getTeamWorkspaceByCoachId } from "@/lib/teamWorkspace";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "PLAYER") {
    return NextResponse.json({ error: "Players only" }, { status: 403 });
  }

  await ensureDatabase();
  const player = await db.user.findUnique({ where: { id: session.sub }, select: { coachId: true } });
  const workspace = await getTeamWorkspaceByCoachId(player?.coachId);
  const today = todayKey();

  const assignment = await db.programAssignment.findFirst({
    where: {
      playerId: session.sub,
      program: {
        status: workspace.programVisibility === "ALL" ? { in: ["ACTIVE", "ARCHIVED"] } : "ACTIVE",
        OR: [
          { startDate: null },
          { startDate: { lte: today } },
        ],
        AND: [
          {
            OR: [
              { endDate: null },
              { endDate: { gte: today } },
            ],
          },
        ],
      },
    },
    include: {
      program: {
        include: {
          sessions: {
            orderBy: [{ order: "asc" }, { day: "asc" }],
            include: {
              progress: { where: { playerId: session.sub } },
            },
          },
        },
      },
    },
    orderBy: { assignedAt: "desc" },
  });

  if (!assignment) {
    return NextResponse.json({ program: null });
  }

  const { program } = assignment;
  const sessions = program.sessions
    .slice()
    .sort((a, b) => {
      const dayDiff = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
      return dayDiff === 0 ? a.order - b.order : dayDiff;
    });
  const completedSessions = sessions.filter((session) => session.progress[0]?.status === "COMPLETED").length;
  const remainingSessions = Math.max(sessions.length - completedSessions, 0);
  const progress = sessions.length > 0 ? Math.round((completedSessions / sessions.length) * 100) : 0;

  return NextResponse.json({
    program: {
      id: program.id,
      name: program.name,
      goal: program.goal,
      description: program.description,
      startDate: program.startDate,
      endDate: program.endDate,
      status: program.status,
      assignedAt: assignment.assignedAt,
      progress,
      completedSessions,
      remainingSessions,
      totalSessions: sessions.length,
      sessions: sessions.map((session) => {
        const progress = session.progress[0] ?? null;
        return {
          id: session.id,
          title: session.title,
          day: session.day,
          durationMinutes: session.durationMinutes,
          intensity: session.intensity,
          notes: session.notes,
          status: progress?.status ?? "NOT_STARTED",
          completedAt: progress?.completedAt ?? null,
          completionNotes: progress?.notes ?? null,
        };
      }),
    },
  });
}
