"use client";

import type { BarDatum } from "@/lib/analytics";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type VehiclesByBrandChartProps = {
  data: BarDatum[];
};

function shortLabel(label: string, max = 10) {
  const raw = String(label || "");
  if (raw.length <= max) return raw;
  return `${raw.slice(0, max - 1)}…`;
}

export default function VehiclesByBrandChart({ data }: VehiclesByBrandChartProps) {
  if (data.length === 0) {
    return <div className="h-[320px] flex items-center justify-center text-sm text-[var(--muted)]">No data</div>;
  }

  return (
    <div className="h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, bottom: 24, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--ec-chart-grid)" />
          <XAxis
            dataKey="name"
            interval={0}
            tick={{ fontSize: 12, fontWeight: 600, fill: "var(--ec-chart-axis)" }}
            stroke="var(--ec-chart-grid)"
            tickFormatter={(v) => shortLabel(String(v), 10)}
          />
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
          <Bar dataKey="value" fill="var(--ec-chart-emerald)" stroke="var(--ec-chart-axis)" strokeOpacity={0.18} strokeWidth={1} radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
