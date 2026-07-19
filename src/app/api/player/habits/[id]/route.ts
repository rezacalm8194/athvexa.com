import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "PLAYER") {
    return NextResponse.json({ error: "Players only" }, { status: 403 });
  }
  const habit = await db.habit.findUnique({ where: { id: params.id } });
  if (!habit || habit.playerId !== session.sub) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.active === "boolean") data.active = body.active;
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (Number.isInteger(body.targetDays)) data.targetDays = Math.min(Math.max(body.targetDays, 1), 7);

  const updated = await db.habit.update({ where: { id: params.id }, data });
  return NextResponse.json({ habit: updated });
}

// Archiving (soft-delete) is preferred so history isn't lost, but allow a
// hard delete too for habits created by mistake.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "PLAYER") {
    return NextResponse.json({ error: "Players only" }, { status: 403 });
  }
  const habit = await db.habit.findUnique({ where: { id: params.id } });
  if (!habit || habit.playerId !== session.sub) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.habitLog.deleteMany({ where: { habitId: params.id } });
  await db.habit.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
