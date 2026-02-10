import { NextRequest, NextResponse } from "next/server";

import {
  getClientIp,
  getClientUserAgent,
  getSessionFromRequest,
  validateSession,
} from "@/lib/auth";

const PUBLIC_PAGE_ROUTES = new Set(["/login"]);
const PUBLIC_API_ROUTES = new Set([
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/me",
  "/api/auth/debug",
  "/api/health",
]);

const PUBLIC_FILE_REGEX =
  /\.(?:svg|png|jpe?g|gif|ico|webp|avif|css|js|map|txt|xml|woff2?|ttf)$/i;

function isPublicAsset(pathname: string): boolean {
  if (
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/manifest.json"
  ) {
    return true;
  }

  return PUBLIC_FILE_REGEX.test(pathname);
}

function isPublicApiRoute(pathname: string): boolean {
  for (const route of PUBLIC_API_ROUTES) {
    if (pathname === route || pathname.startsWith(`${route}/`)) {
      return true;
    }
  }
  return false;
}

function getSafeRedirectPath(path: string | null): string | null {
  if (!path) return null;
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  if (path === "/login" || path.startsWith("/login?")) return null;
  return path;
}

function isAuthenticated(request: NextRequest): boolean {
  const sessionCookie = request.cookies.get("session")?.value;
  if (!sessionCookie) return false;

  try {
    const ip = getClientIp(request.headers);
    const userAgent = getClientUserAgent(request.headers);
    const session = getSessionFromRequest(userAgent, ip, sessionCookie);
    return Boolean(session && validateSession(session));
  } catch {
    return false;
  }
}

function redirectToLogin(request: NextRequest): NextResponse {
  const loginUrl = new URL("/login", request.url);
  const requestedPath = getSafeRedirectPath(
    `${request.nextUrl.pathname}${request.nextUrl.search}`
  );

  if (requestedPath) {
    loginUrl.searchParams.set("redirect", requestedPath);
  }

  return NextResponse.redirect(loginUrl);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static/public assets early.
  if (isPublicAsset(pathname)) {
    return NextResponse.next();
  }

  // Allow CORS preflight to reach route handlers.
  if (request.method === "OPTIONS") {
    return NextResponse.next();
  }

  const authenticated = isAuthenticated(request);

  // API routes: return JSON 401 instead of page redirects.
  if (pathname.startsWith("/api/")) {
    if (isPublicApiRoute(pathname)) {
      return NextResponse.next();
    }

    if (!authenticated) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.next();
  }

  // Login page is public, but authenticated users should not stay on it.
  if (PUBLIC_PAGE_ROUTES.has(pathname)) {
    if (!authenticated) return NextResponse.next();

    const redirectParam = getSafeRedirectPath(
      request.nextUrl.searchParams.get("redirect")
    );
    return NextResponse.redirect(new URL(redirectParam || "/dashboard", request.url));
  }

  // All other app routes are protected.
  if (!authenticated) {
    return redirectToLogin(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json|.*\\.(?:svg|png|jpe?g|gif|ico|webp|avif|css|js|map|txt|xml|woff2?|ttf)$).*)",
  ],
};
