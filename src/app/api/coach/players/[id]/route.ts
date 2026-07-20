import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db, ensureDatabase } from "@/lib/db";

const schema = z.object({ role: z.enum(["PLAYER", "ASSISTANT"]) });

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "COACH") {
    return NextResponse.json({ error: "Only the head coach can change roles" }, { status: 403 });
  }
  if (params.id === session.sub) {
    return NextResponse.json({ error: "You can't change your own role" }, { status: 400 });
  }

  await ensureDatabase();

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const member = await db.user.findUnique({ where: { id: params.id } });
  if (!member || member.coachId !== session.sub) {
    return NextResponse.json({ error: "Team member not found" }, { status: 404 });
  }

  const updated = await db.user.update({
    where: { id: params.id },
    data: { role: parsed.data.role },
  });

  return NextResponse.json({ id: updated.id, role: updated.role });
}
