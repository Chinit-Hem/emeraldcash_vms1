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
            <h3 className="text-sm font-bold text-[var(--text)] truncate">{title}</h3>
            {subtitle ? <p className="mt-0.5 truncate text-xs text-[var(--muted)]">{subtitle}</p> : null}
          </div>
          {right ? <div className="shrink-0">{right}</div> : null}
        </div>
      </div>
      <div className="ec-chart-card-body">{children}</div>
    </div>
  );
}
