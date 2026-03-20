// ═══════════════════════════════════════════════════════════════════════════════
// @upds/services — Helper de Auditoria
// Toda accion de escritura debe generar una entrada inmutable en AuditLog.
// Este modulo centraliza la creacion de logs para uso en todos los services.
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

import type { PrismaClient, TransactionClient } from "@upds/db";

/** Acepta tanto PrismaClient como TransactionClient (dentro de $transaction). */
export type DbClient = PrismaClient | TransactionClient;

/** Acciones registrables en el audit log. */
export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "CONFIRM"
  | "CANCEL"
  | "LOGIN"
  | "LOGIN_FAILED"
  | "PASSWORD_CHANGE"
  | "PASSWORD_RESET";

/** Entidades del sistema que pueden auditarse. */
export type AuditEntityType =
  | "USER"
  | "PRODUCT"
  | "PRODUCT_VARIANT"
  | "MANUFACTURER"
  | "MANUFACTURE_ORDER"
  | "INVENTORY_MOVEMENT"
  | "RECIPIENT"
  | "DEPARTMENT";

/** Parametros para crear una entrada de auditoria. */
export interface CreateAuditLogParams {
  user_id: string;
  action: AuditAction;
  entity_type: AuditEntityType;
  entity_id: string;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Funcion principal
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Crea una entrada inmutable en la tabla audit_logs.
 *
 * Puede usarse de dos formas:
 * 1. Con un PrismaClient directo (operaciones simples)
 * 2. Dentro de una transaccion prisma.$transaction (operaciones compuestas)
 *
 * @example
 * // Uso directo
 * await createAuditLog(prisma, {
 *   user_id: session.user.id,
 *   action: "CREATE",
 *   entity_type: "USER",
 *   entity_id: newUser.id,
 *   new_values: { email: newUser.email, role: newUser.role },
 * });
 *
 * @example
 * // Dentro de transaccion
 * await prisma.$transaction(async (tx) => {
 *   const user = await tx.user.create({ data: {...} });
 *   await createAuditLog(tx, {
 *     user_id: adminId,
 *     action: "CREATE",
 *     entity_type: "USER",
 *     entity_id: user.id,
 *     new_values: { email: user.email },
 *   });
 * });
 */
export async function createAuditLog(
  db: DbClient,
  params: CreateAuditLogParams,
): Promise<void> {
  await db.auditLog.create({
    data: {
      user_id: params.user_id,
      action: params.action,
      entity_type: params.entity_type,
      entity_id: params.entity_id,
      old_values:
        (params.old_values as Record<
          string,
          string | number | boolean | null
        >) ?? undefined,
      new_values:
        (params.new_values as Record<
          string,
          string | number | boolean | null
        >) ?? undefined,
      ip_address: params.ip_address ?? null,
      user_agent: params.user_agent ?? null,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilidades
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extrae los campos que cambiaron entre el estado anterior y el nuevo.
 * Util para registrar solo las diferencias en old_values / new_values.
 *
 * @example
 * const changes = diffValues(
 *   { email: "old@mail.com", full_name: "Juan", role: "VIEWER" },
 *   { email: "new@mail.com", full_name: "Juan", role: "ADMIN" },
 * );
 * // changes = { old: { email: "old@mail.com", role: "VIEWER" }, new: { email: "new@mail.com", role: "ADMIN" } }
 */
export function diffValues(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>,
): { old: Record<string, unknown>; new: Record<string, unknown> } | null {
  const oldDiff: Record<string, unknown> = {};
  const newDiff: Record<string, unknown> = {};

  for (const key of Object.keys(newObj)) {
    if (oldObj[key] !== newObj[key]) {
      oldDiff[key] = oldObj[key];
      newDiff[key] = newObj[key];
    }
  }

  if (Object.keys(oldDiff).length === 0) return null;

  return { old: oldDiff, new: newDiff };
}
