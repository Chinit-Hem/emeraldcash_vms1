import type { Vehicle } from "@/lib/types";

type VehiclesCache = {
  ts: number;
  data: Vehicle[];
};

let cache: VehiclesCache | null = null;

function cacheTtlMs(): number {
  const raw = process.env.VEHICLES_CACHE_TTL_MS;
  // Default 10 minutes.
  if (!raw) return 10 * 60 * 1000;

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 10 * 60 * 1000;
  return parsed;
}

export function getCachedVehicles(): Vehicle[] | null {
  if (!cache) return null;
  if (cacheTtlMs() === 0) return null;

  const ageMs = Date.now() - cache.ts;
  if (ageMs < cacheTtlMs()) return cache.data;

  cache = null;
  return null;
}

export function setCachedVehicles(data: Vehicle[]): void {
  cache = { ts: Date.now(), data };
}

export function clearCachedVehicles(): void {
  cache = null;
}
