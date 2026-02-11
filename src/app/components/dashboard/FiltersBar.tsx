"use client";

import { GlassButton } from "@/app/components/ui/GlassButton";
import { GlassInput } from "@/app/components/ui/GlassInput";
import { useEffect, useMemo, useState } from "react";
import type { Vehicle } from "@/lib/types";
import { COLOR_OPTIONS } from "@/lib/types";

interface FilterState {
  search: string;
  category: string;
  brand: string;
  yearMin: string;
  yearMax: string;
  priceMin: string;
  priceMax: string;
  condition: string;
  color: string;
  dateFrom: string;
  dateTo: string;
  withoutImage: boolean;
}

interface FiltersBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  vehicles: Vehicle[];
  resultCount: number;
  totalCount: number;
  isFiltered?: boolean;
  onClearFilters?: () => void;
}


const CATEGORIES = ["All", "Cars", "Motorcycles", "Tuk Tuk"];
const CONDITIONS = ["All", "New", "Used"];

export default function FiltersBar({
  filters,
  onFilterChange,
  vehicles,
  resultCount,
  totalCount,
  isFiltered: propIsFiltered,
  onClearFilters,
}: FiltersBarProps) {

  // Extract unique brands from vehicles
  const brands = useMemo(() => {
    const brandSet = new Set(vehicles.map((v) => v.Brand).filter(Boolean));
    return ["All", ...Array.from(brandSet).sort()];
  }, [vehicles]);

  const handleChange = (key: keyof FilterState, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const handleClear = () => {
    onFilterChange({
      search: "",
      category: "All",
      brand: "All",
      yearMin: "",
      yearMax: "",
      priceMin: "",
      priceMax: "",
      condition: "All",
      color: "All",
      dateFrom: "",
      dateTo: "",
      withoutImage: false,
    });
  };

  // Use prop if provided, otherwise compute locally
  const hasActiveFilters = propIsFiltered !== undefined 
    ? propIsFiltered 
    : filters.search ||
      filters.category !== "All" ||
      filters.brand !== "All" ||
      filters.yearMin ||
      filters.yearMax ||
      filters.priceMin ||
      filters.priceMax ||
      filters.condition !== "All" ||
      filters.color !== "All" ||
      filters.dateFrom ||
      filters.dateTo ||
      filters.withoutImage;

  const hasAdvancedFilters =
    filters.category !== "All" ||
    filters.brand !== "All" ||
    filters.yearMin ||
    filters.yearMax ||
    filters.priceMin ||
    filters.priceMax ||
    filters.condition !== "All" ||
    filters.color !== "All" ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.withoutImage;

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(hasAdvancedFilters);

  useEffect(() => {
    if (hasAdvancedFilters) {
      setShowAdvancedFilters(true);
    }
  }, [hasAdvancedFilters]);


  // Active filter chips
  const activeFilters = useMemo(() => {
    const chips = [];
    if (filters.search) chips.push({ key: "search", label: `Search: "${filters.search}"` });
    if (filters.category !== "All") chips.push({ key: "category", label: `Category: ${filters.category}` });
    if (filters.brand !== "All") chips.push({ key: "brand", label: `Brand: ${filters.brand}` });
    if (filters.condition !== "All") chips.push({ key: "condition", label: `Condition: ${filters.condition}` });
    if (filters.color !== "All") chips.push({ key: "color", label: `Color: ${filters.color}` });
    if (filters.yearMin || filters.yearMax) {
      const yearLabel = [filters.yearMin, filters.yearMax].filter(Boolean).join(" - ");
      chips.push({ key: "year", label: `Year: ${yearLabel}` });
    }
    if (filters.priceMin || filters.priceMax) {
      const priceLabel = [filters.priceMin, filters.priceMax].filter(Boolean).map(p => `$${p}`).join(" - ");
      chips.push({ key: "price", label: `Price: ${priceLabel}` });
    }
    if (filters.dateFrom || filters.dateTo) {
      const dateLabel = [filters.dateFrom, filters.dateTo].filter(Boolean).join(" to ");
      chips.push({ key: "date", label: `Date: ${dateLabel}` });
    }
    if (filters.withoutImage) chips.push({ key: "withoutImage", label: "No Images" });
    return chips;
  }, [filters]);

  const removeFilter = (key: string) => {
    switch (key) {
      case "search":
        handleChange("search", "");
        break;
      case "category":
        handleChange("category", "All");
        break;
      case "brand":
        handleChange("brand", "All");
        break;
      case "condition":
        handleChange("condition", "All");
        break;
      case "color":
        handleChange("color", "All");
        break;
      case "year":
        handleChange("yearMin", "");
        handleChange("yearMax", "");
        break;
      case "price":
        handleChange("priceMin", "");
        handleChange("priceMax", "");
        break;
      case "date":
        handleChange("dateFrom", "");
        handleChange("dateTo", "");
        break;
      case "withoutImage":
        onFilterChange({ ...filters, withoutImage: false });
        break;
    }
  };

  return (
    <div className="ec-glassPanel rounded-2xl p-4 mb-6">
      {/* Header with result count */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Filters
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing {resultCount} of {totalCount} vehicles
          </p>
        </div>
        <div className="flex items-center gap-2">
          <GlassButton
            variant="secondary"
            size="sm"
            onClick={() => setShowAdvancedFilters((prev) => !prev)}
          >
            {showAdvancedFilters ? "Hide Filters" : "More Filters"}
          </GlassButton>
          <GlassButton variant="outline" size="sm">
            Apply Filters
          </GlassButton>
          {hasActiveFilters && (
            <GlassButton 
              variant="ghost" 
              size="sm" 
              onClick={onClearFilters || handleClear}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 mr-1"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
              Reset
            </GlassButton>
          )}

        </div>
      </div>

      {/* Active Filter Chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {activeFilters.map((chip) => (
            <div
              key={chip.key}
              className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 rounded-full text-sm"
            >
              <span>{chip.label}</span>
              <button
                onClick={() => removeFilter(chip.key)}
                className="ml-1 hover:bg-emerald-200 dark:hover:bg-emerald-800/50 rounded-full p-0.5"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="h-3 w-3"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Search
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder="Brand, Model, or Plate..."
            value={filters.search}
            onChange={(e) => handleChange("search", e.target.value)}
            className="w-full px-4 py-2.5 pl-10 bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>
      </div>

      {/* Advanced Filter Grid */}
      {showAdvancedFilters && (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">

        {/* Category */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Category
          </label>
          <select
            value={filters.category}
            onChange={(e) => handleChange("category", e.target.value)}
            className="w-full px-3 py-2.5 bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Brand */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Brand
          </label>
          <select
            value={filters.brand}
            onChange={(e) => handleChange("brand", e.target.value)}
            className="w-full px-3 py-2.5 bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            {brands.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
        </div>

        {/* Condition */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Condition
          </label>
          <select
            value={filters.condition}
            onChange={(e) => handleChange("condition", e.target.value)}
            className="w-full px-3 py-2.5 bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            {CONDITIONS.map((cond) => (
              <option key={cond} value={cond}>
                {cond}
              </option>
            ))}
          </select>
        </div>

        {/* Year Range */}
        <div className="sm:col-span-2 lg:col-span-1">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Year Range
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Min"
              value={filters.yearMin}
              onChange={(e) => handleChange("yearMin", e.target.value)}
              className="w-full px-3 py-2.5 bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            <input
              type="number"
              placeholder="Max"
              value={filters.yearMax}
              onChange={(e) => handleChange("yearMax", e.target.value)}
              className="w-full px-3 py-2.5 bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
        </div>

        {/* Price Range */}
        <div className="sm:col-span-2 lg:col-span-1">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Price Range ($)
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Min"
              value={filters.priceMin}
              onChange={(e) => handleChange("priceMin", e.target.value)}
              className="w-full px-3 py-2.5 bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            <input
              type="number"
              placeholder="Max"
              value={filters.priceMax}
              onChange={(e) => handleChange("priceMax", e.target.value)}
              className="w-full px-3 py-2.5 bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
        </div>

        {/* Color */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Color
          </label>
          <select
            value={filters.color}
            onChange={(e) => handleChange("color", e.target.value)}
            className="w-full px-3 py-2.5 bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <option value="All">All Colors</option>
            {COLOR_OPTIONS.map((color) => (
              <option key={color.value} value={color.value}>
                {color.value}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range */}
        <div className="sm:col-span-2 lg:col-span-1">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Date Range
          </label>
          <div className="flex gap-2">
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleChange("dateFrom", e.target.value)}
              className="w-full px-3 py-2.5 bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleChange("dateTo", e.target.value)}
              className="w-full px-3 py-2.5 bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
