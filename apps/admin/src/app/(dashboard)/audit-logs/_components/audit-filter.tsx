"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// AuditFilter — componente cliente con todos los filtros del visor de auditoría
// Usa searchParams URL para que el Server Component re-cargue con los filtros.
// ═══════════════════════════════════════════════════════════════════════════════

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface AuditFilterProps {
  actions: string[];
  entity_types: string[];
  currentFilters: {
    action?: string;
    entity_type?: string;
    date_from?: string;
    date_to?: string;
  };
}

export function AuditFilter({
  actions,
  entity_types,
  currentFilters,
}: AuditFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const createQueryString = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      // Reset to page 1 on filter change
      params.delete("page");
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      return params.toString();
    },
    [searchParams],
  );

  function handleChange(key: string, value: string) {
    const qs = createQueryString({ [key]: value || undefined });
    router.push(`${pathname}?${qs}`);
  }

  function handleReset() {
    router.push(pathname);
  }

  const hasFilters =
    currentFilters.action ||
    currentFilters.entity_type ||
    currentFilters.date_from ||
    currentFilters.date_to;

  return (
    <div className="flex flex-wrap items-end gap-3">
      {/* Acción */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">
          Acción
        </label>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          value={currentFilters.action ?? ""}
          onChange={(e) => handleChange("action", e.target.value)}
        >
          <option value="">Todas</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {/* Tipo de entidad */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">
          Entidad
        </label>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          value={currentFilters.entity_type ?? ""}
          onChange={(e) => handleChange("entity_type", e.target.value)}
        >
          <option value="">Todas</option>
          {entity_types.map((et) => (
            <option key={et} value={et}>
              {et}
            </option>
          ))}
        </select>
      </div>

      {/* Fecha desde */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">
          Desde
        </label>
        <input
          type="date"
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          value={currentFilters.date_from ?? ""}
          onChange={(e) => handleChange("date_from", e.target.value)}
        />
      </div>

      {/* Fecha hasta */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">
          Hasta
        </label>
        <input
          type="date"
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          value={currentFilters.date_to ?? ""}
          onChange={(e) => handleChange("date_to", e.target.value)}
        />
      </div>

      {/* Reset */}
      {hasFilters && (
        <button
          type="button"
          onClick={handleReset}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground hover:bg-muted"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
