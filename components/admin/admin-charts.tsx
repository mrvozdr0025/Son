"use client"

import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const activityConfig = {
  topics: { label: "Konular", color: "var(--chart-1)" },
  comments: { label: "Yorumlar", color: "var(--chart-2)" },
  views: { label: "Görüntülenme", color: "var(--chart-3)" },
} satisfies ChartConfig

export function ActivityChart({
  data,
}: {
  data: { day: string; topics: number; comments: number; views?: number }[]
}) {
  return (
    <ChartContainer config={activityConfig} className="h-64 w-full">
      <LineChart data={data} margin={{ left: 0, right: 12 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} />
        <YAxis tickLine={false} axisLine={false} width={30} fontSize={11} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line type="monotone" dataKey="topics" stroke="var(--color-topics)" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="comments" stroke="var(--color-comments)" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="views" stroke="var(--color-views)" strokeWidth={2} dot={false} />
      </LineChart>
    </ChartContainer>
  )
}

const categoryConfig = {
  topics: { label: "Konu", color: "var(--chart-1)" },
} satisfies ChartConfig

export function CategoryChart({ data }: { data: { name: string; topics: number }[] }) {
  return (
    <ChartContainer config={categoryConfig} className="h-64 w-full">
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 12 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="name"
          tickLine={false}
          axisLine={false}
          width={90}
          fontSize={11}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="topics" fill="var(--color-topics)" radius={4} />
      </BarChart>
    </ChartContainer>
  )
}
