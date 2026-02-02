import { parseSessionCookie, validateSession } from "@/lib/auth";
import { getCambodiaNowString, normalizeCambodiaTimeString } from "@/lib/cambodiaTime";
import type { Vehicle } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

import { clearCachedVehicles, getCachedVehicles, setCachedVehicles } from "../vehicles/_cache";
import {
  appsScriptUrl,
  driveFolderIdForCategory,
  driveThumbnailUrl,
  parseImageDataUrl,
  toAppsScriptPayload,
  toVehicle,
} from "../vehicles/_shared";

function requireSession(req: NextRequest) {
  const sessionCookie = req.cookies.get("session")?.value;
  if (!sessionCookie) return null;

  const session = parseSessionCookie(sessionCookie);
  if (!session || !validateSession(session)) return null;

  return session;
}

export async function GET(req: NextRequest) {
  const session = requireSession(req);
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const cached = getCachedVehicles();
  if (cached) {
    return NextResponse.json({ ok: true, data: cached });
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    return NextResponse.json(
      { ok: false, error: "Missing NEXT_PUBLIC_API_URL in .env.local" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(appsScriptUrl(baseUrl, "getVehicles"), { cache: "no-store" });

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `Apps Script error: ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();

    if (data.ok === false) {
      return NextResponse.json({ ok: false, error: data.error }, { status: 500 });
    }

    const vehicles = (Array.isArray(data.data) ? (data.data as Record<string, unknown>[]) : [])
      .filter((row) => row && typeof row === "object")
      .map((row) => toVehicle(row)) as Vehicle[];

    setCachedVehicles(vehicles);
    return NextResponse.json({ ok: true, data: vehicles });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Fetch failed" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = requireSession(req);
  if (!session) {
    return NextResponse.json({ ok: false, error: "Invalid or expired session" }, { status: 401 });
  }

  if (session.role !== "Admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    return NextResponse.json(
      { ok: false, error: "Missing NEXT_PUBLIC_API_URL in .env.local" },
      { status: 500 }
    );
  }

  const safePart = (value: unknown) =>
    String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32);

  const extensionFromMimeType = (mimeType: string) => {
    const normalized = mimeType.toLowerCase();
    if (normalized === "image/png") return "png";
    if (normalized === "image/webp") return "webp";
    if (normalized === "image/gif") return "gif";
    if (normalized === "image/svg+xml") return "svg";
    return "jpg";
  };

  try {
    const payload = toAppsScriptPayload(body);
    payload.Time = normalizeCambodiaTimeString(payload.Time) || getCambodiaNowString();

    const imageData = parseImageDataUrl(payload.Image);
    if (imageData) {
      const folderId = driveFolderIdForCategory(payload.Category);
      if (!folderId) {
        return NextResponse.json(
          { ok: false, error: "Unknown category. Please select Cars, Motorcycles, or Tuk Tuk." },
          { status: 400 }
        );
      }

      const ext = extensionFromMimeType(imageData.mimeType);
      const fileNameId = crypto.randomUUID().split("-")[0];
      const parts = [
        fileNameId,
        safePart(payload.Category),
        safePart(payload.Brand),
        safePart(payload.Model),
      ].filter(Boolean);
      const fileName = `${parts.join("-")}.${ext}`;

      const uploadRes = await fetch(baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "uploadImage",
          folderId,
          category: payload.Category,
          token: process.env.APPS_SCRIPT_UPLOAD_TOKEN,
          mimeType: imageData.mimeType,
          fileName,
          data: imageData.base64Data,
        }),
        cache: "no-store",
      });

      const uploadJson = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok || uploadJson.ok === false) {
        const message =
          typeof uploadJson?.error === "string" && uploadJson.error.trim()
            ? uploadJson.error.trim()
            : `Image upload failed (${uploadRes.status}).`;

        return NextResponse.json(
          {
            ok: false,
            error:
              `${message} ` +
              `Your Apps Script must support action=uploadImage to save images into Drive folders.`,
          },
          { status: 502 }
        );
      }

      const uploadedUrlCandidate =
        uploadJson?.url ??
        uploadJson?.data?.url ??
        uploadJson?.data?.thumbnailUrl ??
        uploadJson?.thumbnailUrl ??
        uploadJson?.data?.imageUrl;

      const uploadedFileIdCandidate = uploadJson?.fileId ?? uploadJson?.data?.fileId;

      if (typeof uploadedUrlCandidate === "string" && uploadedUrlCandidate.trim()) {
        payload.Image = uploadedUrlCandidate.trim();
      } else if (typeof uploadedFileIdCandidate === "string" && uploadedFileIdCandidate.trim()) {
        payload.Image = driveThumbnailUrl(uploadedFileIdCandidate.trim());
      } else {
        return NextResponse.json(
          {
            ok: false,
            error: "Image upload succeeded but no image URL was returned by Apps Script.",
          },
          { status: 502 }
        );
      }
    }

    const res = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", data: payload }),
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `Apps Script error: ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();

    if (data.ok === false) {
      return NextResponse.json({ ok: false, error: data.error }, { status: 500 });
    }

    clearCachedVehicles();
    return NextResponse.json({ ok: true, data: data.data ?? null });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Fetch failed" },
      { status: 500 }
    );
  }
}
