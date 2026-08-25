import { NextResponse } from "next/server";
import { db, ensureDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureDatabase();
    await db.$queryRawUnsafe("SELECT 1");
    return NextResponse.json({ ok: true, cwd: process.cwd() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, cwd: process.cwd(), message }, { status: 500 });
  }
}
