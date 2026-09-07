import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/jwt";

function redirectToLogin(req: NextRequest, pathname: string) {
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

function appOrigin() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://app.athvexa.com").replace(/\/+$/, "");
}

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  // Edge middleware often has a build-time JWT_SECRET (or none) while Node
  // signs cookies with the runtime secret. If a cookie is present but Edge
  // cannot verify it, let the Node server decide — do not wipe the cookie.
  const hasSessionCookie = Boolean(token);
  const { pathname } = req.nextUrl;
  const hostname = req.nextUrl.hostname.toLowerCase();
  const siteMode = process.env.ATHVEXA_SITE_MODE?.trim().toLowerCase();
  const isMarketingOnly = siteMode === "marketing";
  const isAppHost = siteMode === "app" || hostname === "app.athvexa.com";
  const isAppPath =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/invite");

  if (isMarketingOnly && isAppPath) {
    const dest = new URL(`${appOrigin()}${pathname}${req.nextUrl.search}`);
    return NextResponse.redirect(dest);
  }

  if (isAppHost && pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = session || hasSessionCookie ? "/dashboard" : "/login";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/dashboard") && !session && !hasSessionCookie) {
    return redirectToLogin(req, pathname);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/onboarding/:path*", "/login", "/register", "/invite/:path*"],
};
