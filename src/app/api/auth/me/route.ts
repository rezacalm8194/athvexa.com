import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db, ensureDatabase } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null }, { status: 401 });
  await ensureDatabase();

  const user = await db.user.findUnique({
    where: { id: session.sub },
    select: { id: true, name: true, email: true, phone: true, role: true, locale: true, timeZone: true, onboardingCompletedAt: true },
  });
  return NextResponse.json({ user });
}
