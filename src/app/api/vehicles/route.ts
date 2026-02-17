import crypto from "node:crypto";

import {
  requireSession,
} from "@/lib/auth";
import { getCambodiaNowString, normalizeCambodiaTimeString } from "@/lib/cambodiaTime";
import type { Vehicle, VehicleMeta } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

import { clearCachedVehicles } from "./_cache";
import {
  appsScriptUrl,
  driveFolderIdForCategory,
  driveThumbnailUrl,
  extractDriveFileId,
  fetchAppsScript,
  parseImageDataUrl,
  toAppsScriptPayload,
  toVehicle,
} from "./_shared";

function buildCorsHeaders(req: NextRequest) {
  const appOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN?.trim();
  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL?.trim();
  const vercelOrigin = vercelUrl
    ? vercelUrl.startsWith("http")
      ? vercelUrl
      : `https://${vercelUrl}`
    : "";
  const requestOrigin = req.headers.get("origin") || "";
  const allowedOrigin = appOrigin || vercelOrigin || requestOrigin || "*";

  const headers = new Headers({
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  });

  if (allowedOrigin !== "*") {
    headers.set("Access-Control-Allow-Credentials", "true");
  }

  return headers;
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(req),
  });
}

function noStoreHeaders() {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, private",
    "Pragma": "no-cache",
    "Expires": "0",
  };
}

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

function sanitizeListImageValue(value: unknown): string {
  if (typeof value !== "string") return "";
  const image = value.trim();
  if (!image) return "";

  // Do not send very large inline image payloads to list clients.
  if (image.startsWith("data:image/")) return "";
  if (image.length > 2048) return "";

  return image;
}

// Safe error response helper to prevent circular references
function createErrorResponse(message: string, status: number): NextResponse {
  // Ensure message is a simple string, never an object or circular reference
  const safeMessage = typeof message === "string" ? message : String(message);
  return NextResponse.json(
    { ok: false, error: safeMessage },
    { status, headers: { "Content-Type": "application/json", ...noStoreHeaders() } }
  );
}

