"use client";

import { useAuthUser } from "@/app/components/AuthContext";
import ChartCard from "@/app/components/dashboard/ChartCard";
import KpiCard from "@/app/components/dashboard/KpiCard";
import MonthlyAddedChart from "@/app/components/dashboard/charts/MonthlyAddedChart";
import NewVsUsedChart from "@/app/components/dashboard/charts/NewVsUsedChart";
import PriceDistributionChart from "@/app/components/dashboard/charts/PriceDistributionChart";
import VehiclesByBrandChart from "@/app/components/dashboard/charts/VehiclesByBrandChart";
import VehiclesByCategoryChart from "@/app/components/dashboard/charts/VehiclesByCategoryChart";
import {
  buildMonthlyAdded,
  buildNewVsUsed,
  buildPriceDistribution,
  buildVehiclesByBrand,
  buildVehiclesByCategory,
  marketPriceStats,
  normalizeCategoryLabel,
  normalizeConditionLabel,
} from "@/lib/analytics";
import { getCambodiaNowString } from "@/lib/cambodiaTime";
import type { Vehicle } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

function formatMoney(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `$${Math.round(value).toLocaleString()}`;
}

export default function Dashboard() {
  const user = useAuthUser();
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false); // Background refresh only
  const [vehiclesError, setVehiclesError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [cambodiaNow, setCambodiaNow] = useState(() => getCambodiaNowString());
  const fetchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => setCambodiaNow(getCambodiaNowString()), 1000);
    return () => window.clearInterval(interval);
  }, []);

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

  const fetchVehicles = async () => {
    fetchAbortRef.current?.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    setIsRefreshing(true);
    setVehiclesError("");
    try {
      const res = await fetch("/api/vehicles", { cache: "no-store", signal: controller.signal });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch vehicles");
      const data = await res.json();
      const newVehicles = (data.data || []) as Vehicle[];
      setVehicles(newVehicles);
      setLastUpdated(getCambodiaNowString());
      // Save to localStorage
      try {
        localStorage.setItem("vms-vehicles", JSON.stringify(newVehicles));
      } catch {
        // Ignore storage errors
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setVehiclesError(err instanceof Error ? err.message : "Error loading vehicles");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // Fetch fresh data in background
    void fetchVehicles();
    return () => {
      fetchAbortRef.current?.abort();
      fetchAbortRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const kpis = useMemo(() => {
    const countsByCategory: Record<string, number> = { Cars: 0, Motorcycles: 0, "Tuk Tuk": 0, Other: 0 };
    const countsByCondition: Record<string, number> = { New: 0, Used: 0, Other: 0 };
    let noImagesCount = 0;

    for (const v of vehicles) {
      countsByCategory[normalizeCategoryLabel(v.Category)] += 1;
      countsByCondition[normalizeConditionLabel(v.Condition)] += 1;
      if (!v.Image || v.Image.trim() === "") {
        noImagesCount += 1;
      }
    }

    const stats = marketPriceStats(vehicles);
    return {
      total: vehicles.length,
      cars: countsByCategory.Cars ?? 0,
      motorcycles: countsByCategory.Motorcycles ?? 0,
      tukTuk: countsByCategory["Tuk Tuk"] ?? 0,
      newCount: countsByCondition.New ?? 0,
      usedCount: countsByCondition.Used ?? 0,
      noImagesCount,
      totalMarketValue: stats.sum,
      avgPrice: stats.avg,
      medianPrice: stats.median,
      pricedCount: stats.count,
    };
  }, [vehicles]);

  const byCategory = useMemo(() => buildVehiclesByCategory(vehicles), [vehicles]);
  const byBrand = useMemo(() => buildVehiclesByBrand(vehicles, 12), [vehicles]);
  const priceDistribution = useMemo(() => buildPriceDistribution(vehicles), [vehicles]);
  const newVsUsed = useMemo(() => buildNewVsUsed(vehicles), [vehicles]);
  const monthlyAdded = useMemo(() => buildMonthlyAdded(vehicles), [vehicles]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 rounded-2xl overflow-hidden shadow-xl ring-1 ring-black/5 ec-glassPanel">
        <div className="bg-gradient-to-r from-green-800/95 via-green-700/95 to-green-600/95 px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Dashboard</h1>
              <p className="text-green-50/90 mt-1 text-sm">
                Welcome, <span className="font-semibold text-white">{user.username}</span> • Role:{" "}
                <span className="font-semibold text-white">{user.role}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => fetchVehicles()} className="ec-btn ec-btnBlue text-sm flex items-center gap-2">
                {isRefreshing ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Refreshing...</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                      <path d="M3 3v5h5" />
                      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                      <path d="M16 21h5v-5" />
                    </svg>
                    <span>Refresh</span>
                  </>
                )}
              </button>
              <div className="text-xs text-white/90 font-semibold">
                Cambodia time: <span className="font-mono text-white">{cambodiaNow}</span>
              </div>
            </div>
          </div>
          {lastUpdated ? (
            <div className="mt-2 text-xs text-white/80 flex items-center gap-2">
              <span>Last updated: <span className="font-mono">{lastUpdated}</span></span>
              {isRefreshing && (
                <span className="flex items-center gap-1">
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Syncing...
                </span>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {vehiclesError ? (
        <div className="mb-4 ec-glassPanel rounded-2xl shadow-xl ring-1 ring-black/5 p-4 text-red-700">
          {vehiclesError}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
          <KpiCard label="Total Vehicles" value={kpis.total.toLocaleString()} accent="green" />
          <KpiCard label="Cars" value={kpis.cars.toLocaleString()} accent="blue" />
          <KpiCard
            label="Motorcycles"
            value={kpis.motorcycles.toLocaleString()}
            accent="orange"
          />
          <KpiCard label="Tuk Tuk" value={kpis.tukTuk.toLocaleString()} accent="green" />
          <KpiCard label="New" value={kpis.newCount.toLocaleString()} accent="green" />
          <KpiCard label="Used" value={kpis.usedCount.toLocaleString()} accent="orange" />
          <KpiCard label="No Images" value={kpis.noImagesCount.toLocaleString()} accent="red" />
        </div>

        <div className="lg:col-span-6">
          <ChartCard title="Vehicles by Category" subtitle="Distribution across categories">
            <VehiclesByCategoryChart data={byCategory} />
          </ChartCard>
        </div>

        <div className="lg:col-span-6">
          <ChartCard title="New vs Used" subtitle="Condition ratio">
            <NewVsUsedChart data={newVsUsed} />
          </ChartCard>
        </div>

        <div className="lg:col-span-12">
          <ChartCard title="Vehicles by Brand" subtitle="Top brands (others grouped)">
            <VehiclesByBrandChart data={byBrand} />
          </ChartCard>
        </div>

        <div className="lg:col-span-12">
          <ChartCard title="Monthly Added Vehicles" subtitle="Based on Time column">
            <MonthlyAddedChart data={monthlyAdded} />
          </ChartCard>
        </div>

        <div className="lg:col-span-12">
          <ChartCard
            title="Market Price Distribution"
            subtitle={`Histogram of MARKET PRICE (priced vehicles: ${kpis.pricedCount.toLocaleString()})`}
            right={
              <div className="text-xs text-gray-600 font-semibold text-right">
                <div>
                  Total: <span className="font-mono text-gray-900">{formatMoney(kpis.totalMarketValue)}</span>
                </div>
                <div>
                  Avg: <span className="font-mono text-gray-900">{formatMoney(kpis.avgPrice)}</span> • Median:{" "}
                  <span className="font-mono text-gray-900">{formatMoney(kpis.medianPrice)}</span>
                </div>
              </div>
            }
          >
            <PriceDistributionChart data={priceDistribution} />
          </ChartCard>
        </div>
      </div>
    </div>
  );
}

