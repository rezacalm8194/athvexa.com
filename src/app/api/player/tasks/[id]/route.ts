import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session || session.role !== "PLAYER") {
    return NextResponse.json({ error: "Players only" }, { status: 403 });
  }
  const { done } = await req.json().catch(() => ({ done: undefined }));

  const task = await db.task.findUnique({ where: { id: id }, include: { dailyLog: true } });
  if (!task || task.dailyLog.playerId !== session.sub) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await db.task.update({ where: { id: id }, data: { done: Boolean(done) } });
  return NextResponse.json({ task: updated });
}
