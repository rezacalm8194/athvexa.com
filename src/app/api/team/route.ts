import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

const schema = z.object({
  name: z.string().min(2, "Team name is too short").max(60, "Team name is too long"),
  sport: z.string().max(40).optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "COACH" && session.role !== "ASSISTANT")) {
    return NextResponse.json({ error: "Coaches only" }, { status: 403 });
  }

  let teamOwnerId = session.sub;
  if (session.role === "ASSISTANT") {
    const me = await db.user.findUnique({ where: { id: session.sub }, select: { coachId: true } });
    teamOwnerId = me?.coachId ?? session.sub;
  }

  const team = await db.team.findUnique({ where: { coachId: teamOwnerId } });
  return NextResponse.json({ team });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "COACH") {
    return NextResponse.json({ error: "Only a head coach can create a team" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const existing = await db.team.findUnique({ where: { coachId: session.sub } });
  if (existing) {
    return NextResponse.json({ error: "You already have a team" }, { status: 409 });
  }

  const team = await db.team.create({
    data: { name: parsed.data.name, sport: parsed.data.sport, coachId: session.sub },
  });

  return NextResponse.json({ team });
}
