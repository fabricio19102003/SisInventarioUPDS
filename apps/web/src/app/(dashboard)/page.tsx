import Link from "next/link";
import { getDashboardStatsAction } from "@/actions/dashboard";
import type { DashboardStats, RecentMovement } from "@upds/services";
import {
  MOVEMENT_TYPE_LABELS,
  MOVEMENT_STATUS_LABELS,
  MANUFACTURE_ORDER_STATUS_LABELS,
  WAREHOUSE_AREA_LABELS,
} from "@upds/validators";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatAmount(value: unknown): string {
  const num = Number(value);
  if (isNaN(num) || num === 0) return "—";
  return `Bs. ${num.toFixed(2)}`;
}

function getStatusColor(status: string): string {
  switch (status) {
    case "CONFIRMED":
    case "COMPLETED":
      return "text-green-600";
    case "CANCELLED":
      return "text-red-600";
    case "IN_PROGRESS":
      return "text-blue-600";
    default:
      return "text-yellow-600";
  }
}

function getMovementTarget(m: RecentMovement): string {
  if (m.recipient_name) return m.recipient_name;
  if (m.department_name) return m.department_name;
  return "—";
}

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------

function KpiCard({
  label,
  value,
  href,
  alert,
}: {
  label: string;
  value: number;
  href?: string;
  alert?: boolean;
}) {
  const content = (
    <div
      className={`rounded-lg border p-5 ${
        alert && value > 0
          ? "border-destructive/50 bg-destructive/5"
          : "bg-card"
      }`}
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-3xl font-bold ${
          alert && value > 0 ? "text-destructive" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="transition-opacity hover:opacity-80">
        {content}
      </Link>
    );
  }
  return content;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function DashboardPage() {
  const result = await getDashboardStatsAction();

  if (!result.success) {
    return (
      <div className="rounded-lg border border-destructive/50 p-6 text-center text-sm text-destructive">
        Error al cargar el dashboard: {result.error}
      </div>
    );
  }

  const stats: DashboardStats = result.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Resumen general del Sistema de Inventario
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          label="Productos activos"
          value={stats.total_active_products}
          href="/productos"
        />
        <KpiCard
          label="Variantes activas"
          value={stats.total_active_variants}
          href="/productos"
        />
        <KpiCard
          label="Alertas stock bajo"
          value={stats.low_stock_alerts}
          href="/productos?low_stock=true"
          alert
        />
        <KpiCard
          label="Órdenes pendientes"
          value={stats.pending_manufacture_orders}
          href="/ordenes?status=PENDING"
        />
        <KpiCard
          label="Movimientos borrador"
          value={stats.draft_movements}
          href="/movimientos?status=DRAFT"
        />
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Stock por área */}
        <div className="rounded-lg border p-5">
          <h2 className="text-lg font-semibold">Stock por Área</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Distribución de inventario por sector de almacén
          </p>

          {stats.stock_by_area.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Sin datos de stock.
            </p>
          ) : (
            <div className="space-y-4">
              {stats.stock_by_area.map((area) => (
                <div key={area.warehouse_area} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {WAREHOUSE_AREA_LABELS[
                        area.warehouse_area as keyof typeof WAREHOUSE_AREA_LABELS
                      ] ?? area.warehouse_area}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {area.total_stock} unidades
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>{area.total_variants} variantes</span>
                    {area.low_stock_variants > 0 && (
                      <span className="text-destructive font-medium">
                        {area.low_stock_variants} con stock bajo
                      </span>
                    )}
                  </div>
                  {/* Simple bar */}
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        area.low_stock_variants > 0
                          ? "bg-destructive/70"
                          : "bg-primary"
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          stats.stock_by_area.reduce((max, a) => Math.max(max, a.total_stock), 1) > 0
                            ? (area.total_stock /
                                stats.stock_by_area.reduce((max, a) => Math.max(max, a.total_stock), 1)) *
                              100
                            : 0,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Órdenes por estado */}
        <div className="rounded-lg border p-5">
          <h2 className="text-lg font-semibold">Órdenes de Fabricación</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Estado actual de las órdenes
          </p>

          {stats.manufacture_orders_by_status.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Sin órdenes registradas.
            </p>
          ) : (
            <div className="space-y-3">
              {stats.manufacture_orders_by_status.map((entry) => (
                <div
                  key={entry.status}
                  className="flex items-center justify-between rounded-lg bg-muted/40 px-4 py-3"
                >
                  <span className="text-sm font-medium">
                    {MANUFACTURE_ORDER_STATUS_LABELS[
                      entry.status as keyof typeof MANUFACTURE_ORDER_STATUS_LABELS
                    ] ?? entry.status}
                  </span>
                  <span
                    className={`text-xl font-bold ${getStatusColor(entry.status)}`}
                  >
                    {entry.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Últimos movimientos */}
      <div className="rounded-lg border p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Últimos Movimientos</h2>
            <p className="text-sm text-muted-foreground">
              Las 10 operaciones de inventario más recientes
            </p>
          </div>
          <Link
            href="/movimientos"
            className="text-sm text-primary hover:underline"
          >
            Ver todos
          </Link>
        </div>

        {stats.recent_movements.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Sin movimientos registrados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Número</th>
                  <th className="pb-2 pr-4 font-medium">Tipo</th>
                  <th className="pb-2 pr-4 font-medium">Estado</th>
                  <th className="pb-2 pr-4 font-medium">Destino</th>
                  <th className="pb-2 pr-4 text-right font-medium">Total</th>
                  <th className="pb-2 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stats.recent_movements.map((m) => (
                  <tr key={m.id}>
                    <td className="py-2.5 pr-4">
                      <span className="font-mono font-medium">
                        {m.movement_number}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4">
                      {MOVEMENT_TYPE_LABELS[
                        m.movement_type as keyof typeof MOVEMENT_TYPE_LABELS
                      ] ?? m.movement_type}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className={getStatusColor(m.status)}>
                        {MOVEMENT_STATUS_LABELS[
                          m.status as keyof typeof MOVEMENT_STATUS_LABELS
                        ] ?? m.status}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground max-w-[150px] truncate">
                      {getMovementTarget(m)}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-medium">
                      {formatAmount(m.total_amount)}
                    </td>
                    <td className="py-2.5 text-muted-foreground whitespace-nowrap">
                      {new Date(m.created_at).toLocaleDateString("es-BO")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
