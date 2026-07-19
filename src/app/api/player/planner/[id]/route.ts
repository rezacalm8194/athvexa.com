import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

async function ownedItem(id: string, playerId: string) {
  const item = await db.planItem.findUnique({ where: { id } });
  if (!item || item.playerId !== playerId) return null;
  return item;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "PLAYER") {
    return NextResponse.json({ error: "Players only" }, { status: 403 });
  }
  const existing = await ownedItem(params.id, session.sub);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.done === "boolean") data.done = body.done;
  if (typeof body.label === "string" && body.label.trim()) data.label = body.label.trim();
  if (typeof body.category === "string" && body.category) data.category = body.category;

  const item = await db.planItem.update({ where: { id: params.id }, data });
  return NextResponse.json({ item });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "PLAYER") {
    return NextResponse.json({ error: "Players only" }, { status: 403 });
  }
  const existing = await ownedItem(params.id, session.sub);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.planItem.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
