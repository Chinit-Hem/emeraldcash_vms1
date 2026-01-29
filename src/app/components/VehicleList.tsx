"use client";

import { extractDriveFileId } from "@/lib/drive";
import { derivePrices } from "@/lib/pricing";
import type { Vehicle } from "@/lib/types";
import { tokenizeQuery, vehicleSearchText } from "@/lib/vehicleSearch";
import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { useAuthUser } from "@/app/components/AuthContext";

let vehiclesCache: Vehicle[] | null = null;

type VehicleListProps = {
  category?: string;
};

function normalizeCategory(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export default function VehicleList({ category }: VehicleListProps) {
  const router = useRouter();
  const user = useAuthUser();
  const isAdmin = user.role === "Admin";
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => vehiclesCache ?? []);
  const [loading, setLoading] = useState(() => vehiclesCache == null);
  const [error, setError] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [condition, setCondition] = useState("");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
        const nextVehicles = (data.data || []) as Vehicle[];
        vehiclesCache = nextVehicles;
        if (alive) setVehicles(nextVehicles);
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : "Error loading vehicles");
      } finally {
        if (alive) setLoading(false);
      }
    }
    fetchVehicles();
    return () => {
      alive = false;
    };
  }, [router]);

  const searchIndex = useMemo(() => {
    const map = new Map<string, string>();
    for (const vehicle of vehicles) {
      map.set(vehicle.VehicleId, vehicleSearchText(vehicle));
    }
    return map;
  }, [vehicles]);

  const deferredQuery = useDeferredValue(query);
  const queryTokens = useMemo(() => tokenizeQuery(deferredQuery), [deferredQuery]);
  const conditionNormalized = condition.trim().toLowerCase();
  const yearFromNumber = useMemo(() => {
    if (!yearFrom.trim()) return null;
    const parsed = Number.parseInt(yearFrom, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }, [yearFrom]);
  const yearToNumber = useMemo(() => {
    if (!yearTo.trim()) return null;
    const parsed = Number.parseInt(yearTo, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }, [yearTo]);

  const categoryFilteredVehicles = useMemo(() => {
    if (!category) return vehicles;
    const categoryNormalized = normalizeCategory(category);
    return vehicles.filter((v) => normalizeCategory(v.Category) === categoryNormalized);
  }, [vehicles, category]);

  const filteredVehicles = useMemo(() => {
    let current = categoryFilteredVehicles;

    if (conditionNormalized) {
      current = current.filter((vehicle) => vehicle.Condition?.toLowerCase() === conditionNormalized);
    }

    if (yearFromNumber !== null) {
      current = current.filter((vehicle) => (vehicle.Year ?? 0) >= yearFromNumber);
    }

    if (yearToNumber !== null) {
      current = current.filter((vehicle) => (vehicle.Year ?? 9999) <= yearToNumber);
    }

    if (queryTokens.length === 0) return current;

    return current.filter((vehicle) => {
      const haystack = searchIndex.get(vehicle.VehicleId) ?? vehicleSearchText(vehicle);
      return queryTokens.every((token) => haystack.includes(token));
    });
  }, [categoryFilteredVehicles, conditionNormalized, queryTokens, yearFromNumber, yearToNumber, searchIndex]);

  const hasSearch = queryTokens.length > 0 || !!conditionNormalized || yearFromNumber !== null || yearToNumber !== null;
  const showSearch = isSearchOpen || hasSearch;

  const clearSearch = () => {
    setQuery("");
    setCondition("");
    setYearFrom("");
    setYearTo("");
    setIsSearchOpen(false);
  };

  const handleDelete = async (vehicle: Vehicle) => {
    if (!isAdmin) return;
    const vehicleId = vehicle.VehicleId;
    const ok = confirm("Delete this vehicle?");
    if (!ok) return;

    setDeletingId(vehicleId);
    try {
      const imageFileId = extractDriveFileId(vehicle.Image);
      const res = await fetch(`/api/vehicles/${encodeURIComponent(vehicleId)}`, {
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

      setVehicles((prev) => prev.filter((v) => v.VehicleId !== vehicleId));
      vehiclesCache = (vehiclesCache ?? vehicles).filter((v) => v.VehicleId !== vehicleId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <div className="text-center py-8">Loading vehicles...</div>;
  if (error) return <div className="text-red-600 py-8">{error}</div>;

  return (
    <div>
      <div className="ec-glassPanel rounded-2xl shadow-xl ring-1 ring-black/5 overflow-hidden">
        <div className="ec-glassPanelSoft p-4 border-b border-black/5 print:hidden">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  if (showSearch) clearSearch();
                  else setIsSearchOpen(true);
                }}
                className="ec-btn ec-btnPrimary w-full sm:w-auto text-sm"
              >
                {showSearch ? "Hide Search" : "Advanced Search"}
              </button>
              {hasSearch ? (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="ec-btn w-full sm:w-auto text-sm"
                >
                  Clear
                </button>
              ) : null}
            </div>

            <div className="text-sm text-gray-600 whitespace-nowrap text-right sm:text-left">
              {filteredVehicles.length} / {categoryFilteredVehicles.length} vehicles
            </div>
          </div>
        </div>

        {showSearch ? (
          <div className="ec-glassPanelSoft px-4 pb-4 border-b border-black/5 print:hidden">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="relative md:col-span-12">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
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
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search all data (brand, model, plate, year, color...)"
                  className="ec-input w-full pl-10 pr-12"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
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
              </div>

              <div className="md:col-span-4">
                <select
                  aria-label="Filter by condition"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="ec-select w-full"
                >
                  <option value="">All Conditions</option>
                  <option value="New">New</option>
                  <option value="Used">Used</option>
                  <option value="Damaged">Damaged</option>
                </select>
              </div>

              <div className="md:col-span-4">
                <input
                  type="number"
                  inputMode="numeric"
                  value={yearFrom}
                  onChange={(e) => setYearFrom(e.target.value)}
                  placeholder="Year from"
                  className="ec-input w-full"
                />
              </div>

              <div className="md:col-span-4">
                <input
                  type="number"
                  inputMode="numeric"
                  value={yearTo}
                  onChange={(e) => setYearTo(e.target.value)}
                  placeholder="Year to"
                  className="ec-input w-full"
                />
              </div>
            </div>
          </div>
        ) : null}

        {/* Mobile cards */}
        <div className="sm:hidden divide-y divide-black/5">
          {filteredVehicles.map((vehicle, index) => {
            const derived = derivePrices(vehicle.PriceNew);
            const price40 = vehicle.Price40 ?? derived.Price40;
            const price70 = vehicle.Price70 ?? derived.Price70;
            const rowClass = index % 2 === 0 ? "ec-glassRow" : "ec-glassRowAlt";

            return (
              <div
                key={vehicle.VehicleId}
                onClick={() => router.push(`/vehicles/${encodeURIComponent(vehicle.VehicleId)}/view`)}
                className={`p-4 cursor-pointer transition-colors active:opacity-95 ${rowClass}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">
                      {index + 1}. {vehicle.Brand} {vehicle.Model}
                    </div>
                    <div className="mt-1 text-xs text-gray-600 truncate">
                      {vehicle.Category} • {vehicle.Year || "-"} • {vehicle.Plate}
                    </div>
                  </div>
                  <div className="text-right text-xs tabular-nums text-gray-700 whitespace-nowrap">
                    <div>
                      {vehicle.PriceNew == null ? "-" : `$${vehicle.PriceNew.toLocaleString()}`}{" "}
                      <span className="text-gray-500">market</span>
                    </div>
                    <div className="mt-0.5 text-gray-600">
                      {price40 == null ? "-" : `$${price40.toLocaleString()}`}{" "}
                      <span className="text-gray-400">D.O.C.1 40%</span>{" "}
                      {price70 == null ? "" : `• $${price70.toLocaleString()}`}{" "}
                      {price70 == null ? null : <span className="text-gray-400">Vehicle 70%</span>}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex gap-3" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => router.push(`/vehicles/${encodeURIComponent(vehicle.VehicleId)}/view`)}
                    className="ec-btn px-3 py-2 text-blue-600 text-sm"
                  >
                    View
                  </button>
                  {isAdmin ? (
                    <>
                      <button
                        type="button"
                        onClick={() => router.push(`/vehicles/${encodeURIComponent(vehicle.VehicleId)}/edit`)}
                        className="ec-btn px-3 py-2 text-green-700 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(vehicle)}
                        disabled={deletingId === vehicle.VehicleId}
                        className="ec-btn px-3 py-2 text-red-600 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {deletingId === vehicle.VehicleId ? "Deleting..." : "Delete"}
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto print:block">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-green-800/95 via-green-700/95 to-green-600/95">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-extrabold text-white/90 uppercase tracking-wider">
                  #
                </th>
                <th className="px-6 py-3 text-left text-xs font-extrabold text-white/90 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-extrabold text-white/90 uppercase tracking-wider">
                  Brand
                </th>
                <th className="px-6 py-3 text-left text-xs font-extrabold text-white/90 uppercase tracking-wider">
                  Model
                </th>
                <th className="px-6 py-3 text-left text-xs font-extrabold text-white/90 uppercase tracking-wider">
                  Year
                </th>
                <th className="px-6 py-3 text-left text-xs font-extrabold text-white/90 uppercase tracking-wider">
                  Plate
                </th>
                <th className="px-6 py-3 text-right text-xs font-extrabold text-white/90 uppercase tracking-wider">
                  Market Price
                </th>
                <th className="px-6 py-3 text-right text-xs font-extrabold text-white/90 uppercase tracking-wider">
                  D.O.C.1 40%
                </th>
                <th className="px-6 py-3 text-right text-xs font-extrabold text-white/90 uppercase tracking-wider">
                  Vehicle 70%
                </th>
                <th className="px-6 py-3 text-right text-xs font-extrabold text-white/90 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-transparent divide-y divide-black/5">
              {filteredVehicles.map((vehicle, index) => {
                const derived = derivePrices(vehicle.PriceNew);
                const price40 = vehicle.Price40 ?? derived.Price40;
                const price70 = vehicle.Price70 ?? derived.Price70;
                const rowClass = index % 2 === 0 ? "ec-glassRow" : "ec-glassRowAlt";

                return (
                  <tr
                    key={vehicle.VehicleId}
                    onClick={() => router.push(`/vehicles/${encodeURIComponent(vehicle.VehicleId)}/view`)}
                    className={`${rowClass} cursor-pointer transition-colors`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {vehicle.Category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {vehicle.Brand}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {vehicle.Model}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {vehicle.Year || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                      {vehicle.Plate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right tabular-nums text-gray-600">
                      {vehicle.PriceNew == null ? "-" : `$${vehicle.PriceNew.toLocaleString()}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right tabular-nums text-gray-600">
                      {price40 == null ? "-" : `$${price40.toLocaleString()}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right tabular-nums text-gray-600">
                      {price70 == null ? "-" : `$${price70.toLocaleString()}`}
                    </td>
                    <td
                      className="px-6 py-4 whitespace-nowrap text-sm space-x-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => router.push(`/vehicles/${encodeURIComponent(vehicle.VehicleId)}/view`)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View
                      </button>
                      {isAdmin ? (
                        <>
                          <button
                            onClick={() => router.push(`/vehicles/${encodeURIComponent(vehicle.VehicleId)}/edit`)}
                            className="text-green-700 hover:text-green-900 font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(vehicle)}
                            disabled={deletingId === vehicle.VehicleId}
                            className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deletingId === vehicle.VehicleId ? "Deleting..." : "Delete"}
                          </button>
                        </>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredVehicles.length === 0 ? (
          <div className="text-center py-10 text-gray-600">
            {queryTokens.length > 0 ? (
              <div>
                <p className="font-medium text-gray-800">
                  No results for &quot;{query.trim()}&quot;
                </p>
                <p className="text-sm text-gray-600 mt-1">Try a different keyword or clear the search.</p>
              </div>
            ) : (
              "No vehicles found"
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
