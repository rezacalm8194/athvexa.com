import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCoachApi } from "@/lib/apiAuth";
import { deliverDueChecklistReport, getChecklistSchedule, saveChecklistSchedule } from "@/lib/checklistReports";

const schema = z.object({ enabled: z.boolean(), everyDays: z.number().int().min(1).max(30) });
export async function GET() { const auth = await requireCoachApi(); if (auth.error) return auth.error; await deliverDueChecklistReport(auth.teamOwnerId); return NextResponse.json(await getChecklistSchedule(auth.teamOwnerId)); }
export async function PUT(req: NextRequest) { const auth = await requireCoachApi(); if (auth.error) return auth.error; const parsed = schema.safeParse(await req.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Invalid schedule" }, { status: 400 }); return NextResponse.json(await saveChecklistSchedule(auth.teamOwnerId, parsed.data.enabled, parsed.data.everyDays)); }
