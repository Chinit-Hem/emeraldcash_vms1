import { createSessionCookie } from "@/lib/auth";
import type { Role } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

const DEMO_USERS: Record<string, { password: string; role: Role }> = {
  admin: { password: "1234", role: "Admin" },
  staff: { password: "1234", role: "Staff" },
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!username || !password) {
    return NextResponse.json(
      { ok: false, error: "Username and password required" },
      { status: 400 }
    );
  }

  const entry = DEMO_USERS[username.toLowerCase()];
  if (!entry || entry.password !== password) {
    return NextResponse.json(
      { ok: false, error: "Invalid username/password" },
      { status: 401 }
    );
  }

  const user = { username, role: entry.role };
  let sessionCookie = "";
  try {
    sessionCookie = createSessionCookie({ ...user, ts: Date.now() });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to create session" },
      { status: 500 }
    );
  }

  const isHttps =
    req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";

  const res = NextResponse.json({ ok: true, user });
  res.cookies.set("session", sessionCookie, {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps,
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });
  return res;
}
