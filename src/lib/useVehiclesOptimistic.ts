"use client";

import useSWR, { mutate as globalMutate } from "swr";
import type { Vehicle, VehicleMeta } from "@/lib/types";

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    if (res.status === 401) {
      window.location.href = "/login";
      throw new Error("Unauthorized");
    }
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || `Failed to fetch: ${res.status}`);
  }
  return res.json();
};

interface UseVehiclesOptions {
  category?: string;
  condition?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

interface UseVehiclesReturn {
  vehicles: Vehicle[] | undefined;
  meta: VehicleMeta | undefined;
  isLoading: boolean;
  isValidating: boolean;
  error: Error | undefined;
  mutate: () => Promise<void>;
}

export function useVehicles(options: UseVehiclesOptions = {}): UseVehiclesReturn {
  const { category, condition, q, limit = 100, offset = 0 } = options;

  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (condition) params.set("condition", condition);
  if (q) params.set("q", q);
  params.set("limit", limit.toString());
  params.set("offset", offset.toString());

  const key = `/api/vehicles?${params.toString()}`;

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    key,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      keepPreviousData: true,
    }
  );

  return {
    vehicles: data?.data,
    meta: data?.meta,
    isLoading,
    isValidating,
    error,
    mutate: async () => {
      await mutate();
    },
  };
}

// Optimistic update helpers
export function optimisticUpdateVehicle(
  vehicleId: string,
  updatedData: Partial<Vehicle>,
  options: UseVehiclesOptions = {}
) {
  const { category, condition, q, limit = 100, offset = 0 } = options;

  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (condition) params.set("condition", condition);
  if (q) params.set("q", q);
  params.set("limit", limit.toString());
  params.set("offset", offset.toString());

  const key = `/api/vehicles?${params.toString()}`;

  // Update all matching SWR caches
  globalMutate(
    (cacheKey) => typeof cacheKey === "string" && cacheKey.startsWith("/api/vehicles"),
    (currentData: { data: Vehicle[]; meta?: VehicleMeta } | undefined) => {
      if (!currentData?.data) return currentData;

      return {
        ...currentData,
        data: currentData.data.map((v) =>
          v.VehicleId === vehicleId ? { ...v, ...updatedData } : v
        ),
      };
    },
    { revalidate: false }
  );

  return key;
}

export function optimisticDeleteVehicle(
  vehicleId: string,
  options: UseVehiclesOptions = {}
) {
  const { category, condition, q, limit = 100, offset = 0 } = options;

  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (condition) params.set("condition", condition);
  if (q) params.set("q", q);
  params.set("limit", limit.toString());
  params.set("offset", offset.toString());

  const key = `/api/vehicles?${params.toString()}`;

  // Update all matching SWR caches
  globalMutate(
    (cacheKey) => typeof cacheKey === "string" && cacheKey.startsWith("/api/vehicles"),
    (currentData: { data: Vehicle[]; meta?: VehicleMeta } | undefined) => {
      if (!currentData?.data) return currentData;

      return {
        ...currentData,
        data: currentData.data.filter((v) => v.VehicleId !== vehicleId),
        meta: currentData.meta
          ? {
              ...currentData.meta,
              total: (currentData.meta.total || 1) - 1,
            }
          : undefined,
      };
    },
    { revalidate: false }
  );

  return key;
}

export function rollbackOptimisticUpdate(
  originalVehicle: Vehicle,
  options: UseVehiclesOptions = {}
) {
  optimisticUpdateVehicle(originalVehicle.VehicleId, originalVehicle, options);
}

export function restoreOptimisticDelete(
  originalVehicle: Vehicle,
  options: UseVehiclesOptions = {}
) {
  const { category, condition, q, limit = 100, offset = 0 } = options;

  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (condition) params.set("condition", condition);
  if (q) params.set("q", q);
  params.set("limit", limit.toString());
  params.set("offset", offset.toString());

  // Update all matching SWR caches to restore the vehicle
  globalMutate(
    (cacheKey) => typeof cacheKey === "string" && cacheKey.startsWith("/api/vehicles"),
    (currentData: { data: Vehicle[]; meta?: VehicleMeta } | undefined) => {
      if (!currentData?.data) return currentData;

      // Check if vehicle already exists (shouldn't happen in normal flow)
      if (currentData.data.find((v) => v.VehicleId === originalVehicle.VehicleId)) {
        return currentData;
      }

      return {
        ...currentData,
        data: [...currentData.data, originalVehicle],
        meta: currentData.meta
          ? {
              ...currentData.meta,
              total: (currentData.meta.total || 0) + 1,
            }
          : undefined,
      };
    },
    { revalidate: false }
  );
}

