"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { ChartTooltipContent, ChartContainer } from "@/components/ui/chart"
import type { CohortPerformanceData } from "@/lib/types"

interface CohortAnalysisProps {
  data: CohortPerformanceData[];
}

const chartConfig = {
    puntaje: {
      label: "Puntaje Promedio",
      color: "hsl(var(--primary))",
    },
}

export function CohortAnalysis({ data }: CohortAnalysisProps) {
  return (
    <div className="h-[400px] w-full">
        <ChartContainer config={chartConfig} className="w-full h-full">
            <BarChart data={data} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis
                    dataKey="month"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                />
                <YAxis
                    domain={[60, 100]}
                />
                <Tooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                />
                <Legend />
                <Bar dataKey="Puntaje Promedio" fill="var(--color-puntaje)" radius={4} />
            </BarChart>
        </ChartContainer>
    </div>
  )
}
