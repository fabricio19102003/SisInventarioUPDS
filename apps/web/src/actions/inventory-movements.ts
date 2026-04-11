"use server";

// ═══════════════════════════════════════════════════════════════════════════════
// Server Actions — Inventory Movement Domain
// Capa fina: permission gate + delegacion al servicio. Sin logica de negocio.
// ═══════════════════════════════════════════════════════════════════════════════

import { InventoryMovementService } from "@upds/services";
import { prisma } from "@upds/db";
import { requirePermission } from "@/lib/session";
import { getAuditContext } from "@/lib/audit-context";

const movementService = new InventoryMovementService(prisma);

// ─────────────────────────────────────────────────────────────────────────────
// CREAR MOVIMIENTO (cabecera DRAFT)
// ─────────────────────────────────────────────────────────────────────────────

export async function createMovementAction(input: unknown) {
  const session = await requirePermission("movement:create");
  const auditCtx = await getAuditContext();
  return movementService.createMovement(input, session.id, auditCtx);
}

// ─────────────────────────────────────────────────────────────────────────────
// AGREGAR ITEM A MOVIMIENTO DRAFT
// ─────────────────────────────────────────────────────────────────────────────

export async function addMovementItemAction(input: unknown) {
  const session = await requirePermission("movement:create");
  const auditCtx = await getAuditContext();
  return movementService.addItem(input, session.id, auditCtx);
}

// ─────────────────────────────────────────────────────────────────────────────
// REMOVER ITEM DE MOVIMIENTO DRAFT
// ─────────────────────────────────────────────────────────────────────────────

export async function removeMovementItemAction(itemId: string) {
  const session = await requirePermission("movement:create");
  const auditCtx = await getAuditContext();
  return movementService.removeItem(itemId, session.id, auditCtx);
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIRMAR MOVIMIENTO — Operacion critica, afecta stock
// ─────────────────────────────────────────────────────────────────────────────

export async function confirmMovementAction(movementId: string) {
  const session = await requirePermission("movement:confirm");
  const auditCtx = await getAuditContext();
  return movementService.confirmMovement(
    { movement_id: movementId },
    session.id,
    auditCtx,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CANCELAR MOVIMIENTO
// ─────────────────────────────────────────────────────────────────────────────

export async function cancelMovementAction(input: unknown) {
  const session = await requirePermission("movement:cancel");
  const auditCtx = await getAuditContext();
  return movementService.cancelMovement(input, session.id, auditCtx);
}

// ─────────────────────────────────────────────────────────────────────────────
// OBTENER MOVIMIENTO POR ID
// ─────────────────────────────────────────────────────────────────────────────

export async function getMovementByIdAction(movementId: string) {
  await requirePermission("movement:view");
  return movementService.getMovementById(movementId);
}

// ─────────────────────────────────────────────────────────────────────────────
// LISTAR MOVIMIENTOS CON FILTROS Y PAGINACION
// ─────────────────────────────────────────────────────────────────────────────

export async function listMovementsAction(input?: unknown) {
  await requirePermission("movement:view");
  return movementService.listMovements(input);
}
