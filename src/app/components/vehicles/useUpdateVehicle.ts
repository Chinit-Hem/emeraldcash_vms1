"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { compressImage } from "@/lib/compressImage";
import { refreshVehicleCache, writeVehicleCache } from "@/lib/vehicleCache";
import type { Vehicle } from "@/lib/types";

interface UpdateVehicleData {
  VehicleId: string;
  [key: string]: string | number | boolean | null | undefined;
}


interface UseUpdateVehicleResult {
  updateVehicle: (data: UpdateVehicleData, imageFile?: File | null) => Promise<boolean>;
  isUpdating: boolean;
  error: string | null;
}

export function useUpdateVehicle(
  onSuccess?: () => void,
  onError?: (error: string) => void
): UseUpdateVehicleResult {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateVehicle = useCallback(
    async (data: UpdateVehicleData, imageFile?: File | null): Promise<boolean> => {
      setIsUpdating(true);
      setError(null);

      try {
        let body: string | FormData;
        const headers: Record<string, string> = {};

        if (imageFile) {
          // Use FormData for image uploads
          const formData = new FormData();
          
          // Add vehicle data
          Object.entries(data).forEach(([key, value]) => {
            if (value != null && key !== "Image") {
              formData.append(key, String(value));
            }
          });

          // Compress and add the image
          const compressedResult = await compressImage(imageFile, {
            maxWidth: 1280,
            quality: 0.75,
            targetMinSizeKB: 250,
            targetMaxSizeKB: 800,
          });
          formData.append("image", compressedResult.file);

          body = formData;
        } else {
          // Use JSON for non-image updates
          headers["Content-Type"] = "application/json";
          body = JSON.stringify(data);
        }

        const res = await fetch(`/api/vehicles/${encodeURIComponent(data.VehicleId)}`, {
          method: "PUT",
          headers,
          body,
          credentials: "include",
        });

        if (res.status === 401) {
          router.push("/login?redirect=" + encodeURIComponent(window.location.pathname));
          return false;
        }

        const json = await res.json().catch(() => ({}));
        
        if (res.status === 403) {
          throw new Error("You don't have permission to update this vehicle");
        }
        
        if (!res.ok || json.ok === false) {
          throw new Error(json.error || "Failed to save vehicle");
        }

        // Refresh cache
        await refreshVehicleCache();

        // Update local cache with new data
        try {
          const cached = localStorage.getItem("vms-vehicles");
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              const index = parsed.findIndex((v: Vehicle) => v.VehicleId === data.VehicleId);
              if (index >= 0) {
                parsed[index] = { ...parsed[index], ...data };
                writeVehicleCache(parsed);
              }
            }
          }
        } catch {
          // Ignore cache errors
        }

        onSuccess?.();
        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to save vehicle";
        setError(errorMessage);
        onError?.(errorMessage);
        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    [router, onSuccess, onError]
  );

  return {
    updateVehicle,
    isUpdating,
    error,
  };
}
