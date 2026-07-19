import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { weekDates } from "@/lib/week";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "PLAYER") {
    return NextResponse.json({ error: "Players only" }, { status: 403 });
  }
  const week = req.nextUrl.searchParams.get("week");
  const dates = weekDates(week);

  const items = await db.planItem.findMany({
    where: { playerId: session.sub, date: { in: dates } },
    orderBy: [{ date: "asc" }, { order: "asc" }],
  });

  return NextResponse.json({ dates, items });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "PLAYER") {
    return NextResponse.json({ error: "Players only" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const { date, label, category } = body;
  if (typeof date !== "string" || typeof label !== "string" || !label.trim()) {
    return NextResponse.json({ error: "date and label are required" }, { status: 400 });
  }

  const count = await db.planItem.count({ where: { playerId: session.sub, date } });

  const item = await db.planItem.create({
    data: {
      playerId: session.sub,
      date,
      label: label.trim(),
      category: typeof category === "string" && category ? category : "Training",
      order: count,
    },
  });

  return NextResponse.json({ item });
}
