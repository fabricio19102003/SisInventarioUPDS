"use server";

// ═══════════════════════════════════════════════════════════════════════════════
// Server Actions de Reportes
// Cada action:
//   1. Exige autenticacion y permiso especifico via requirePermission()
//   2. Valida el input con el schema Zod correspondiente
//   3. Llama al metodo de ReportsService
//   4. Retorna ServiceResult<T>
//
// Permisos por rol (segun AGENTS.md):
//   - report:financial       → ADMIN, INVENTORY_MANAGER
//   - report:inventory       → ADMIN, INVENTORY_MANAGER, VIEWER
//   - report:movements       → ADMIN, INVENTORY_MANAGER, VIEWER
//   - report:donations       → ADMIN, INVENTORY_MANAGER, VIEWER
//   - report:consumption     → ADMIN, INVENTORY_MANAGER
//   - report:write_offs      → ADMIN, INVENTORY_MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

import { prisma } from "@upds/db";
import { ReportsService } from "@upds/services";
import {
  financialReportFiltersSchema,
  inventoryReportFiltersSchema,
  movementsReportFiltersSchema,
  donationsReportFiltersSchema,
  departmentConsumptionFiltersSchema,
  writeOffsReportFiltersSchema,
} from "@upds/validators";
import { requirePermission } from "@/lib/session";

const reportsService = new ReportsService(prisma);

// ─────────────────────────────────────────────────────────────────────────────
// 1. Reporte Financiero (Ventas confirmadas)
// Acceso: ADMIN, INVENTORY_MANAGER
// ─────────────────────────────────────────────────────────────────────────────

export async function getFinancialReportAction(input: unknown) {
  await requirePermission("report:financial");

  const parsed = financialReportFiltersSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.message };
  }

  return reportsService.getFinancialReport(parsed.data);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Reporte de Inventario Actual
// Acceso: ADMIN, INVENTORY_MANAGER, VIEWER
// ─────────────────────────────────────────────────────────────────────────────

export async function getInventoryReportAction(input: unknown) {
  await requirePermission("report:inventory");

  const parsed = inventoryReportFiltersSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.message };
  }

  return reportsService.getInventoryReport(parsed.data);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Reporte de Movimientos (Paginado)
// Acceso: ADMIN, INVENTORY_MANAGER, VIEWER
// ─────────────────────────────────────────────────────────────────────────────

export async function getMovementsReportAction(input: unknown) {
  await requirePermission("report:movements");

  const parsed = movementsReportFiltersSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.message };
  }

  return reportsService.getMovementsReport(parsed.data);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Reporte de Dotaciones a Becarios
// Acceso: ADMIN, INVENTORY_MANAGER, VIEWER
// ─────────────────────────────────────────────────────────────────────────────

export async function getDonationsReportAction(input: unknown) {
  await requirePermission("report:donations");

  const parsed = donationsReportFiltersSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.message };
  }

  return reportsService.getDonationsReport(parsed.data);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Reporte de Consumo por Departamento
// Acceso: ADMIN, INVENTORY_MANAGER
// ─────────────────────────────────────────────────────────────────────────────

export async function getDepartmentConsumptionAction(input: unknown) {
  await requirePermission("report:consumption");

  const parsed = departmentConsumptionFiltersSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.message };
  }

  return reportsService.getDepartmentConsumptionReport(parsed.data);
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Reporte de Bajas por Deterioro
// Acceso: ADMIN, INVENTORY_MANAGER
// ─────────────────────────────────────────────────────────────────────────────

export async function getWriteOffsReportAction(input: unknown) {
  await requirePermission("report:write_offs");

  const parsed = writeOffsReportFiltersSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.message };
  }

  return reportsService.getWriteOffsReport(parsed.data);
}
