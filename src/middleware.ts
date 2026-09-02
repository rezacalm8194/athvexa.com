import { NextRequest, NextResponse } from "next/server";
import { expiredSessionCookieOptions, SESSION_COOKIE, verifySession } from "@/lib/jwt";

function redirectToLogin(req: NextRequest, pathname: string) {
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  const res = NextResponse.redirect(url);
  res.cookies.set(SESSION_COOKIE, "", expiredSessionCookieOptions());
  return res;
}

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  const { pathname } = req.nextUrl;
  const hostname = req.nextUrl.hostname.toLowerCase();
  const siteMode = process.env.ATHVEXA_SITE_MODE?.trim().toLowerCase();
  const isMarketingHost =
    siteMode === "marketing" ||
    (siteMode !== "app" && (hostname === "athvexa.com" || hostname === "www.athvexa.com"));
  const isAppHost = siteMode === "app" || hostname === "app.athvexa.com";
  const isAppPath =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/invite");

  if (isMarketingHost && isAppPath) {
    const url = req.nextUrl.clone();
    url.hostname = "app.athvexa.com";
    url.protocol = "https:";
    url.port = "";
    return NextResponse.redirect(url);
  }

  if (isAppHost && pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = session ? "/dashboard" : "/login";
    const res = NextResponse.redirect(url);
    if (token && !session) {
      res.cookies.set(SESSION_COOKIE, "", expiredSessionCookieOptions());
    }
    return res;
  }

  const isDashboard = pathname.startsWith("/dashboard");

  if (isDashboard && !session) {
    return redirectToLogin(req, pathname);
  }

  const res = NextResponse.next();
  if (token && !session) {
    res.cookies.set(SESSION_COOKIE, "", expiredSessionCookieOptions());
  }
  return res;
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/onboarding/:path*", "/login", "/register", "/invite/:path*"],
};
