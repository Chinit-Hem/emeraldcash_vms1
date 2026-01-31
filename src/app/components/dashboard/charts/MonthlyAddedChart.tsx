"use client";

import type { BarDatum } from "@/lib/analytics";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type MonthlyAddedChartProps = {
  data: BarDatum[];
};

export default function MonthlyAddedChart({ data }: MonthlyAddedChartProps) {
  if (data.length === 0) {
    return <div className="h-[320px] flex items-center justify-center text-sm text-gray-600">No time data</div>;
  }

  return (
    <div className="h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 24, left: 10 }}>
          <defs>
            <linearGradient id="vms-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.42} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.08} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value: unknown) => [String(value), "Vehicles"]} />
          <Area type="monotone" dataKey="value" stroke="#10b981" fill="url(#vms-area)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

