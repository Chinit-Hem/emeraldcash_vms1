import { NextRequest, NextResponse } from "next/server";

import {
  getClientIp,
  getClientUserAgent,
  getSessionFromRequest,
  validateSession,
} from "@/lib/auth";

function isAuthenticated(request: NextRequest): boolean {
  const ip = getClientIp(request.headers);
  const userAgent = getClientUserAgent(request.headers);
  const sessionCookie = request.cookies.get("session")?.value;
  if (!sessionCookie) return false;

  const session = getSessionFromRequest(userAgent, ip, sessionCookie);
  return !!session && validateSession(session);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes and static assets to pass through
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/login" ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  if (!isAuthenticated(request)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
