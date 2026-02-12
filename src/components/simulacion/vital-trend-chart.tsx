"use client";

import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import type { Vitals } from "@/lib/types";

interface VitalTrendChartProps {
  data: (Pick<Vitals, 'heartRate' | 'respiratoryRate' | 'temperature'>)[];
  dataKey: keyof Vitals;
  strokeColor: string;
}

export function VitalTrendChart({ data, dataKey, strokeColor }: VitalTrendChartProps) {
  const domain = [
      Math.min(...data.map(d => d[dataKey] as number)) - 5,
      Math.max(...data.map(d => d[dataKey] as number)) + 5,
  ]

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
