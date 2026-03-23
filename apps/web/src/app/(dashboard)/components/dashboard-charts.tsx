"use client"

import {
  SimpleBarChart,
  SimplePieChart,
  SimpleAreaChart,
} from "@upds/ui"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@upds/ui"
import {
  WAREHOUSE_AREA_LABELS,
  MANUFACTURE_ORDER_STATUS_LABELS,
} from "@upds/validators"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StockByAreaItem {
  warehouse_area: string
  total_variants: number
  total_stock: number
  low_stock_variants: number
}

interface OrderStatusItem {
  status: string
  count: number
}

interface MonthlyMovementsItem {
  month: string
  entries: number
  exits: number
  total: number
}

interface DashboardChartsProps {
  stockByArea: StockByAreaItem[]
  ordersByStatus: OrderStatusItem[]
  movementsByMonth: MonthlyMovementsItem[]
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#eab308",
  IN_PROGRESS: "#3b82f6",
  COMPLETED: "#22c55e",
  CANCELLED: "#ef4444",
}

const MONTH_NAMES: Record<string, string> = {
  "01": "Ene",
  "02": "Feb",
  "03": "Mar",
  "04": "Abr",
  "05": "May",
  "06": "Jun",
  "07": "Jul",
  "08": "Ago",
  "09": "Sep",
  "10": "Oct",
  "11": "Nov",
  "12": "Dic",
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DashboardCharts({
  stockByArea,
  ordersByStatus,
  movementsByMonth,
}: DashboardChartsProps) {
  const stockChartData = stockByArea.map((area) => ({
    name:
      WAREHOUSE_AREA_LABELS[
        area.warehouse_area as keyof typeof WAREHOUSE_AREA_LABELS
      ] ?? area.warehouse_area,
    "Stock Total": area.total_stock,
    "Stock Bajo": area.low_stock_variants,
  }))

  const ordersChartData = ordersByStatus.map((item) => ({
    name:
      MANUFACTURE_ORDER_STATUS_LABELS[
        item.status as keyof typeof MANUFACTURE_ORDER_STATUS_LABELS
      ] ?? item.status,
    value: item.count,
    color: STATUS_COLORS[item.status] ?? "#94a3b8",
  }))

  const movementsChartData = movementsByMonth.map((m) => ({
    name: MONTH_NAMES[m.month.split("-")[1] ?? ""] ?? m.month,
    Entradas: m.entries,
    Salidas: m.exits,
  }))

  return (
    <>
      {/* Two-column: Bar + Donut */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Stock por Área — Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Stock por Área</CardTitle>
            <CardDescription>
              Distribución de inventario por sector de almacén
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stockByArea.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Sin datos de stock.
              </p>
            ) : (
              <SimpleBarChart
                data={stockChartData}
                bars={[
                  { dataKey: "Stock Total", color: "#4A90D9" },
                  { dataKey: "Stock Bajo", color: "#ef4444" },
                ]}
                showLegend
              />
            )}
          </CardContent>
        </Card>

        {/* Órdenes por Estado — Donut Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Órdenes de Fabricación</CardTitle>
            <CardDescription>
              Estado actual de las órdenes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {ordersByStatus.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Sin órdenes registradas.
              </p>
            ) : (
              <SimplePieChart data={ordersChartData} showLegend />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Movimientos por Mes — Area Chart (full width) */}
      <Card>
        <CardHeader>
          <CardTitle>Movimientos por Mes</CardTitle>
          <CardDescription>
            Tendencia de entradas y salidas en los últimos 6 meses
          </CardDescription>
        </CardHeader>
        <CardContent>
          {movementsByMonth.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Sin datos de movimientos.
            </p>
          ) : (
            <SimpleAreaChart
              data={movementsChartData}
              areas={[
                { dataKey: "Entradas", color: "#22c55e" },
                { dataKey: "Salidas", color: "#4A90D9" },
              ]}
              showLegend
              showGrid
            />
          )}
        </CardContent>
      </Card>
    </>
  )
}
