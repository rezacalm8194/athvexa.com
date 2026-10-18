import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db, ensureUserTableForAuth } from "@/lib/db";
import { verifyPassword, signSession, SESSION_COOKIE, parseRole, sessionCookieOptions } from "@/lib/auth";
import { parseContact } from "@/lib/contact";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
  remember: z.boolean().optional().default(true),
});

type LoginUser = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  passwordHash: string;
  managedByCoach: boolean;
  role: string;
  locale: string | null;
  timeZone: string | null;
  onboardingCompletedAt: Date | string | null;
};

const LOGIN_COLUMNS = [
  "id",
  "name",
  "email",
  "phone",
  "passwordHash",
  "managedByCoach",
  "role",
  "locale",
  "timeZone",
  "onboardingCompletedAt",
] as const;

function sqliteBool(value: unknown) {
  return value === true || value === 1 || value === "1";
}

function mapLoginUser(row: Record<string, unknown> | null | undefined): LoginUser | null {
  if (!row || typeof row.id !== "string" || typeof row.passwordHash !== "string") return null;
  return {
    id: row.id,
    name: typeof row.name === "string" ? row.name : "",
    email: typeof row.email === "string" ? row.email : null,
    phone: typeof row.phone === "string" ? row.phone : null,
    passwordHash: row.passwordHash,
    managedByCoach: sqliteBool(row.managedByCoach),
    role: typeof row.role === "string" ? row.role : "PLAYER",
    locale: typeof row.locale === "string" ? row.locale : null,
    timeZone: typeof row.timeZone === "string" ? row.timeZone : null,
    onboardingCompletedAt:
      row.onboardingCompletedAt instanceof Date || typeof row.onboardingCompletedAt === "string"
        ? row.onboardingCompletedAt
        : null,
  };
}

async function findUserForLogin(contact: { type: "email" | "phone"; value: string }): Promise<LoginUser | null> {
  const columns = await db.$queryRawUnsafe<{ name: string }[]>(`PRAGMA table_info("User");`);
  const names = new Set(columns.map((column) => column.name));
  if (!names.has("id") || !names.has("passwordHash")) return null;
  if (contact.type === "phone" && !names.has("phone")) return null;
  if (contact.type === "email" && !names.has("email")) return null;

  const select = LOGIN_COLUMNS.filter((name) => names.has(name))
    .map((name) => `"${name}"`)
    .join(", ");
  const whereCol = contact.type === "email" ? "email" : "phone";
  const rows = await db.$queryRaw<Record<string, unknown>[]>(
    Prisma.sql`SELECT ${Prisma.raw(select)} FROM "User" WHERE ${Prisma.raw(`"${whereCol}"`)} = ${contact.value} LIMIT 1`
  );
  return mapLoginUser(rows[0]);
}

async function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Enter a valid email or phone number and password" }, { status: 400 });
    }
    const { identifier, password, remember } = parsed.data;
    const contact = parseContact(identifier);
    if (!contact) {
      return NextResponse.json({ error: "Enter a valid email or phone number" }, { status: 400 });
    }

    void ensureUserTableForAuth().catch((error) => {
      console.error("Login schema patch skipped", error);
    });
    const user = await withTimeout(findUserForLogin(contact), 15000, "Database timed out while signing in");
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: "Incorrect email, phone number, or password" }, { status: 401 });
    }
    if (user.managedByCoach) {
      return NextResponse.json({ error: "This player is managed by a coach and cannot sign in" }, { status: 403 });
    }
    const role = parseRole(user.role);
    if (!role) {
      return NextResponse.json({ error: "Account role is invalid" }, { status: 500 });
    }

    const token = await signSession({ sub: user.id, role, name: user.name }, remember);

    const res = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        locale: user.locale,
        timeZone: user.timeZone,
        onboardingCompletedAt: user.onboardingCompletedAt,
      },
    });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24));
    return res;
  } catch (error) {
    console.error("Login failed", error);
    const detail = error instanceof Error ? error.message : "Unknown database error";
    if (detail.includes("JWT_SECRET")) {
      return NextResponse.json({ error: "Server auth secret is not configured. Set JWT_SECRET in Pachim (32+ characters)." }, { status: 500 });
    }
    return NextResponse.json({ error: `Could not sign in. ${detail}` }, { status: 500 });
  }
}
