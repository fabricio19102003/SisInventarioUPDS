"use client";

// ─────────────────────────────────────────────────────────────────────────────
// ExportButton — Botón de exportación a Excel para páginas de reportes.
//
// Genera la URL al Route Handler /api/reports/[type]/export con los filtros
// actuales en el querystring y la abre en una nueva pestaña para disparar
// la descarga del archivo .xlsx.
//
// Solo se renderiza si el usuario tiene el permiso "report:export".
// ─────────────────────────────────────────────────────────────────────────────

import { Download } from "lucide-react";
import { can } from "@upds/validators";
import type { UserRole } from "@upds/validators";

// Tipos de reporte válidos (coinciden con los segmentos del Route Handler)
export type ReportType =
  | "financiero"
  | "inventario"
  | "movimientos"
  | "dotaciones"
  | "consumo-departamentos"
  | "bajas";

export interface ExportButtonProps {
  /** Tipo de reporte — corresponde al segmento [type] del Route Handler */
  reportType: ReportType;
  /** Filtros actuales del reporte (valores del URL search params) */
  currentFilters?: Record<string, string | undefined>;
  /** Rol del usuario actual (para verificar permisos) */
  userRole: UserRole;
}

export function ExportButton({
  reportType,
  currentFilters = {},
  userRole,
}: ExportButtonProps) {
  // Verificar permiso — si no tiene acceso, no renderizar nada
  if (!can(userRole, "report:export")) {
    return null;
  }

  function handleExport() {
    // Construir URL con filtros actuales
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(currentFilters)) {
      if (value && value.trim() !== "") {
        params.set(key, value);
      }
    }

    const queryString = params.toString();
    const url = `/api/reports/${reportType}/export${queryString ? `?${queryString}` : ""}`;

    // Abrir en nueva pestaña para disparar la descarga del archivo
    window.open(url, "_blank");
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
    >
      <Download className="h-4 w-4" />
      Exportar Excel
    </button>
  );
}
