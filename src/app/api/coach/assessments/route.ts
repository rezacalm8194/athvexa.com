import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCoachApi } from "@/lib/apiAuth";
import { ASSESSMENT_TYPES } from "@/lib/assessmentTypes";
import { previousScoresById } from "@/lib/assessmentPrevious";
import { getAssessmentTemplate, parseStoredMetrics, resolveTemplateMetrics, serializeMetrics } from "@/lib/assessmentTemplates";
import { createNotification, notifyOwnerOfAssistantAction } from "@/lib/notifications";

const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const assessmentSchema = z.object({
  playerId: z.preprocess(blankToUndefined, z.string().min(1).optional()),
  playerIds: z.array(z.string().min(1)).max(200).optional(),
  playerName: z.preprocess(blankToUndefined, z.string().trim().min(2, "Enter the player's name").max(120).optional()),
  type: z.enum(ASSESSMENT_TYPES).optional(),
  templateId: z.preprocess(blankToUndefined, z.string().min(1).nullable().optional()),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD"),
  score: z.number({ invalid_type_error: "Score must be a number" }).finite().optional(),
  metrics: z.record(z.number({ invalid_type_error: "Metric values must be numbers" }).finite()).nullable().optional(),
  notes: z.string().max(3000).nullable().optional(),
}).superRefine((value, context) => {
  const playerIds = uniqueIds(value.playerIds?.length ? value.playerIds : value.playerId ? [value.playerId] : []);
  if (playerIds.length === 0 && !value.playerName) context.addIssue({ code: z.ZodIssueCode.custom, message: "Select a player or enter their name" });
  if (playerIds.length > 0 && value.playerName) context.addIssue({ code: z.ZodIssueCode.custom, message: "Choose either a roster player or a new player" });
});

function uniqueIds(ids: string[]) {
  return [...new Set(ids)];
}

function monthRange(month: string | null) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return null;
  const [year, monthNum] = month.split("-").map(Number);
  return { gte: month, lt: monthNum === 12 ? `${year + 1}-01` : `${year}-${String(monthNum + 1).padStart(2, "0")}` };
}
const labelFor = (row: { player: { name: string; email: string | null } | null; playerName: string | null }) => row.player?.name || row.player?.email || row.playerName || "Unnamed";
const keyFor = (row: { playerId: string | null; playerName: string | null }) => row.playerId ? `user:${row.playerId}` : `manual:${row.playerName?.trim().toLocaleLowerCase()}`;

async function isRosterPlayer(playerId: string, coachId: string) {
  return Boolean(await db.user.findFirst({ where: { id: playerId, coachId, role: "PLAYER" }, select: { id: true } }));
}

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

