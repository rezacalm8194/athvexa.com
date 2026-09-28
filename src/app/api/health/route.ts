import { NextResponse } from "next/server";
import { db, ensureDatabase, getDatabaseUrl, inspectSqliteFiles } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureDatabase();
    await db.$queryRawUnsafe("SELECT 1");
    const invites = await db.invite.count().catch(() => -1);
    const files = await inspectSqliteFiles().catch(() => []);
    return NextResponse.json({ ok: true, cwd: process.cwd(), database: getDatabaseUrl(), invites, files });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, cwd: process.cwd(), database: getDatabaseUrl(), message }, { status: 500 });
  }
}
