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

const updateSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).nullable().optional(),
  goal: z.string().max(200).nullable().optional(),
  durationWeeks: z.number().int().min(1).max(52),
  sessionsPerWeek: z.number().int().min(1).max(14),
  startDate: z.string().max(10).nullable().optional(),
  endDate: z.string().max(10).nullable().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
  playerIds: z.array(z.string()).default([]),
  sessions: z.array(sessionSchema).default([]),
});

const actionSchema = z.object({ action: z.enum(["duplicate", "archive", "restore"]) });

async function loadOwnedProgram(id: string, teamOwnerId: string) {
  const program = await db.program.findUnique({ where: { id } });
  if (!program || program.coachId !== teamOwnerId) return null;
  return program;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireCoachApi();
  if (auth.error) return auth.error;

  const program = await db.program.findUnique({
    where: { id: params.id },
    include: {
      sessions: { orderBy: { order: "asc" } },
      assignments: { include: { player: { select: { id: true, name: true, email: true } } } },
    },
  });
  if (!program || program.coachId !== auth.teamOwnerId) {
    return NextResponse.json({ error: "Program not found" }, { status: 404 });
  }

  return NextResponse.json({
    program: {
      id: program.id,
      name: program.name,
      description: program.description,
      goal: program.goal,
      durationWeeks: program.durationWeeks,
      sessionsPerWeek: program.sessionsPerWeek,
      startDate: program.startDate,
      endDate: program.endDate,
      status: program.status,
      createdAt: program.createdAt,
      updatedAt: program.updatedAt,
      sessions: program.sessions.map((s) => ({
        id: s.id,
        title: s.title,
        day: s.day,
        durationMinutes: s.durationMinutes,
        intensity: s.intensity,
        notes: s.notes,
      })),
      assignedPlayers: program.assignments.map((a) => a.player),
    },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireCoachApi();
  if (auth.error) return auth.error;
  const { teamOwnerId } = auth;

  const existing = await loadOwnedProgram(params.id, teamOwnerId);
  if (!existing) return NextResponse.json({ error: "Program not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid program data" }, { status: 400 });
  }
  const { playerIds, sessions, ...data } = parsed.data;

  const validPlayerIds = playerIds.length
    ? (
        await db.user.findMany({
          where: { id: { in: playerIds }, coachId: teamOwnerId, role: "PLAYER" },
          select: { id: true },
        })
      ).map((p) => p.id)
    : [];

  await db.$transaction([
    db.programSession.deleteMany({ where: { programId: params.id } }),
    db.programAssignment.deleteMany({ where: { programId: params.id } }),
    db.program.update({
      where: { id: params.id },
      data: {
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
    }),
  ]);

  return NextResponse.json({ id: params.id });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireCoachApi();
  if (auth.error) return auth.error;
  const { teamOwnerId } = auth;

  const existing = await loadOwnedProgram(params.id, teamOwnerId);
  if (!existing) return NextResponse.json({ error: "Program not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  if (parsed.data.action === "archive") {
    await db.program.update({ where: { id: existing.id }, data: { status: "ARCHIVED" } });
    return NextResponse.json({ id: existing.id, status: "ARCHIVED" });
  }

  if (parsed.data.action === "restore") {
    await db.program.update({ where: { id: existing.id }, data: { status: "DRAFT" } });
    return NextResponse.json({ id: existing.id, status: "DRAFT" });
  }

  // duplicate — copy the program and its sessions, but not its player assignments,
  // so the coach can tweak the copy before assigning anyone.
  const sessions = await db.programSession.findMany({ where: { programId: existing.id }, orderBy: { order: "asc" } });
  const copy = await db.program.create({
    data: {
      coachId: teamOwnerId,
      name: `${existing.name} (copy)`,
      description: existing.description,
      goal: existing.goal,
      durationWeeks: existing.durationWeeks,
      sessionsPerWeek: existing.sessionsPerWeek,
      startDate: existing.startDate,
      endDate: existing.endDate,
      status: "DRAFT",
      sessions: {
        create: sessions.map((s) => ({
          title: s.title,
          day: s.day,
          durationMinutes: s.durationMinutes,
          intensity: s.intensity,
          notes: s.notes,
          order: s.order,
        })),
      },
    },
  });

  return NextResponse.json({ id: copy.id }, { status: 201 });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireCoachApi();
  if (auth.error) return auth.error;

  const existing = await loadOwnedProgram(params.id, auth.teamOwnerId);
  if (!existing) return NextResponse.json({ error: "Program not found" }, { status: 404 });

  await db.$transaction([
    db.programSession.deleteMany({ where: { programId: existing.id } }),
    db.programAssignment.deleteMany({ where: { programId: existing.id } }),
    db.program.delete({ where: { id: existing.id } }),
  ]);

  return NextResponse.json({ ok: true });
}
