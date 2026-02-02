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
    return <div className="h-[320px] flex items-center justify-center text-sm text-gray-600">No data</div>;
  }

  return (
    <div className="h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, bottom: 24, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
          <XAxis
            dataKey="name"
            interval={0}
            tick={{ fontSize: 12 }}
            tickFormatter={(v) => shortLabel(String(v), 10)}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value: unknown) => [String(value), "Vehicles"]} />
          <Bar dataKey="value" fill="#2563eb" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

