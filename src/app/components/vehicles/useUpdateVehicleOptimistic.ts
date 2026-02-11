"use client";

import { useState, useCallback } from "react";
import { compressImage } from "@/lib/compressImage";
import type { Vehicle } from "@/lib/types";

interface UseUpdateVehicleOptimisticOptions {
  onSuccess?: (vehicle: Vehicle) => void;
  onError?: (error: Error, originalVehicle: Vehicle) => void;
}

interface UseUpdateVehicleOptimisticReturn {
  updateVehicle: (
    vehicleId: string,
    data: Partial<Vehicle>,
    originalVehicle: Vehicle,
    imageFile?: File | null
  ) => Promise<void>;
  isUpdating: boolean;
}

export function useUpdateVehicleOptimistic(
  options: UseUpdateVehicleOptimisticOptions = {}
): UseUpdateVehicleOptimisticReturn {
  const { onSuccess, onError } = options;
  const [isUpdating, setIsUpdating] = useState(false);

  const updateVehicle = useCallback(
    async (
      vehicleId: string,
      data: Partial<Vehicle>,
      originalVehicle: Vehicle,
      imageFile?: File | null
    ): Promise<void> => {
      setIsUpdating(true);

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

        const res = await fetch(`/api/vehicles/${encodeURIComponent(vehicleId)}`, {
          method: "PUT",
          headers,
          body,
          credentials: "include",
        });

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error || `Failed to update vehicle: ${res.status}`);
        }

        const result = await res.json();

        if (!result.ok) {
          throw new Error(result.error || "Failed to update vehicle");
        }

        // Call success callback with updated vehicle
        onSuccess?.({ ...originalVehicle, ...data });
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to update vehicle");
        onError?.(error, originalVehicle);
        throw error;
      } finally {
        setIsUpdating(false);
      }
    },
    [onSuccess, onError]
  );

  return {
    updateVehicle,
    isUpdating,
  };
}

