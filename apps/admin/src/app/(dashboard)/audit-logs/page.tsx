// ═══════════════════════════════════════════════════════════════════════════════
// Visor de Audit Logs — Panel de Administración
// Server Component: lee searchParams, llama a la action, renderiza tabla y filtros.
// Solo accesible por ADMIN (verificado en layout + action).
// ═══════════════════════════════════════════════════════════════════════════════

import {
  getAuditLogsAction,
  getAuditFilterOptionsAction,
} from "@/actions/audit-logs";
import { PageTransition } from "@upds/ui";
import { ScrollText, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { AuditFilter } from "./_components/audit-filter";
import { AuditRowDetail } from "./_components/audit-row-detail";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString("es-BO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Badge de colores por tipo de accion. */
function ActionBadge({ action }: { action: string }) {
  const colorMap: Record<string, string> = {
    CREATE: "bg-green-100 text-green-700 border-green-300",
    UPDATE: "bg-blue-100 text-blue-700 border-blue-300",
    DELETE: "bg-red-100 text-red-700 border-red-300",
    CONFIRM: "bg-emerald-100 text-emerald-700 border-emerald-300",
    CANCEL: "bg-orange-100 text-orange-700 border-orange-300",
    LOGIN: "bg-purple-100 text-purple-700 border-purple-300",
    LOGIN_FAILED: "bg-red-100 text-red-700 border-red-300",
    PASSWORD_CHANGE: "bg-yellow-100 text-yellow-700 border-yellow-300",
    PASSWORD_RESET: "bg-yellow-100 text-yellow-700 border-yellow-300",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
        colorMap[action] ?? "bg-muted text-muted-foreground border-border"
      }`}
    >
      {action}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────────────────────────────────────

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
    const params = new URLSearchParams(searchParams);
    params.set("page", String(p));
    return `?${params.toString()}`;
  }

  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <span>
        Mostrando {from}–{to} de {total} registros
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

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page ?? "1", 10) || 1;

  // Cargar en paralelo: logs + opciones de filtro
  const [result, filterOptions] = await Promise.all([
    getAuditLogsAction({
      user_id: params.user_id || undefined,
      action: params.action || undefined,
      entity_type: params.entity_type || undefined,
      // z.coerce.date() acepta strings ISO — se pasan tal cual
      date_from: params.date_from
        ? new Date(params.date_from)
        : undefined,
      date_to: params.date_to
        ? new Date(params.date_to)
        : undefined,
      page,
      per_page: 20,
    }),
    getAuditFilterOptionsAction(),
  ]);

  if (!result.success) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Logs de Auditoría</h1>
          </div>
          <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6 text-center text-sm text-destructive">
            <p className="font-medium">Error al cargar los registros</p>
            <p className="mt-1 text-muted-foreground">{result.error}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Consejo: reduce el rango de fechas a un máximo de 90 días.
            </p>
          </div>
        </div>
      </PageTransition>
    );
  }

  const { data: logs, total, per_page, total_pages } = result.data;

  const currentFilters = {
    action: params.action,
    entity_type: params.entity_type,
    date_from: params.date_from,
    date_to: params.date_to,
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <ScrollText className="h-7 w-7 text-primary" />
              <h1 className="text-2xl font-bold">Logs de Auditoría</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Registro inmutable de todas las acciones realizadas en el sistema
            </p>
          </div>
          {/* Contador total */}
          <div className="rounded-lg border bg-card px-4 py-2 text-right">
            <p className="text-xs text-muted-foreground">Registros encontrados</p>
            <p className="text-2xl font-bold text-primary">
              {total.toLocaleString("es-BO")}
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="rounded-lg border bg-card p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Filtros
          </p>
          <AuditFilter
            actions={filterOptions.actions}
            entity_types={filterOptions.entity_types}
            currentFilters={currentFilters}
          />
          <p className="mt-3 text-xs text-muted-foreground">
            Por defecto se muestran los últimos 30 días. Rango máximo: 90 días.
          </p>
        </div>

        {/* Tabla */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Historial de acciones — Página {page} de {total_pages}
          </h2>

          {logs.length === 0 ? (
            <div className="rounded-lg border p-10 text-center text-sm text-muted-foreground">
              <ScrollText className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
              <p className="font-medium">No hay registros para los filtros seleccionados</p>
              <p className="mt-1 text-xs">
                Intenta ampliar el rango de fechas o limpiar los filtros.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">
                        Fecha / Hora
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        Usuario
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        Acción
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        Entidad
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        ID Entidad
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        Detalle
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {logs.map((log) => (
                      <tr
                        key={log.id}
                        className="hover:bg-muted/30 transition-colors align-top"
                      >
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-muted-foreground">
                          {formatDateTime(log.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          {log.user ? (
                            <div>
                              <p className="font-medium leading-tight">
                                {log.user.full_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {log.user.email}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              ID: {log.user_id.slice(0, 8)}…
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <ActionBadge action={log.action} />
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                            {log.entity_type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-muted-foreground">
                            {log.entity_id.slice(0, 8)}…
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <AuditRowDetail
                            old_values={log.old_values}
                            new_values={log.new_values}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Paginación */}
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
