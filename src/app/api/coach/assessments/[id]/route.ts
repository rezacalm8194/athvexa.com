import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCoachApi } from "@/lib/apiAuth";
import { ASSESSMENT_TYPES } from "@/lib/assessmentTypes";

const assessmentSchema = z.object({
  playerId: z.string().min(1, "Player is required"),
  type: z.enum(ASSESSMENT_TYPES),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD"),
  score: z.number().int().min(0).max(100),
  notes: z.string().max(3000).nullable().optional(),
});

async function loadOwnedAssessment(id: string, teamOwnerId: string) {
  const assessment = await db.assessment.findUnique({
    where: { id },
    include: { player: { select: { id: true, name: true, email: true, coachId: true, role: true } } },
  });
  if (!assessment || assessment.coachId !== teamOwnerId || assessment.player.coachId !== teamOwnerId) return null;
  return assessment;
}

async function ensurePlayerBelongsToCoach(playerId: string, teamOwnerId: string) {
  const player = await db.user.findFirst({
    where: { id: playerId, coachId: teamOwnerId, role: "PLAYER" },
    select: { id: true },
  });
  return Boolean(player);
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireCoachApi();
  if (auth.error) return auth.error;

  const assessment = await loadOwnedAssessment(params.id, auth.teamOwnerId);
  if (!assessment) return NextResponse.json({ error: "Assessment not found" }, { status: 404 });

  const previous = await db.assessment.findFirst({
    where: {
      coachId: auth.teamOwnerId,
      playerId: assessment.playerId,
      type: assessment.type,
      OR: [
        { date: { lt: assessment.date } },
        { date: assessment.date, createdAt: { lt: assessment.createdAt } },
      ],
      NOT: { id: assessment.id },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    select: { score: true },
  });
  const previousScore = previous?.score ?? null;

  return NextResponse.json({
    assessment: {
      id: assessment.id,
      playerId: assessment.playerId,
      player: { id: assessment.player.id, name: assessment.player.name, email: assessment.player.email },
      type: assessment.type,
      date: assessment.date,
      score: assessment.score,
      previousScore,
      change: previousScore == null ? null : assessment.score - previousScore,
      notes: assessment.notes,
      createdAt: assessment.createdAt,
      updatedAt: assessment.updatedAt,
    },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireCoachApi();
  if (auth.error) return auth.error;

  const existing = await loadOwnedAssessment(params.id, auth.teamOwnerId);
  if (!existing) return NextResponse.json({ error: "Assessment not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = assessmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid assessment data" }, { status: 400 });
  }

  const belongs = await ensurePlayerBelongsToCoach(parsed.data.playerId, auth.teamOwnerId);
  if (!belongs) return NextResponse.json({ error: "Player is not in your team" }, { status: 403 });

  await db.assessment.update({
    where: { id: existing.id },
    data: {
      playerId: parsed.data.playerId,
      type: parsed.data.type,
      date: parsed.data.date,
      score: parsed.data.score,
      notes: parsed.data.notes?.trim() || null,
    },
  });

  return NextResponse.json({ id: existing.id });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireCoachApi();
  if (auth.error) return auth.error;

  const existing = await loadOwnedAssessment(params.id, auth.teamOwnerId);
  if (!existing) return NextResponse.json({ error: "Assessment not found" }, { status: 404 });

  await db.assessment.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}

