import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCoachApi } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { deliverDueChecklistReport } from "@/lib/checklistReports";

const schema = z.object({ enabled: z.boolean(), everyDays: z.number().int().min(1).max(30) });
export async function GET() { const auth = await requireCoachApi(); if (auth.error) return auth.error; await deliverDueChecklistReport(auth.teamOwnerId); const s = await db.user.findUnique({ where: { id: auth.teamOwnerId }, select: { checklistReportEnabled: true, checklistReportEveryDays: true, checklistReportLastSentAt: true } }); return NextResponse.json({ enabled: s?.checklistReportEnabled ?? false, everyDays: s?.checklistReportEveryDays ?? 7, lastSentAt: s?.checklistReportLastSentAt ?? null }); }
export async function PUT(req: NextRequest) { const auth = await requireCoachApi(); if (auth.error) return auth.error; const parsed = schema.safeParse(await req.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Invalid schedule" }, { status: 400 }); const s = await db.user.update({ where: { id: auth.teamOwnerId }, data: { checklistReportEnabled: parsed.data.enabled, checklistReportEveryDays: parsed.data.everyDays }, select: { checklistReportEnabled: true, checklistReportEveryDays: true, checklistReportLastSentAt: true } }); return NextResponse.json({ enabled: s.checklistReportEnabled, everyDays: s.checklistReportEveryDays, lastSentAt: s.checklistReportLastSentAt }); }
