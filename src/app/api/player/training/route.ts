import { NextResponse } from "next/server";
import { db, ensureDatabase } from "@/lib/db";
import { getSession } from "@/lib/session";

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
  const today = todayKey();

  const assignment = await db.programAssignment.findFirst({
    where: {
      playerId: session.sub,
      program: {
        status: "ACTIVE",
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
          sessions: { orderBy: [{ order: "asc" }, { day: "asc" }] },
        },
      },
    },
    orderBy: { assignedAt: "desc" },
  });

  if (!assignment) {
    return NextResponse.json({ program: null });
  }

  const { program } = assignment;
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
      sessions: program.sessions
        .slice()
        .sort((a, b) => {
          const dayDiff = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
          return dayDiff === 0 ? a.order - b.order : dayDiff;
        })
        .map((session) => ({
          id: session.id,
          title: session.title,
          day: session.day,
          durationMinutes: session.durationMinutes,
          intensity: session.intensity,
          notes: session.notes,
        })),
    },
  });
}
