import { NextRequest, NextResponse } from "next/server";

import {
  getClientIp,
  getClientUserAgent,
  getSessionFromRequest,
  validateSession,
} from "@/lib/auth";

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/health",
  "/favicon.ico",
  "/logo.png",
  "/_next",
  "/static",
];

// Static file extensions that should be public
const PUBLIC_EXTENSIONS = [
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".css",
  ".js",
];

function isPublicPath(pathname: string): boolean {
  // Check exact matches
  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path))) {
    return true;
  }

  // Check file extensions
  if (PUBLIC_EXTENSIONS.some((ext) => pathname.endsWith(ext))) {
    return true;
  }

  return false;
}

function isAuthenticated(request: NextRequest, pathname: string): boolean {
  const ip = getClientIp(request.headers);
  const userAgent = getClientUserAgent(request.headers);
  const sessionCookie = request.cookies.get("session")?.value;

  // Debug logging for mobile
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  if (isMobile && !sessionCookie) {
    console.log(`[MIDDLEWARE] Mobile request without session: ${pathname}`);
  }

  if (!sessionCookie) return false;

  const session = getSessionFromRequest(userAgent, ip, sessionCookie);
  return !!session && validateSession(session);
}


export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes and static assets to pass through
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Special case: allow /api/auth/me to check session (returns 200 with ok:false if no session)
  if (pathname === "/api/auth/me") {
    return NextResponse.next();
  }

  if (!isAuthenticated(request, pathname)) {

    // For API requests, return 401 instead of redirect
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

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
