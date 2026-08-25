import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db, ensureDatabase } from "@/lib/db";
import { getTeamOwnerId } from "@/lib/teamContext";

const schema = z.object({
  name: z.string().min(2, "Team name is too short").max(60, "Team name is too long"),
  sport: z.string().max(40).optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "COACH" && session.role !== "ASSISTANT")) {
    return NextResponse.json({ error: "Coaches only" }, { status: 403 });
  }

  await ensureDatabase();

  const teamOwnerId = await getTeamOwnerId(session.sub);

  const team = await db.team.findFirst({
    where: { coachId: teamOwnerId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, sport: true, coachId: true, createdAt: true },
  });
  return NextResponse.json({ team });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "COACH") {
    return NextResponse.json({ error: "Only a head coach can create a team" }, { status: 403 });
  }

  await ensureDatabase();

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const existing = await db.team.findFirst({
    where: { coachId: session.sub },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "You already have a team" }, { status: 409 });
  }

  const team = await db.team.create({
    data: {
      name: parsed.data.name,
      sport: parsed.data.sport,
      coachId: session.sub,
      members: { create: { userId: session.sub, role: "OWNER" } },
    },
  });

  return NextResponse.json({ team });
}
