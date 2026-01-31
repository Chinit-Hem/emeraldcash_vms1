"use client";

import type { PieDatum } from "@/lib/analytics";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type NewVsUsedChartProps = {
  data: PieDatum[];
};

export default function NewVsUsedChart({ data }: NewVsUsedChartProps) {
  if (data.length === 0) {
    return <div className="h-[260px] flex items-center justify-center text-sm text-gray-600">No data</div>;
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
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value: unknown) => [String(value), "Vehicles"]} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

