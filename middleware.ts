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

  if (pathname.startsWith("/dashboard")) {
    if (!isAuthenticated(request)) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
