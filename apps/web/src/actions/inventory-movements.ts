"use server";

// ═══════════════════════════════════════════════════════════════════════════════
// Server Actions — Inventory Movement Domain
// Capa fina: permission gate + delegacion al servicio. Sin logica de negocio.
// ═══════════════════════════════════════════════════════════════════════════════

import { InventoryMovementService } from "@upds/services";
import { prisma } from "@upds/db";
import { requirePermission } from "@/lib/session";

const movementService = new InventoryMovementService(prisma);

// ─────────────────────────────────────────────────────────────────────────────
// CREAR MOVIMIENTO (cabecera DRAFT)
// ─────────────────────────────────────────────────────────────────────────────

export async function createMovementAction(input: unknown) {
  const session = await requirePermission("movement:create");
  return movementService.createMovement(input, session.id);
}

// ─────────────────────────────────────────────────────────────────────────────
// AGREGAR ITEM A MOVIMIENTO DRAFT
// ─────────────────────────────────────────────────────────────────────────────

export async function addMovementItemAction(input: unknown) {
  const session = await requirePermission("movement:create");
  return movementService.addItem(input, session.id);
}

// ─────────────────────────────────────────────────────────────────────────────
// REMOVER ITEM DE MOVIMIENTO DRAFT
// ─────────────────────────────────────────────────────────────────────────────

export async function removeMovementItemAction(itemId: string) {
  const session = await requirePermission("movement:create");
  return movementService.removeItem(itemId, session.id);
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIRMAR MOVIMIENTO — Operacion critica, afecta stock
// ─────────────────────────────────────────────────────────────────────────────

export async function confirmMovementAction(movementId: string) {
  const session = await requirePermission("movement:confirm");
  return movementService.confirmMovement({ movement_id: movementId }, session.id);
}

// ─────────────────────────────────────────────────────────────────────────────
// CANCELAR MOVIMIENTO
// ─────────────────────────────────────────────────────────────────────────────

export async function cancelMovementAction(input: unknown) {
  const session = await requirePermission("movement:cancel");
  return movementService.cancelMovement(input, session.id);
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
