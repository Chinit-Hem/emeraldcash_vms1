import { NextRequest, NextResponse } from "next/server";

/**
 * Simple test endpoint to verify cookies are being received
 * This helps diagnose mobile cookie issues
 */
export async function GET(req: NextRequest) {
  const allCookies = req.cookies.getAll();
  const sessionCookie = req.cookies.get("session");
  
  const userAgent = req.headers.get("user-agent") || "";
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  
  // Log for debugging
  console.log(`[TEST_COOKIE] ${isMobile ? '[MOBILE] ' : ''}Request received:`, {
    cookieCount: allCookies.length,
    hasSession: !!sessionCookie,
    cookieNames: allCookies.map(c => c.name),
  });

  return NextResponse.json({
    ok: true,
    message: "Cookie test endpoint",
    cookies: {
      count: allCookies.length,
      names: allCookies.map(c => c.name),
      session: {
        exists: !!sessionCookie,
        length: sessionCookie?.value?.length || 0,
      },
    },
    headers: {
      userAgent: userAgent.substring(0, 100),
      host: req.headers.get("host"),
    },
  });
}

export async function POST(req: NextRequest) {
  // Set a test cookie
  const body = await req.json().catch(() => ({}));
  const testValue = body.value || "test-value";
  
  const res = NextResponse.json({
    ok: true,
    message: "Test cookie set",
    value: testValue,
  });

  // Use same options as login
  const host = req.headers.get("host") || "";
  const isLocalhost = host.includes("localhost") || host.includes("127.0.0.1");

  res.cookies.set("test_cookie", testValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: !isLocalhost,
    path: "/",
    maxAge: 60 * 5, // 5 minutes
  });

  console.log(`[TEST_COOKIE] Set test_cookie for host: ${host}, isLocalhost: ${isLocalhost}`);

  return res;
}
