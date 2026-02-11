"use client";

import { driveThumbnailUrl, extractDriveFileId } from "@/lib/drive";
import { derivePrices } from "@/lib/pricing";
import type { Vehicle } from "@/lib/types";
import { cn, ui } from "@/lib/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface VehicleTableProps {
  vehicles: Vehicle[];
  isAdmin: boolean;
  onEdit?: (vehicle: Vehicle) => void;
  onDelete: (vehicle: Vehicle) => void;
  sortField: keyof Vehicle | null;
  sortDirection: "asc" | "desc";
  onSort: (field: keyof Vehicle) => void;
}


type SortableField = "Brand" | "Model" | "Year" | "PriceNew" | "Condition" | "Category" | "Plate";

const SORTABLE_FIELDS: SortableField[] = ["Brand", "Model", "Year", "PriceNew", "Condition", "Category", "Plate"];

// SortHeader component - defined outside of VehicleTable to avoid "created during render" error
interface SortHeaderProps {
  field: SortableField;
  children: React.ReactNode;
  sortField: keyof Vehicle | null;
  sortDirection: "asc" | "desc";
  onSort: (field: keyof Vehicle) => void;
}

const SortHeader = ({ field, children, sortField, sortDirection, onSort }: SortHeaderProps) => {
  const isActive = sortField === field;
  return (
    <th
      onClick={() => onSort(field)}
      className={cn(
        ui.table.th,
        "sticky top-0 z-20 cursor-pointer select-none transition-colors hover:bg-slate-100 dark:hover:bg-white/10"
      )}
    >
      <div className="flex items-center gap-1">
        {children}
        <span className="inline-flex flex-col">
          <svg
            className={`h-3 w-3 ${isActive && sortDirection === "asc" ? "text-emerald-600 dark:text-emerald-300" : "text-slate-300 dark:text-slate-600"}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="m18 15-6-6-6 6" />
          </svg>
          <svg
            className={`-mt-1 h-3 w-3 ${isActive && sortDirection === "desc" ? "text-emerald-600 dark:text-emerald-300" : "text-slate-300 dark:text-slate-600"}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </div>
    </th>
  );
};

const COLUMNS = [
  { key: "id", label: "ID", visible: true },
  { key: "image", label: "Image", visible: true },
  { key: "category", label: "Category", visible: true },
  { key: "brand", label: "Brand", visible: true },
  { key: "model", label: "Model", visible: true },
  { key: "year", label: "Year", visible: true },
  { key: "plate", label: "Plate", visible: true },
  { key: "marketPrice", label: "Market Price", visible: true },
  { key: "price40", label: "D.O.C. 40%", visible: true },
  { key: "price70", label: "Vehicles 70%", visible: true },
  { key: "taxType", label: "Tax Type", visible: true },
  { key: "condition", label: "Condition", visible: true },
  { key: "bodyType", label: "Body Type", visible: true },
  { key: "color", label: "Color", visible: true },
  { key: "actions", label: "Actions", visible: true },
];

export default function VehicleTable({
  vehicles,
  isAdmin,
  onEdit,
  onDelete,
  sortField,
  sortDirection,
  onSort,
}: VehicleTableProps) {
  const router = useRouter();

  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [visibleColumns, setVisibleColumns] = useState(COLUMNS.map(c => c.key));
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  const handleImageError = (vehicleId: string) => {
    setImageErrors((prev) => new Set(prev).add(vehicleId));
  };

  const formatPrice = (price: number | null) => {
    if (price == null) return "-";
    return `$${price.toLocaleString()}`;
  };

  const toggleColumn = (columnKey: string) => {
    setVisibleColumns(prev =>
      prev.includes(columnKey)
        ? prev.filter(k => k !== columnKey)
        : [...prev, columnKey]
    );
  };

  return (
    <div className="hidden lg:block">
      {/* Column Visibility Menu */}
      <div className="flex justify-end mb-4">
        <div className="relative">
          <button
            onClick={() => setShowColumnMenu(!showColumnMenu)}
            className={cn(
              ui.button.base,
              ui.button.size.sm,
              ui.button.secondary,
              "px-3 text-sm"
            )}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="h-4 w-4"
            >
              <path d="M12 3h.01" />
              <path d="M12 7h.01" />
              <path d="M12 11h.01" />
              <path d="M12 15h.01" />
              <path d="M12 19h.01" />
            </svg>
            Columns
          </button>
          {showColumnMenu && (
            <div className="absolute right-0 z-30 mt-2 w-56 rounded-xl border border-[var(--border)] bg-[var(--card)] p-1 shadow-[0_14px_28px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-slate-900/95 dark:backdrop-blur-xl">
              <div className="p-2">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Visible Columns
                </div>
                {COLUMNS.map((column) => (
                  <label key={column.key} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/10">
                    <input
                      type="checkbox"
                      checked={visibleColumns.includes(column.key)}
                      onChange={() => toggleColumn(column.key)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-600"
                    />
                    <span className="text-sm text-[var(--text)]">{column.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={cn(ui.table.wrapper, "max-h-[70vh]")}>
        <table className={ui.table.table}>
          <thead className={ui.table.head}>
            <tr className={ui.table.headRow}>

              <th className={ui.table.th}>
                ID
              </th>
              <th className={cn(ui.table.th, "w-16")}>
                Image
              </th>
              <SortHeader field="Category" sortField={sortField} sortDirection={sortDirection} onSort={onSort}>Category</SortHeader>
              <SortHeader field="Brand" sortField={sortField} sortDirection={sortDirection} onSort={onSort}>Brand</SortHeader>
              <SortHeader field="Model" sortField={sortField} sortDirection={sortDirection} onSort={onSort}>Model</SortHeader>
              <SortHeader field="Year" sortField={sortField} sortDirection={sortDirection} onSort={onSort}>Year</SortHeader>
              <SortHeader field="Plate" sortField={sortField} sortDirection={sortDirection} onSort={onSort}>Plate</SortHeader>
              <th className={cn(ui.table.th, "text-right")}>
                Market Price
              </th>
              <th className={cn(ui.table.th, "text-right")}>
                D.O.C. 40%
              </th>
              <th className={cn(ui.table.th, "text-right")}>
                Vehicles 70%
              </th>
              <th className={ui.table.th}>
                Tax Type
              </th>
              <SortHeader field="Condition" sortField={sortField} sortDirection={sortDirection} onSort={onSort}>Condition</SortHeader>
              <th className={ui.table.th}>
                Body Type
              </th>
              <th className={ui.table.th}>
                Color
              </th>
              <th className={cn(ui.table.th, "w-32 text-center")}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((vehicle, index) => {
              const derived = derivePrices(vehicle.PriceNew);
              const price40 = vehicle.Price40 ?? derived.Price40;
              const price70 = vehicle.Price70 ?? derived.Price70;
              const vehicleId = vehicle.VehicleId;
              const imageFileId = extractDriveFileId(vehicle.Image);
              const thumbUrl = imageFileId && !imageErrors.has(vehicleId)
                ? `${driveThumbnailUrl(imageFileId, "w100-h100")}`
                : null;

              return (
              <tr
                key={vehicleId || `row-${index}`}
                className={cn(
                  ui.table.tr,
                  "transition-colors duration-150",
                  index % 2 !== 0 && "bg-slate-50/70 dark:bg-white/[0.01]"
                )}
              >

                  {/* Vehicle ID */}
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-500 dark:text-gray-400">
                    {vehicle.VehicleId || "-"}
                  </td>

                  {/* Image */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {thumbUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumbUrl}
                        alt={`${vehicle.Brand} ${vehicle.Model}`}
                        className="h-12 w-12 rounded-lg object-cover ring-1 ring-black/10 bg-white"
                        onError={() => handleImageError(vehicleId)}
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.5}
                          className="h-5 w-5 text-gray-400"
                        >
                          <rect width="18" height="18" x="3" y="3" rx="2" />
                          <circle cx="9" cy="9" r="2" />
                          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                        </svg>
                      </div>
                    )}
                  </td>

                  {/* Category */}
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {vehicle.Category || "-"}
                  </td>

                  {/* Brand */}
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {vehicle.Brand || "-"}
                  </td>

                  {/* Model */}
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {vehicle.Model || "-"}
                  </td>

                  {/* Year */}
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {vehicle.Year || "-"}
                  </td>

                  {/* Plate */}
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-600 dark:text-gray-400">
                    {vehicle.Plate || "-"}
                  </td>

                  {/* Market Price */}
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    {formatPrice(vehicle.PriceNew)}
                  </td>

                  {/* D.O.C. 40% */}
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-semibold text-red-700 dark:text-red-300">
                    {formatPrice(price40)}
                  </td>

                  {/* Vehicles 70% */}
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatPrice(price70)}
                  </td>

                  {/* Tax Type */}
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {vehicle.TaxType || "-"}
                  </td>

                  {/* Condition */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        vehicle.Condition === "New"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : vehicle.Condition === "Used"
                          ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {vehicle.Condition || "Unknown"}
                    </span>
                  </td>

                  {/* Body Type */}
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {vehicle.BodyType || "-"}
                  </td>

                  {/* Color */}
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {vehicle.Color || "-"}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => router.push(`/vehicles/${encodeURIComponent(vehicleId)}/view`)}
                        className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors touch-target"
                        title="View"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          className="h-4 w-4"
                        >
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                      {isAdmin && (
                        <>
                      <button
                        onClick={() => onEdit ? onEdit(vehicle) : router.push(`/vehicles/${encodeURIComponent(vehicleId)}/edit`)}
                        className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-900/30 transition-colors touch-target"
                        title="Edit"
                      >

                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              className="h-4 w-4"
                            >
                              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => onDelete(vehicle)}
                            className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors touch-target"
                            title="Delete"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              className="h-4 w-4"
                            >
                              <path d="M3 6h18" />
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
