"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  SimpleBarChart,
  SimplePieChart,
  SimpleAreaChart,
} from "@upds/ui";
import {
  WAREHOUSE_AREA_LABELS,
  MANUFACTURE_ORDER_STATUS_LABELS,
} from "@upds/validators";
import type {
  WarehouseArea,
  ManufactureOrderStatus,
} from "@upds/validators";

interface StockByArea {
  warehouse_area: string;
  total_variants: number;
  total_stock: number;
  low_stock_variants: number;
}

interface OrderStatusSummary {
  status: string;
  count: number;
}

interface MonthlyMovements {
  month: string;
  entries: number;
  exits: number;
  total: number;
}

interface DashboardChartsProps {
  stockByArea: StockByArea[];
  ordersByStatus: OrderStatusSummary[];
  movementsByMonth: MonthlyMovements[];
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
};

const statusColors: Record<string, string> = {
  PENDING: "#eab308",
  IN_PROGRESS: "#3b82f6",
  COMPLETED: "#22c55e",
  CANCELLED: "#ef4444",
};

export function DashboardCharts({
  stockByArea,
  ordersByStatus,
  movementsByMonth,
}: DashboardChartsProps) {
  const stockChartData = stockByArea.map((area) => ({
    name:
      WAREHOUSE_AREA_LABELS[area.warehouse_area as WarehouseArea] ??
      area.warehouse_area,
    "Stock Total": area.total_stock,
    "Stock Bajo": area.low_stock_variants,
  }));

  const ordersChartData = ordersByStatus.map((item) => ({
    name:
      MANUFACTURE_ORDER_STATUS_LABELS[
        item.status as ManufactureOrderStatus
      ] ?? item.status,
    value: item.count,
    color: statusColors[item.status] ?? "#94a3b8",
  }));

  const movementsChartData = movementsByMonth.map((m) => ({
    name: MONTH_NAMES[m.month.split("-")[1] ?? ""] ?? m.month,
    Entradas: m.entries,
    Salidas: m.exits,
  }));

  return (
    <>
      {/* Stock por Area + Ordenes por Estado */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Stock por Area — Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Stock por Area</CardTitle>
            <CardDescription>
              Distribucion del inventario por sector del almacen
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stockChartData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No hay datos de stock disponibles.
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

        {/* Ordenes por Estado — Donut Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ordenes por Estado</CardTitle>
            <CardDescription>
              Estado actual de las ordenes de fabricacion
            </CardDescription>
          </CardHeader>
          <CardContent>
            {ordersChartData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No hay ordenes de fabricacion registradas.
              </p>
            ) : (
              <SimplePieChart data={ordersChartData} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Movimientos por Mes — Area Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Movimientos por Mes</CardTitle>
          <CardDescription>
            Entradas y salidas de inventario en los ultimos 6 meses
          </CardDescription>
        </CardHeader>
        <CardContent>
          {movementsChartData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No hay movimientos registrados en los ultimos meses.
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
  );
}
