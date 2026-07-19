import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { todayKey } from "@/lib/week";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "PLAYER") {
    return NextResponse.json({ error: "Players only" }, { status: 403 });
  }
  const habit = await db.habit.findUnique({ where: { id: params.id } });
  if (!habit || habit.playerId !== session.sub) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const date = typeof body.date === "string" ? body.date : todayKey();

  const existing = await db.habitLog.findUnique({ where: { habitId_date: { habitId: params.id, date } } });
  if (existing) {
    await db.habitLog.delete({ where: { id: existing.id } });
    return NextResponse.json({ done: false, date });
  }

  await db.habitLog.create({ data: { habitId: params.id, date } });
  return NextResponse.json({ done: true, date });
}
