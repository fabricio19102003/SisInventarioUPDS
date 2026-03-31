"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts"

// ─── Bar Chart ───────────────────────────────────────────────────────────────

interface BarChartData {
  name: string
  [key: string]: string | number
}

interface SimpleBarChartProps {
  data: BarChartData[]
  bars: { dataKey: string; color: string; name?: string }[]
  height?: number
  showGrid?: boolean
  showLegend?: boolean
}

export function SimpleBarChart({
  data,
  bars,
  height = 300,
  showGrid = true,
  showLegend = false,
}: SimpleBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}
        <XAxis
          dataKey="name"
          tick={{ fontSize: 12 }}
          className="fill-muted-foreground"
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 12 }}
          className="fill-muted-foreground"
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "var(--radius)",
            fontSize: 12,
            color: "hsl(var(--popover-foreground))",
          }}
        />
        {showLegend && <Legend />}
        {bars.map((bar) => (
          <Bar
            key={bar.dataKey}
            dataKey={bar.dataKey}
            fill={bar.color}
            name={bar.name ?? bar.dataKey}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Pie / Donut Chart ───────────────────────────────────────────────────────

interface PieChartData {
  name: string
  value: number
  color: string
}

interface SimplePieChartProps {
  data: PieChartData[]
  height?: number
  innerRadius?: number
  showLegend?: boolean
  showLabel?: boolean
}

export function SimplePieChart({
  data,
  height = 300,
  innerRadius = 60,
  showLegend = true,
  showLabel = false,
}: SimplePieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={innerRadius + 40}
          paddingAngle={2}
          dataKey="value"
          label={showLabel ? ({ name, value }) => `${name}: ${value}` : undefined}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "var(--radius)",
            fontSize: 12,
            color: "hsl(var(--popover-foreground))",
          }}
        />
        {showLegend && (
          <Legend
            verticalAlign="bottom"
            formatter={(value: string) => (
              <span style={{ color: "hsl(var(--foreground))", fontSize: 12 }}>{value}</span>
            )}
          />
        )}
      </PieChart>
    </ResponsiveContainer>
  )
}

// ─── Area Chart ──────────────────────────────────────────────────────────────

interface AreaChartData {
  name: string
  [key: string]: string | number
}

interface SimpleAreaChartProps {
  data: AreaChartData[]
  areas: { dataKey: string; color: string; name?: string }[]
  height?: number
  showGrid?: boolean
  showLegend?: boolean
}

export function SimpleAreaChart({
  data,
  areas,
  height = 300,
  showGrid = true,
  showLegend = false,
}: SimpleAreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}
        <XAxis
          dataKey="name"
          tick={{ fontSize: 12 }}
          className="fill-muted-foreground"
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 12 }}
          className="fill-muted-foreground"
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "var(--radius)",
            fontSize: 12,
            color: "hsl(var(--popover-foreground))",
          }}
        />
        {showLegend && <Legend />}
        {areas.map((area) => (
          <Area
            key={area.dataKey}
            type="monotone"
            dataKey={area.dataKey}
            stroke={area.color}
            fill={area.color}
            fillOpacity={0.15}
            name={area.name ?? area.dataKey}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}
