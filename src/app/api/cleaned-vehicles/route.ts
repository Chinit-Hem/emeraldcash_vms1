import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

// CORS headers
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
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

// GET /api/cleaned-vehicles - Get all cleaned vehicles from Google Sheets
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");
    const category = searchParams.get("category");
    const brand = searchParams.get("brand");

    let query = sql`SELECT * FROM cleaned_vehicles_for_google_sheets WHERE 1=1`;
    
    if (category) {
      query = sql`${query} AND category ILIKE ${`%${category}%`}`;
    }
    
    if (brand) {
      query = sql`${query} AND brand ILIKE ${`%${brand}%`}`;
    }
    
    query = sql`${query} ORDER BY id LIMIT ${limit} OFFSET ${offset}`;
    
    const vehicles = await query;
    
    // Get total count
    const countResult = await sql`SELECT COUNT(*) as count FROM cleaned_vehicles_for_google_sheets`;
    const total = parseInt((countResult as unknown as { count: string }[])[0].count);

    return NextResponse.json({
      success: true,
      data: vehicles,
      meta: {
        total,
        limit,
        offset,
        hasMore: offset + vehicles.length < total,
      },
    }, {
      headers: buildCorsHeaders(req),
    });
    
  } catch (error) {
    console.error("Error fetching cleaned vehicles:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch vehicles",
    }, {
      status: 500,
      headers: buildCorsHeaders(req),
    });
  }
}