export async function GET(req: NextRequest) {
  // Keep `noCache` query support for backwards compatibility with old clients.
  void req.nextUrl.searchParams.get("noCache");
  const lite = req.nextUrl.searchParams.get("lite") === "1";

  const maxRowsParam = req.nextUrl.searchParams.get("maxRows");
  let maxRows: number | null = null;
  if (typeof maxRowsParam === "string" && maxRowsParam.trim()) {
    const parsed = Number.parseInt(maxRowsParam.trim(), 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      maxRows = Math.min(parsed, 5000);
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!baseUrl) {
    return createErrorResponse(
      "Missing NEXT_PUBLIC_API_URL in .env.local / Vercel env vars",
      500
    );
  }

  try {
    const toIntOrNull = (value: unknown): number | null => {
      if (typeof value === "number") return Number.isFinite(value) ? Math.trunc(value) : null;
      if (typeof value !== "string") return null;
      const trimmed = value.trim();
      if (!trimmed) return null;
      const parsed = Number.parseInt(trimmed, 10);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const fetchVehiclesPage = async (offset: number, limit: number) => {
      const url = new URL(appsScriptUrl(baseUrl, "getVehicles"));
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("offset", String(offset));

      const res = await fetch(url.toString(), {
        cache: "no-store",
        next: { revalidate: 0 },
      });

      if (!res.ok) {
        throw new Error(`Apps Script error: ${res.status}`);
      }

      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (json.ok === false) {
        const message = typeof json.error === "string" && json.error.trim() ? json.error.trim() : "Apps Script ok=false";
        throw new Error(message);
      }

      const rows = (Array.isArray(json.data) ? (json.data as unknown[]) : [])
        .filter((row) => row && typeof row === "object") as Record<string, unknown>[];

      const metaRaw = json.meta && typeof json.meta === "object" ? (json.meta as Record<string, unknown>) : null;
      const meta = metaRaw
        ? {
            total: toIntOrNull(metaRaw.total),
            limit: toIntOrNull(metaRaw.limit),
            offset: toIntOrNull(metaRaw.offset),
          }
        : null;

      return { rows, meta };
    };

    // Many Apps Script implementations paginate by default. Fetch all pages (max 500/page).
    const requestedLimit = 500;
    const maxPages = 50; // 50 * 500 = 25k rows safety cap

    let offset = 0;
    let total: number | null = null;
    let lastMetaOffset: number | null = null;
    const allRows: Record<string, unknown>[] = [];
    let pageCount = 0;
    let totalRawRows = 0;
    let totalValidRows = 0;

    for (let page = 0; page < maxPages; page++) {
      const { rows, meta } = await fetchVehiclesPage(offset, requestedLimit);
      pageCount++;
      totalRawRows += rows.length;
      
      // Filter out empty rows (rows with no VehicleId or meaningful data)
      const validRows = rows.filter((row) => {
        const vehicleId = row["VehicleId"] || row["VehicleID"] || row["Id"] || row["id"] || row["#"];
        const hasId = vehicleId !== undefined && vehicleId !== null && String(vehicleId).trim() !== "";
        // Also check if row has at least some meaningful data beyond just an ID
        const hasData = Object.values(row).some(v => v !== undefined && v !== null && v !== "");
        return hasId && hasData;
      });
      
      totalValidRows += validRows.length;
      allRows.push(...validRows);

      if (!meta) {
        // No pagination metadata => assume this is the full list.
        console.log(`[DEBUG] No meta data, breaking after page ${pageCount}. Raw rows: ${totalRawRows}, Valid rows: ${totalValidRows}`);
        break;
      }

      if (meta.total != null && meta.total >= 0) total ??= meta.total;

      const effectiveLimit = meta.limit && meta.limit > 0 ? meta.limit : requestedLimit;
      const effectiveOffset = meta.offset != null && meta.offset >= 0 ? meta.offset : offset;

      // Guard: if offset doesn't move, stop to avoid infinite loops.
      if (lastMetaOffset != null && effectiveOffset === lastMetaOffset) {
        console.log(`[DEBUG] Offset didn't move, breaking. Page: ${pageCount}, Raw: ${totalRawRows}, Valid: ${totalValidRows}`);
        break;
      }
      lastMetaOffset = effectiveOffset;

      if (rows.length === 0) {
        console.log(`[DEBUG] No rows returned, breaking. Page: ${pageCount}`);
        break;
      }
      // Don't break on rows.length < effectiveLimit if we got valid data
      // The backend might return fewer rows than limit but still have more data
      if (rows.length < effectiveLimit && validRows.length === 0) {
        console.log(`[DEBUG] Rows < limit and no valid rows, breaking. Page: ${pageCount}`);
        break;
      }
      if (total != null && allRows.length >= total) {
        console.log(`[DEBUG] Reached total count (${total}), breaking.`);
        break;
      }

      offset = effectiveOffset + effectiveLimit;
      if (total != null && offset >= total) {
        console.log(`[DEBUG] Offset >= total, breaking.`);
        break;
      }
    }

    console.log(`[DEBUG] Fetch complete. Pages: ${pageCount}, Raw rows: ${totalRawRows}, Valid rows: ${totalValidRows}, AllRows: ${allRows.length}`);

    // Additional filtering to ensure no empty/invalid vehicles
    const vehicles = allRows
      .map((row) => toVehicle(row))
      .filter((v) => v.VehicleId && String(v.VehicleId).trim() !== "") as Vehicle[];

    const normalizedVehicles = vehicles.map((vehicle) => {
      const nextImage = sanitizeListImageValue(vehicle.Image);
      if (nextImage === vehicle.Image) return vehicle;
      return { ...vehicle, Image: nextImage };
    });
    
    console.log(`[DEBUG] Final vehicles count: ${normalizedVehicles.length}`);

    // Compute meta from FULL dataset (all vehicles, not just current page)
    // IMPORTANT: total = actual record count, NOT max(ID) or lastRowIndex
    // This ensures KPI "Total Vehicles" matches the actual data count
    const meta: VehicleMeta = {
      total: normalizedVehicles.length,
      countsByCategory: {
        Cars: normalizedVehicles.filter(v => v.Category === "Cars").length,
        Motorcycles: normalizedVehicles.filter(v => v.Category === "Motorcycles").length,
        TukTuks: normalizedVehicles.filter(v => v.Category === "Tuk Tuk").length,
      },
      avgPrice: normalizedVehicles.length > 0
        ? normalizedVehicles.reduce((sum, v) => sum + (v.PriceNew || 0), 0) / normalizedVehicles.length
        : 0,
      noImageCount: normalizedVehicles.filter(v => !v.Image || !extractDriveFileId(v.Image)).length,
      countsByCondition: {
        New: normalizedVehicles.filter(v => v.Condition === "New").length,
        Used: normalizedVehicles.filter(v => v.Condition === "Used").length,
      },
    };

    const limitedVehicles = maxRows ? normalizedVehicles.slice(0, maxRows) : normalizedVehicles;
    const responseVehicles = lite
      ? limitedVehicles.map((vehicle) => {
          const {
            MarketPriceLow,
            MarketPriceMedian,
            MarketPriceHigh,
            MarketPriceSource,
            MarketPriceSamples,
            MarketPriceUpdatedAt,
            MarketPriceConfidence,
            ...rest
          } = vehicle;
          void MarketPriceLow;
          void MarketPriceMedian;
          void MarketPriceHigh;
          void MarketPriceSource;
          void MarketPriceSamples;
          void MarketPriceUpdatedAt;
          void MarketPriceConfidence;
          return rest;
        })
      : limitedVehicles;

    return NextResponse.json({ ok: true, data: responseVehicles, meta }, { headers: noStoreHeaders() });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Fetch failed";
    return createErrorResponse(message, 500);
  }
}

export async function POST(req: NextRequest) {
  const session = requireSession(req);
  if (!session) {
    return createErrorResponse("Invalid or expired session", 401);
  }

  if (session.role !== "Admin") {
    return createErrorResponse("Forbidden", 403);
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!baseUrl) {
    return createErrorResponse(
      "Missing NEXT_PUBLIC_API_URL in .env.local / Vercel env vars",
      500
    );
  }

  // Handle both FormData (new) and JSON (legacy) requests
  let body: Record<string, unknown>;

  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    body = {};
    for (const [key, value] of formData.entries()) {
      body[key] = value;
    }
  } else {
    body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  }

  // Sanitize string inputs
  const safePart = (value: unknown) =>
    sanitizeString(value, 32)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const extensionFromMimeType = (mimeType: string) => {
    const normalized = mimeType.toLowerCase();
    if (normalized === "image/png") return "png";
    if (normalized === "image/webp") return "webp";
    if (normalized === "image/gif") return "gif";
    if (normalized === "image/svg+xml") return "svg";
    return "jpg";
  };

  // Validate required fields
  const category = sanitizeString(body.Category, 50);
  const brand = sanitizeString(body.Brand, 100);
  const model = sanitizeString(body.Model, 100);

  if (!category || !brand || !model) {
    return createErrorResponse("Category, Brand, and Model are required", 400);
  }

  // Validate numeric fields
  const year = sanitizeNumber(body.Year);
  const priceNew = sanitizeNumber(body.PriceNew);

  if (year !== null && (year < 1900 || year > new Date().getFullYear() + 2)) {
    return createErrorResponse("Invalid year", 400);
  }

  if (priceNew !== null && priceNew < 0) {
    return createErrorResponse("Price must be positive", 400);
  }

  try {
    const payload = toAppsScriptPayload(body);
    payload.Time = normalizeCambodiaTimeString(payload.Time) || getCambodiaNowString();

    const imageData = parseImageDataUrl(payload.Image);
    if (imageData) {
      const folderId = driveFolderIdForCategory(payload.Category);
      if (!folderId) {
        return createErrorResponse(
          "Unknown category. Please select Cars, Motorcycles, or Tuk Tuk.",
          400
        );
      }

      const ext = extensionFromMimeType(imageData.mimeType);
      const fileNameId = crypto.randomUUID().split("-")[0];
      const parts = [fileNameId, safePart(payload.Category), safePart(payload.Brand), safePart(payload.Model)].filter(
        Boolean
      );
      const fileName = `${parts.join("-")}.${ext}`;

      // Validate token before sending
      const uploadToken = process.env.APPS_SCRIPT_UPLOAD_TOKEN;
      if (!uploadToken) {
        return createErrorResponse("Server configuration error", 500);
      }

      const uploadRes = await fetchAppsScript(baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "uploadImage",
          folderId,
          category: payload.Category,
          token: uploadToken,
          mimeType: imageData.mimeType,
          fileName,
          data: imageData.base64Data,
        }),
        cache: "no-store",
        timeoutMs: 90000,
      });

      const uploadJson = (await uploadRes.json().catch(() => ({}))) as Record<string, unknown>;
      const uploadOk = uploadRes.ok && (uploadJson?.ok === true || uploadJson?.ok !== false);
      const hasError = typeof uploadJson?.error === "string" && String(uploadJson.error).trim();
      if (!uploadOk || hasError) {
        const message = hasError
          ? String(uploadJson.error).trim()
          : `Image upload failed (${uploadRes.status}).`;
        return createErrorResponse(
          `${message} Your Apps Script must support action=uploadImage to save images into Drive folders.`,
          502
        );
      }

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
        return createErrorResponse(
          "Image upload succeeded but no image URL was returned by Apps Script.",
          502
        );
      }
    }

    const res = await fetchAppsScript(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", data: payload }),
      cache: "no-store",
      timeoutMs: 30000,
    });

    if (!res.ok) {
      return createErrorResponse(`Apps Script error: ${res.status}`, 502);
    }

    const data = await res.json().catch(() => ({}));
    if (data.ok === false) {
      const errorMsg = typeof data.error === "string" ? data.error : "Apps Script returned ok=false";
      return createErrorResponse(errorMsg, 500);
    }

    clearCachedVehicles();
    return NextResponse.json({ ok: true, data: data.data ?? null }, { headers: noStoreHeaders() });
  } catch (e: unknown) {
    const message =
      e instanceof Error && e.name === "AbortError"
        ? "Request to Apps Script timed out. Try again or use a smaller image."
        : e instanceof Error
          ? e.message
          : "Fetch failed";
    return createErrorResponse(message, 502);
  }
}
