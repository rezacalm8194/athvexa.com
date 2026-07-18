import { NextResponse } from "next/server";
import { sessionCookieName } from "@fpp/auth";
import { loginWithPassword } from "../../../auth-flow";

function redirectTo(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, request.url), { status: 303 });
}

function redirectWithSession(request: Request, path: string, token: string, expires: Date) {
  const response = redirectTo(request, path);

  response.cookies.set(sessionCookieName, token, {
    expires,
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });

  return response;
}

export async function POST(request: Request) {
  const result = await loginWithPassword(await request.formData(), request.headers);

  if (!result.ok) {
    return redirectTo(request, `/login?error=${result.error}`);
  }

  return redirectWithSession(request, result.returnTo, result.token, result.expiresAt);
}
