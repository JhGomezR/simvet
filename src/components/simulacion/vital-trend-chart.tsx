"use client";

import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import type { Vitals } from "@/lib/types";

interface VitalTrendChartProps {
  data: (Pick<Vitals, 'heartRate' | 'respiratoryRate' | 'temperature'>)[];
  dataKey: keyof Vitals;
  strokeColor: string;
}

export function VitalTrendChart({ data, dataKey, strokeColor }: VitalTrendChartProps) {
  const values = data.map((d) => (d as Record<string, number>)[dataKey as string]);
  const domain = [Math.min(...values) - 5, Math.max(...values) + 5];

  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={data}>
        <YAxis domain={domain} hide />
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={strokeColor}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
