import { NextRequest, NextResponse } from "next/server";
import { getCachedVehicles } from "../vehicles/_cache";

interface HealthMetrics {
  timestamp: string;
  status: "healthy" | "degraded" | "unhealthy";
  version: string;
  environment: string;
  cache: {
    status: "hit" | "miss" | "error";
    vehicleCount: number;
    lastUpdated: string | null;
  };
  googleSheets: {
    status: "connected" | "disconnected" | "unknown";
    lastSync: string | null;
    error?: string;
  };
  uptime: number;
}

const START_TIME = Date.now();
let LAST_SYNC_TIME: string | null = null;
let LAST_SYNC_ERROR: string | null = null;

// Update sync status (called by cron job)
function updateSyncStatus(success: boolean, error?: string) {

  if (success) {
    LAST_SYNC_TIME = new Date().toISOString();
    LAST_SYNC_ERROR = null;
  } else {
    LAST_SYNC_ERROR = error || "Unknown error";
  }
}

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Check cache status
    const cachedVehicles = getCachedVehicles();
    const cacheStatus = cachedVehicles ? "hit" : "miss";
    
    // Check Google Sheets connectivity
    let sheetsStatus: "connected" | "disconnected" | "unknown" = "unknown";
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
    
    if (baseUrl) {
      try {
        const testUrl = new URL(baseUrl);
        testUrl.searchParams.set("action", "getVehicles");
        testUrl.searchParams.set("limit", "1");
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const res = await fetch(testUrl.toString(), {
          method: "GET",
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        sheetsStatus = res.ok ? "connected" : "disconnected";
      } catch {
        sheetsStatus = "disconnected";
      }
    }
    
    // Determine overall health
    let status: "healthy" | "degraded" | "unhealthy" = "healthy";
    if (cacheStatus === "miss" && sheetsStatus === "disconnected") {
      status = "unhealthy";
    } else if (cacheStatus === "miss" || sheetsStatus === "disconnected") {
      status = "degraded";
    }
    
    // Calculate uptime
    const uptime = Math.floor((Date.now() - START_TIME) / 1000);
    
    const metrics: HealthMetrics = {
      timestamp: new Date().toISOString(),
      status,
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "dev",
      environment: process.env.VERCEL_ENV || "development",
      cache: {
        status: cacheStatus,
        vehicleCount: cachedVehicles?.length || 0,
        lastUpdated: LAST_SYNC_TIME,
      },
      googleSheets: {
        status: sheetsStatus,
        lastSync: LAST_SYNC_TIME,
        error: LAST_SYNC_ERROR || undefined,
      },
      uptime,
    };
    
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json(metrics, {
      status: status === "healthy" ? 200 : status === "degraded" ? 200 : 503,
      headers: {
        "X-Response-Time": `${responseTime}ms`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        status: "unhealthy",
        error: errorMessage,
      },
      { status: 503 }
    );
  }
}

// Health check for load balancers (simple ping)
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
