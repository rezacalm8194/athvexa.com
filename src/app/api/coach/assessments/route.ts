import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCoachApi } from "@/lib/apiAuth";
import { ASSESSMENT_TYPES } from "@/lib/assessmentTypes";
import { previousScoresById } from "@/lib/assessmentPrevious";
import { createNotification, notifyOwnerOfAssistantAction } from "@/lib/notifications";

const assessmentSchema = z.object({
  playerId: z.string().min(1).optional().or(z.literal("")),
  playerName: z.string().trim().min(2, "Enter the player's name").max(120).optional(),
  type: z.enum(ASSESSMENT_TYPES),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD"),
  score: z.number({ invalid_type_error: "Score must be a number" }).finite(),
  notes: z.string().max(3000).nullable().optional(),
}).superRefine((value, context) => {
  if (!value.playerId && !value.playerName) context.addIssue({ code: z.ZodIssueCode.custom, message: "Select a player or enter their name" });
  if (value.playerId && value.playerName) context.addIssue({ code: z.ZodIssueCode.custom, message: "Choose either a roster player or a new player" });
});

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

export async function GET(req: NextRequest) {
  const auth = await requireCoachApi();
  if (auth.error) return auth.error;
  const search = req.nextUrl.searchParams.get("search")?.trim().toLocaleLowerCase() ?? "";
  const type = req.nextUrl.searchParams.get("type") ?? "all";
  const range = monthRange(req.nextUrl.searchParams.get("month"));
  const requestedPlayerId = req.nextUrl.searchParams.get("playerId")?.trim();
  const rows = await db.assessment.findMany({ where: { coachId: auth.teamOwnerId, ...(type !== "all" && ASSESSMENT_TYPES.includes(type as never) ? { type } : {}), ...(range ? { date: range } : {}) }, include: { player: { select: { id: true, name: true, email: true } } }, orderBy: [{ date: "desc" }, { createdAt: "desc" }] });
  const roster = await db.user.findMany({ where: { coachId: auth.teamOwnerId, role: "PLAYER" }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" } });
  const visibleRows = rows.filter((row) => (!requestedPlayerId || row.playerId === requestedPlayerId) && (!search || labelFor(row).toLocaleLowerCase().includes(search)));
  const history = await db.assessment.findMany({ where: { coachId: auth.teamOwnerId }, select: { id: true, playerId: true, playerName: true, type: true, date: true, createdAt: true, score: true }, orderBy: [{ date: "asc" }, { createdAt: "asc" }] });
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
  const playersSummary = [...summaries.values()].filter((item) => !search || item.name.toLocaleLowerCase().includes(search)).map((item) => ({ id: item.id, name: item.name, email: item.email, manual: item.manual, latestAssessment: item.latest ? { id: item.latest.id, type: item.latest.type, date: item.latest.date, score: item.latest.score, notes: item.latest.notes } : null, count: item.count, neverAssessed: item.count === 0, needsAssessment: item.count === 0 }));
  const assessed = [...summaries.values()].filter((item) => item.count > 0).length;
  return NextResponse.json({ players: roster, playersSummary, assessments: visibleRows.map((row) => ({ id: row.id, playerId: row.playerId, playerName: labelFor(row), player: row.player, type: row.type, date: row.date, score: row.score, previousScore: previous.get(row.id) ?? null, change: previous.has(row.id) ? Number((row.score - (previous.get(row.id) ?? 0)).toFixed(2)) : null, notes: row.notes, createdAt: row.createdAt, updatedAt: row.updatedAt })), kpis: { totalPlayers: summaries.size, totalAssessments: rows.length, assessmentsThisMonth: rows.filter((row) => row.date.startsWith(new Date().toISOString().slice(0, 7))).length, playersAssessed: assessed, playersNotAssessed: summaries.size - assessed }, types: ASSESSMENT_TYPES });
}

export async function POST(req: NextRequest) {
  const auth = await requireCoachApi();
  if (auth.error) return auth.error;
  const parsed = assessmentSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid assessment data" }, { status: 400 });
  const playerId = parsed.data.playerId || null;
  if (playerId && !(await isRosterPlayer(playerId, auth.teamOwnerId))) return NextResponse.json({ error: "Player is not in your team" }, { status: 403 });
  const assessment = await db.assessment.create({ data: { coachId: auth.teamOwnerId, playerId, playerName: playerId ? null : parsed.data.playerName!.trim(), type: parsed.data.type, date: parsed.data.date, score: parsed.data.score, notes: parsed.data.notes?.trim() || null } });
  if (playerId) await createNotification({ userId: playerId, title: "New assessment added", description: `${parsed.data.type} assessment recorded: ${parsed.data.score}.`, type: "ASSESSMENT_ADDED", actionHref: "/dashboard/player", relatedId: assessment.id });
  await notifyOwnerOfAssistantAction({ actorRole: auth.session.role, actorName: auth.session.name, ownerId: auth.teamOwnerId, title: "Assistant added an assessment", description: `recorded a ${parsed.data.type} assessment (${parsed.data.score}).`, actionHref: `/dashboard/coach/assessments?assessmentId=${encodeURIComponent(assessment.id)}`, relatedId: assessment.id });
  return NextResponse.json({ id: assessment.id }, { status: 201 });
}
