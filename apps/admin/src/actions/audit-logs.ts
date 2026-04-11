"use server";

// ═══════════════════════════════════════════════════════════════════════════════
// @upds/admin — Server Actions para Audit Logs
// Solo accesible por el rol ADMIN (permiso audit:view).
// Valida filtros con Zod antes de llamar al servicio.
// ═══════════════════════════════════════════════════════════════════════════════

import { requirePermission } from "@/lib/session";
import { prisma } from "@upds/db";
import { getAuditLogs, getAuditFilterOptions } from "@upds/services";
import { auditLogFiltersSchema } from "@upds/validators";
import type { AuditLogFiltersInput } from "@upds/validators";

/**
 * Retorna una pagina paginada de audit logs con filtros opcionales.
 * Permiso requerido: audit:view (exclusivo ADMIN).
 */
export async function getAuditLogsAction(input?: AuditLogFiltersInput) {
  await requirePermission("audit:view");

  // Validar y parsear filtros
  const parsed = auditLogFiltersSchema.safeParse(input ?? {});
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.errors.map((e) => e.message).join(", "),
    };
  }

  return getAuditLogs(prisma, parsed.data);
}

/**
 * Retorna los valores distintos de action y entity_type para poblar dropdowns.
 * Permiso requerido: audit:view (exclusivo ADMIN).
 */
export async function getAuditFilterOptionsAction() {
  await requirePermission("audit:view");
  return getAuditFilterOptions(prisma);
}
