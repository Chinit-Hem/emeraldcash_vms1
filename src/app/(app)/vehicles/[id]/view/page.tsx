"use client";

import { useAuthUser } from "@/app/components/AuthContext";
import ImageZoom from "@/app/components/ImageZoom";
import { normalizeCambodiaTimeString } from "@/lib/cambodiaTime";
import { extractDriveFileId } from "@/lib/drive";
import type { Vehicle } from "@/lib/types";
import { TAX_TYPE_METADATA } from "@/lib/types";
import { refreshVehicleCache } from "@/lib/vehicleCache";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function ViewVehiclePage() {
  return <ViewVehicleInner />;
}

function ViewVehicleInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthUser();
  const isAdmin = user.role === "Admin";
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const autoPrintDoneRef = useRef(false);

  const shouldAutoPrint = (() => {
    const value = searchParams?.get("print") ?? "";
    return value === "1" || value.toLowerCase() === "true";
  })();

  // Load from cache immediately
  useEffect(() => {
    if (!id) return;

    // Try to find vehicle in cache first
    try {
      const cached = localStorage.getItem("vms-vehicles");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const found = (parsed as Vehicle[]).find((v) => v.VehicleId === id);
          if (found) {
            setVehicle(found);
            setLoading(false);
          }
        }
      }
    } catch {
      // Ignore cache errors
    }
  }, [id]);

  // Fetch fresh data in background
  useEffect(() => {
    if (!id) return;
    let alive = true;
    setError("");

    async function fetchVehicle() {
      try {
        const res = await fetch(`/api/vehicles/${encodeURIComponent(id)}`, { cache: "no-store" });
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch vehicle");
        const data = await res.json();
        if (!alive) return;
        const fetchedVehicle = data.data || data.vehicle;
        setVehicle(fetchedVehicle);
        // Update cache
        try {
          const cached = localStorage.getItem("vms-vehicles");
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              const index = parsed.findIndex((v: Vehicle) => v.VehicleId === id);
              if (index >= 0) {
                parsed[index] = fetchedVehicle;
                localStorage.setItem("vms-vehicles", JSON.stringify(parsed));
              }
            }
          }
        } catch {
          // Ignore cache update errors
        }
      } catch (err) {
        if (!alive) return;
        // Only set error if we didn't have cached data
        if (!vehicle) {
          setError(err instanceof Error ? err.message : "Error loading vehicle");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    fetchVehicle();
    return () => {
      alive = false;
    };
  }, [id, router, vehicle]);

  useEffect(() => {
    if (!shouldAutoPrint) return;
    if (!vehicle) return;
    if (autoPrintDoneRef.current) return;
    autoPrintDoneRef.current = true;

    const timeout = window.setTimeout(() => window.print(), 150);
    return () => window.clearTimeout(timeout);
  }, [shouldAutoPrint, vehicle]);

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

  if (!vehicle) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto ec-glassPanel rounded-2xl shadow-xl ring-1 ring-black/5 p-6 text-center text-gray-700">
          Vehicle not found
        </div>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const handleDelete = async () => {
    if (!isAdmin) return;
    const ok = confirm("Delete this vehicle?");
    if (!ok) return;

    setDeleting(true);
    try {
      const imageFileId = extractDriveFileId(vehicle.Image);
      const res = await fetch(`/api/vehicles/${encodeURIComponent(vehicle.VehicleId)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageFileId, imageUrl: vehicle.Image }),
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.ok === false) throw new Error(json.error || "Failed to delete vehicle");

      await refreshVehicleCache();
      router.push("/vehicles");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto ec-glassPanel rounded-2xl shadow-xl ring-1 ring-black/5 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">
              {vehicle.Brand} {vehicle.Model}
            </h1>
            <p className="text-gray-600 mt-2">Vehicle ID: {vehicle.VehicleId}</p>
          </div>
          <div className="space-y-2">
            <button
              onClick={handlePrint}
              className="w-full ec-glassBtnBlue px-4 py-2 print:hidden"
            >
              Print
            </button>
            <button
              onClick={() => router.back()}
              className="w-full ec-glassBtnSecondary px-4 py-2 print:hidden"
            >
              Back
            </button>
          </div>
        </div>

        {/* Image Section */}
        {vehicle.Image && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Vehicle Image</h2>
            <ImageZoom src={vehicle.Image} alt={`${vehicle.Brand} ${vehicle.Model}`} />
          </div>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="ec-glassBadge rounded-lg p-4">
            <p className="text-gray-600 text-sm font-medium">Category</p>
            <p className="text-lg font-semibold text-gray-800">{vehicle.Category}</p>
          </div>

          <div className="ec-glassBadge rounded-lg p-4">
            <p className="text-gray-600 text-sm font-medium">Plate Number</p>
            <p className="text-lg font-semibold text-gray-800 font-mono uppercase">{vehicle.Plate}</p>
          </div>

          <div className="ec-glassBadge rounded-lg p-4">
            <p className="text-gray-600 text-sm font-medium">Year</p>
            <p className="text-lg font-semibold text-gray-800">{vehicle.Year || "N/A"}</p>
          </div>

          <div className="ec-glassBadge rounded-lg p-4">
            <p className="text-gray-600 text-sm font-medium">Color</p>
            <p className="text-lg font-semibold text-gray-800">{vehicle.Color}</p>
          </div>

          <div className="ec-glassBadge rounded-lg p-4">
            <p className="text-gray-600 text-sm font-medium">Condition</p>
            <p className="text-lg font-semibold text-gray-800">{vehicle.Condition}</p>
          </div>

          <div className="ec-glassBadge rounded-lg p-4">
            <p className="text-gray-600 text-sm font-medium">Body Type</p>
            <p className="text-lg font-semibold text-gray-800">{vehicle.BodyType}</p>
          </div>

          <div className="ec-glassBadge rounded-lg p-4">
            <p className="text-gray-600 text-sm font-medium">Tax Type</p>
            <p className="text-lg font-semibold text-gray-800">{vehicle.TaxType}</p>
            {vehicle.TaxType && (
              <p className="text-xs text-gray-500 mt-1">
                {TAX_TYPE_METADATA.find((tt) => tt.value === vehicle.TaxType)?.description}
              </p>
            )}
          </div>

          <div className="ec-glassBadge rounded-lg p-4">
            <p className="text-gray-600 text-sm font-medium">Market Price</p>
            <p className="text-lg font-semibold text-gray-800">
              ${vehicle.PriceNew?.toLocaleString() || "N/A"}
            </p>
          </div>

          <div className="ec-glassBadge rounded-lg p-4">
            <p className="text-gray-600 text-sm font-medium">D.O.C.40%</p>
            <p className="text-lg font-semibold text-gray-800">
              ${vehicle.Price40?.toLocaleString() || "N/A"}
            </p>
          </div>

          <div className="ec-glassBadge rounded-lg p-4">
            <p className="text-gray-600 text-sm font-medium">Vehicles70%</p>
            <p className="text-lg font-semibold text-gray-800">
              ${vehicle.Price70?.toLocaleString() || "N/A"}
            </p>
          </div>

          <div className="ec-glassBadge rounded-lg p-4 md:col-span-2">
            <p className="text-gray-600 text-sm font-medium">Added Time</p>
            <p className="text-lg font-semibold text-gray-800 font-mono">
              {normalizeCambodiaTimeString(vehicle.Time)}
            </p>
          </div>
        </div>

        {/* Cambodia Market Price Section */}
        {(vehicle.MarketPriceMedian || vehicle.MarketPriceLow || vehicle.MarketPriceHigh) && (
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
            <div className="ec-glassPanel rounded-xl p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Low (25th %)</p>
                  <p className="text-2xl font-bold text-orange-600">
                    ${vehicle.MarketPriceLow?.toLocaleString() || "-"}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Median</p>
                  <p className="text-3xl font-bold text-green-600">
                    ${vehicle.MarketPriceMedian?.toLocaleString() || "-"}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">High (75th %)</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    ${vehicle.MarketPriceHigh?.toLocaleString() || "-"}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap items-center justify-between gap-4 text-sm">
                <div className="flex items-center gap-4">
                  <span className="text-gray-600">
                    Source: <span className="font-medium">{vehicle.MarketPriceSource || "N/A"}</span>
                  </span>
                  <span className="text-gray-600">
                    Samples: <span className="font-medium">{vehicle.MarketPriceSamples || 0}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Confidence:</span>
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full ${
                      vehicle.MarketPriceConfidence === "High"
                        ? "bg-green-100 text-green-700"
                        : vehicle.MarketPriceConfidence === "Medium"
                        ? "bg-yellow-100 text-yellow-700"
                        : vehicle.MarketPriceConfidence === "Low"
                        ? "bg-orange-100 text-orange-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {vehicle.MarketPriceConfidence || "Unknown"}
                  </span>
                </div>
              </div>
              {vehicle.MarketPriceUpdatedAt && (
                <p className="mt-2 text-xs text-gray-500 text-right">
                  Updated: {new Date(vehicle.MarketPriceUpdatedAt).toLocaleString()}
                </p>
              )}
            </div>
            <p className="mt-2 text-xs text-gray-400 text-center">
              Prices are estimates based on available Cambodia marketplace listings.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 print:hidden">
          {isAdmin ? (
            <>
              <button
                onClick={() => router.push(`/vehicles/${vehicle.VehicleId}/edit`)}
                className="flex-1 ec-glassBtnPrimary px-6 py-3"
              >
                Edit Vehicle
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 ec-glassBtnRed px-6 py-3"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </>
          ) : null}
          <button
            onClick={() => router.back()}
            className="flex-1 ec-glassBtnSecondary px-6 py-3"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
