import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCoachApi } from "@/lib/apiAuth";
import { ASSESSMENT_TYPES } from "@/lib/assessmentTypes";
import { getAssessmentTemplate, parseStoredMetrics, resolveTemplateMetrics, serializeMetrics } from "@/lib/assessmentTemplates";
import { notifyOwnerOfAssistantAction } from "@/lib/notifications";

const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const assessmentSchema = z.object({
  playerId: z.preprocess(blankToUndefined, z.string().min(1).optional()),
  playerName: z.preprocess(blankToUndefined, z.string().trim().min(2, "Enter the player's name").max(120).optional()),
  type: z.enum(ASSESSMENT_TYPES).optional(),
  templateId: z.preprocess(blankToUndefined, z.string().min(1).nullable().optional()),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD"),
  score: z.number({ invalid_type_error: "Score must be a number" }).finite().optional(),
  metrics: z.record(z.number({ invalid_type_error: "Metric values must be numbers" }).finite()).nullable().optional(),
  notes: z.string().max(3000).nullable().optional(),
}).superRefine((value, context) => {
  if (!value.playerId && !value.playerName) context.addIssue({ code: z.ZodIssueCode.custom, message: "Select a player or enter their name" });
  if (value.playerId && value.playerName) context.addIssue({ code: z.ZodIssueCode.custom, message: "Choose either a roster player or a new player" });
});

function resolveWrite(data: z.infer<typeof assessmentSchema>) {
  const templateId = data.templateId || null;
  const template = getAssessmentTemplate(templateId ?? undefined);
  if (templateId && !template) return { error: "Unknown assessment template" };
  if (template) {
    const resolved = resolveTemplateMetrics(template, data.metrics ?? {});
    if (!resolved.ok) return { error: "Enter a valid value for every metric" };
    return { type: template.type, templateId: template.id, score: resolved.score, metrics: serializeMetrics(resolved.metrics) };
  }
  if (data.score == null || !Number.isFinite(data.score)) return { error: "Score must be a number" };
  if (!data.type) return { error: "Type is required" };
  return { type: data.type, templateId: null, score: data.score, metrics: null };
}

async function loadOwnedAssessment(id: string, teamOwnerId: string) {
  const assessment = await db.assessment.findUnique({
    where: { id },
    include: { player: { select: { id: true, name: true, email: true, coachId: true, role: true } } },
  });
  if (!assessment || assessment.coachId !== teamOwnerId || (assessment.playerId && assessment.player?.coachId !== teamOwnerId)) return null;
  return assessment;
}

async function ensurePlayerBelongsToCoach(playerId: string, teamOwnerId: string) {
  const player = await db.user.findFirst({
    where: { id: playerId, coachId: teamOwnerId, role: "PLAYER" },
    select: { id: true },
  });
  return Boolean(player);
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireCoachApi();
  if (auth.error) return auth.error;

  const assessment = await loadOwnedAssessment(id, auth.teamOwnerId);
  if (!assessment) return NextResponse.json({ error: "Assessment not found" }, { status: 404 });

  const previous = await db.assessment.findFirst({
    where: {
      coachId: auth.teamOwnerId,
      playerId: assessment.playerId,
      playerName: assessment.playerId ? undefined : assessment.playerName,
      ...(assessment.templateId ? { templateId: assessment.templateId } : { templateId: null, type: assessment.type }),
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
      player: assessment.player ? { id: assessment.player.id, name: assessment.player.name, email: assessment.player.email } : null,
      playerName: assessment.player?.name ?? assessment.playerName,
      type: assessment.type,
      templateId: assessment.templateId,
      date: assessment.date,
      score: assessment.score,
      previousScore,
      change: previousScore == null ? null : Number((assessment.score - previousScore).toFixed(2)),
      metrics: parseStoredMetrics(assessment.metrics),
      notes: assessment.notes,
      createdAt: assessment.createdAt,
      updatedAt: assessment.updatedAt,
    },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireCoachApi();
  if (auth.error) return auth.error;

  const existing = await loadOwnedAssessment(id, auth.teamOwnerId);
  if (!existing) return NextResponse.json({ error: "Assessment not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = assessmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid assessment data" }, { status: 400 });
  }

  const write = resolveWrite(parsed.data);
  if ("error" in write) return NextResponse.json({ error: write.error }, { status: 400 });

  const playerId = parsed.data.playerId || null;
  if (playerId) {
    const belongs = await ensurePlayerBelongsToCoach(playerId, auth.teamOwnerId);
    if (!belongs) return NextResponse.json({ error: "Player is not in your team" }, { status: 403 });
  }

  await db.assessment.update({
    where: { id: existing.id },
    data: {
      playerId,
      playerName: playerId ? null : parsed.data.playerName!.trim(),
      type: write.type,
      templateId: write.templateId,
      date: parsed.data.date,
      score: write.score,
      metrics: write.metrics,
      notes: parsed.data.notes?.trim() || null,
    },
  });

  await notifyOwnerOfAssistantAction({ actorRole: auth.session.role, actorName: auth.session.name, ownerId: auth.teamOwnerId, title: "Assistant updated an assessment", description: `updated ${(existing.player?.name ?? existing.playerName ?? "a player")}’s ${write.type} assessment.`, actionHref: `/dashboard/coach/assessments?assessmentId=${encodeURIComponent(existing.id)}`, relatedId: existing.id });

  return NextResponse.json({ id: existing.id });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireCoachApi();
  if (auth.error) return auth.error;

  const existing = await loadOwnedAssessment(id, auth.teamOwnerId);
  if (!existing) return NextResponse.json({ error: "Assessment not found" }, { status: 404 });

  await db.assessment.delete({ where: { id: existing.id } });
  await notifyOwnerOfAssistantAction({ actorRole: auth.session.role, actorName: auth.session.name, ownerId: auth.teamOwnerId, title: "Assistant deleted an assessment", description: `deleted ${(existing.player?.name ?? existing.playerName ?? "a player")}’s ${existing.type} assessment.`, actionHref: "/dashboard/coach/assessments" });
  return NextResponse.json({ ok: true });
}