function publicAssessment(
  row: {
    id: string;
    playerId: string | null;
    playerName: string | null;
    player: { id: string; name: string; email: string | null } | null;
    type: string;
    templateId: string | null;
    date: string;
    score: number;
    notes: string | null;
    metrics: string | null;
    createdAt: Date;
    updatedAt: Date;
  },
  previousScore: number | null
) {
  return {
    id: row.id,
    playerId: row.playerId,
    playerName: labelFor(row),
    player: row.player,
    type: row.type,
    templateId: row.templateId,
    date: row.date,
    score: row.score,
    previousScore,
    change: previousScore == null ? null : Number((row.score - previousScore).toFixed(2)),
    metrics: parseStoredMetrics(row.metrics),
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireCoachApi();
  if (auth.error) return auth.error;
  const search = req.nextUrl.searchParams.get("search")?.trim().toLocaleLowerCase() ?? "";
  const type = req.nextUrl.searchParams.get("type") ?? "all";
  const range = monthRange(req.nextUrl.searchParams.get("month"));
  const requestedPlayerId = req.nextUrl.searchParams.get("playerId")?.trim();
  const allRows = await db.assessment.findMany({ where: { coachId: auth.teamOwnerId }, include: { player: { select: { id: true, name: true, email: true } } }, orderBy: [{ date: "desc" }, { createdAt: "desc" }] });
  const rows = allRows.filter((row) =>
    (type === "all" || row.type === type) && (!range || (row.date >= range.gte && row.date < range.lt))
  );
  const roster = await db.user.findMany({ where: { coachId: auth.teamOwnerId, role: "PLAYER" }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" } });
  const visibleRows = rows.filter((row) => (!requestedPlayerId || row.playerId === requestedPlayerId) && (!search || labelFor(row).toLocaleLowerCase().includes(search)));
  const history = await db.assessment.findMany({ where: { coachId: auth.teamOwnerId }, select: { id: true, playerId: true, playerName: true, type: true, templateId: true, date: true, createdAt: true, score: true }, orderBy: [{ date: "asc" }, { createdAt: "asc" }] });
  const previous = previousScoresById(visibleRows, history);
  const summaries = new Map<string, { id: string; name: string; email: string; manual: boolean; latest: typeof rows[number] | null; count: number }>();
  for (const player of roster) summaries.set(`user:${player.id}`, { id: player.id, name: player.name, email: player.email ?? "", manual: false, latest: null, count: 0 });
  for (const row of rows) {
    const key = keyFor(row); if (!key) continue;
    const item = summaries.get(key) ?? { id: key, name: labelFor(row), email: "", manual: true, latest: null, count: 0 };
    item.count += 1;
    if (!item.latest || row.date > item.latest.date || (row.date === item.latest.date && row.createdAt > item.latest.createdAt)) item.latest = row;
    summaries.set(key, item);
  }
  const playersSummary = [...summaries.values()].filter((item) => !search || item.name.toLocaleLowerCase().includes(search)).map((item) => ({ id: item.id, name: item.name, email: item.email, manual: item.manual, latestAssessment: item.latest ? { id: item.latest.id, type: item.latest.type, templateId: item.latest.templateId, date: item.latest.date, score: item.latest.score, metrics: parseStoredMetrics(item.latest.metrics), notes: item.latest.notes } : null, count: item.count, neverAssessed: item.count === 0, needsAssessment: item.count === 0 }));
  const allPlayerKeys = new Set([...roster.map((player) => `user:${player.id}`), ...allRows.map(keyFor)]);
  const assessedKeys = new Set(allRows.map(keyFor));
  return NextResponse.json({ players: roster, playersSummary, assessments: visibleRows.map((row) => publicAssessment(row, previous.get(row.id) ?? null)), kpis: { totalPlayers: allPlayerKeys.size, totalAssessments: allRows.length, assessmentsThisMonth: allRows.filter((row) => row.date.startsWith(new Date().toISOString().slice(0, 7))).length, playersAssessed: assessedKeys.size, playersNotAssessed: Math.max(allPlayerKeys.size - assessedKeys.size, 0) }, types: ASSESSMENT_TYPES });
}

export async function POST(req: NextRequest) {
  const auth = await requireCoachApi();
  if (auth.error) return auth.error;
  const parsed = assessmentSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid assessment data" }, { status: 400 });
  const write = resolveWrite(parsed.data);
  if ("error" in write) return NextResponse.json({ error: write.error }, { status: 400 });

  const playerIds = uniqueIds(parsed.data.playerIds?.length ? parsed.data.playerIds : parsed.data.playerId ? [parsed.data.playerId] : []);
  for (const playerId of playerIds) {
    if (!(await isRosterPlayer(playerId, auth.teamOwnerId))) return NextResponse.json({ error: "Player is not in your team" }, { status: 403 });
  }

  const targets = playerIds.length > 0
    ? playerIds.map((playerId) => ({ playerId, playerName: null as string | null }))
    : [{ playerId: null as string | null, playerName: parsed.data.playerName!.trim() }];

  const ids: string[] = [];
  for (const target of targets) {
    const assessment = await db.assessment.create({
      data: {
        coachId: auth.teamOwnerId,
        playerId: target.playerId,
        playerName: target.playerName,
        type: write.type,
        templateId: write.templateId,
        date: parsed.data.date,
        score: write.score,
        metrics: write.metrics,
        notes: parsed.data.notes?.trim() || null,
      },
    });
    ids.push(assessment.id);
    if (target.playerId) {
      await createNotification({
        userId: target.playerId,
        title: "New assessment added",
        description: `${write.type} assessment recorded: ${write.score}.`,
        type: "ASSESSMENT_ADDED",
        actionHref: "/dashboard/player/assessments",
        relatedId: assessment.id,
      });
    }
  }

  await notifyOwnerOfAssistantAction({
    actorRole: auth.session.role,
    actorName: auth.session.name,
    ownerId: auth.teamOwnerId,
    title: "Assistant added an assessment",
    description: `recorded a ${write.type} assessment (${write.score}).`,
    actionHref: `/dashboard/coach/assessments?assessmentId=${encodeURIComponent(ids[0])}`,
    relatedId: ids[0],
  });
  return NextResponse.json({ id: ids[0], ids, count: ids.length }, { status: 201 });
}
