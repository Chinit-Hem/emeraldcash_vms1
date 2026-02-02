import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { parseSessionCookie, validateSession } from "@/lib/auth";
import { fetchAppsScript } from "../../_shared";

function requireSession(req: NextRequest) {
  const sessionCookie = req.cookies.get("session")?.value;
  if (!sessionCookie) return null;

  const session = parseSessionCookie(sessionCookie);
  if (!session || !validateSession(session)) return null;

  return session;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = requireSession(req);
  if (!session) {
    return NextResponse.json({ ok: false, error: "Invalid or expired session" }, { status: 401 });
  }

  if (session.role !== "Admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    return NextResponse.json(
      { ok: false, error: "Missing NEXT_PUBLIC_API_URL" },
      { status: 500 }
    );
  }

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const imageFileId = String(body.imageFileId || "").trim();
    if (!imageFileId) {
      return NextResponse.json({ ok: false, error: "Missing imageFileId" }, { status: 400 });
    }

    const res = await fetchAppsScript(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "deleteImage",
        fileId: imageFileId,
        token: process.env.APPS_SCRIPT_UPLOAD_TOKEN,
      }),
      cache: "no-store",
      timeoutMs: 30000,
    });

    const data = await res.json();
    if (data.ok === false) {
      return NextResponse.json({ ok: false, error: data.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data: data.data ?? null });
  } catch (e: unknown) {
    const message =
      e instanceof Error && e.name === "AbortError"
        ? "Request to Apps Script timed out."
        : e instanceof Error
          ? e.message
          : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
