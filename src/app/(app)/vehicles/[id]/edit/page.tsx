"use client";

import { useAuthUser } from "@/app/components/AuthContext";
import ImageZoom from "@/app/components/ImageZoom";
import { fileToDataUrl } from "@/lib/fileToDataUrl";
import { derivePrices } from "@/lib/pricing";
import type { Vehicle } from "@/lib/types";
import { tokenizeQuery, vehicleSearchText } from "@/lib/vehicleSearch";
import { useParams, useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [jumpQuery, setJumpQuery] = useState("");
  const [formData, setFormData] = useState<Partial<Vehicle>>({});
  const [saving, setSaving] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
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

  useEffect(() => {
    let alive = true;

    async function fetchVehicles() {
      try {
        const res = await fetch("/api/vehicles", { cache: "no-store" });
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch vehicles");
        const data = await res.json();
        if (!alive) return;
        setVehicles((data.data || []) as Vehicle[]);
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "Error loading vehicles");
      } finally {
        if (alive) setLoading(false);
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
    setFormData((prev) => {
      const next: Partial<Vehicle> = { ...prev, [field]: value };
      if (field === "PriceNew") {
        const priceNew = typeof value === "number" && Number.isFinite(value) ? value : null;
        const derived = derivePrices(priceNew);
        next.Price40 = derived.Price40;
        next.Price70 = derived.Price70;
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!currentVehicle || !id) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/vehicles/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, VehicleId: id }),
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      const json = await res.json().catch(() => ({}));
      if (res.status === 403) throw new Error("Forbidden");
      if (!res.ok || json.ok === false) throw new Error(json.error || "Failed to save vehicle");

      try {
        sessionStorage.removeItem(`${EDIT_DRAFT_PREFIX}${id}`);
      } catch {
        // ignore
      }

      alert("Vehicle saved successfully!");
      router.push(`/vehicles/${encodeURIComponent(id)}/view`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error saving vehicle");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-center h-[60vh] text-gray-700">Loading...</div>
      </div>
    );
  }

  if (error) {
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
          {vehicles.length === 0 ? "No vehicles found" : "Vehicle not found"}
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
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to load image");
    } finally {
      setImageLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto ec-glassPanel rounded-2xl shadow-xl ring-1 ring-black/5 p-4 sm:p-6 lg:p-8">
        {/* Header with Navigation */}
        <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-start mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">
              Edit: {currentVehicle.Brand} {currentVehicle.Model}
            </h1>
            <p className="text-gray-600 mt-2">
              Vehicle {currentIndex + 1} of {vehicles.length}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrevious}
              disabled={currentIndex <= 0}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium"
            >
              ← Previous
            </button>
            <button
              onClick={handleNext}
              disabled={currentIndex === -1 || currentIndex >= vehicles.length - 1}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium"
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
              onChange={(e) => setJumpQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && jumpResults[0]) {
                  e.preventDefault();
                  jumpTo(jumpResults[0].VehicleId);
                }
              }}
              placeholder="Type brand, model, plate, year..."
              className="w-full pl-4 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-900 placeholder:text-gray-400"
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

        {/* Image Section */}
        {imageUrl ? (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Vehicle Image</h2>
            <ImageZoom src={imageUrl} alt={`${currentVehicle.Brand} ${currentVehicle.Model}`} />
          </div>
        ) : null}

        {/* Form */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
            <input
              type="text"
              value={formData.Brand || ""}
              onChange={(e) => handleChange("Brand", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
            <input
              type="text"
              value={formData.Model || ""}
              onChange={(e) => handleChange("Model", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={categoryValue}
              onChange={(e) => handleChange("Category", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-900"
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
              onChange={(e) => handleChange("Plate", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent font-mono text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
            <input
              type="number"
              value={formData.Year ?? ""}
              onChange={(e) =>
                handleChange(
                  "Year",
                  e.target.value === ""
                    ? null
                    : Number.isNaN(Number.parseInt(e.target.value, 10))
                      ? null
                      : Number.parseInt(e.target.value, 10)
                  )
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
            <input
              type="text"
              value={formData.Color || ""}
              onChange={(e) => handleChange("Color", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
            <input
              type="text"
              value={formData.Condition || ""}
              onChange={(e) => handleChange("Condition", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Body Type</label>
            <input
              type="text"
              value={formData.BodyType || ""}
              onChange={(e) => handleChange("BodyType", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tax Type</label>
            <input
              type="text"
              value={formData.TaxType || ""}
              onChange={(e) => handleChange("TaxType", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Market Price</label>
            <input
              type="number"
              value={formData.PriceNew ?? ""}
              onChange={(e) =>
                handleChange(
                  "PriceNew",
                  e.target.value === ""
                    ? null
                    : Number.isNaN(Number.parseFloat(e.target.value))
                      ? null
                      : Number.parseFloat(e.target.value)
                )
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">D.O.C.1 40%</label>
            <input
              type="number"
              readOnly
              value={formData.Price40 ?? ""}
              placeholder="Auto"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle 70%</label>
            <input
              type="number"
              readOnly
              value={formData.Price70 ?? ""}
              placeholder="Auto"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
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
                onChange={(e) => handleImageFile(e.target.files?.[0] ?? null)}
                title="Upload vehicle image"
                className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-green-700 file:text-white file:font-medium hover:file:bg-green-800"
              />
              <p className="text-xs text-gray-500 mt-2">
                {imageLoading
                  ? "Loading image..."
                  : "Max 4MB. Uploaded to Google Drive and saved in Google Sheet."}
              </p>
            </div>
            <div>
              <input
                type="url"
                value={formData.Image ?? ""}
                onChange={(e) => handleChange("Image", e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-gray-900 placeholder:text-gray-400"
              />
              {formData.Image ? (
                <button
                  type="button"
                  onClick={() => handleChange("Image", "")}
                  className="mt-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Clear image
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition font-medium"
          >
            {saving ? "Saving..." : "Save Vehicle"}
          </button>
          <button
            onClick={() => router.back()}
            className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
