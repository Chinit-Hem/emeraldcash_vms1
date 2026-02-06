"use client";

/// <reference types="react" />
/// <reference path="../../../../../types/jsx-global.d.ts" />
import { useAuthUser } from "@/app/components/AuthContext";
import ImageZoom from "@/app/components/ImageZoom";
import { MarketPriceButton } from "@/app/components/MarketPriceButton";
import { compressImage, formatFileSize } from "@/lib/compressImage";
import { fileToDataUrl } from "@/lib/fileToDataUrl";
import { derivePrices } from "@/lib/pricing";
import type { Vehicle } from "@/lib/types";
import { COLOR_OPTIONS, PLATE_NUMBER_HINTS, PLATE_NUMBER_MAX_LENGTH, TAX_TYPE_METADATA } from "@/lib/types";
import { tokenizeQuery, vehicleSearchText } from "@/lib/vehicleSearch";
import { refreshVehicleCache, writeVehicleCache } from "@/lib/vehicleCache";
import { useParams, useRouter } from "next/navigation";
import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

const CATEGORY_OPTIONS = ["Cars", "Motorcycles", "Tuk Tuk"] as const;
const EDIT_DRAFT_PREFIX = "vms.editVehicleDraft.v1:";

export default function EditVehiclePage() {
  return <EditVehicleInner />;
}

