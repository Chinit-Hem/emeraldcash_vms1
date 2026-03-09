"use client";

import { isIOSSafariBrowser } from "@/lib/platform";
import { useEffect, useState } from "react";

type KpiCardProps = {
  label: string;
  value: string;
  sublabel?: string;
  subtitle?: string;
  accent?: "green" | "blue" | "orange" | "red" | "gray";
  onClick?: () => void;
};

function accentClasses(accent: KpiCardProps["accent"], isIOSSafari: boolean) {
  if (isIOSSafari) {
    // iOS: Simple border colors without glass effects
    if (accent === "blue") return "border-t-2 border-emerald-500";
    if (accent === "orange") return "border-t-2 border-orange-500";
    if (accent === "red") return "border-t-2 border-red-500";
    if (accent === "gray") return "border-t-2 border-gray-400";
    return "border-t-2 border-emerald-500";
  }
  // Desktop: Full glass effects
  if (accent === "blue") return "ec-metric-card-accent-blue";
  if (accent === "orange") return "ec-metric-card-accent-orange";
  if (accent === "red") return "ec-metric-card-accent-red";
  if (accent === "gray") return "ec-metric-card-accent-gray";
  return "";
}

export default function KpiCard({ label, value, sublabel, subtitle, accent = "green", onClick }: KpiCardProps) {
  const [isIOSSafari, setIsIOSSafari] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsIOSSafari(isIOSSafariBrowser());
    }
  }, []);

  // iOS-safe card classes
  const cardClass = isIOSSafari
    ? `bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700 shadow-sm ${accentClasses(accent, true)} ${onClick ? "cursor-pointer active:scale-95" : "cursor-default"}`
    : `ec-metric-card ${accentClasses(accent, false)} ${onClick ? "" : "cursor-default"}`;

  return (
    <div
      className={cardClass}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-3xl font-bold text-slate-800 dark:text-white tabular-nums tracking-tight">
        {value}
      </div>
      {sublabel ? (
        <div className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
          {sublabel}
        </div>
      ) : null}
      {subtitle ? (
        <div className="mt-1 text-xs italic text-slate-500/80 dark:text-slate-400/80">
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}
