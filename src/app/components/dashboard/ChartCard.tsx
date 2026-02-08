"use client";

import type { ReactNode } from "react";

type ChartCardProps = {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
};

export default function ChartCard({ title, subtitle, right, children }: ChartCardProps) {
  return (
    <div className="ec-chart-card">
      <div className="ec-chart-card-header">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white truncate">{title}</h3>
            {subtitle ? <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{subtitle}</p> : null}
          </div>
          {right ? <div className="shrink-0">{right}</div> : null}
        </div>
      </div>
      <div className="ec-chart-card-body">{children}</div>
    </div>
  );
}
