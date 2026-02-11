"use client";

import type { BarDatum } from "@/lib/analytics";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type MonthlyAddedChartProps = {
  data: BarDatum[];
};

export default function MonthlyAddedChart({ data }: MonthlyAddedChartProps) {
  if (data.length === 0) {
    return <div className="h-[320px] flex items-center justify-center text-sm text-[var(--muted)]">No time data</div>;
  }

  return (
    <div className="h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 24, left: 10 }}>
          <defs>
            <linearGradient id="vms-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--ec-chart-emerald)" stopOpacity={0.45} />
              <stop offset="100%" stopColor="var(--ec-chart-emerald)" stopOpacity={0.08} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--ec-chart-grid)" />
          <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 600, fill: "var(--ec-chart-axis)" }} stroke="var(--ec-chart-grid)" />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fontWeight: 600, fill: "var(--ec-chart-axis)" }} stroke="var(--ec-chart-grid)" />
          <Tooltip
            formatter={(value: unknown) => [String(value), "Vehicles"]}
            contentStyle={{
              background: "var(--ec-chart-tooltip-bg)",
              border: "1px solid var(--ec-chart-tooltip-border)",
              borderRadius: "12px",
              backdropFilter: "blur(12px)",
              boxShadow: "0 10px 26px rgba(8, 14, 22, 0.28)",
              color: "var(--text)",
            }}
            labelStyle={{ color: "var(--ec-chart-axis)", fontWeight: 700 }}
            itemStyle={{ color: "var(--text)" }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--ec-chart-emerald)"
            fill="url(#vms-area)"
            strokeWidth={2.4}
            activeDot={{ r: 5, fill: "var(--ec-chart-emerald)", stroke: "var(--ec-chart-axis)", strokeWidth: 1.5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
