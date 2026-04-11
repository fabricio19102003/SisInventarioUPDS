import { getWriteOffsReportAction } from "@/actions/reports";
import { getServerSession } from "@/lib/session";
import type { WriteOffReportRow, WriteOffItemRow } from "@upds/services";
import { PageTransition } from "@upds/ui";
import { SIZE_LABELS, GENDER_LABELS } from "@upds/validators";
import { Trash2, Package, AlertOctagon } from "lucide-react";
import { DateRangeFilter } from "../components/date-range-filter";
import { ExportButton } from "../components/export-button";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getItemVariantLabel(item: WriteOffItemRow): string {
  const parts: string[] = [];
  if (item.size)
    parts.push(SIZE_LABELS[item.size as keyof typeof SIZE_LABELS] ?? item.size);
  if (item.gender)
    parts.push(
      GENDER_LABELS[item.gender as keyof typeof GENDER_LABELS] ?? item.gender,
    );
  if (item.color) parts.push(item.color);
  return parts.length > 0 ? parts.join(" / ") : "—";
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
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-destructive/10 text-destructive">
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Write-offs Table
// ---------------------------------------------------------------------------

function WriteOffsTable({ rows }: { rows: WriteOffReportRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border p-10 text-center text-sm text-muted-foreground">
        No se encontraron bajas para los filtros seleccionados.
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
                Procesado por
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Producto
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Variante
              </th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                Cant.
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Justificación
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) =>
              row.items.map((item, iIdx) => (
                <tr
                  key={`${row.movement_number}-${iIdx}`}
                  className="hover:bg-muted/30 transition-colors"
                >
                  {/* Movement header — shown only on first item row */}
                  {iIdx === 0 ? (
                    <td
                      className="px-4 py-3 align-top"
                      rowSpan={row.items.length}
                    >
                      <span className="font-mono font-medium text-primary">
                        {row.movement_number}
                      </span>
                    </td>
                  ) : null}

                  {iIdx === 0 ? (
                    <td
                      className="px-4 py-3 align-top whitespace-nowrap text-muted-foreground"
                      rowSpan={row.items.length}
                    >
                      {formatDate(row.processed_at)}
                    </td>
                  ) : null}

                  {iIdx === 0 ? (
                    <td
                      className="px-4 py-3 align-top text-muted-foreground"
                      rowSpan={row.items.length}
                    >
                      {row.processed_by_name}
                    </td>
                  ) : null}

                  {/* Item detail */}
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium leading-tight">
                        {item.product_name}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {item.product_sku}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {getItemVariantLabel(item)}
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-destructive">
                    {item.quantity}
                  </td>

                  {/* Justification — shown only on first item row, spans all items */}
                  {iIdx === 0 ? (
                    <td
                      className="px-4 py-3 align-top max-w-[320px]"
                      rowSpan={row.items.length}
                    >
                      <div className="flex items-start gap-2">
                        <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                        <p className="text-sm leading-relaxed break-words">
                          {row.notes ?? (
                            <span className="italic text-muted-foreground">
                              Sin justificación registrada
                            </span>
                          )}
                        </p>
                      </div>
                    </td>
                  ) : null}
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function BajasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const [params, session] = await Promise.all([
    searchParams,
    getServerSession(),
  ]);

  const result = await getWriteOffsReportAction({
    date_from: params.date_from || undefined,
    date_to: params.date_to || undefined,
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
            <h1 className="text-2xl font-bold">Reporte de Bajas</h1>
            <p className="text-sm text-muted-foreground">
              Productos dados de baja por deterioro — cada baja incluye justificación obligatoria
            </p>
          </div>
          {session && (
            <ExportButton
              reportType="bajas"
              userRole={session.role}
              currentFilters={{
                date_from: params.date_from,
                date_to: params.date_to,
              }}
            />
          )}
        </div>

        {/* Filtros */}
        <DateRangeFilter />

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          <SummaryCard
            label="Total Bajas"
            value={summary.total_write_offs.toLocaleString("es-BO")}
            icon={Trash2}
          />
          <SummaryCard
            label="Total Ítems Dados de Baja"
            value={summary.total_items_lost.toLocaleString("es-BO")}
            icon={Package}
          />
        </div>

        {/* Table */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Detalle de Bajas
          </h2>
          <WriteOffsTable rows={rows} />
        </div>
      </div>
    </PageTransition>
  );
}
