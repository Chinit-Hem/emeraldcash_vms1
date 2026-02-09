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
import { GlassButton } from "@/app/components/ui/GlassButton";

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

  // Formats supported:
  // - YYYY-MM-DD HH:mm:ss
  // - YYYY-MM-DDTHH:mm:ss
  // - MM/DD/YYYY HH:mm:ss
  let match = raw.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ ]((\d{1,2}):(\d{2})(?::(\d{2}))?))?/
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
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ ]((\d{1,2}):(\d{2})(?::(\d{2}))?))?/
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

function parseTimeToMinutes(value: string): number | null {
  const raw = value.trim();
  if (!raw) return null;
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hour = Number.parseInt(match[1] ?? "", 10);
  const minute = Number.parseInt(match[2] ?? "", 10);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23) return null;
  if (minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
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

export default function VehicleList({ category }: VehicleListProps) {
  const router = useRouter();
  const user = useAuthUser();
  const isAdmin = user.role === "Admin";
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState("");
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<string, Vehicle>>(new Map());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filters, setFilters] = useState<VehicleFilters>((() => ({
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
  })));

  // Load from cache immediately on mount + subscribe to cache updates
  useEffect(() => {
    const cached = readVehicleCache();
    if (cached) setVehicles(cached);
    return onVehicleCacheUpdate((nextVehicles) => setVehicles(nextVehicles));
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
          // Clear optimistic updates since we have fresh data
          setOptimisticUpdates(new Map());
          // Save to localStorage + notify listeners
          writeVehicleCache(nextVehicles);
        }
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : "Error loading vehicles");
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
