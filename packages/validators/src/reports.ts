// ═══════════════════════════════════════════════════════════════════════════════
// @upds/validators — Schemas de Filtros de Reportes
// Validacion de filtros para los 6 tipos de reporte del sistema.
// Patron: base dateRange + extensiones por tipo de reporte.
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from "zod";
import {
  MovementTypeSchema,
  MovementStatusSchema,
  ProductCategorySchema,
  WarehouseAreaSchema,
} from "./enums";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Primer dia del mes actual a las 00:00:00.000 UTC */
function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
  );
}

/** Ultimo instante del mes actual (23:59:59.999) UTC */
function endOfCurrentMonth(): Date {
  const now = new Date();
  // Dia 0 del mes siguiente = ultimo dia del mes actual
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999),
  );
}

/**
 * Normaliza una fecha al inicio del dia (00:00:00.000 UTC).
 * z.coerce.date() parsea strings "YYYY-MM-DD" como UTC midnight.
 * Usamos setUTCHours para preservar la fecha UTC del input sin desvio
 * por zona horaria (ej: Bolivia UTC-4 corria el dia anterior con getters locales).
 */
function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Normaliza una fecha al final del dia (23:59:59.999 UTC).
 * Garantiza que date_to incluya todos los registros del dia seleccionado.
 */
function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

// ─────────────────────────────────────────────────────────────────────────────
// Base: rango de fechas (compartido por todos los reportes temporales)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Schema base con rango de fechas opcional.
 * Si no se proveen, se aplica el mes en curso por defecto.
 * Usa z.coerce.date() para aceptar strings ISO, timestamps y objetos Date.
 */
export const dateRangeSchema = z
  .object({
    date_from: z.coerce.date().optional(),
    date_to: z.coerce.date().optional(),
  })
  .transform((data) => ({
    date_from: startOfDay(data.date_from ?? startOfCurrentMonth()),
    date_to: endOfDay(data.date_to ?? endOfCurrentMonth()),
  }));

export type DateRangeInput = z.input<typeof dateRangeSchema>;
export type DateRangeOutput = z.output<typeof dateRangeSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// 1. Reporte Financiero (Ventas)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Filtros para el reporte financiero.
 * Aplica sobre: SALE + CONFIRMED + is_donated = false.
 * Filtros: rango de fechas + categoria opcional de producto.
 */
export const financialReportFiltersSchema = z
  .object({
    date_from: z.coerce.date().optional(),
    date_to: z.coerce.date().optional(),
    product_category: ProductCategorySchema.optional(),
  })
  .transform((data) => ({
    date_from: startOfDay(data.date_from ?? startOfCurrentMonth()),
    date_to: endOfDay(data.date_to ?? endOfCurrentMonth()),
    product_category: data.product_category,
  }));

export type FinancialReportFiltersInput = z.input<
  typeof financialReportFiltersSchema
>;
export type FinancialReportFilters = z.output<
  typeof financialReportFiltersSchema
>;

// ─────────────────────────────────────────────────────────────────────────────
// 2. Reporte de Inventario Actual
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Filtros para el reporte de inventario.
 * No tiene rango de fechas — muestra el estado actual.
 * Filtros: area, categoria, solo-bajo-stock.
 */
export const inventoryReportFiltersSchema = z.object({
  warehouse_area: WarehouseAreaSchema.optional(),
  category: ProductCategorySchema.optional(),
  low_stock_only: z.coerce.boolean().optional().default(false),
  search: z.string().max(255).optional(),
});

export type InventoryReportFiltersInput = z.input<
  typeof inventoryReportFiltersSchema
>;
export type InventoryReportFilters = z.output<
  typeof inventoryReportFiltersSchema
>;

// ─────────────────────────────────────────────────────────────────────────────
// 3. Reporte de Movimientos
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Filtros para el reporte de movimientos con paginacion.
 * Usa el indice compuesto: [movement_type, status, processed_at].
 */
export const movementsReportFiltersSchema = z
  .object({
    date_from: z.coerce.date().optional(),
    date_to: z.coerce.date().optional(),
    movement_type: MovementTypeSchema.optional(),
    status: MovementStatusSchema.optional(),
    product_id: z.string().uuid("ID de producto invalido").optional(),
    page: z.coerce.number().int().min(1).default(1),
    per_page: z.coerce.number().int().min(1).max(100).default(20),
  })
  .transform((data) => ({
    date_from: startOfDay(data.date_from ?? startOfCurrentMonth()),
    date_to: endOfDay(data.date_to ?? endOfCurrentMonth()),
    movement_type: data.movement_type,
    status: data.status,
    product_id: data.product_id,
    page: data.page,
    per_page: data.per_page,
  }));

