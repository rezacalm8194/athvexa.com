import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, ensureDatabase } from "@/lib/db";
import { getSession } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/auth";

const schema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid password" }, { status: 400 });
  }

  await ensureDatabase();
  const user = await db.user.findUnique({ where: { id: session.sub }, select: { passwordHash: true } });
  if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const matches = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!matches) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });

  await db.user.update({
    where: { id: session.sub },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });

  return NextResponse.json({ ok: true });
}
