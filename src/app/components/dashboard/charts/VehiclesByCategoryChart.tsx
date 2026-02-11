"use client";

import type { PieDatum } from "@/lib/analytics";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type VehiclesByCategoryChartProps = {
  data: PieDatum[];
};

export default function VehiclesByCategoryChart({ data }: VehiclesByCategoryChartProps) {
  if (data.length === 0) {
    return <div className="h-[260px] flex items-center justify-center text-sm text-[var(--muted)]">No data</div>;
  }

  return (
    <div className="h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={2}
            stroke="var(--ec-chart-axis)"
            strokeOpacity={0.18}
            strokeWidth={1}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
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
          <Legend wrapperStyle={{ color: "var(--ec-chart-axis)", fontSize: 12, fontWeight: 600 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
