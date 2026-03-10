import { requireSession } from "@/lib/auth";
import { vehicleService } from "@/services/VehicleService";
import { uploadImage, getCloudinaryFolder } from "@/lib/cloudinary";
import type { Vehicle, VehicleMeta } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { clearCachedVehicles } from "./_cache";

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
  const startTime = Date.now();
  
  // Keep `noCache` query support for backwards compatibility with old clients.
  void req.nextUrl.searchParams.get("noCache");
  const lite = req.nextUrl.searchParams.get("lite") === "1";
  const search = req.nextUrl.searchParams.get("search") || undefined;

  const maxRowsParam = req.nextUrl.searchParams.get("maxRows");
  let maxRows: number | null = null;
  if (typeof maxRowsParam === "string" && maxRowsParam.trim()) {
    const parsed = Number.parseInt(maxRowsParam.trim(), 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      maxRows = Math.min(parsed, 5000);
    }
  }

  try {
    // Fetch vehicles using VehicleService with SSR optimization
    let vehicles: Vehicle[];
    
    if (search) {
      // Search vehicles using case-insensitive ILIKE
      const searchResult = await vehicleService.searchVehicles(search, maxRows || undefined);
      if (!searchResult.success || !searchResult.data) {
        throw new Error(searchResult.error || "Search failed");
      }
      vehicles = searchResult.data;
    } else {
      // Get vehicles with database-level limit if maxRows specified
      // Uses case-insensitive ILIKE filtering via VehicleService
      const vehiclesResult = await vehicleService.getVehicles(
        maxRows ? { limit: maxRows } : undefined
      );
      if (!vehiclesResult.success || !vehiclesResult.data) {
        throw new Error(vehiclesResult.error || "Failed to fetch vehicles");
      }
      vehicles = vehiclesResult.data;
    }

    // Sanitize image values for list view
    const normalizedVehicles = vehicles.map((vehicle) => {
      const nextImage = sanitizeListImageValue(vehicle.Image);
      if (nextImage === vehicle.Image) return vehicle;
      return { ...vehicle, Image: nextImage };
    });

    // Get stats from database using VehicleService
    // Use lite version when in lite mode for better performance
    let stats;
    if (lite) {
      // Lite mode: only get total count, skip expensive aggregations
      const statsResult = await vehicleService.getVehicleStatsLite();
      if (!statsResult.success || !statsResult.data) {
        throw new Error(statsResult.error || "Failed to fetch stats");
      }
      stats = { total: statsResult.data.total };
    } else {
      // Full mode: get all stats including category/condition breakdowns
      const statsResult = await vehicleService.getVehicleStats();
      if (!statsResult.success || !statsResult.data) {
        throw new Error(statsResult.error || "Failed to fetch stats");
      }
      stats = statsResult.data;
    }

    // Compute meta from FULL dataset
    const meta: VehicleMeta = {
      total: stats.total,
      countsByCategory: 'byCategory' in stats ? stats.byCategory : {},
      avgPrice: 'avgPrice' in stats ? stats.avgPrice : 0,
      noImageCount: normalizedVehicles.filter(v => !v.Image).length,
      countsByCondition: 'byCondition' in stats ? stats.byCondition : { New: 0, Used: 0, Other: 0 },
    };

    // maxRows already applied at DB level, but apply again in case search was used
    const limitedVehicles = maxRows && search ? normalizedVehicles.slice(0, maxRows) : normalizedVehicles;
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

    const duration = Date.now() - startTime;
    console.log(`[GET /api/vehicles] Success: ${responseVehicles.length} vehicles, lite=${lite}, ${duration}ms`);

    return NextResponse.json({ ok: true, data: responseVehicles, meta }, { headers: noStoreHeaders() });
  } catch (e: unknown) {
    const duration = Date.now() - startTime;
    const message = e instanceof Error ? e.message : "Fetch failed";
    console.error(`[GET /api/vehicles] Error after ${duration}ms:`, message);
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

  // Validate required fields
  const category = sanitizeString(body.Category, 50) || sanitizeString(body.category, 50);
  const brand = sanitizeString(body.Brand, 100) || sanitizeString(body.brand, 100);
  const model = sanitizeString(body.Model, 100) || sanitizeString(body.model, 100);

  if (!category || !brand || !model) {
    return createErrorResponse("Category, Brand, and Model are required", 400);
  }

  // Validate numeric fields
  const year = sanitizeNumber(body.Year ?? body.year);
  const marketPrice = sanitizeNumber(body.PriceNew ?? body.MarketPrice ?? body.market_price);

  if (year !== null && (year < 1900 || year > new Date().getFullYear() + 2)) {
    return createErrorResponse("Invalid year", 400);
  }

  if (marketPrice !== null && marketPrice < 0) {
    return createErrorResponse("Price must be positive", 400);
  }

  try {
    // Handle image upload if provided
    let imageId = sanitizeString(body.ImageId ?? body.image_id, 2048);
    // Check for image data in various field names (Image from form, imageData/image_data from JSON)
    const imageData = body.imageData || body.image_data || body.Image;

    if (imageData && typeof imageData === "string" && imageData.startsWith("data:image/")) {
      // Upload to Cloudinary with automatic folder selection based on category
      const targetFolder = getCloudinaryFolder(category);
      const uploadResult = await uploadImage(imageData, {
        folder: targetFolder,
        publicId: `vehicle_${Date.now()}`,
        tags: [category, brand, model].filter(Boolean),
      });

      if (!uploadResult.success) {
        return createErrorResponse(`Image upload failed: ${uploadResult.error}`, 502);
      }

      imageId = uploadResult.url || imageId;
    }

    // Prepare vehicle data for database (matching cleaned_vehicles_for_google_sheets schema)
    const vehicleData = {
      category,
      brand,
      model,
      year: year || new Date().getFullYear(),
      plate: sanitizeString(body.Plate ?? body.plate, 20),
      market_price: marketPrice || 0,
      tax_type: sanitizeString(body.TaxType ?? body.tax_type, 50),
      condition: sanitizeString(body.Condition ?? body.condition, 20) || "New",
      body_type: sanitizeString(body.BodyType ?? body.body_type, 50),
      color: sanitizeString(body.Color ?? body.color, 50),
      image_id: imageId,
    };

    // Create vehicle in database using VehicleService
    const createResult = await vehicleService.createVehicle(vehicleData);
    
    if (!createResult.success || !createResult.data) {
      throw new Error(createResult.error || "Failed to create vehicle");
    }

    const newVehicle = createResult.data;

    // Clear server-side cache and revalidate
    clearCachedVehicles();
    
    // Revalidate Next.js cache tags
    try {
      revalidateTag('vehicles', {});
      console.log("[POST /api/vehicles] Revalidated vehicles tag");
    } catch (e) {
      console.error("[POST /api/vehicles] Failed to revalidate:", e);
    }
    
    return NextResponse.json({ 
      ok: true, 
      data: newVehicle
    }, { headers: noStoreHeaders() });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to create vehicle";
    console.error("[POST /api/vehicles] Error:", message);
    return createErrorResponse(message, 500);
  }
}
