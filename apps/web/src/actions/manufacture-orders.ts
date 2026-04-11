"use server";

// ═══════════════════════════════════════════════════════════════════════════════
// Server Actions — Manufacture Order Domain
// Capa fina: permission gate + delegacion al servicio. Sin logica de negocio.
// ═══════════════════════════════════════════════════════════════════════════════

import { ManufactureOrderService } from "@upds/services";
import { prisma } from "@upds/db";
import { requirePermission } from "@/lib/session";
import { getAuditContext } from "@/lib/audit-context";

const orderService = new ManufactureOrderService(prisma);

// ─────────────────────────────────────────────────────────────────────────────
// CREAR ORDEN DE FABRICACION
// ─────────────────────────────────────────────────────────────────────────────

export async function createOrderAction(input: unknown) {
  const session = await requirePermission("manufacture_order:create");
  const auditCtx = await getAuditContext();
  return orderService.createOrder(input, session.id, auditCtx);
}

// ─────────────────────────────────────────────────────────────────────────────
// AGREGAR ITEM A ORDEN
// ─────────────────────────────────────────────────────────────────────────────

export async function addOrderItemAction(input: unknown) {
  const session = await requirePermission("manufacture_order:create");
  const auditCtx = await getAuditContext();
  return orderService.addItem(input, session.id, auditCtx);
}

// ─────────────────────────────────────────────────────────────────────────────
// REMOVER ITEM DE ORDEN
// ─────────────────────────────────────────────────────────────────────────────

export async function removeOrderItemAction(itemId: string) {
  const session = await requirePermission("manufacture_order:create");
  const auditCtx = await getAuditContext();
  return orderService.removeItem(itemId, session.id, auditCtx);
}

// ─────────────────────────────────────────────────────────────────────────────
// INICIAR PRODUCCION (PENDING -> IN_PROGRESS)
// ─────────────────────────────────────────────────────────────────────────────

export async function startProductionAction(orderId: string) {
  const session = await requirePermission("manufacture_order:create");
  const auditCtx = await getAuditContext();
  return orderService.startProduction(orderId, session.id, auditCtx);
}

// ─────────────────────────────────────────────────────────────────────────────
// RECIBIR ITEMS — Operacion critica, afecta stock via InventoryMovement
// ─────────────────────────────────────────────────────────────────────────────

export async function receiveOrderItemsAction(input: unknown) {
  const session = await requirePermission("manufacture_order:receive");
  const auditCtx = await getAuditContext();
  return orderService.receiveItems(input, session.id, auditCtx);
}

// ─────────────────────────────────────────────────────────────────────────────
// CANCELAR ORDEN
// ─────────────────────────────────────────────────────────────────────────────

export async function cancelOrderAction(input: unknown) {
  const session = await requirePermission("manufacture_order:cancel");
  const auditCtx = await getAuditContext();
  return orderService.cancelOrder(input, session.id, auditCtx);
}

// ─────────────────────────────────────────────────────────────────────────────
// OBTENER ORDEN POR ID
// ─────────────────────────────────────────────────────────────────────────────

export async function getOrderByIdAction(orderId: string) {
  await requirePermission("manufacture_order:view");
  return orderService.getOrderById(orderId);
}

// ─────────────────────────────────────────────────────────────────────────────
// LISTAR ORDENES CON FILTROS Y PAGINACION
// ─────────────────────────────────────────────────────────────────────────────

export async function listOrdersAction(input?: unknown) {
  await requirePermission("manufacture_order:view");
  return orderService.listOrders(input);
}
