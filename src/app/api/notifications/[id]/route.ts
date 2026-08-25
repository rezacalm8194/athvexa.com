import { NextRequest, NextResponse } from "next/server";
import { db, ensureDatabase } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  await ensureDatabase();
  const existing = await db.notification.findUnique({ where: { id: id }, select: { userId: true } });
  if (!existing || existing.userId !== session.sub) return NextResponse.json({ error: "Notification not found" }, { status: 404 });

  const notification = await db.notification.update({
    where: { id: id },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ notification });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  await ensureDatabase();
  const existing = await db.notification.findUnique({ where: { id: id }, select: { userId: true } });
  if (!existing || existing.userId !== session.sub) return NextResponse.json({ error: "Notification not found" }, { status: 404 });

  await db.notification.delete({ where: { id: id } });
  return NextResponse.json({ ok: true });
}
