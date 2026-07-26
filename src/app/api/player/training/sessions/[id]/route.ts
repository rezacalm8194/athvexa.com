import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, ensureDatabase } from "@/lib/db";
import { getSession } from "@/lib/session";

const schema = z.object({
  action: z.enum(["start", "complete", "skip"]),
  completedAt: z.string().datetime().optional(),
  notes: z.string().max(2000, "Notes must be 2000 characters or fewer.").optional(),
});

function serialize(status: string, completedAt: Date | null, notes: string | null) {
  return { status, completedAt, notes };
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "PLAYER") {
    return NextResponse.json({ error: "Players only" }, { status: 403 });
  }

  await ensureDatabase();
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid session update." }, { status: 400 });
  }

  const programSession = await db.programSession.findUnique({
    where: { id: params.id },
    select: { id: true, programId: true },
  });
  if (!programSession) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const assignment = await db.programAssignment.findUnique({
    where: { programId_playerId: { programId: programSession.programId, playerId: session.sub } },
    select: { id: true },
  });
  if (!assignment) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const existing = await db.programSessionProgress.findUnique({
    where: { playerId_programSessionId: { playerId: session.sub, programSessionId: params.id } },
  });

  if (parsed.data.action === "complete" && existing?.status === "COMPLETED") {
    return NextResponse.json({ error: "This session is already completed." }, { status: 409 });
  }

  const status =
    parsed.data.action === "start" ? "IN_PROGRESS" : parsed.data.action === "skip" ? "SKIPPED" : "COMPLETED";
  const completedAt =
    parsed.data.action === "complete"
      ? parsed.data.completedAt
        ? new Date(parsed.data.completedAt)
        : new Date()
      : null;
  const notes = parsed.data.notes?.trim() || null;

  const progress = await db.programSessionProgress.upsert({
    where: { playerId_programSessionId: { playerId: session.sub, programSessionId: params.id } },
    update: { status, completedAt, notes },
    create: {
      playerId: session.sub,
      programSessionId: params.id,
      status,
      completedAt,
      notes,
    },
  });

  return NextResponse.json({
    session: serialize(progress.status, progress.completedAt, progress.notes),
    message:
      progress.status === "COMPLETED"
        ? "Session marked as completed."
        : progress.status === "SKIPPED"
          ? "Session marked as skipped."
          : "Session started.",
  });
}
