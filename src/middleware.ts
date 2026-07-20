import { NextRequest, NextResponse } from "next/server";
import { appBaseUrl, dashboardPathForRole, marketingBaseUrl, SESSION_COOKIE, verifySession } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  const { pathname } = req.nextUrl;

  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");
  const isDashboard = pathname.startsWith("/dashboard");
  const appUrl = appBaseUrl();
  const marketingUrl = marketingBaseUrl();
  const appHost = new URL(appUrl).hostname;
  const isLocalhost = req.nextUrl.hostname === "localhost" || req.nextUrl.hostname === "127.0.0.1";

  if (isDashboard && !session) {
    const url = isLocalhost ? req.nextUrl.clone() : new URL("/login", marketingUrl);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isDashboard && session && !isLocalhost && req.nextUrl.hostname !== appHost) {
    return NextResponse.redirect(new URL(pathname + req.nextUrl.search, appUrl));
  }

  if (isAuthPage && session) {
    const target = dashboardPathForRole(session.role);
    const url = isLocalhost ? new URL(target, req.nextUrl.origin) : new URL(target, appUrl);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register"],
};
