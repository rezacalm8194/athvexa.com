import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  const { pathname } = req.nextUrl;
  const hostname = req.nextUrl.hostname.toLowerCase();
  const isMarketingHost = hostname === "athvexa.com" || hostname === "www.athvexa.com";
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

  if (hostname === "app.athvexa.com" && pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = session ? "/dashboard" : "/login";
    return NextResponse.redirect(url);
  }

  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");
  const isDashboard = pathname.startsWith("/dashboard");

  if (isDashboard && !session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && session) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/login", "/register", "/invite/:path*"],
};
