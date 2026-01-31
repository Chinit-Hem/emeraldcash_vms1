import { parseSessionCookie, validateSession } from "@/lib/auth";
import { normalizeCambodiaTimeString } from "@/lib/cambodiaTime";
import { extractDriveFileId } from "@/lib/drive";
import type { Vehicle } from "@/lib/types";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { clearCachedVehicles, getCachedVehicles } from "../_cache";
import {
  appsScriptUrl,
  driveFolderIdForCategory,
  driveThumbnailUrl,
  parseImageDataUrl,
  toAppsScriptPayload,
  toVehicle,
} from "../_shared";

function requireSession(req: NextRequest) {
  const sessionCookie = req.cookies.get("session")?.value;
  if (!sessionCookie) return null;

  const session = parseSessionCookie(sessionCookie);
  if (!session || !validateSession(session)) return null;

  return session;
}

function toIntOrNull(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? Math.trunc(value) : null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchAllVehicleRows(baseUrl: string, cache: RequestCache): Promise<Record<string, unknown>[]> {
  const requestedLimit = 500;
  const maxPages = 50; // 50 * 500 = 25k rows safety cap

  let offset = 0;
  let total: number | null = null;
  let lastMetaOffset: number | null = null;
  const allRows: Record<string, unknown>[] = [];

  for (let page = 0; page < maxPages; page++) {
    const url = new URL(appsScriptUrl(baseUrl, "getVehicles"));
    url.searchParams.set("limit", String(requestedLimit));
    url.searchParams.set("offset", String(offset));

    const res = await fetch(url.toString(), { cache });
    if (!res.ok) throw new Error(`Failed to fetch vehicles: ${res.status}`);

    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (json.ok === false) {
      const message = typeof json.error === "string" && json.error.trim() ? json.error.trim() : "Apps Script ok=false";
      throw new Error(message);
    }

    const rows = (Array.isArray(json.data) ? (json.data as unknown[]) : [])
      .filter((row) => row && typeof row === "object") as Record<string, unknown>[];
    allRows.push(...rows);

    const metaRaw = json.meta && typeof json.meta === "object" ? (json.meta as Record<string, unknown>) : null;
    if (!metaRaw) break;

    const meta = {
      total: toIntOrNull(metaRaw.total),
      limit: toIntOrNull(metaRaw.limit),
      offset: toIntOrNull(metaRaw.offset),
    };

    if (meta.total != null && meta.total >= 0) total ??= meta.total;
    const effectiveLimit = meta.limit && meta.limit > 0 ? meta.limit : requestedLimit;
    const effectiveOffset = meta.offset != null && meta.offset >= 0 ? meta.offset : offset;

    if (lastMetaOffset != null && effectiveOffset === lastMetaOffset) break;
    lastMetaOffset = effectiveOffset;

    if (rows.length === 0) break;
    if (rows.length < effectiveLimit) break;
    if (total != null && allRows.length >= total) break;

    offset = effectiveOffset + effectiveLimit;
    if (total != null && offset >= total) break;
  }

  return allRows;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = requireSession(req);
  if (!session) {
    return NextResponse.json({ ok: false, error: "Invalid or expired session" }, { status: 401 });
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
    // Fast path: try to fetch just one record (if your Apps Script supports getById).
    try {
      const byIdUrl = new URL(baseUrl);
      byIdUrl.searchParams.set("action", "getById");
      byIdUrl.searchParams.set("id", id);

      const byIdRes = await fetch(byIdUrl.toString(), { cache: "no-store" });
      const byIdJson = byIdRes.ok ? await byIdRes.json().catch(() => ({})) : null;

      if (byIdRes.ok && byIdJson && byIdJson.ok !== false && byIdJson.data && typeof byIdJson.data === "object") {
        const vehicle: Vehicle = toVehicle(byIdJson.data as Record<string, unknown>);
        if (!vehicle.VehicleId) vehicle.VehicleId = id;
        return NextResponse.json({ ok: true, data: vehicle });
      }

      if (byIdRes.ok && byIdJson && byIdJson.ok === false) {
        const message = typeof byIdJson.error === "string" ? byIdJson.error : "";
        if (/not\s*found/i.test(message)) {
          return NextResponse.json({ ok: false, error: "Vehicle not found" }, { status: 404 });
        }
      }
    } catch {
      // ignore and fallback to list fetch
    }

    const cachedVehicles = getCachedVehicles();
    if (cachedVehicles) {
      const cached = cachedVehicles.find((vehicle) => vehicle.VehicleId === id);
      if (cached) {
        return NextResponse.json({ ok: true, data: cached });
      }
    }

    // Fallback: fetch list and search by id (works with older Apps Script versions).
    const rows = await fetchAllVehicleRows(baseUrl, "no-store");
    const match = rows.find((row) => String(row.VehicleId ?? row.VehicleID ?? row.Id ?? row.id ?? "") === id);

    if (!match) {
      return NextResponse.json({ ok: false, error: "Vehicle not found" }, { status: 404 });
    }

    const vehicle: Vehicle = toVehicle(match);

    return NextResponse.json({ ok: true, data: vehicle });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const payload = toAppsScriptPayload(body, { vehicleId: id });
    const normalizedTime = normalizeCambodiaTimeString(payload.Time);
    if (normalizedTime) payload.Time = normalizedTime;
    else delete payload.Time;

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
      const parts = [id, safePart(payload.Category), safePart(payload.Brand), safePart(payload.Model)].filter(Boolean);
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
      body: JSON.stringify({ action: "update", id, data: payload }),
      cache: "no-store",
    });

    const data = await res.json();

    if (data.ok === false) {
      return NextResponse.json({ ok: false, error: data.error }, { status: 400 });
    }

    clearCachedVehicles();
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    return NextResponse.json({ ok: false, error: "Missing NEXT_PUBLIC_API_URL" }, { status: 500 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const imageFileIdFromBody =
      extractDriveFileId(body.imageFileId) ?? extractDriveFileId(body.imageUrl) ?? null;

    let imageFileId = imageFileIdFromBody;
    if (!imageFileId) {
      // Fallback: fetch the current vehicle so we can extract its Drive file id.
      try {
        // Fast path: use getById if available.
        const byIdUrl = new URL(baseUrl);
        byIdUrl.searchParams.set("action", "getById");
        byIdUrl.searchParams.set("id", id);
        const byIdRes = await fetch(byIdUrl.toString(), { cache: "no-store" });
        if (byIdRes.ok) {
          const byIdJson = await byIdRes.json().catch(() => ({}));
          if (byIdJson?.ok !== false && byIdJson?.data && typeof byIdJson.data === "object") {
            const vehicle = toVehicle(byIdJson.data as Record<string, unknown>);
            imageFileId = extractDriveFileId(vehicle.Image);
          }
        }
      } catch {
        // ignore and try list fallback below
      }
    }
    if (!imageFileId) {
      // Fallback: list fetch (older Apps Script versions without getById).
      try {
        const rows = await fetchAllVehicleRows(baseUrl, "no-store");
        const match = rows.find((row) => String(row.VehicleId ?? row.VehicleID ?? row.Id ?? row.id ?? "") === id);
        if (match) {
          const vehicle = toVehicle(match);
          imageFileId = extractDriveFileId(vehicle.Image);
        }
      } catch {
        // ignore fallback errors; deletion should still proceed
      }
    }

    const deletePayload: Record<string, unknown> = {
      action: "delete",
      VehicleId: id,
      id,
      vehicleId: id,
      token: process.env.APPS_SCRIPT_UPLOAD_TOKEN,
    };
    if (imageFileId) deletePayload.imageFileId = imageFileId;

    const res = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(deletePayload),
      cache: "no-store",
    });

    const data = await res.json();
    if (data.ok === false) {
      return NextResponse.json({ ok: false, error: data.error }, { status: 400 });
    }

    clearCachedVehicles();
    return NextResponse.json({ ok: true, data: data.data ?? null });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
