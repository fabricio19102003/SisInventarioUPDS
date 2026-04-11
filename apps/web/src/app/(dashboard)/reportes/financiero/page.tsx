import { getFinancialReportAction } from "@/actions/reports";
import { getServerSession } from "@/lib/session";
import type { FinancialReportRow } from "@upds/services";
import { PageTransition } from "@upds/ui";
import { DollarSign, ShoppingCart, Package } from "lucide-react";
import { DateRangeFilter } from "../components/date-range-filter";
import { ExportButton } from "../components/export-button";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatAmount(value: unknown): string {
  const num = Number(value);
  if (isNaN(num)) return "—";
  return `Bs. ${num.toFixed(2)}`;
}

function formatDate(date: Date | string): string {
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
  value: string;
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
// Table
// ---------------------------------------------------------------------------

function FinancialTable({ rows }: { rows: FinancialReportRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border p-10 text-center text-sm text-muted-foreground">
        No se encontraron resultados para los filtros seleccionados.
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
                Número
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Fecha
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Destinatario
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Documento
              </th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                Ítems
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr key={row.movement_number} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <span className="font-mono font-medium text-primary">
                    {row.movement_number}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                  {formatDate(row.processed_at)}
                </td>
                <td className="px-4 py-3">
                  {row.recipient_full_name ?? (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                  {row.recipient_document ?? "—"}
                </td>
                <td className="px-4 py-3 text-center text-muted-foreground">
                  {row.items_count}
                </td>
                <td className="px-4 py-3 text-right font-semibold">
                  {formatAmount(row.total_amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function FinancieroPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const [params, session] = await Promise.all([
    searchParams,
    getServerSession(),
  ]);

  const result = await getFinancialReportAction({
    date_from: params.date_from || undefined,
    date_to: params.date_to || undefined,
    product_category: params.product_category || undefined,
  });

  if (!result.success) {
    return (
      <div className="rounded-lg border border-destructive/50 p-6 text-center text-sm text-destructive">
        Error al cargar el reporte: {result.error}
      </div>
    );
  }

  const { summary, rows } = result.data;

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Reporte Financiero</h1>
            <p className="text-sm text-muted-foreground">
              Ventas confirmadas — excluye dotaciones gratuitas a becarios
            </p>
          </div>
          {session && (
            <ExportButton
              reportType="financiero"
              userRole={session.role}
              currentFilters={{
                date_from: params.date_from,
                date_to: params.date_to,
                product_category: params.product_category,
              }}
            />
          )}
        </div>

        {/* Filtros */}
        <DateRangeFilter />

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryCard
            label="Total Ventas"
            value={formatAmount(summary.total_amount)}
            icon={DollarSign}
          />
          <SummaryCard
            label="Total Movimientos"
            value={summary.total_movements.toLocaleString("es-BO")}
            icon={ShoppingCart}
          />
          <SummaryCard
            label="Total Ítems"
            value={summary.total_items.toLocaleString("es-BO")}
            icon={Package}
          />
        </div>

        {/* Table */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Detalle de Ventas
          </h2>
          <FinancialTable rows={rows} />
        </div>
      </div>
    </PageTransition>
  );
}
