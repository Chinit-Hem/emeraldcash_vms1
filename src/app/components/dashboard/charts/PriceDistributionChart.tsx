"use client";

import type { BarDatum } from "@/lib/analytics";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type PriceDistributionChartProps = {
  data: BarDatum[];
};

export default function PriceDistributionChart({ data }: PriceDistributionChartProps) {
  if (data.length === 0) {
    return <div className="h-[320px] flex items-center justify-center text-sm text-gray-600">No price data</div>;
  }

  return (
    <div className="h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, bottom: 24, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
          <XAxis dataKey="name" interval={0} tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value: unknown) => [String(value), "Vehicles"]} />
          <Bar dataKey="value" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

