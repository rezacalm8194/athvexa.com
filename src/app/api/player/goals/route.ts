import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "PLAYER") {
    return NextResponse.json({ error: "Players only" }, { status: 403 });
  }

  const goals = await db.goal.findMany({
    where: { playerId: session.sub, status: { not: "ARCHIVED" } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ goals });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "PLAYER") {
    return NextResponse.json({ error: "Players only" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const { title, description, category, targetDate } = body;
  if (typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const goal = await db.goal.create({
    data: {
      playerId: session.sub,
      title: title.trim(),
      description: typeof description === "string" && description.trim() ? description.trim() : null,
      category: typeof category === "string" && category ? category : "Performance",
      targetDate: typeof targetDate === "string" && targetDate ? targetDate : null,
    },
  });

  return NextResponse.json({ goal });
}
