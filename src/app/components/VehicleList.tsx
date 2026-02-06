"use client";

import { normalizeCambodiaTimeString } from "@/lib/cambodiaTime";
import { driveThumbnailUrl, extractDriveFileId } from "@/lib/drive";
import { derivePrices } from "@/lib/pricing";
import type { Vehicle } from "@/lib/types";
import { onVehicleCacheUpdate, readVehicleCache, refreshVehicleCache, writeVehicleCache } from "@/lib/vehicleCache";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { tokenizeQuery, vehicleSearchText } from "@/lib/vehicleSearch";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";

import { useAuthUser } from "@/app/components/AuthContext";
import FilterField from "@/app/components/filters/FilterField";
import FilterInput from "@/app/components/filters/FilterInput";
import FilterSelect, { type SelectOption } from "@/app/components/filters/FilterSelect";
import VehicleCard from "@/app/components/VehicleCard";
import ImageModal from "@/app/components/ImageModal";
import { VehicleListSkeleton, TableSkeleton } from "@/app/components/LoadingSkeleton";

type VehicleListProps = {
  category?: string;
};

function normalizeString(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeCategoryKey(value: unknown) {
  const raw = normalizeString(value);
  if (!raw) return "";
  if (raw === "car") return "cars";
  if (raw === "motorcycle") return "motorcycles";
  if (raw === "tuktuk" || raw === "tuk-tuk") return "tuk tuk";
  return raw;
}

function toIntOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function toNumberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function parseVehicleDateTimeParts(rawValue: unknown): { dateKey: string; timeMinutes: number | null } {
  const raw = String(rawValue ?? "").trim();
  if (!raw) return { dateKey: "", timeMinutes: null };

  let match = raw.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/
  );
  if (match) {
    const year = Number.parseInt(match[1] ?? "", 10);
    const month = Number.parseInt(match[2] ?? "", 10);
    const day = Number.parseInt(match[3] ?? "", 10);
    const hour = match[4] ? Number.parseInt(match[4], 10) : null;
    const minute = match[5] ? Number.parseInt(match[5], 10) : null;

    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
      return { dateKey: "", timeMinutes: null };
    }

    const dateKey = `${year}-${pad2(month)}-${pad2(day)}`;
    const timeMinutes = hour != null && minute != null ? hour * 60 + minute : null;
    return { dateKey, timeMinutes };
  }

  match = raw.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/
  );
  if (match) {
    const month = Number.parseInt(match[1] ?? "", 10);
    const day = Number.parseInt(match[2] ?? "", 10);
    const year = Number.parseInt(match[3] ?? "", 10);
    const hour = match[4] ? Number.parseInt(match[4], 10) : null;
    const minute = match[5] ? Number.parseInt(match[5], 10) : null;

    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
      return { dateKey: "", timeMinutes: null };
    }

    const dateKey = `${year}-${pad2(month)}-${pad2(day)}`;
    const timeMinutes = hour != null && minute != null ? hour * 60 + minute : null;
    return { dateKey, timeMinutes };
  }

  return { dateKey: "", timeMinutes: null };
}

type VehicleFilters = {
  id: string;
  query: string;
  brand: string;
  category: string;
  yearFrom: string;
  yearTo: string;
  priceMin: string;
  priceMax: string;
  condition: string;
  taxType: string;
  dateFrom: string;
  dateTo: string;
  withoutImage: boolean;
};

const CATEGORY_OPTIONS: SelectOption[] = [
  { label: "Cars", value: "Cars" },
  { label: "Motorcycles", value: "Motorcycles" },
  { label: "Tuk Tuk", value: "Tuk Tuk" },
];

const ITEMS_PER_PAGE = 20;

