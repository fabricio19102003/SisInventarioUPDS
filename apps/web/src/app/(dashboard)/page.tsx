import Link from "next/link";
import { getDashboardStatsAction } from "@/actions/dashboard";
import type { DashboardStats, RecentMovement } from "@upds/services";
import {
  MOVEMENT_TYPE_LABELS,
  MOVEMENT_STATUS_LABELS,
} from "@upds/validators";
import {
  StaggerContainer,
  StaggerItem,
  FadeInUp,
} from "@upds/ui";
import { DashboardCharts } from "./components/dashboard-charts";

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
      <StaggerContainer className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <StaggerItem>
          <KpiCard
            label="Productos activos"
            value={stats.total_active_products}
            href="/productos"
          />
        </StaggerItem>
        <StaggerItem>
          <KpiCard
            label="Variantes activas"
            value={stats.total_active_variants}
            href="/productos"
          />
        </StaggerItem>
        <StaggerItem>
          <KpiCard
            label="Alertas stock bajo"
            value={stats.low_stock_alerts}
            href="/productos?low_stock=true"
            alert
          />
        </StaggerItem>
        <StaggerItem>
          <KpiCard
            label="Órdenes pendientes"
            value={stats.pending_manufacture_orders}
            href="/ordenes?status=PENDING"
          />
        </StaggerItem>
        <StaggerItem>
          <KpiCard
            label="Movimientos borrador"
            value={stats.draft_movements}
            href="/movimientos?status=DRAFT"
          />
        </StaggerItem>
      </StaggerContainer>

      {/* Charts: Stock por Área + Órdenes + Movimientos por Mes */}
      <FadeInUp delay={0.2}>
        <DashboardCharts
          stockByArea={stats.stock_by_area}
          ordersByStatus={stats.manufacture_orders_by_status}
          movementsByMonth={stats.movements_by_month}
        />
      </FadeInUp>

      {/* Últimos movimientos */}
      <FadeInUp delay={0.3}>
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
      </FadeInUp>
    </div>
  );
}
