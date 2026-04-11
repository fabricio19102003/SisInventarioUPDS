import { getDepartmentConsumptionAction } from "@/actions/reports";
import { getServerSession } from "@/lib/session";
import type { DepartmentConsumptionRow } from "@upds/services";
import { PageTransition } from "@upds/ui";
import { Briefcase, Package, Building2 } from "lucide-react";
import { DateRangeFilter } from "../components/date-range-filter";
import { ExportButton } from "../components/export-button";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Summary Card
// ---------------------------------------------------------------------------

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Consumption Table
// ---------------------------------------------------------------------------

function ConsumptionTable({ rows }: { rows: DepartmentConsumptionRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border p-10 text-center text-sm text-muted-foreground">
        No se encontraron entregas para los filtros seleccionados.
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Departamento
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Código
              </th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                Total Entregas
              </th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                Total Ítems
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Última Entrega
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr
                key={row.department_id}
                className="hover:bg-muted/30 transition-colors"
              >
                <td className="px-4 py-3 font-medium">
                  {row.department_name}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {row.department_code}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="font-semibold">
                    {row.total_deliveries.toLocaleString("es-BO")}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="font-semibold">
                    {row.total_items.toLocaleString("es-BO")}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                  {formatDate(row.last_delivery_at)}
                </td>
              </tr>
            ))}
          </tbody>
          {rows.length > 1 && (
            <tfoot className="border-t bg-muted/30">
              <tr>
                <td
                  className="px-4 py-3 font-semibold text-muted-foreground"
                  colSpan={2}
                >
                  Total
                </td>
                <td className="px-4 py-3 text-center font-bold">
                  {rows
                    .reduce((acc, r) => acc + r.total_deliveries, 0)
                    .toLocaleString("es-BO")}
                </td>
                <td className="px-4 py-3 text-center font-bold">
                  {rows
                    .reduce((acc, r) => acc + r.total_items, 0)
                    .toLocaleString("es-BO")}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ConsumoDepartamentosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const [params, session] = await Promise.all([
    searchParams,
    getServerSession(),
  ]);

  const result = await getDepartmentConsumptionAction({
    date_from: params.date_from || undefined,
    date_to: params.date_to || undefined,
    department_id: params.department_id || undefined,
  });

  if (!result.success) {
    return (
      <div className="rounded-lg border border-destructive/50 p-6 text-center text-sm text-destructive">
        Error al cargar el reporte: {result.error}
      </div>
    );
  }

  const { rows, total_departments, total_deliveries, total_items } = result.data;

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Consumo por Departamento</h1>
            <p className="text-sm text-muted-foreground">
              Entregas de material de oficina a departamentos internos de la universidad
            </p>
          </div>
          {session && (
            <ExportButton
              reportType="consumo-departamentos"
              userRole={session.role}
              currentFilters={{
                date_from: params.date_from,
                date_to: params.date_to,
                department_id: params.department_id,
              }}
            />
          )}
        </div>

        {/* Filtros */}
        <DateRangeFilter />

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryCard
            label="Total Entregas"
            value={total_deliveries.toLocaleString("es-BO")}
            icon={Briefcase}
          />
          <SummaryCard
            label="Total Ítems"
            value={total_items.toLocaleString("es-BO")}
            icon={Package}
          />
          <SummaryCard
            label="Departamentos Atendidos"
            value={total_departments.toLocaleString("es-BO")}
            icon={Building2}
          />
        </div>

        {/* Table */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Consumo Agregado por Departamento
          </h2>
          <ConsumptionTable rows={rows} />
        </div>
      </div>
    </PageTransition>
  );
}
