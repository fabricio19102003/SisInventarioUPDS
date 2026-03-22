"use server";

// ═══════════════════════════════════════════════════════════════════════════════
// Server Actions — Manufacture Order Domain
// Capa fina: permission gate + delegacion al servicio. Sin logica de negocio.
// ═══════════════════════════════════════════════════════════════════════════════

import { ManufactureOrderService } from "@upds/services";
import { prisma } from "@upds/db";
import { requirePermission } from "@/lib/session";

const orderService = new ManufactureOrderService(prisma);

// ─────────────────────────────────────────────────────────────────────────────
// CREAR ORDEN DE FABRICACION
// ─────────────────────────────────────────────────────────────────────────────

export async function createOrderAction(input: unknown) {
  const session = await requirePermission("manufacture_order:create");
  return orderService.createOrder(input, session.id);
}

// ─────────────────────────────────────────────────────────────────────────────
// AGREGAR ITEM A ORDEN
// ─────────────────────────────────────────────────────────────────────────────

export async function addOrderItemAction(input: unknown) {
  const session = await requirePermission("manufacture_order:create");
  return orderService.addItem(input, session.id);
}

// ─────────────────────────────────────────────────────────────────────────────
// REMOVER ITEM DE ORDEN
// ─────────────────────────────────────────────────────────────────────────────

export async function removeOrderItemAction(itemId: string) {
  const session = await requirePermission("manufacture_order:create");
  return orderService.removeItem(itemId, session.id);
}

// ─────────────────────────────────────────────────────────────────────────────
// INICIAR PRODUCCION (PENDING -> IN_PROGRESS)
// ─────────────────────────────────────────────────────────────────────────────

export async function startProductionAction(orderId: string) {
  const session = await requirePermission("manufacture_order:create");
  return orderService.startProduction(orderId, session.id);
}

// ─────────────────────────────────────────────────────────────────────────────
// RECIBIR ITEMS — Operacion critica, afecta stock via InventoryMovement
// ─────────────────────────────────────────────────────────────────────────────

export async function receiveOrderItemsAction(input: unknown) {
  const session = await requirePermission("manufacture_order:receive");
  return orderService.receiveItems(input, session.id);
}

// ─────────────────────────────────────────────────────────────────────────────
// CANCELAR ORDEN
// ─────────────────────────────────────────────────────────────────────────────

export async function cancelOrderAction(input: unknown) {
  const session = await requirePermission("manufacture_order:cancel");
  return orderService.cancelOrder(input, session.id);
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
