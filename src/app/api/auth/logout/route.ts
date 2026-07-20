import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionCookieDomain } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", {
    path: "/",
    ...(sessionCookieDomain() ? { domain: sessionCookieDomain() } : {}),
    maxAge: 0,
  });
  return res;
}
