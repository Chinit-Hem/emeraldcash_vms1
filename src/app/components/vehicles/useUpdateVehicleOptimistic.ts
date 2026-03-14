"use client";

import { useState, useCallback } from "react";
import { compressImage } from "@/lib/clientImageCompression";
import { getCloudinaryFolder } from "@/lib/cloudinary-folders";
import { recordMutation } from "@/lib/vehicleCache";
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

// Maximum retry attempts for transient errors
const MAX_RETRY_ATTEMPTS = 2; // Reduced from 3 for faster failure
const RETRY_DELAY_MS = 500; // Reduced from 1000 for faster retry
const MAX_CLOUDINARY_RETRIES = 1; // Reduced from 2
const CLOUDINARY_RETRY_DELAY = 300; // Reduced from 500

// Image compression settings - optimized for speed
const COMPRESSION_MAX_WIDTH = 800; // Reduced from 1280 for faster processing
const COMPRESSION_QUALITY = 0.7; // Reduced from 0.75 for faster processing

// Server-side upload configuration - uses /api/upload endpoint
// This keeps Cloudinary credentials secure on the server
const UPLOAD_API_URL = '/api/upload';

// Helper function to delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to check if error is retryable
const isRetryableError = (error: Error): boolean => {
  const message = error.message.toLowerCase();
  const has502 = message.includes('502') || message.includes('[http 502]');
  const has504 = message.includes('504') || message.includes('[http 504]');
  const hasTimeout = message.includes('timeout');
  const hasNetworkError = message.includes('network') || 
                          message.includes('econnreset') ||
                          message.includes('econnrefused') ||
                          message.includes('socket hang up');
  
  const statusCode = (error as Error & { statusCode?: number }).statusCode;
  const isRetryableStatus = statusCode === 502 || statusCode === 504 || statusCode === 503;
  
  return has502 || has504 || hasTimeout || hasNetworkError || isRetryableStatus;
};

/**
 * Upload image file to Cloudinary using unsigned upload preset with retry logic
 */
async function uploadImageToCloudinaryWithRetry(
  file: File,
  category: string,
  vehicleId: string,
  maxRetries: number = MAX_CLOUDINARY_RETRIES
): Promise<string> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      console.log(`[uploadImageToCloudinary] Attempt ${attempt}/${maxRetries + 1}`);
      const result = await uploadImageToCloudinary(file, category, vehicleId);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown upload error");
      
      // Don't retry on configuration errors
      if (lastError.message.includes('configuration error') || 
          lastError.message.includes('Upload Preset Error') ||
          lastError.message.includes('Cloud Name Error')) {
        throw lastError;
      }
      
      if (attempt <= maxRetries) {
        console.log(`[uploadImageToCloudinary] Retrying after ${CLOUDINARY_RETRY_DELAY}ms...`);
        await delay(CLOUDINARY_RETRY_DELAY * attempt); // Exponential backoff
      }
    }
  }
  
  throw lastError || new Error("Cloudinary upload failed after retries");
}

/**
 * Upload image file to Cloudinary via server-side API endpoint
 * This keeps Cloudinary credentials secure on the server
 */
