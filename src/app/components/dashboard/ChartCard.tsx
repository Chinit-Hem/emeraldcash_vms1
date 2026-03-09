"use client";

import { isIOSSafariBrowser } from "@/lib/platform";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

type ChartCardProps = {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
};

export default function ChartCard({ title, subtitle, right, children }: ChartCardProps) {
  const [isIOSSafari, setIsIOSSafari] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsIOSSafari(isIOSSafariBrowser());
    }
  }, []);

  // iOS-safe classes
  const cardClass = isIOSSafari
    ? "bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden"
    : "ec-chart-card dark:bg-slate-900/40 dark:backdrop-blur-xl dark:border dark:border-white/10 dark:shadow-2xl";

  const headerClass = isIOSSafari
    ? "p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50"
    : "ec-chart-card-header dark:bg-slate-800/30 dark:border-white/5";

  return (
    <div className={cardClass}>
      <div className={headerClass}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-slate-800 dark:text-white">{title}</h3>
            {subtitle ? <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
          </div>
          {right ? <div className="shrink-0">{right}</div> : null}
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
