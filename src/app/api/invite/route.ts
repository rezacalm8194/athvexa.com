import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

export async function POST() {
  const session = await getSession();
  if (!session || (session.role !== "COACH" && session.role !== "ASSISTANT")) {
    return NextResponse.json({ error: "Coaches only" }, { status: 403 });
  }

  const invite = await db.invite.create({
    data: {
      token: nanoid(12),
      coachId: session.sub,
      role: "PLAYER",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14), // 14 days
    },
  });

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return NextResponse.json({ url: `${base}/invite/${invite.token}` });
}
