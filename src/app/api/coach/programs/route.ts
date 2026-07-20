import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCoachApi } from "@/lib/apiAuth";

const sessionSchema = z.object({
  title: z.string().min(1).max(120),
  day: z.string().min(1).max(20).default("Monday"),
  durationMinutes: z.number().int().min(0).max(600).nullable().optional(),
  intensity: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  notes: z.string().max(2000).nullable().optional(),
});

const createSchema = z.object({
  name: z.string().min(1, "Program name is required").max(120),
  description: z.string().max(2000).nullable().optional(),
  goal: z.string().max(200).nullable().optional(),
  durationWeeks: z.number().int().min(1).max(52).default(4),
  sessionsPerWeek: z.number().int().min(1).max(14).default(3),
  startDate: z.string().max(10).nullable().optional(),
  endDate: z.string().max(10).nullable().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("DRAFT"),
  playerIds: z.array(z.string()).default([]),
  sessions: z.array(sessionSchema).default([]),
});

export async function GET(req: NextRequest) {
  const auth = await requireCoachApi();
  if (auth.error) return auth.error;
  const { teamOwnerId } = auth;

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search")?.trim() ?? "";
  const status = searchParams.get("status") ?? "all";

  const [programs, kpis] = await Promise.all([
    db.program.findMany({
      where: {
        coachId: teamOwnerId,
        ...(status !== "all" ? { status: status.toUpperCase() } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { goal: { contains: search } },
                { description: { contains: search } },
              ],
            }
          : {}),
      },
      include: { _count: { select: { assignments: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.program.groupBy({
      by: ["status"],
      where: { coachId: teamOwnerId },
      _count: { _all: true },
    }),
  ]);

  const assignedPlayers = await db.programAssignment.findMany({
    where: { program: { coachId: teamOwnerId } },
    select: { playerId: true },
    distinct: ["playerId"],
  });

  const kpiCounts = { active: 0, draft: 0, archived: 0 };
  for (const row of kpis) {
    if (row.status === "ACTIVE") kpiCounts.active = row._count._all;
    if (row.status === "DRAFT") kpiCounts.draft = row._count._all;
    if (row.status === "ARCHIVED") kpiCounts.archived = row._count._all;
  }

  return NextResponse.json({
    programs: programs.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      goal: p.goal,
      durationWeeks: p.durationWeeks,
      sessionsPerWeek: p.sessionsPerWeek,
      startDate: p.startDate,
      endDate: p.endDate,
      status: p.status,
      assignedCount: p._count.assignments,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })),
    kpis: {
      active: kpiCounts.active,
      draft: kpiCounts.draft,
      archived: kpiCounts.archived,
      assignedPlayers: assignedPlayers.length,
    },
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireCoachApi();
  if (auth.error) return auth.error;
  const { teamOwnerId } = auth;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid program data" }, { status: 400 });
  }
  const { playerIds, sessions, ...data } = parsed.data;

  // Only assign players who actually belong to this coach's roster.
  const validPlayerIds = playerIds.length
    ? (
        await db.user.findMany({
          where: { id: { in: playerIds }, coachId: teamOwnerId, role: "PLAYER" },
          select: { id: true },
        })
      ).map((p) => p.id)
    : [];

  const program = await db.program.create({
    data: {
      coachId: teamOwnerId,
      name: data.name,
      description: data.description ?? null,
      goal: data.goal ?? null,
      durationWeeks: data.durationWeeks,
      sessionsPerWeek: data.sessionsPerWeek,
      startDate: data.startDate ?? null,
      endDate: data.endDate ?? null,
      status: data.status,
      sessions: {
        create: sessions.map((s, i) => ({
          title: s.title,
          day: s.day,
          durationMinutes: s.durationMinutes ?? null,
          intensity: s.intensity,
          notes: s.notes ?? null,
          order: i,
        })),
      },
      assignments: {
        create: validPlayerIds.map((playerId) => ({ playerId })),
      },
    },
  });

  return NextResponse.json({ id: program.id }, { status: 201 });
}
