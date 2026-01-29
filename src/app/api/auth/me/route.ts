import { NextRequest, NextResponse } from "next/server";

import { parseSessionCookie, validateSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get("session")?.value;
    if (!sessionCookie) return NextResponse.json({ ok: false });

    const session = parseSessionCookie(sessionCookie);
    if (!session || !validateSession(session)) return NextResponse.json({ ok: false });

    return NextResponse.json({
      ok: true,
      user: { username: session.username, role: session.role },
    });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