export default function VehicleList({ category }: VehicleListProps) {
  const router = useRouter();
  const user = useAuthUser();
  const isAdmin = user.role === "Admin";
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<string, Vehicle>>(new Map());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedImage, setSelectedImage] = useState<{ url: string; alt: string } | null>(null);
  const [filters, setFilters] = useState<VehicleFilters>(() => ({
    id: "",
    query: "",
    brand: "",
    category: String(category ?? "").trim(),
    yearFrom: "",
    yearTo: "",
    priceMin: "",
    priceMax: "",
    condition: "",
    taxType: "",
    dateFrom: "",
    dateTo: "",
    withoutImage: false,
  }));

  // Load from cache immediately on mount + subscribe to cache updates
  useEffect(() => {
    const cached = readVehicleCache();
    if (cached) {
      setVehicles(cached);
      setLoading(false);
    }
    return onVehicleCacheUpdate((nextVehicles) => {
      setVehicles(nextVehicles);
      setLoading(false);
    });
  }, []);

  const searchParams = useSearchParams();
  const refreshToken = searchParams?.get("refresh") || "";

  // Fetch fresh data in background
  useEffect(() => {
    let alive = true;

    async function fetchVehicles() {
      try {
        const res = await fetch("/api/vehicles?noCache=1", { cache: "no-store" });
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        if (!data.ok) {
          throw new Error(data.error || "Failed to fetch vehicles");
        }
        const nextVehicles = (data.data || []) as Vehicle[];
        if (alive) {
          setVehicles(nextVehicles);
          setOptimisticUpdates(new Map());
          writeVehicleCache(nextVehicles);
          setLoading(false);
        }
      } catch (err) {
        if (alive) {
          setError(err instanceof Error ? err.message : "Error loading vehicles");
          setLoading(false);
        }
      }
    }
    fetchVehicles();
    return () => {
      alive = false;
    };
  }, [router, refreshToken]);

  useEffect(() => {
    let mounted = true;
    const interval = window.setInterval(async () => {
      if (!mounted) return;
      setIsRefreshing(true);
      await refreshVehicleCache();
      if (mounted) setIsRefreshing(false);
    }, 15000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshVehicleCache();
    setIsRefreshing(false);
  };

  const fixedCategory = String(category ?? "").trim();
  const categoryFixed = !!fixedCategory;

  useEffect(() => {
    if (!categoryFixed) return;
    setFilters((prev) => {
      if (normalizeCategoryKey(prev.category) === normalizeCategoryKey(fixedCategory)) return prev;
      return { ...prev, category: fixedCategory };
    });
  }, [categoryFixed, fixedCategory]);

  // Initialize filters from URL query params
  useEffect(() => {
    if (!searchParams) return;
    const withoutImageParam = searchParams.get("withoutImage");
    const conditionParam = searchParams.get("condition") || "";
    const brandParam = searchParams.get("brand") || "";
    const idParam = searchParams.get("id") || "";
    const queryParam = searchParams.get("query") || searchParams.get("q") || "";

    setFilters((prev) => {
      const next = { ...prev };
      if (withoutImageParam != null) next.withoutImage = withoutImageParam === "1" || withoutImageParam === "true";
      if (conditionParam) next.condition = conditionParam;
      if (brandParam) next.brand = brandParam;
      if (idParam) next.id = idParam;
      if (queryParam) next.query = queryParam;
      return next;
    });
  }, [searchParams]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const debouncedQuery = useDebouncedValue(filters.query, 200);
  const queryTokens = useMemo(() => tokenizeQuery(debouncedQuery), [debouncedQuery]);

  const brandOptions = useMemo<SelectOption[]>(() => {
    const set = new Set<string>();
    for (const vehicle of vehicles) {
      const value = String(vehicle.Brand || "").trim();
      if (value) set.add(value);
    }
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ label: value, value }));
  }, [vehicles]);

  const taxTypeOptions = useMemo<SelectOption[]>(() => {
    const set = new Set<string>();
    for (const vehicle of vehicles) {
      const value = String(vehicle.TaxType || "").trim();
      if (value) set.add(value);
    }
    const extras = ["Tax Paper", "Plate Number"];
    for (const ex of extras) set.add(ex);

    const others = Array.from(set).filter((v) => !extras.includes(v)).sort((a, b) => a.localeCompare(b));
    const ordered = extras.concat(others);
    return ordered.map((value) => ({ label: value, value }));
  }, [vehicles]);

  const searchIndex = useMemo(() => {
    const map = new Map<string, string>();
    for (const vehicle of vehicles) {
      map.set(vehicle.VehicleId, vehicleSearchText(vehicle));
    }
    return map;
  }, [vehicles]);

  const timeIndex = useMemo(() => {
    const map = new Map<string, { dateKey: string; timeMinutes: number | null }>();
    for (const vehicle of vehicles) {
      map.set(vehicle.VehicleId, parseVehicleDateTimeParts(vehicle.Time));
    }
    return map;
  }, [vehicles]);

  const categoryFilteredVehicles = useMemo(() => {
    const selected = String(filters.category || "").trim();
    if (!selected) return vehicles;
    const key = normalizeCategoryKey(selected);
    if (!key) return vehicles;
    return vehicles.filter((v) => normalizeCategoryKey(v.Category) === key);
  }, [vehicles, filters.category]);

  const filteredVehicles = useMemo(() => {
    let current = categoryFilteredVehicles.map((vehicle) => {
      const optimistic = optimisticUpdates.get(vehicle.VehicleId);
      return optimistic || vehicle;
    }).filter((vehicle) => {
      const optimistic = optimisticUpdates.get(vehicle.VehicleId);
      return !optimistic || !optimistic._deleted;
    });

    const idFilter = filters.id.trim();
    if (idFilter) {
      current = current.filter((vehicle) => String(vehicle.VehicleId || "").includes(idFilter));
    }

    const brandFilter = normalizeString(filters.brand);
    if (brandFilter) {
      current = current.filter((vehicle) => normalizeString(vehicle.Brand) === brandFilter);
    }

    const conditionFilter = normalizeString(filters.condition);
    if (conditionFilter) {
      current = current.filter((vehicle) => normalizeString(vehicle.Condition) === conditionFilter);
    }

    const taxTypeFilter = normalizeString(filters.taxType);
    if (taxTypeFilter) {
      current = current.filter((vehicle) => normalizeString(vehicle.TaxType) === taxTypeFilter);
    }

    const yearFromNumber = toIntOrNull(filters.yearFrom);
    const yearToNumber = toIntOrNull(filters.yearTo);
    if (yearFromNumber != null) {
      current = current.filter((vehicle) => vehicle.Year != null && vehicle.Year >= yearFromNumber);
    }
    if (yearToNumber != null) {
      current = current.filter((vehicle) => vehicle.Year != null && vehicle.Year <= yearToNumber);
    }

    const priceMin = toNumberOrNull(filters.priceMin);
    const priceMax = toNumberOrNull(filters.priceMax);
    if (priceMin != null) {
      current = current.filter((vehicle) => vehicle.PriceNew != null && vehicle.PriceNew >= priceMin);
    }
    if (priceMax != null) {
      current = current.filter((vehicle) => vehicle.PriceNew != null && vehicle.PriceNew <= priceMax);
    }

    const dateFrom = filters.dateFrom.trim();
    const dateTo = filters.dateTo.trim();

    if (dateFrom || dateTo) {
      current = current.filter((vehicle) => {
        const meta = timeIndex.get(vehicle.VehicleId) ?? { dateKey: "", timeMinutes: null };
        const dateKey = meta.dateKey;

        if (dateFrom && (!dateKey || dateKey < dateFrom)) return false;
        if (dateTo && (!dateKey || dateKey > dateTo)) return false;

        return true;
      });
    }

    if (filters.withoutImage) {
      current = current.filter((vehicle) => {
        const imageValue = vehicle.Image;
        if (!imageValue || !String(imageValue).trim()) return true;
        const fileId = extractDriveFileId(imageValue);
        return !fileId;
      });
    }

    if (queryTokens.length === 0) return current;

    return current.filter((vehicle) => {
      const haystack = searchIndex.get(vehicle.VehicleId) ?? "";
      return queryTokens.every((token) => haystack.includes(token));
    });
  }, [categoryFilteredVehicles, filters, searchIndex, queryTokens, timeIndex, optimisticUpdates]);

  // Pagination
  const totalPages = Math.ceil(filteredVehicles.length / ITEMS_PER_PAGE);
  const paginatedVehicles = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredVehicles.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredVehicles, currentPage]);

  const activeFiltersCount = useMemo(() => {
    const fixedKey = normalizeCategoryKey(fixedCategory);
    let count = 0;
    for (const [key, value] of Object.entries(filters)) {
      const trimmed = String(value ?? "").trim();
      if (!trimmed) continue;
      if (key === "category" && categoryFixed && normalizeCategoryKey(trimmed) === fixedKey) continue;
      if (key === "withoutImage" && value === false) continue;
      count++;
    }
    return count;
  }, [filters, fixedCategory, categoryFixed]);
  const hasFilters = activeFiltersCount > 0;

  const clearFilters = () => {
    setFilters({
      id: "",
      query: "",
      brand: "",
      category: categoryFixed ? fixedCategory : "",
      yearFrom: "",
      yearTo: "",
      priceMin: "",
      priceMax: "",
      condition: "",
      taxType: "",
      dateFrom: "",
      dateTo: "",
      withoutImage: false,
    });
    setFiltersOpen(false);
    setCurrentPage(1);
  };

  const handleDelete = async (vehicle: Vehicle) => {
    if (!isAdmin) return;
    const vehicleId = vehicle.VehicleId;
    const ok = confirm("Delete this vehicle?");
    if (!ok) return;

    setOptimisticUpdates((prev) => {
      const next = new Map(prev);
      next.set(vehicleId, { ...vehicle, _deleted: true });
      return next;
    });

    (async () => {
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

        setVehicles((prev) => {
          const nextVehicles = prev.filter((v) => v.VehicleId !== vehicleId);
          writeVehicleCache(nextVehicles);
          return nextVehicles;
        });
        setOptimisticUpdates((prev) => {
          const next = new Map(prev);
          next.delete(vehicleId);
          return next;
        });
      } catch (err) {
        setOptimisticUpdates((prev) => {
          const next = new Map(prev);
          next.delete(vehicleId);
          return next;
        });
        alert(`Failed to delete vehicle: ${err instanceof Error ? err.message : "Unknown error"}. Please try again.`);
      }
    })();
  };

  const handleImageClick = (vehicle: Vehicle) => {
    if (!vehicle.Image) return;
    const fileId = extractDriveFileId(vehicle.Image);
    if (!fileId) return;
    const fullUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
    setSelectedImage({
      url: fullUrl,
      alt: `${vehicle.Brand} ${vehicle.Model}`,
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="ec-glassPanel rounded-2xl shadow-xl ring-1 ring-black/5 overflow-hidden">
        <div className="ec-glassPanelSoft p-4 border-b border-black/5">
          <div className="skeleton h-10 w-32 rounded-lg" />
        </div>
        <div className="sm:hidden">
          <VehicleListSkeleton count={5} />
        </div>
        <div className="hidden sm:block">
          <table className="min-w-full">
            <thead className="ec-glassHeader">
              <tr>
                {Array.from({ length: 8 }).map((_, i) => (
                  <th key={i} className="px-6 py-3">
                    <div className="skeleton h-4 w-16 rounded" />
                  </th>
                ))}
              </tr>
            </thead>
            <TableSkeleton rows={5} columns={8} />
          </table>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="ec-glassPanel rounded-2xl shadow-xl ring-1 ring-black/5 overflow-hidden">
        <div className="ec-errorBanner m-4">
          <svg
            className="ec-errorBanner-icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div className="ec-errorBanner-content">
            <div className="ec-errorBanner-title">Failed to load vehicles</div>
            <div className="ec-errorBanner-message">{error}</div>
          </div>
          <button onClick={handleRefresh} className="ec-errorBanner-action">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (filteredVehicles.length === 0) {
    return (
      <div className="ec-glassPanel rounded-2xl shadow-xl ring-1 ring-black/5 overflow-hidden">
        {/* Filter bar */}
        <div className="ec-glassPanelSoft p-4 border-b border-black/5 print:hidden">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setFiltersOpen((prev) => !prev)}
                className="ec-btn ec-btnPrimary w-full sm:w-auto text-sm touch-target"
              >
                <span className="inline-flex items-center gap-2">
                  <span>{filtersOpen ? "Hide Filters" : "Show Filters"}</span>
                  {activeFiltersCount > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-2 rounded-full bg-white/20 text-white text-xs font-extrabold">
                      {activeFiltersCount}
                    </span>
                  )}
                </span>
              </button>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="ec-btn w-full sm:w-auto text-sm touch-target"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="text-sm text-gray-600 whitespace-nowrap text-right sm:text-left">
              0 vehicles
            </div>
          </div>
        </div>

        {/* Empty state */}
        <div className="ec-emptyState">
          <div className="ec-emptyState-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>
          <h3 className="ec-emptyState-title">
            {queryTokens.length > 0 ? `No results for "${filters.query.trim()}"` : "No vehicles found"}
          </h3>
          <p className="ec-emptyState-description">
            {queryTokens.length > 0
              ? "Try a different keyword or clear the search."
              : hasFilters
              ? "Try adjusting your filters to see more results."
              : "Get started by adding your first vehicle."}
          </p>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 ec-btn ec-btnPrimary touch-target"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="ec-glassPanel rounded-2xl shadow-xl ring-1 ring-black/5 overflow-hidden">
        {/* Filter bar */}
        <div className="ec-glassPanelSoft p-4 border-b border-black/5 print:hidden">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setFiltersOpen((prev) => !prev)}
                className="ec-btn ec-btnPrimary w-full sm:w-auto text-sm touch-target"
              >
                <span className="inline-flex items-center gap-2">
                  <span>{filtersOpen ? "Hide Filters" : "Show Filters"}</span>
                  {activeFiltersCount > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-2 rounded-full bg-white/20 text-white text-xs font-extrabold">
                      {activeFiltersCount}
                    </span>
                  )}
                </span>
              </button>
              {filtersOpen && (
                <>
                  {hasFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="ec-btn w-full sm:w-auto text-sm touch-target"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="ec-btn w-full sm:w-auto text-sm touch-target"
                  >
                    {isRefreshing ? "Refreshing..." : "Refresh"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFilters((prev) => ({ ...prev, withoutImage: !prev.withoutImage }));
                      setFiltersOpen(true);
                    }}
                    className={`ec-btn w-full sm:w-auto text-sm touch-target ${filters.withoutImage ? "ec-btnPrimary" : ""}`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                      >
                        <rect width="18" height="18" x="3" y="3" rx="1" />
                        <path d="M9 9h6v6H9z" />
                      </svg>
                      <span>{filters.withoutImage ? "Show all images" : "Find no image"}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="ec-btn w-full sm:w-auto text-sm touch-target"
                    title="Print all vehicle data"
                  >
                    <span className="inline-flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                      >
                        <polyline points="6,9 6,2 18,2 18,9" />
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                        <rect width="12" height="8" x="6" y="14" />
                      </svg>
                      <span>Print</span>
                    </span>
                  </button>
                </>
              )}
            </div>
            <div className="text-sm text-gray-600 whitespace-nowrap text-right sm:text-left">
              {filteredVehicles.length} / {categoryFilteredVehicles.length} vehicles
            </div>
          </div>
        </div>

        {/* Quick search */}
        <div className="ec-glassPanelSoft px-4 pb-4 border-b border-black/5 print:hidden">
          <FilterField id="vms-filter-query" label="Quick Search">
            <FilterInput
              id="vms-filter-query"
              value={filters.query}
              onChange={(value) => setFilters((prev) => ({ ...prev, query: value }))}
              placeholder="Search across all fields..."
              inputMode="search"
            />
          </FilterField>
        </div>

        {/* Expanded filters */}
        {filtersOpen && (
          <div className="ec-glassPanelSoft px-4 pb-4 border-b border-black/5 print:hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <FilterField id="vms-filter-id" label="ID">
                <FilterInput
                  id="vms-filter-id"
                  value={filters.id}
                  onChange={(value) => setFilters((prev) => ({ ...prev, id: value }))}
                  placeholder="e.g. 1"
                  inputMode="numeric"
                />
              </FilterField>

              <FilterField id="vms-filter-brand" label="Brand">
                <FilterSelect
                  id="vms-filter-brand"
                  value={filters.brand}
                  onChange={(value) => setFilters((prev) => ({ ...prev, brand: value }))}
                  options={brandOptions}
                  placeholder="All Brands"
                />
              </FilterField>

              <FilterField id="vms-filter-category" label="Category">
                <FilterSelect
                  id="vms-filter-category"
                  value={filters.category}
                  onChange={(value) => setFilters((prev) => ({ ...prev, category: value }))}
                  options={CATEGORY_OPTIONS}
                  placeholder="All Categories"
                  disabled={categoryFixed}
                />
              </FilterField>

              <FilterField id="vms-filter-condition" label="Condition">
                <FilterSelect
                  id="vms-filter-condition"
                  value={filters.condition}
                  onChange={(value) => setFilters((prev) => ({ ...prev, condition: value }))}
                  options={[
                    { label: "New", value: "New" },
                    { label: "Used", value: "Used" },
                    { label: "Damaged", value: "Damaged" },
                  ]}
                  placeholder="All Conditions"
                />
              </FilterField>

              <FilterField id="vms-filter-taxType" label="Tax Type">
                <FilterSelect
                  id="vms-filter-taxType"
                  value={filters.taxType}
                  onChange={(value) => setFilters((prev) => ({ ...prev, taxType: value }))}
                  options={taxTypeOptions}
                  placeholder="All Tax Types"
                />
              </FilterField>

              <FilterField id="vms-filter-yearFrom" label="Year From">
                <FilterInput
                  id="vms-filter-yearFrom"
                  value={filters.yearFrom}
                  onChange={(value) => setFilters((prev) => ({ ...prev, yearFrom: value }))}
                  placeholder="e.g. 2018"
                  type="number"
                  inputMode="numeric"
                />
              </FilterField>

              <FilterField id="vms-filter-yearTo" label="Year To">
                <FilterInput
                  id="vms-filter-yearTo"
                  value={filters.yearTo}
                  onChange={(value) => setFilters((prev) => ({ ...prev, yearTo: value }))}
                  placeholder="e.g. 2026"
                  type="number"
                  inputMode="numeric"
                />
              </FilterField>

              <FilterField id="vms-filter-priceMin" label="Price Min">
                <FilterInput
                  id="vms-filter-priceMin"
                  value={filters.priceMin}
                  onChange={(value) => setFilters((prev) => ({ ...prev, priceMin: value }))}
                  placeholder="e.g. 1000"
                  type="number"
                  inputMode="decimal"
                />
              </FilterField>

              <FilterField id="vms-filter-priceMax" label="Price Max">
                <FilterInput
                  id="vms-filter-priceMax"
                  value={filters.priceMax}
                  onChange={(value) => setFilters((prev) => ({ ...prev, priceMax: value }))}
                  placeholder="e.g. 20000"
                  type="number"
                  inputMode="decimal"
                />
              </FilterField>

              <FilterField id="vms-filter-dateFrom" label="Date From">
                <FilterInput
                  id="vms-filter-dateFrom"
                  value={filters.dateFrom}
                  onChange={(value) => setFilters((prev) => ({ ...prev, dateFrom: value }))}
                  type="date"
                />
              </FilterField>

              <FilterField id="vms-filter-dateTo" label="Date To">
                <FilterInput
                  id="vms-filter-dateTo"
                  value={filters.dateTo}
                  onChange={(value) => setFilters((prev) => ({ ...prev, dateTo: value }))}
                  type="date"
                />
              </FilterField>
            </div>
          </div>
        )}

        {/* Mobile cards */}
        <div className="sm:hidden divide-y divide-black/5">
          {paginatedVehicles.map((vehicle, index) => (
            <div key={vehicle.VehicleId || `card-${index}`}>
              <VehicleCard
                vehicle={vehicle}
                index={(currentPage - 1) * ITEMS_PER_PAGE + index}
                isAdmin={isAdmin}
                onDelete={handleDelete}
                searchQuery={filters.query}
              />
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto print:block">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="ec-glassHeader bg-emerald-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-extrabold text-white uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-extrabold text-white uppercase tracking-wider">Image</th>
                <th className="px-6 py-3 text-left text-xs font-extrabold text-white uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-extrabold text-white uppercase tracking-wider">Brand</th>
                <th className="px-6 py-3 text-left text-xs font-extrabold text-white uppercase tracking-wider">Model</th>
                <th className="px-6 py-3 text-left text-xs font-extrabold text-white uppercase tracking-wider">Year</th>
                <th className="px-6 py-3 text-left text-xs font-extrabold text-white uppercase tracking-wider">Plate</th>
                <th className="px-6 py-3 text-right text-xs font-extrabold text-white uppercase tracking-wider">Market</th>
                <th className="px-6 py-3 text-right text-xs font-extrabold text-white uppercase tracking-wider">D.O.C.</th>
                <th className="px-6 py-3 text-right text-xs font-extrabold text-white uppercase tracking-wider">Vehicles70%</th>
                <th className="px-6 py-3 text-left text-xs font-extrabold text-white uppercase tracking-wider">Tax</th>
                <th className="px-6 py-3 text-left text-xs font-extrabold text-white uppercase tracking-wider">Condition</th>
                <th className="px-6 py-3 text-left text-xs font-extrabold text-white uppercase tracking-wider print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-transparent divide-y divide-black/5">
              {paginatedVehicles.map((vehicle, index) => {
                const derived = derivePrices(vehicle.PriceNew);
                const price40 = vehicle.Price40 ?? derived.Price40;
                const price70 = vehicle.Price70 ?? derived.Price70;
                const rowClass = index % 2 === 0 ? "ec-glassRow" : "ec-glassRowAlt";
                const vehicleId = vehicle.VehicleId;
                const displayNo = vehicleId || String(index + 1);
                const imageFileId = extractDriveFileId(vehicle.Image);
                const thumbUrl = imageFileId ? `${driveThumbnailUrl(imageFileId, "w100-h100")}?t=${Date.now()}` : vehicle.Image;

                return (
                  <tr
                    key={vehicleId || `row-${index}`}
                    onClick={() => {
                      if (!vehicleId) return;
                      router.push(`/vehicles/${encodeURIComponent(vehicleId)}/view`);
                    }}
                    className={`${rowClass} ${vehicleId ? "cursor-pointer" : ""} transition-colors`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {displayNo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {thumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumbUrl}
                          alt={`${vehicle.Brand} ${vehicle.Model}`}
                          loading="lazy"
                          decoding="async"
                          className="h-10 w-10 rounded-lg object-cover ring-1 ring-black/10 bg-white"
                        />
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right tabular-nums font-extrabold text-blue-700">
                      {vehicle.PriceNew == null ? "-" : `$${vehicle.PriceNew.toLocaleString()}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right tabular-nums font-extrabold text-orange-700">
                      {price40 == null ? "-" : `$${price40.toLocaleString()}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right tabular-nums font-extrabold text-emerald-700">
                      {price70 == null ? "-" : `$${price70.toLocaleString()}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {vehicle.TaxType || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {vehicle.Condition || "-"}
                    </td>
                    <td
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 print:hidden"
                      onClick={(e: React.MouseEvent<HTMLTableCellElement>) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (!vehicleId) return;
                            router.push(`/vehicles/${encodeURIComponent(vehicleId)}/view`);
                          }}
                          disabled={!vehicleId}
                          className="ec-btn ec-btnBlue px-3 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          View
                        </button>
                        {isAdmin ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                if (!vehicleId) return;
                                router.push(`/vehicles/${encodeURIComponent(vehicleId)}/edit`);
                              }}
                              disabled={!vehicleId}
                              className="ec-btn ec-btnPrimary px-3 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(vehicle)}
                              disabled={!vehicleId}
                              className="ec-btn ec-btnRed px-3 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              Delete
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="ec-glassPanelSoft p-4 border-t border-black/5 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="ec-btn px-3 py-2 text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="ec-btn px-3 py-2 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Image Modal */}
      <ImageModal
        isOpen={!!selectedImage}
        imageUrl={selectedImage?.url || ""}
        alt={selectedImage?.alt || ""}
        onClose={() => setSelectedImage(null)}
      />
    </div>
  );
}
