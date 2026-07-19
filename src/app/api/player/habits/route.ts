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

  const habits = await db.habit.findMany({
    where: { playerId: session.sub, active: true },
    orderBy: { createdAt: "asc" },
    include: { logs: { where: { date: { in: dates } } } },
  });

  return NextResponse.json({ dates, habits });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "PLAYER") {
    return NextResponse.json({ error: "Players only" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const { name, icon, color, targetDays } = body;
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const habit = await db.habit.create({
    data: {
      playerId: session.sub,
      name: name.trim(),
      icon: typeof icon === "string" && icon ? icon : "💧",
      color: typeof color === "string" && color ? color : "#4CAF50",
      targetDays: Number.isInteger(targetDays) ? Math.min(Math.max(targetDays, 1), 7) : 7,
    },
    include: { logs: true },
  });

  return NextResponse.json({ habit });
}
