import {
  getClientIp,
  getClientUserAgent,
  getSessionFromRequest,
  validateSession,
} from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const userAgent = getClientUserAgent(req.headers);
    const sessionCookie = req.cookies.get("session")?.value;
    
    if (!sessionCookie) {
      return NextResponse.json({ ok: false });
    }

    const session = getSessionFromRequest(userAgent, ip, sessionCookie);
    if (!session || !validateSession(session)) {
      return NextResponse.json({ ok: false });
    }

    return NextResponse.json({
      ok: true,
      user: { username: session.username, role: session.role },
    });
  } catch {
    return NextResponse.json({ ok: false });
  }
}

