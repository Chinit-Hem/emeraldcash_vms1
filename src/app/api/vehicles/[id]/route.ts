import { parseSessionCookie, validateSession } from "@/lib/auth";
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
    const res = await fetch(appsScriptUrl(baseUrl, "getVehicles"), { cache: "no-store" });

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `Failed to fetch vehicle: ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();

    if (data.ok === false) {
      return NextResponse.json({ ok: false, error: data.error }, { status: 404 });
    }

    const rows = Array.isArray(data.data) ? (data.data as Record<string, unknown>[]) : [];
    const match = rows.find(
      (row) => row && typeof row === "object" && String((row as Record<string, unknown>).VehicleId) === id
    );

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
        const listRes = await fetch(appsScriptUrl(baseUrl, "getVehicles"), { cache: "no-store" });
        if (listRes.ok) {
          const listJson = await listRes.json().catch(() => ({}));
          const rows = Array.isArray(listJson?.data) ? (listJson.data as Record<string, unknown>[]) : [];
          const match = rows.find(
            (row) =>
              row &&
              typeof row === "object" &&
              String(
                (row as Record<string, unknown>).VehicleId ??
                  (row as Record<string, unknown>).VehicleID ??
                  (row as Record<string, unknown>).Id ??
                  (row as Record<string, unknown>).id ??
                  ""
              ) === id
          );
          if (match) {
            const vehicle = toVehicle(match);
            imageFileId = extractDriveFileId(vehicle.Image);
          }
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