async function uploadImageToCloudinary(
  file: File,
  category: string,
  vehicleId: string
): Promise<string> {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("vehicleId", vehicleId);
  formData.append("category", category);

  console.log(`[uploadImageToCloudinary] Uploading via server API:`, {
    url: UPLOAD_API_URL,
    vehicleId,
    category,
    fileSize: `${(file.size / 1024).toFixed(2)}KB`,
  });

  const response = await fetch(UPLOAD_API_URL, {
    method: "POST",
    body: formData,
    credentials: "include", // Include cookies for authentication
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error || errorData.details || `Upload failed: ${response.status}`;
    
    console.error('[uploadImageToCloudinary] Server upload error:', {
      status: response.status,
      error: errorMessage,
      errorData,
    });
    
    throw new Error(errorMessage);
  }

  const result = await response.json();
  
  if (!result.ok || !result.data?.url) {
    throw new Error("Server response missing image URL");
  }

  console.log(`[uploadImageToCloudinary] Success:`, {
    url: result.data.url.substring(0, 100) + "...",
    publicId: result.data.publicId,
    folder: result.data.folder,
  });

  return result.data.url;
}

/**
 * Convert Base64 string to File object
 */
function base64ToFile(base64String: string, filename: string): File {
  const arr = base64String.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
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

      console.log(`[updateVehicle] Starting update for vehicle ${vehicleId}`, {
        hasImageFile: !!imageFile,
        hasImageInData: !!data.Image,
        imageType: data.Image ? (data.Image.startsWith("data:image/") ? "base64" : "url") : "none",
      });

      let lastError: Error | null = null;
      let attempts = 0;
      let cloudinaryImageUrl: string | null = null;

      // Step 1: Handle image upload to Cloudinary (OUTSIDE retry loop - do this once)
      try {
        // Case A: We have a File object from file input
        if (imageFile) {
          console.log(`[updateVehicle] Compressing image file...`);
          
          const compressedResult = await compressImage(imageFile, {
            maxWidth: COMPRESSION_MAX_WIDTH,
            quality: COMPRESSION_QUALITY,
          });
          
          console.log(`[updateVehicle] Image compressed:`, {
            originalSize: `${(imageFile.size / 1024).toFixed(2)}KB`,
            compressedSize: `${(compressedResult.compressedSize / 1024).toFixed(2)}KB`,
          });

          console.log(`[updateVehicle] Uploading compressed image to Cloudinary...`);
          cloudinaryImageUrl = await uploadImageToCloudinaryWithRetry(
            compressedResult.file,
            data.Category || originalVehicle.Category || "Cars",
            vehicleId
          );
          
          console.log(`[updateVehicle] Cloudinary upload complete:`, {
            url: cloudinaryImageUrl.substring(0, 100) + "...",
          });
        }
        // Case B: We have a Base64 string in data.Image
        else if (data.Image && data.Image.startsWith("data:image/")) {
          console.log(`[updateVehicle] Converting Base64 to File and uploading to Cloudinary...`);
          
          const fileFromBase64 = base64ToFile(data.Image, `vehicle_${vehicleId}_${Date.now()}.jpg`);
          
          console.log(`[updateVehicle] Base64 converted to File:`, {
            size: `${(fileFromBase64.size / 1024).toFixed(2)}KB`,
          });

          cloudinaryImageUrl = await uploadImageToCloudinaryWithRetry(
            fileFromBase64,
            data.Category || originalVehicle.Category || "Cars",
            vehicleId
          );
          
          console.log(`[updateVehicle] Cloudinary upload complete:`, {
            url: cloudinaryImageUrl.substring(0, 100) + "...",
          });
        }
        // Case C: We have an existing URL in data.Image
        else if (data.Image && (data.Image.startsWith("http://") || data.Image.startsWith("https://"))) {
          console.log(`[updateVehicle] Using existing URL:`, {
            url: data.Image.substring(0, 100) + "...",
          });
          cloudinaryImageUrl = data.Image;
        }
      } catch (uploadError) {
        console.error(`[updateVehicle] Image upload failed:`, uploadError);
        setIsUpdating(false);
        const error = uploadError instanceof Error ? uploadError : new Error("Image upload failed");
        onError?.(error, originalVehicle);
        throw error;
      }

      // Step 2: Validate image upload result
      // CRITICAL: If an image was provided but upload failed, block update
      const imageWasProvided = !!imageFile || (data.Image && data.Image.startsWith("data:image/"));
      const imageUploadFailed = imageWasProvided && !cloudinaryImageUrl;
      const imageUrlIsInvalid = cloudinaryImageUrl === "undefined" || 
                                cloudinaryImageUrl === "null" || 
                                (cloudinaryImageUrl && cloudinaryImageUrl.includes("/undefined"));

      if (imageUploadFailed || imageUrlIsInvalid) {
        console.error(`[updateVehicle] Image upload failed or returned invalid URL:`, {
          cloudinaryImageUrl,
          imageWasProvided,
          imageUploadFailed,
          imageUrlIsInvalid,
        });
        setIsUpdating(false);
        const error = new Error(
          imageUrlIsInvalid 
            ? "Image upload returned an invalid URL. Please try uploading the image again."
            : "Image upload failed. Please check your internet connection and try again."
        );
        onError?.(error, originalVehicle);
        throw error;
      }

      // Step 3: Prepare payload with Cloudinary URL (never send Base64)
      const payload: Record<string, unknown> = {
        id: vehicleId,
        category: data.Category || originalVehicle.Category,
        brand: data.Brand || originalVehicle.Brand,
        model: data.Model || originalVehicle.Model,
        year: data.Year || originalVehicle.Year,
        plate: data.Plate || originalVehicle.Plate,
        color: data.Color || originalVehicle.Color,
        condition: data.Condition || originalVehicle.Condition,
        body_type: data.BodyType || originalVehicle.BodyType,
        tax_type: data.TaxType || originalVehicle.TaxType,
        market_price: data.PriceNew || originalVehicle.PriceNew,
      };

      // Only add image_id if we have a valid Cloudinary URL
      // CRITICAL: Never send Base64 strings to the API - they cause 502/503 errors
      if (cloudinaryImageUrl && 
          (cloudinaryImageUrl.startsWith('http://') || 
           cloudinaryImageUrl.startsWith('https://'))) {
        // Double-check that we're not accidentally sending a Base64 string
        if (cloudinaryImageUrl.startsWith('data:image/')) {
          console.error(`[updateVehicle] CRITICAL: Attempted to send Base64 in payload! Blocking.`);
          setIsUpdating(false);
          const error = new Error("Image upload failed: Invalid image format detected. Please try again.");
          onError?.(error, originalVehicle);
          throw error;
        }
        payload.image_id = cloudinaryImageUrl;
        console.log(`[updateVehicle] Payload will include Cloudinary URL`);
      } else {
        console.log(`[updateVehicle] No image to save - payload has no image_id`);
      }

      // Remove undefined values
      Object.keys(payload).forEach(key => {
        if (payload[key] === undefined) {
          delete payload[key];
        }
      });

      // Final safety check: ensure no Base64 data in any payload field
      const payloadString = JSON.stringify(payload);
      if (payloadString.includes('data:image/')) {
        console.error(`[updateVehicle] CRITICAL: Base64 detected in payload! Aborting.`);
        setIsUpdating(false);
        const error = new Error("Image upload failed: Base64 data detected in payload. Please try again.");
        onError?.(error, originalVehicle);
        throw error;
      }

      // Step 3: Send to API with retry logic (only for the API call, not upload)
      while (attempts < MAX_RETRY_ATTEMPTS) {
        attempts++;
        
        console.log(`[updateVehicle] API call attempt ${attempts}/${MAX_RETRY_ATTEMPTS}`);

        try {
          const res = await fetch(`/api/vehicles/${encodeURIComponent(vehicleId)}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
            credentials: "include",
          });

          console.log(`[updateVehicle] API response status: ${res.status}`);

          if (!res.ok) {
            const json = await res.json().catch(() => ({}));
            const errorMessage = json.error || `Failed to update vehicle: ${res.status}`;
            throw new Error(`[HTTP ${res.status}] ${errorMessage}`);
          }

          const result = await res.json();

          if (!result.ok) {
            throw new Error(result.error || "API returned error");
          }

          const updatedVehicle = result.data || { ...originalVehicle, ...data, Image: cloudinaryImageUrl };
          
          console.log(`[updateVehicle] Update successful for vehicle ${vehicleId}`);

          // Record mutation to trigger auto-refresh
          recordMutation();
          console.log(`[updateVehicle] Mutation recorded - VehicleList will auto-refresh`);

          // Call success callback
          onSuccess?.(updatedVehicle);
          
          setIsUpdating(false);
          return;
          
        } catch (err) {
          lastError = err instanceof Error ? err : new Error("Failed to update vehicle");
          
          console.error(`[updateVehicle] API error on attempt ${attempts}:`, lastError.message);

          // Check if we should retry
          if (attempts < MAX_RETRY_ATTEMPTS && isRetryableError(lastError)) {
            const retryDelay = RETRY_DELAY_MS * Math.pow(2, attempts - 1);
            console.log(`[updateVehicle] Retrying after ${retryDelay}ms...`);
            await delay(retryDelay);
            continue;
          }
          
          break;
        }
      }

      // All retries exhausted
      setIsUpdating(false);
      
      if (lastError) {
        const enhancedError = new Error(
          `${lastError.message}\n\n(Attempted ${attempts} time${attempts > 1 ? 's' : ''})`
        );
        onError?.(enhancedError, originalVehicle);
        throw enhancedError;
      }
    },
    [onSuccess, onError]
  );

  return {
    updateVehicle,
    isUpdating,
  };
}
