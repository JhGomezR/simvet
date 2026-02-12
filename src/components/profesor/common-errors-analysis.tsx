"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { ChartTooltipContent, ChartContainer } from "@/components/ui/chart"
import type { CommonErrorData } from "@/lib/types"

interface CommonErrorsAnalysisProps {
  data: CommonErrorData[];
}

const chartConfig = {
    frecuencia: {
      label: "Frecuencia",
      color: "hsl(var(--destructive))",
    },
}

export function CommonErrorsAnalysis({ data }: CommonErrorsAnalysisProps) {
  return (
    <div className="h-[400px] w-full">
        <ChartContainer config={chartConfig} className="w-full h-full">
            <BarChart 
                data={data}
                layout="vertical"
                margin={{ left: 20, right: 20, top: 20, bottom: 20 }}
            >
                <CartesianGrid horizontal={false} />
                <YAxis
                    dataKey="error"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    width={180}
                />
                <XAxis dataKey="Frecuencia" type="number" />
                <Tooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                />
                <Legend />
                <Bar dataKey="Frecuencia" fill="var(--color-frecuencia)" radius={4} />
            </BarChart>
        </ChartContainer>
    </div>
  )
}