export type MovementsReportFiltersInput = z.input<
  typeof movementsReportFiltersSchema
>;
export type MovementsReportFilters = z.output<
  typeof movementsReportFiltersSchema
>;

// ─────────────────────────────────────────────────────────────────────────────
// 4. Reporte de Dotaciones a Becarios
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Filtros para el reporte de donaciones (dotacion a becarios).
 * Aplica sobre: DONATION + CONFIRMED.
 * Filtros: rango de fechas + destinatario opcional.
 */
export const donationsReportFiltersSchema = z
  .object({
    date_from: z.coerce.date().optional(),
    date_to: z.coerce.date().optional(),
    recipient_id: z.string().uuid("ID de destinatario invalido").optional(),
  })
  .transform((data) => ({
    date_from: startOfDay(data.date_from ?? startOfCurrentMonth()),
    date_to: endOfDay(data.date_to ?? endOfCurrentMonth()),
    recipient_id: data.recipient_id,
  }));

export type DonationsReportFiltersInput = z.input<
  typeof donationsReportFiltersSchema
>;
export type DonationsReportFilters = z.output<
  typeof donationsReportFiltersSchema
>;

// ─────────────────────────────────────────────────────────────────────────────
// 5. Reporte de Consumo por Departamento
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Filtros para el reporte de entregas a departamentos internos.
 * Aplica sobre: DEPARTMENT_DELIVERY + CONFIRMED.
 * Filtros: rango de fechas + departamento opcional.
 */
export const departmentConsumptionFiltersSchema = z
  .object({
    date_from: z.coerce.date().optional(),
    date_to: z.coerce.date().optional(),
    department_id: z.string().uuid("ID de departamento invalido").optional(),
  })
  .transform((data) => ({
    date_from: startOfDay(data.date_from ?? startOfCurrentMonth()),
    date_to: endOfDay(data.date_to ?? endOfCurrentMonth()),
    department_id: data.department_id,
  }));

export type DepartmentConsumptionFiltersInput = z.input<
  typeof departmentConsumptionFiltersSchema
>;
export type DepartmentConsumptionFilters = z.output<
  typeof departmentConsumptionFiltersSchema
>;

// ─────────────────────────────────────────────────────────────────────────────
// 6. Reporte de Bajas por Deterioro
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Filtros para el reporte de bajas por deterioro.
 * Aplica sobre: WRITE_OFF + CONFIRMED.
 * Solo rango de fechas.
 */
export const writeOffsReportFiltersSchema = z
  .object({
    date_from: z.coerce.date().optional(),
    date_to: z.coerce.date().optional(),
  })
  .transform((data) => ({
    date_from: startOfDay(data.date_from ?? startOfCurrentMonth()),
    date_to: endOfDay(data.date_to ?? endOfCurrentMonth()),
  }));

export type WriteOffsReportFiltersInput = z.input<
  typeof writeOffsReportFiltersSchema
>;
export type WriteOffsReportFilters = z.output<
  typeof writeOffsReportFiltersSchema
>;

// ─────────────────────────────────────────────────────────────────────────────
// 7. Filtros de Audit Log
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Schema de filtros para el visor de audit logs.
 * Paginado, max 100 por pagina.
 * Las fechas se aceptan como strings ISO (z.coerce.date).
 */
export const auditLogFiltersSchema = z
  .object({
    user_id: z.string().uuid("ID de usuario invalido").optional(),
    action: z.string().optional(),
    entity_type: z.string().optional(),
    date_from: z.coerce.date().optional(),
    date_to: z.coerce.date().optional(),
    page: z.coerce.number().int().positive().default(1),
    per_page: z.coerce.number().int().positive().max(100).default(20),
  })
  .transform((data) => ({
    ...data,
    date_from: data.date_from ? startOfDay(data.date_from) : undefined,
    date_to: data.date_to ? endOfDay(data.date_to) : undefined,
  }));

export type AuditLogFiltersInput = z.input<typeof auditLogFiltersSchema>;
export type AuditLogFiltersOutput = z.output<typeof auditLogFiltersSchema>;
