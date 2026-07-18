import { NextResponse } from "next/server";
import { sessionCookieName } from "@fpp/auth";

function getRedirectUrl(request: Request, path: string) {
  const url = new URL(path, request.url);

  if (url.hostname === "0.0.0.0" || url.hostname === "[::]") {
    url.hostname = "localhost";
  }

  return url;
}

export function redirectTo(request: Request, path: string) {
  return NextResponse.redirect(getRedirectUrl(request, path), { status: 303 });
}

export function redirectWithSession(request: Request, path: string, token: string, expires: Date) {
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

export const authRedirectTestExports = {
  getRedirectUrl
};
