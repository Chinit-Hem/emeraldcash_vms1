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
    <div className="ec-glassPanel rounded-2xl shadow-xl ring-1 ring-black/5 overflow-hidden">
      <div className="ec-glassPanelSoft px-4 py-3 border-b border-black/5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-extrabold text-gray-900 truncate">{title}</div>
            {subtitle ? <div className="text-xs text-gray-600 mt-0.5 truncate">{subtitle}</div> : null}
          </div>
          {right ? <div className="shrink-0">{right}</div> : null}
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

