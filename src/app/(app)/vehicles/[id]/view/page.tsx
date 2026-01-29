"use client";

import type { Vehicle } from "@/lib/types";
import { extractDriveFileId } from "@/lib/drive";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ImageZoom from "@/app/components/ImageZoom";
import { useAuthUser } from "@/app/components/AuthContext";

export default function ViewVehiclePage() {
  return <ViewVehicleInner />;
}

function ViewVehicleInner() {
  const router = useRouter();
  const user = useAuthUser();
  const isAdmin = user.role === "Admin";
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setLoading(true);
    setError("");
    setVehicle(null);

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
        setVehicle(data.data || data.vehicle);
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "Error loading vehicle");
      } finally {
        if (alive) setLoading(false);
      }
    }

    fetchVehicle();
    return () => {
      alive = false;
    };
  }, [id, router]);

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
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium print:hidden"
            >
              Print
            </button>
            <button
              onClick={() => router.back()}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium print:hidden"
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
          <div className="border-l-4 border-blue-600 pl-4">
            <p className="text-gray-600 text-sm font-medium">Category</p>
            <p className="text-lg font-semibold text-gray-800">{vehicle.Category}</p>
          </div>

          <div className="border-l-4 border-green-600 pl-4">
            <p className="text-gray-600 text-sm font-medium">Plate Number</p>
            <p className="text-lg font-semibold text-gray-800 font-mono">{vehicle.Plate}</p>
          </div>

          <div className="border-l-4 border-purple-600 pl-4">
            <p className="text-gray-600 text-sm font-medium">Year</p>
            <p className="text-lg font-semibold text-gray-800">{vehicle.Year || "N/A"}</p>
          </div>

          <div className="border-l-4 border-orange-600 pl-4">
            <p className="text-gray-600 text-sm font-medium">Color</p>
            <p className="text-lg font-semibold text-gray-800">{vehicle.Color}</p>
          </div>

          <div className="border-l-4 border-red-600 pl-4">
            <p className="text-gray-600 text-sm font-medium">Condition</p>
            <p className="text-lg font-semibold text-gray-800">{vehicle.Condition}</p>
          </div>

          <div className="border-l-4 border-cyan-600 pl-4">
            <p className="text-gray-600 text-sm font-medium">Body Type</p>
            <p className="text-lg font-semibold text-gray-800">{vehicle.BodyType}</p>
          </div>

          <div className="border-l-4 border-pink-600 pl-4">
            <p className="text-gray-600 text-sm font-medium">Tax Type</p>
            <p className="text-lg font-semibold text-gray-800">{vehicle.TaxType}</p>
          </div>

          <div className="border-l-4 border-indigo-600 pl-4">
            <p className="text-gray-600 text-sm font-medium">Market Price</p>
            <p className="text-lg font-semibold text-gray-800">
              ${vehicle.PriceNew?.toLocaleString() || "N/A"}
            </p>
          </div>

          <div className="border-l-4 border-lime-600 pl-4">
            <p className="text-gray-600 text-sm font-medium">D.O.C.1 40%</p>
            <p className="text-lg font-semibold text-gray-800">
              ${vehicle.Price40?.toLocaleString() || "N/A"}
            </p>
          </div>

          <div className="border-l-4 border-emerald-600 pl-4">
            <p className="text-gray-600 text-sm font-medium">Vehicle 70%</p>
            <p className="text-lg font-semibold text-gray-800">
              ${vehicle.Price70?.toLocaleString() || "N/A"}
            </p>
          </div>

          <div className="border-l-4 border-gray-600 pl-4 md:col-span-2">
            <p className="text-gray-600 text-sm font-medium">Added Time</p>
            <p className="text-lg font-semibold text-gray-800">{vehicle.Time}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 print:hidden">
          {isAdmin ? (
            <>
              <button
                onClick={() => router.push(`/vehicles/${vehicle.VehicleId}/edit`)}
                className="flex-1 px-6 py-3 bg-green-700 text-white rounded-lg hover:bg-green-800 transition font-medium"
              >
                Edit Vehicle
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed transition font-medium"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </>
          ) : null}
          <button
            onClick={() => router.back()}
            className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition font-medium"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
