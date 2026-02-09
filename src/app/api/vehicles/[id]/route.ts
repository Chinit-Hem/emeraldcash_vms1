
import {
  requireSession,
} from "@/lib/auth";
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
  fetchAppsScript,
  toAppsScriptPayload,
  toVehicle
} from "../_shared";


// Input validation helper
function sanitizeString(value: unknown, maxLength = 1000): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function sanitizeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.trim());
    return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
  }
  return null;
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
  // Enhanced debugging for mobile
  const userAgent = req.headers.get("user-agent") || "";
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const mobilePrefix = isMobile ? "[MOBILE] " : "";
  
  // Log all cookies for debugging
  const allCookies = req.cookies.getAll();
  console.log(`[VEHICLE_API] ${mobilePrefix}GET request cookies:`, {
    count: allCookies.length,
    names: allCookies.map(c => c.name),
    hasSession: allCookies.some(c => c.name === "session"),
  });
  
  const session = requireSession(req);
  if (!session) {
    console.log(`[VEHICLE_API] ${mobilePrefix}Session check failed - returning 401`);
    return NextResponse.json({ ok: false, error: "Invalid or expired session" }, { status: 401 });
  }
  
  console.log(`[VEHICLE_API] ${mobilePrefix}Session valid for user: ${session.username}`);

  const { id } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    return NextResponse.json(
      { ok: false, error: "Missing NEXT_PUBLIC_API_URL" },
      { status: 500 }
    );
  }

  // Validate ID format
  const safeId = sanitizeString(id, 100);
  if (!safeId) {
    return NextResponse.json({ ok: false, error: "Invalid vehicle ID" }, { status: 400 });
  }

  try {
    // Fast path: try to fetch just one record (if your Apps Script supports getById).
    try {
      const byIdUrl = new URL(baseUrl);
      byIdUrl.searchParams.set("action", "getById");
      byIdUrl.searchParams.set("id", safeId);

      const byIdRes = await fetch(byIdUrl.toString(), { cache: "no-store" });
      const byIdJson = byIdRes.ok ? await byIdRes.json().catch(() => ({})) : null;

      if (byIdRes.ok && byIdJson && byIdJson.ok !== false && byIdJson.data && typeof byIdJson.data === "object") {
        const vehicle: Vehicle = toVehicle(byIdJson.data as Record<string, unknown>);
        if (!vehicle.VehicleId) vehicle.VehicleId = safeId;
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
      const cached = cachedVehicles.find((vehicle) => vehicle.VehicleId === safeId);
      if (cached) {
        return NextResponse.json({ ok: true, data: cached });
      }
    }

    // Fallback: fetch list and search by id (works with older Apps Script versions).
    const rows = await fetchAllVehicleRows(baseUrl, "no-store");
    const match = rows.find((row) => String(row.VehicleId ?? row.VehicleID ?? row.Id ?? row.id ?? "") === safeId);

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

  // Validate ID format
  const safeId = sanitizeString(id, 100);
  if (!safeId) {
    return NextResponse.json({ ok: false, error: "Invalid vehicle ID" }, { status: 400 });
  }

  try {
    // Handle both FormData (new) and JSON (legacy) requests
    let body: Record<string, unknown>;
    let newImageFile: File | null = null;

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      body = {};
      for (const [key, value] of formData.entries()) {
        if (key === "image" && value instanceof File) {
          newImageFile = value;
        } else {
          body[key] = value;
        }
      }
    } else {
      body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    }

    // Validate numeric fields
    const year = sanitizeNumber(body.Year);
    const priceNew = sanitizeNumber(body.PriceNew);

    if (year !== null && (year < 1900 || year > new Date().getFullYear() + 2)) {
      return NextResponse.json(
        { ok: false, error: "Invalid year" },
        { status: 400 }
      );
    }

    if (priceNew !== null && priceNew < 0) {
      return NextResponse.json(
        { ok: false, error: "Price must be positive" },
        { status: 400 }
      );
    }

    const payload = toAppsScriptPayload(body, { vehicleId: safeId });
    const normalizedTime = normalizeCambodiaTimeString(payload.Time);
    if (normalizedTime) payload.Time = normalizedTime;
    else delete payload.Time;

    // Handle image upload/replacement with optimized performance
    if (newImageFile) {
      const folderId = driveFolderIdForCategory(payload.Category);
      if (!folderId) {
        return NextResponse.json(
          { ok: false, error: "Unknown category. Please select Cars, Motorcycles, or Tuk Tuk." },
          { status: 400 }
        );
      }

      // Validate token early
      const uploadToken = process.env.APPS_SCRIPT_UPLOAD_TOKEN;
      if (!uploadToken) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Missing APPS_SCRIPT_UPLOAD_TOKEN. Add it in Vercel env vars to enable image updates.",
          },
          { status: 500 }
        );
      }

      // Prepare image data (convert to base64 once)
      const fileName = `vehicle_${safeId}.webp`;
      const arrayBuffer = await newImageFile.arrayBuffer();
      const base64Data = Buffer.from(arrayBuffer).toString('base64');

      // Parallel operations: fetch existing vehicle AND prepare upload payload
      const [existingVehicleRes] = await Promise.allSettled([
        // Fetch existing vehicle to check for old image (with shorter timeout)
        fetchAppsScript(new URL(baseUrl).toString() + `?action=getById&id=${encodeURIComponent(safeId)}`, {
          cache: "no-store",
          timeoutMs: 10000
        }).catch(() => null)
      ]);

      // Extract existing file ID if available
      let existingFileId: string | null = null;
      if (existingVehicleRes.status === 'fulfilled' && existingVehicleRes.value) {
        try {
          const byIdJson = await existingVehicleRes.value.json().catch(() => ({}));
          if (byIdJson?.ok !== false && byIdJson?.data && typeof byIdJson.data === "object") {
            const vehicle = toVehicle(byIdJson.data as Record<string, unknown>);
            existingFileId = extractDriveFileId(vehicle.Image);
          }
        } catch {
          // ignore, proceed without deleting existing image
        }
      }

      // Prepare upload payload
      const uploadPayload = {
        action: "uploadImage",
        folderId,
        category: payload.Category,
        token: uploadToken,
        mimeType: "image/webp",
        fileName,
        data: base64Data,
        // Optionally replace existing image in one call if Apps Script supports it
        replaceFileId: existingFileId || undefined,
      };

      // Upload new image (reduced timeout from 90s to 60s)
      const uploadRes = await fetchAppsScript(baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(uploadPayload),
        cache: "no-store",
        timeoutMs: 60000, // Reduced from 90s to 60s
      });

      const uploadJson = (await uploadRes.json().catch(() => ({}))) as Record<string, unknown>;
      const uploadOk = uploadRes.ok && (uploadJson?.ok === true || uploadJson?.ok !== false);
      const hasError = typeof uploadJson?.error === "string" && String(uploadJson.error).trim();

      if (!uploadOk || hasError) {
        const message = hasError
          ? String(uploadJson.error).trim()
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

      // Extract uploaded image URL
      const dataObj = uploadJson?.data && typeof uploadJson.data === "object" ? (uploadJson.data as Record<string, unknown>) : {};
      const uploadedUrlCandidate =
        uploadJson?.url ??
        dataObj?.url ??
        dataObj?.thumbnailUrl ??
        uploadJson?.thumbnailUrl ??
        dataObj?.imageUrl;

      const uploadedFileIdCandidate = uploadJson?.fileId ?? dataObj?.fileId;

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

    const res = await fetchAppsScript(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", id: safeId, data: payload }),
      cache: "no-store",
      timeoutMs: 30000,
    });

    const data = await res.json().catch(() => ({}));

    if (data.ok === false) {
      return NextResponse.json({ ok: false, error: data.error }, { status: 400 });
    }

    clearCachedVehicles();
    return NextResponse.json({ ok: true, data });
  } catch (e: unknown) {
    const message =
      e instanceof Error && e.name === "AbortError"
        ? "Request to Apps Script timed out. Try again or use a smaller image."
        : e instanceof Error
          ? e.message
          : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
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

  // Validate ID format
  const safeId = sanitizeString(id, 100);
  if (!safeId) {
    return NextResponse.json({ ok: false, error: "Invalid vehicle ID" }, { status: 400 });
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
        byIdUrl.searchParams.set("id", safeId);
        const byIdRes = await fetchAppsScript(byIdUrl.toString(), { cache: "no-store", timeoutMs: 15000 });
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
        const match = rows.find((row) => String(row.VehicleId ?? row.VehicleID ?? row.Id ?? row.id ?? "") === safeId);
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
      VehicleId: safeId,
      id: safeId,
      vehicleId: safeId,
    };

    if (imageFileId) {
      // Validate token only when deleting an image
      const uploadToken = process.env.APPS_SCRIPT_UPLOAD_TOKEN;
      if (!uploadToken) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Missing APPS_SCRIPT_UPLOAD_TOKEN. Add it in Vercel env vars to enable image updates.",
          },
          { status: 500 }
        );
      }
      deletePayload.token = uploadToken;
      deletePayload.imageFileId = imageFileId;
    }

    const res = await fetchAppsScript(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(deletePayload),
      cache: "no-store",
      timeoutMs: 30000,
    });

    const data = await res.json().catch(() => ({}));
    if (data.ok === false) {
      const message = typeof data.error === "string" ? data.error : "";
      if (/not\s*found|missing|already\s*deleted/i.test(message)) {
        clearCachedVehicles();
        return NextResponse.json({ ok: true, data: null });
      }
      return NextResponse.json({ ok: false, error: data.error }, { status: 400 });
    }

    clearCachedVehicles();
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
