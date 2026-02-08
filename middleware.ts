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
  "/api/auth/debug",
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
  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path))) {
    return true;
  }
  if (PUBLIC_EXTENSIONS.some((ext) => pathname.endsWith(ext))) {
    return true;
  }
  return false;
}

function isAuthenticated(request: NextRequest): { authenticated: boolean; reason?: string; debug?: string } {
  const ip = getClientIp(request.headers);
  const userAgent = getClientUserAgent(request.headers);
  const sessionCookie = request.cookies.get("session")?.value;

  console.log(`[MIDDLEWARE_AUTH] Checking auth for ${request.nextUrl.pathname}`);
  console.log(`[MIDDLEWARE_AUTH] IP: ${ip}, UA: ${userAgent?.substring(0, 50)}`);
  console.log(`[MIDDLEWARE_AUTH] Cookie exists: ${!!sessionCookie}`);

  if (!sessionCookie) {
    console.log(`[MIDDLEWARE_AUTH] No session cookie found`);
    return { authenticated: false, reason: "no-cookie", debug: "Session cookie is missing" };
  }

  const session = getSessionFromRequest(userAgent, ip, sessionCookie);
  
  if (!session) {
    console.log(`[MIDDLEWARE_AUTH] Session cookie exists but failed to parse/validate`);
    // Try to get more details about why parsing failed
    try {
      const [encodedPayload] = sessionCookie.split(".");
      if (encodedPayload) {
        const decoded = Buffer.from(encodedPayload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
        const payload = JSON.parse(decoded);
        console.log(`[MIDDLEWARE_AUTH] Session payload version: ${payload.version}, ts: ${payload.ts}`);
        console.log(`[MIDDLEWARE_AUTH] Session age: ${Date.now() - payload.ts}ms`);
      }
    } catch (e) {
      console.log(`[MIDDLEWARE_AUTH] Could not decode session for debugging: ${e}`);
    }
    return { authenticated: false, reason: "invalid-session", debug: "Session cookie exists but is invalid or fingerprint mismatch" };
  }

  if (!validateSession(session)) {
    const age = Date.now() - session.ts;
    const maxAge = 8 * 60 * 60 * 1000; // 8 hours
    console.log(`[MIDDLEWARE_AUTH] Session validation failed. Age: ${age}ms, Max: ${maxAge}ms`);
    return { authenticated: false, reason: "expired-session", debug: `Session expired or invalid. Age: ${age}ms` };
  }

  console.log(`[MIDDLEWARE_AUTH] Session valid for user: ${session.username}`);
  return { authenticated: true };
}


export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Always allow auth check and debug endpoints
  if (pathname === "/api/auth/me" || pathname === "/api/auth/debug") {
    return NextResponse.next();
  }


  const auth = isAuthenticated(request);

  if (!auth.authenticated) {
    console.log(`[MIDDLEWARE] Blocked: ${pathname}, reason: ${auth.reason}, debug: ${auth.debug}`);

    // For API requests, return 401
    if (pathname.startsWith("/api/")) {
      const response = NextResponse.json(
        { ok: false, error: "Unauthorized", reason: auth.reason, debug: auth.debug },
        { status: 401 }
      );
      // Add debug headers to help troubleshoot
      response.headers.set("X-Auth-Debug", auth.reason || "unknown");
      response.headers.set("X-Auth-Debug-Info", JSON.stringify({
        cookiePresent: !!request.cookies.get("session")?.value,
        userAgent: request.headers.get("user-agent")?.substring(0, 50),
      }));
      return response;
    }

    // Redirect to login
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }


  // User is authenticated, allow access
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