function EditVehicleInner() {
  const router = useRouter();
  const user = useAuthUser();
  const isAdmin = user.role === "Admin";
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false); // Background refresh only
  const [error, setError] = useState("");
  const [jumpQuery, setJumpQuery] = useState("");
  const [formData, setFormData] = useState<Partial<Vehicle>>({});

  const [imageLoading, setImageLoading] = useState(false);
  const [uploadedImageFile, setUploadedImageFile] = useState<File | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [autoUpdateMarketPrice, setAutoUpdateMarketPrice] = useState(false);
  const loadedVehicleIdRef = useRef<string | null>(null);

  const currentIndex = useMemo(() => vehicles.findIndex((v) => v.VehicleId === id), [id, vehicles]);
  const currentVehicle = currentIndex >= 0 ? vehicles[currentIndex] : null;
  const categoryValue = String(formData.Category ?? currentVehicle?.Category ?? "").trim();
  const categoryOptions =
    categoryValue && !CATEGORY_OPTIONS.includes(categoryValue as (typeof CATEGORY_OPTIONS)[number])
      ? [categoryValue, ...CATEGORY_OPTIONS]
      : [...CATEGORY_OPTIONS];

  const searchIndex = useMemo(() => {
    const map = new Map<string, string>();
    for (const vehicle of vehicles) {
      map.set(vehicle.VehicleId, vehicleSearchText(vehicle));
    }
    return map;
  }, [vehicles]);

  const deferredJumpQuery = useDeferredValue(jumpQuery);
  const jumpTokens = useMemo(() => tokenizeQuery(deferredJumpQuery), [deferredJumpQuery]);
  const jumpResults = useMemo(() => {
    if (jumpTokens.length === 0) return [];

    return vehicles
      .filter((v) => v.VehicleId !== id)
      .filter((vehicle) => {
        const haystack = searchIndex.get(vehicle.VehicleId) ?? vehicleSearchText(vehicle);
        return jumpTokens.every((token) => haystack.includes(token));
      })
      .slice(0, 8);
  }, [vehicles, id, jumpTokens, searchIndex]);

  // Load from cache immediately on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem("vms-vehicles");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setVehicles(parsed as Vehicle[]);
        }
      }
    } catch {
      // Ignore cache errors
    }
  }, []);

  // Fetch fresh data in background
  useEffect(() => {
    let alive = true;

    async function fetchVehicles() {
      setIsRefreshing(true);
      try {
        const res = await fetch("/api/vehicles", { cache: "no-store" });
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch vehicles");
        const data = await res.json();
        if (!alive) return;
        const nextVehicles = (data.data || []) as Vehicle[];
        setVehicles(nextVehicles);
        // Save to localStorage
        try {
          localStorage.setItem("vms-vehicles", JSON.stringify(nextVehicles));
        } catch {
          // Ignore storage errors
        }
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "Error loading vehicles");
      } finally {
        if (alive) setIsRefreshing(false);
      }
    }

    fetchVehicles();
    return () => {
      alive = false;
    };
  }, [router]);

  useEffect(() => {
    if (!currentVehicle || !id) return;
    if (loadedVehicleIdRef.current === id) return;
    loadedVehicleIdRef.current = id;

    // Reset uploaded image file when loading a new vehicle
    setUploadedImageFile(null);

    let next: Partial<Vehicle> = currentVehicle;
    try {
      const raw = sessionStorage.getItem(`${EDIT_DRAFT_PREFIX}${id}`);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (parsed && typeof parsed === "object") {
          next = { ...currentVehicle, ...(parsed as Partial<Vehicle>) };
        }
      }
    } catch {
      // ignore invalid draft
    }

    setFormData(next);
  }, [currentVehicle, id]);

  useEffect(() => {
    if (!id) return;
    if (loadedVehicleIdRef.current !== id) return;

    const timeout = window.setTimeout(() => {
      try {
        const draft: Partial<Vehicle> = { ...formData };
        if (typeof draft.Image === "string" && draft.Image.trim().startsWith("data:")) {
          // Avoid storing large base64 images in sessionStorage.
          draft.Image = "";
        }
        sessionStorage.setItem(`${EDIT_DRAFT_PREFIX}${id}`, JSON.stringify(draft));
      } catch {
        // ignore storage errors
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [formData, id]);

  const goToIndex = (index: number) => {
    const next = vehicles[index];
    if (!next) return;
    router.push(`/vehicles/${encodeURIComponent(next.VehicleId)}/edit`);
  };

  const handlePrevious = () => {
    if (currentIndex > 0) goToIndex(currentIndex - 1);
  };

  const handleNext = () => {
    if (currentIndex >= 0 && currentIndex < vehicles.length - 1) goToIndex(currentIndex + 1);
  };

  const handleChange = (field: keyof Vehicle, value: string | number | null) => {
    setSuccessMessage(""); // Clear success message when editing
    setFormData((prev) => {
      const next: Partial<Vehicle> = { ...prev, [field]: value };
      if (field === "PriceNew") {
        // Validate: price must be positive
        const rawValue = typeof value === "number" ? value : (typeof value === "string" ? Number.parseFloat(value) : NaN);
        const priceNew = Number.isFinite(rawValue) && rawValue > 0 ? rawValue : null;
        const derived = derivePrices(priceNew);
        next.PriceNew = priceNew;
        next.Price40 = derived.Price40;
        next.Price70 = derived.Price70;
      }
      return next;
    });
  };

  /**
   * Handle market price update from MarketPriceButton
   */
  const handleMarketPriceUpdate = () => {
    // Intentionally ignore; MarketPriceButton already updates the sheet
    // and we perform auto-update on save. Kept for future extension.
  };

  /**
   * Update market price in Google Sheets
   */
  // Note: market price updates are handled by `MarketPriceButton` which
  // performs the Apps Script update. The local helper was unused and
  // removed to satisfy lint rules.

  const handleSave = async () => {
    if (!currentVehicle || !id) return;

    // Optimistic update: update cache and show success immediately
    const updatedVehicle: Vehicle = {
      ...currentVehicle,
      ...(formData as Vehicle),
      VehicleId: currentVehicle.VehicleId,
    };
    setVehicles((prev) => {
      const nextVehicles = prev.map((vehicle) =>
        vehicle.VehicleId === updatedVehicle.VehicleId ? updatedVehicle : vehicle
      );
      writeVehicleCache(nextVehicles);
      return nextVehicles;
    });

    try {
      sessionStorage.removeItem(`${EDIT_DRAFT_PREFIX}${id}`);
    } catch {
      // ignore
    }

    setSuccessMessage("Vehicle saved successfully!");

    // Clear uploaded image file after optimistic save
    setUploadedImageFile(null);

    // Perform API call in background
    (async () => {
      try {
        let body: string | FormData;
        const headers: Record<string, string> = {};

        if (uploadedImageFile) {
          // Use FormData for image uploads
          const formDataToSend = new FormData();

          // Add vehicle data
          Object.entries(formData).forEach(([key, value]) => {
            if (value != null && key !== 'Image') { // Don't include the data URL in FormData
              formDataToSend.append(key, String(value));
            }
          });
          formDataToSend.append("VehicleId", id);

          // Compress and add the image
          const compressedResult = await compressImage(uploadedImageFile, {
            maxWidth: 1280,
            quality: 0.75,
            targetMinSizeKB: 250,
            targetMaxSizeKB: 800,
          });
          formDataToSend.append("image", compressedResult.file);

          body = formDataToSend;
        } else {
          // Use JSON for non-image updates
          headers["Content-Type"] = "application/json";
          body = JSON.stringify({ ...formData, VehicleId: id });
        }

        const res = await fetch(`/api/vehicles/${encodeURIComponent(id)}`, {
          method: "PUT",
          headers,
          body,
        });

        if (res.status === 401) {
          router.push("/login");
          return;
        }

        const json = await res.json().catch(() => ({}));
        if (res.status === 403) throw new Error("Forbidden");
        if (!res.ok || json.ok === false) throw new Error(json.error || "Failed to save vehicle");

        await refreshVehicleCache();

        // Auto-update market price if enabled
        if (autoUpdateMarketPrice && currentVehicle) {
          try {
            const params = new URLSearchParams({
              category: currentVehicle.Category || "",
              brand: currentVehicle.Brand || "",
              model: currentVehicle.Model || "",
            });
            if (currentVehicle.Year) {
              params.append("year", currentVehicle.Year.toString());
            }

            const priceRes = await fetch(`/api/market-price/fetch?${params.toString()}`);
            if (priceRes.ok) {
              const priceData = await priceRes.json();
              if (priceData.ok && priceData.data) {
                const result = priceData.data;
                await fetch("/api/market-price/update", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    vehicleId: currentVehicle.VehicleId,
                    marketData: {
                      priceLow: result.priceLow,
                      priceMedian: result.priceMedian,
                      priceHigh: result.priceHigh,
                      source: result.sources?.[0] || "khmer24.com",
                      samples: result.sampleCount || 0,
                      confidence: result.confidence || "Low",
                    },
                  }),
                });
              }
            }
          } catch (err) {
            console.warn("Auto-update market price failed:", err);
          }
        }

        // Success: cache already refreshed optimistically
      } catch (err) {
        // On failure, show error but don't block user
        setSuccessMessage("");
        alert(`Failed to save vehicle: ${err instanceof Error ? err.message : "Unknown error"}. Please try again.`);
        // Optionally, revert optimistic update
        setVehicles((prev) => {
          const revertedVehicles = prev.map((vehicle) =>
            vehicle.VehicleId === currentVehicle.VehicleId ? currentVehicle : vehicle
          );
          writeVehicleCache(revertedVehicles);
          return revertedVehicles;
        });
        refreshVehicleCache();
      }
    })();
  };

  if (error && vehicles.length === 0) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto ec-glassPanel rounded-2xl shadow-xl ring-1 ring-black/5 p-6 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto ec-glassPanel rounded-2xl shadow-xl ring-1 ring-black/5 p-8">
          <h1 className="text-2xl font-bold text-gray-900">Forbidden</h1>
          <p className="text-gray-600 mt-2">Only Admin can edit vehicles.</p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => router.back()}
              className="px-5 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition font-medium"
            >
              Back
            </button>
            {id ? (
              <button
                onClick={() => router.push(`/vehicles/${encodeURIComponent(id)}/view`)}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                View Vehicle
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (!currentVehicle) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto ec-glassPanel rounded-2xl shadow-xl ring-1 ring-black/5 p-6 text-center text-gray-700">
          {vehicles.length === 0 ? "No vehicles found" : `Vehicle "${id}" not found`}
        </div>
      </div>
    );
  }

  const imageUrl = (formData.Image ?? currentVehicle.Image) as string;

  const jumpTo = (vehicleId: string) => {
    setJumpQuery("");
    router.push(`/vehicles/${encodeURIComponent(vehicleId)}/edit`);
  };

  const handleImageFile = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      alert("Image too large (max 4MB)");
      return;
    }

    setImageLoading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      setFormData((prev) => ({ ...prev, Image: dataUrl }));
      setUploadedImageFile(file);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to load image");
    } finally {
      setImageLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto ec-glassPanel rounded-2xl shadow-xl ring-1 ring-black/5 p-4 sm:p-6 lg:p-8">
        {/* Success Message Banner */}
        {successMessage ? (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-green-600"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span className="text-green-800 font-medium">{successMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessMessage("")}
              className="text-green-600 hover:text-green-800 transition"
              aria-label="Dismiss success message"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M18 6 6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : null}

        {/* Header with Navigation */}
        <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-start mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">
              Edit: {currentVehicle.Brand} {currentVehicle.Model}
            </h1>
            <p className="text-gray-600 mt-2 flex items-center gap-2">
              <span>Vehicle {currentIndex + 1} of {vehicles.length}</span>
              {isRefreshing && (
                <span className="flex items-center gap-1 text-xs text-blue-600">
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Syncing...
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrevious}
              disabled={currentIndex <= 0}
              className="ec-glassBtnSecondary px-6 py-2"
            >
              ← Previous
            </button>
            <button
              onClick={handleNext}
              disabled={currentIndex === -1 || currentIndex >= vehicles.length - 1}
              className="ec-glassBtnSecondary px-6 py-2"
            >
              Next →
            </button>
          </div>
        </div>

        {/* Quick Search */}
        <div className="mb-8 print:hidden">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search vehicles to edit
          </label>
          <div className="relative">
            <input
              type="text"
              value={jumpQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setJumpQuery(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter" && jumpResults[0]) {
                  e.preventDefault();
                  jumpTo(jumpResults[0].VehicleId);
                }
              }}
              placeholder="Type brand, model, plate, year..."
              className="ec-input w-full pl-4 pr-12 placeholder:text-gray-400"
            />
            {jumpQuery ? (
              <button
                type="button"
                onClick={() => setJumpQuery("")}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="M18 6 6 18" />
                  <path d="M6 6l12 12" />
                </svg>
              </button>
            ) : null}

            {jumpTokens.length > 0 ? (
              <div className="absolute z-10 mt-2 w-full rounded-lg border border-gray-200 ec-glassPanel shadow-lg overflow-hidden">
                {jumpResults.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-600">No matches</div>
                ) : (
                  jumpResults.map((v) => (
                    <button
                      key={v.VehicleId}
                      type="button"
                      onClick={() => jumpTo(v.VehicleId)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition"
                    >
                      <div className="text-sm font-semibold text-gray-900">
                        {v.Brand} {v.Model}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {v.Category} • {v.Plate || "No plate"} • {v.Year || "N/A"}
                      </div>
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Press Enter to open the first result.
          </p>
        </div>

        {/* Image Section - Show ImageZoom when image exists, otherwise show prominent upload area */}
        {imageUrl ? (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Vehicle Image</h2>
            <ImageZoom src={imageUrl} alt={`${currentVehicle.Brand} ${currentVehicle.Model}`} />
          </div>
        ) : (
          <div className="mb-8">
            <div className="bg-amber-50 border-2 border-dashed border-amber-300 rounded-xl p-8 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="h-16 w-16 bg-amber-100 rounded-full flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-8 w-8 text-amber-600"
                    aria-hidden="true"
                  >
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="m21 15-5-5L5 21" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-amber-800">No Image Uploaded</h3>
                  <p className="text-amber-700 mt-1">This vehicle needs an image. Upload one below.</p>
                </div>
                <div className="w-full max-w-md mt-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleImageFile(e.target.files?.[0] ?? null)}
                    title="Upload vehicle image"
                    className="block w-full text-sm text-gray-700 file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:bg-green-700 file:text-white file:font-medium hover:file:bg-green-800"
                  />
                  <p className="text-xs text-amber-600 mt-2">
                    {imageLoading
                      ? "Compressing image..."
                      : uploadedImageFile
                      ? `Ready to upload: ${formatFileSize(uploadedImageFile.size)} (will be compressed on save)`
                      : "Max 4MB. Images are compressed for fast upload."}
                  </p>
                </div>
                <div className="w-full max-w-md">
                  <p className="text-sm text-amber-700 text-center mb-2">or paste an image URL</p>
                  <input
                    type="url"
                    value={formData.Image ?? ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange("Image", e.target.value)}
                    placeholder="https://..."
                    className="w-full px-4 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 placeholder:text-gray-400"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
            <input
              type="text"
              value={formData.Brand || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange("Brand", e.target.value)}
              className="ec-input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
            <input
              type="text"
              value={formData.Model || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange("Model", e.target.value)}
              className="ec-input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={categoryValue}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange("Category", e.target.value)}
              className="ec-input ec-select w-full"
            >
              <option value="" disabled>
                Select category
              </option>
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {categoryValue && !CATEGORY_OPTIONS.includes(categoryValue as (typeof CATEGORY_OPTIONS)[number]) ? (
              <p className="mt-2 text-xs text-amber-700">
                Unknown category. Choose Cars, Motorcycles, or Tuk Tuk (required for Drive upload).
              </p>
            ) : null}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Plate</label>
            <input
              type="text"
              value={formData.Plate || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleChange("Plate", e.target.value.toUpperCase())
              }
              maxLength={PLATE_NUMBER_MAX_LENGTH}
              placeholder={`e.g. ${PLATE_NUMBER_HINTS[0]}`}
              className="ec-input w-full font-mono uppercase placeholder:normal-case"
            />

          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
            <input
              type="number"
              value={formData.Year ?? ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleChange(
                  "Year",
                  e.target.value === ""
                    ? null
                    : Number.isNaN(Number.parseInt(e.target.value, 10))
                      ? null
                      : Number.parseInt(e.target.value, 10)
                  )
              }
              className="ec-input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
            <input
              type="text"
              list="colorsList"
              value={formData.Color || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange("Color", e.target.value)}
              className="ec-input w-full"
              placeholder="Type color (e.g., White, Black, Red, Custom)"
            />
            <datalist id="colorsList">
              {COLOR_OPTIONS.map((color) => (
                <option key={color.value} value={color.value} />
              ))}
            </datalist>
            {formData.Color && (
              <div className="mt-2 flex items-center gap-2">
                <span
                  className="w-6 h-6 rounded border border-gray-300"
                  style={{ backgroundColor: COLOR_OPTIONS.find(c => c.value === formData.Color)?.hex || formData.Color }}
                />
                <span className="text-sm text-gray-600">{formData.Color}</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
            <input
              type="text"
              value={formData.Condition || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange("Condition", e.target.value)}
              className="ec-input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Body Type</label>
            <input
              type="text"
              value={formData.BodyType || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange("BodyType", e.target.value)}
              className="ec-input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tax Type</label>
            <input
              type="text"
              list="taxTypesList"
              value={formData.TaxType || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange("TaxType", e.target.value)}
              className="ec-input w-full"
              placeholder="Type tax type (or choose)"
            />
            <datalist id="taxTypesList">
              {TAX_TYPE_METADATA.map((tt) => (
                <option key={tt.value} value={tt.label} />
              ))}
            </datalist>
            {formData.TaxType && (
              <p className="mt-1 text-xs text-gray-600">
                {TAX_TYPE_METADATA.find((tt) => tt.value === formData.TaxType)?.description || "Custom tax type"}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Market Price</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.PriceNew ?? ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleChange(
                  "PriceNew",
                  e.target.value === ""
                    ? null
                    : Number.isNaN(Number.parseFloat(e.target.value))
                      ? null
                      : Number.parseFloat(e.target.value)
                )
              }
              className="ec-input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">D.O.C.1 40%</label>
            <input
              type="number"
              readOnly
              value={formData.Price40 ?? ""}
              placeholder="Auto"
              className="ec-input w-full bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle 70%</label>
            <input
              type="number"
              readOnly
              value={formData.Price70 ?? ""}
              placeholder="Auto"
              className="ec-input w-full bg-gray-50"
            />
          </div>

        </div>

        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">Image (Upload or URL)</label>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleImageFile(e.target.files?.[0] ?? null)}
                title="Upload vehicle image"
                className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-green-700 file:text-white file:font-medium hover:file:bg-green-800"
              />
              <p className="text-xs text-gray-500 mt-2">
                {imageLoading
                  ? "Compressing image..."
                  : uploadedImageFile
                  ? `Ready to upload: ${formatFileSize(uploadedImageFile.size)} (will be compressed on save)`
                  : "Max 4MB. Images are compressed for fast upload."}
              </p>
            </div>
            <div>
              <input
                type="url"
                value={formData.Image ?? ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange("Image", e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-900 placeholder:text-gray-400"
              />
              {formData.Image ? (
                <button
                  type="button"
                  onClick={() => {
                    handleChange("Image", "");
                    setUploadedImageFile(null);
                  }}
                  className="mt-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Clear image
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Cambodia Market Price Section */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5 text-green-600"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2v20M2 12h20" />
            </svg>
            Cambodia Market Price
          </h2>
          
          {/* Market Price Card */}
          <div className="ec-glassPanel rounded-xl p-6 mb-4">
            <MarketPriceButton 
              vehicle={currentVehicle} 
              onPriceUpdate={handleMarketPriceUpdate}
              variant="card"
            />
          </div>

          {/* Auto-update Toggle */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoUpdateMarketPrice}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAutoUpdateMarketPrice(e.target.checked)}
                className="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-600"
              />
              <div className="text-sm">
                <span className="font-medium text-gray-900">Auto-update market price when saving</span>
                <p className="text-gray-500">Automatically update market price from Cambodia marketplaces when saving vehicle</p>
              </div>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={handleSave}
            className="flex-1 ec-glassBtnPrimary px-6 py-3"
          >
            Save Vehicle
          </button>
          <button
            onClick={() => router.back()}
            className="flex-1 ec-glassBtnSecondary px-6 py-3"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
