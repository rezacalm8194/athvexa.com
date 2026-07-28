import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
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
    url.pathname = token ? "/dashboard" : "/login";
    return NextResponse.redirect(url);
  }

  const isDashboard = pathname.startsWith("/dashboard");

  if (isDashboard && !token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/login", "/register", "/invite/:path*"],
};
