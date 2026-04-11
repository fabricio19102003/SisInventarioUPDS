import { getMovementsReportAction } from "@/actions/reports";
import { getServerSession } from "@/lib/session";
import type { MovementReportRow } from "@upds/services";
import { PageTransition } from "@upds/ui";
import {
  MOVEMENT_TYPE_LABELS,
  MOVEMENT_STATUS_LABELS,
} from "@upds/validators";
import { ScrollText, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { MovementsFilter } from "../components/movements-filter";
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

function formatAmount(value: unknown): string {
  const num = Number(value);
  if (isNaN(num)) return "—";
  if (num === 0) return "—";
  return `Bs. ${num.toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Status Badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    CONFIRMED: "bg-green-100 text-green-700 border-green-300",
    DRAFT: "bg-yellow-100 text-yellow-700 border-yellow-300",
    CANCELLED: "bg-destructive/10 text-destructive border-destructive/30",
  };

  const label =
    MOVEMENT_STATUS_LABELS[status as keyof typeof MOVEMENT_STATUS_LABELS] ??
    status;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
        variants[status] ?? "bg-muted text-muted-foreground border-border"
      }`}
    >
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Movements Table
// ---------------------------------------------------------------------------

function MovementsTable({ rows }: { rows: MovementReportRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border p-10 text-center text-sm text-muted-foreground">
        No se encontraron movimientos para los filtros seleccionados.
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
                Tipo
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Estado
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Fecha
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Procesado por
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Destinatario / Depto.
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
              <tr
                key={row.id}
                className="hover:bg-muted/30 transition-colors"
              >
                <td className="px-4 py-3">
                  <span className="font-mono font-medium text-primary">
                    {row.movement_number}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm">
                    {MOVEMENT_TYPE_LABELS[
                      row.movement_type as keyof typeof MOVEMENT_TYPE_LABELS
                    ] ?? row.movement_type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                  {formatDate(row.processed_at)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {row.processed_by_name}
                </td>
                <td className="px-4 py-3">
                  {row.recipient_name ?? row.department_name ?? (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center text-muted-foreground">
                  {row.items_count}
                </td>
                <td className="px-4 py-3 text-right font-medium">
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
// Pagination
// ---------------------------------------------------------------------------

function Pagination({
  page,
  total,
  perPage,
  searchParams,
}: {
  page: number;
  total: number;
  perPage: number;
  searchParams: Record<string, string>;
}) {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;

  function buildPageUrl(p: number): string {
    const params = new URLSearchParams(
      Object.fromEntries(
        Object.entries(searchParams).filter(([, v]) => v !== undefined),
      ),
    );
    params.set("page", String(p));
    return `?${params.toString()}`;
  }

  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <span>
        Mostrando {from}–{to} de {total} movimientos
      </span>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link
            href={buildPageUrl(page - 1)}
            className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-muted/50 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Link>
        ) : (
          <span className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm opacity-40 cursor-not-allowed">
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </span>
        )}
        <span className="px-3 py-1.5 font-medium">
          {page} / {totalPages}
        </span>
        {page < totalPages ? (
          <Link
            href={buildPageUrl(page + 1)}
            className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-muted/50 transition-colors"
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm opacity-40 cursor-not-allowed">
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function MovimientosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const [params, session] = await Promise.all([
    searchParams,
    getServerSession(),
  ]);
  const page = parseInt(params.page ?? "1", 10) || 1;

  const result = await getMovementsReportAction({
    date_from: params.date_from || undefined,
    date_to: params.date_to || undefined,
    movement_type: params.movement_type || undefined,
    status: params.status || undefined,
    page,
    per_page: 20,
  });

  if (!result.success) {
    return (
      <div className="rounded-lg border border-destructive/50 p-6 text-center text-sm text-destructive">
        Error al cargar el reporte: {result.error}
      </div>
    );
  }

  const { rows, total, per_page } = result.data;

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Reporte de Movimientos</h1>
            <p className="text-sm text-muted-foreground">
              Todos los movimientos de inventario con filtros por tipo y estado
            </p>
          </div>
          {session && (
            <ExportButton
              reportType="movimientos"
              userRole={session.role}
              currentFilters={{
                date_from: params.date_from,
                date_to: params.date_to,
                movement_type: params.movement_type,
                status: params.status,
              }}
            />
          )}
        </div>

        {/* Filtros */}
        <MovementsFilter />

        {/* Summary */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <ScrollText className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total movimientos</p>
              <p className="text-2xl font-bold">
                {total.toLocaleString("es-BO")}
              </p>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Detalle de Movimientos
          </h2>
          <MovementsTable rows={rows} />
          <Pagination
            page={page}
            total={total}
            perPage={per_page}
            searchParams={params}
          />
        </div>
      </div>
    </PageTransition>
  );
}
