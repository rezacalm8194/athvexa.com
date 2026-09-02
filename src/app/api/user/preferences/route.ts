import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, ensureDatabase } from "@/lib/db";
import { getSession } from "@/lib/session";

const preferencesSchema = z.object({
  locale: z.enum(["en", "fa"]),
  timeZone: z.string().trim().min(1).max(80).nullable().optional(),
});

function validTimeZone(value: string) {
  try {
    Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = preferencesSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose English or فارسی and a valid time zone." }, { status: 400 });
  const timeZone = parsed.data.timeZone?.trim() || null;
  if (timeZone && !validTimeZone(timeZone)) return NextResponse.json({ error: "Choose a valid IANA time zone." }, { status: 400 });

  await ensureDatabase();
  const user = await db.user.update({
    where: { id: session.sub },
    data: { locale: parsed.data.locale, timeZone, onboardingCompletedAt: new Date() },
    select: { id: true, role: true, locale: true, timeZone: true, onboardingCompletedAt: true },
  });
  const res = NextResponse.json({ user });
  res.cookies.set("NEXT_LOCALE", user.locale, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  return res;
}
