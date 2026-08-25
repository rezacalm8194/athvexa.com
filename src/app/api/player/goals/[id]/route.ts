import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session || session.role !== "PLAYER") {
    return NextResponse.json({ error: "Players only" }, { status: 403 });
  }
  const goal = await db.goal.findUnique({ where: { id: id } });
  if (!goal || goal.playerId !== session.sub) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (Number.isInteger(body.progress)) {
    const p = Math.min(Math.max(body.progress, 0), 100);
    data.progress = p;
    // Reaching 100% marks the goal done; dragging back down un-does it.
    if (!body.status) data.status = p >= 100 ? "DONE" : "ACTIVE";
  }
  if (typeof body.status === "string" && ["ACTIVE", "DONE", "ARCHIVED"].includes(body.status)) {
    data.status = body.status;
  }
  if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim();

  const updated = await db.goal.update({ where: { id: id }, data });
  return NextResponse.json({ goal: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session || session.role !== "PLAYER") {
    return NextResponse.json({ error: "Players only" }, { status: 403 });
  }
  const goal = await db.goal.findUnique({ where: { id: id } });
  if (!goal || goal.playerId !== session.sub) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.goal.delete({ where: { id: id } });
  return NextResponse.json({ ok: true });
}
