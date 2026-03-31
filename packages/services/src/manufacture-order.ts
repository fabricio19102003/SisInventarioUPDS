// ═══════════════════════════════════════════════════════════════════════════════
// @upds/services — Servicio de Ordenes de Fabricacion
// CRUD ordenes, agregar/quitar items, recepcion parcial, cancelacion.
// Al recibir items se crea un InventoryMovement ENTRY y se actualiza stock.
// ═══════════════════════════════════════════════════════════════════════════════

import { type PrismaClient, type TransactionClient, type Prisma } from "@upds/db";
import {
  createManufactureOrderSchema,
  addOrderItemSchema,
  removeOrderItemSchema,
  receiveOrderItemsSchema,
  cancelOrderSchema,
  orderFiltersSchema,
} from "@upds/validators";
import { createAuditLog } from "./audit";
import type { ServiceResult, AuditContext } from "./auth";
import { InventoryMovementService } from "./inventory-movement";

// ─────────────────────────────────────────────────────────────────────────────
// Selects reutilizables
// ─────────────────────────────────────────────────────────────────────────────

const ORDER_ITEM_SELECT = {
  id: true,
  manufacture_order_id: true,
  product_variant_id: true,
  quantity_ordered: true,
  quantity_received: true,
  unit_cost: true,
  created_at: true,
  updated_at: true,
  product_variant: {
    select: {
      id: true,
      sku_suffix: true,
      size: true,
      gender: true,
      color: true,
      current_stock: true,
      product: {
        select: {
          id: true,
          sku: true,
          name: true,
        },
      },
    },
  },
} as const;

const ORDER_SELECT = {
  id: true,
  order_number: true,
  manufacturer_id: true,
  status: true,
  notes: true,
  cancel_reason: true,
  ordered_at: true,
  expected_at: true,
  completed_at: true,
  cancelled_at: true,
  created_at: true,
  updated_at: true,
  manufacturer: {
    select: {
      id: true,
      name: true,
      contact_name: true,
    },
  },
  items: {
    select: ORDER_ITEM_SELECT,
    orderBy: { created_at: "asc" as const },
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Tipos de respuesta
// ─────────────────────────────────────────────────────────────────────────────

export interface ManufactureOrderItemData {
  id: string;
  manufacture_order_id: string;
  product_variant_id: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number | string | Prisma.Decimal;
  created_at: Date;
  updated_at: Date;
  product_variant: {
    id: string;
    sku_suffix: string;
    size: string | null;
    gender: string | null;
    color: string | null;
    current_stock: number;
    product: {
      id: string;
      sku: string;
      name: string;
    };
  };
}

export interface ManufactureOrderData {
  id: string;
  order_number: string;
  manufacturer_id: string;
  status: string;
  notes: string | null;
  cancel_reason: string | null;
  ordered_at: Date;
  expected_at: Date | null;
  completed_at: Date | null;
  cancelled_at: Date | null;
  created_at: Date;
  updated_at: Date;
  manufacturer: {
    id: string;
    name: string;
    contact_name: string | null;
  };
  items: ManufactureOrderItemData[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilidades
// ─────────────────────────────────────────────────────────────────────────────

async function generateOrderNumber(tx: TransactionClient): Promise<string> {
  const now = new Date();
  const dateStr =
    now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, "0") +
    now.getDate().toString().padStart(2, "0");

  const prefix = `ORD-${dateStr}-`;

  const lastOrder = await tx.manufactureOrder.findFirst({
    where: { order_number: { startsWith: prefix } },
    orderBy: { order_number: "desc" },
    select: { order_number: true },
  });

  let seq = 1;
  if (lastOrder) {
    const lastSeq = parseInt(lastOrder.order_number.slice(prefix.length), 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `${prefix}${seq.toString().padStart(4, "0")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Servicio
// ─────────────────────────────────────────────────────────────────────────────

export class ManufactureOrderService {
  private readonly movementService: InventoryMovementService;

  constructor(private readonly db: PrismaClient) {
    this.movementService = new InventoryMovementService(db);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CREAR ORDEN
  // ─────────────────────────────────────────────────────────────────────────

  async createOrder(
    input: unknown,
    userId: string,
    ctx?: AuditContext,
  ): Promise<ServiceResult<ManufactureOrderData>> {
    const parsed = createManufactureOrderSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? "Datos invalidos",
      };
    }

    const data = parsed.data;

    const manufacturer = await this.db.manufacturer.findUnique({
      where: { id: data.manufacturer_id },
      select: { id: true, is_active: true, name: true },
    });

    if (!manufacturer) {
      return { success: false, error: "Fabricante no encontrado" };
    }

    if (!manufacturer.is_active) {
      return {
        success: false,
        error: "No se puede crear una orden para un fabricante desactivado",
      };
    }

    const order = await this.db.$transaction(
      async (tx: TransactionClient) => {
        const orderNumber = await generateOrderNumber(tx);

        const created = await tx.manufactureOrder.create({
          data: {
            order_number: orderNumber,
            manufacturer_id: data.manufacturer_id,
            status: "PENDING",
            notes: data.notes ?? null,
            expected_at: data.expected_at ?? null,
          },
          select: ORDER_SELECT,
        });

        await createAuditLog(tx, {
          user_id: userId,
          action: "CREATE",
          entity_type: "MANUFACTURE_ORDER",
          entity_id: created.id,
          new_values: {
            order_number: created.order_number,
            manufacturer: manufacturer.name,
            status: "PENDING",
          },
          ip_address: ctx?.ip_address,
          user_agent: ctx?.user_agent,
        });

        return created;
      },
    );

    return { success: true, data: order as ManufactureOrderData };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // AGREGAR ITEM A ORDEN
  // ─────────────────────────────────────────────────────────────────────────

  async addItem(
    input: unknown,
    userId: string,
    ctx?: AuditContext,
  ): Promise<ServiceResult<ManufactureOrderData>> {
    const parsed = addOrderItemSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? "Datos invalidos",
      };
    }

    const data = parsed.data;

    const order = await this.db.manufactureOrder.findUnique({
      where: { id: data.manufacture_order_id },
      select: { id: true, status: true, order_number: true },
    });

    if (!order) {
      return { success: false, error: "Orden de fabricacion no encontrada" };
    }

    if (order.status !== "PENDING") {
      return {
        success: false,
        error: "Solo se pueden agregar items a ordenes en estado PENDIENTE",
      };
    }

    const variant = await this.db.productVariant.findUnique({
      where: { id: data.product_variant_id },
      select: { id: true, is_active: true },
    });

    if (!variant) {
      return { success: false, error: "Variante de producto no encontrada" };
    }

    if (!variant.is_active) {
      return {
        success: false,
        error: "No se puede agregar una variante desactivada",
      };
    }

    const existingItem = await this.db.manufactureOrderItem.findUnique({
      where: {
        manufacture_order_id_product_variant_id: {
          manufacture_order_id: data.manufacture_order_id,
          product_variant_id: data.product_variant_id,
        },
      },
      select: { id: true },
    });

    if (existingItem) {
      return {
        success: false,
        error: "Ya existe un item con esa variante en esta orden",
      };
    }

    const updatedOrder = await this.db.$transaction(
      async (tx: TransactionClient) => {
        await tx.manufactureOrderItem.create({
          data: {
            manufacture_order_id: data.manufacture_order_id,
            product_variant_id: data.product_variant_id,
            quantity_ordered: data.quantity_ordered,
            unit_cost: data.unit_cost,
          },
        });

        const result = await tx.manufactureOrder.findUniqueOrThrow({
          where: { id: data.manufacture_order_id },
          select: ORDER_SELECT,
        });

        await createAuditLog(tx, {
          user_id: userId,
          action: "UPDATE",
          entity_type: "MANUFACTURE_ORDER",
          entity_id: order.id,
          new_values: {
            action: "ADD_ITEM",
            product_variant_id: data.product_variant_id,
            quantity_ordered: data.quantity_ordered,
            unit_cost: data.unit_cost,
          },
          ip_address: ctx?.ip_address,
          user_agent: ctx?.user_agent,
        });

        return result;
      },
    );

    return { success: true, data: updatedOrder as ManufactureOrderData };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // QUITAR ITEM DE ORDEN
  // ─────────────────────────────────────────────────────────────────────────

  async removeItem(
    itemId: string,
    userId: string,
    ctx?: AuditContext,
  ): Promise<ServiceResult<ManufactureOrderData>> {
    const parsed = removeOrderItemSchema.safeParse({ item_id: itemId });
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? "Datos invalidos",
      };
    }

    const item = await this.db.manufactureOrderItem.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        manufacture_order_id: true,
        product_variant_id: true,
        quantity_ordered: true,
        manufacture_order: {
          select: { id: true, status: true },
        },
      },
    });

    if (!item) {
      return { success: false, error: "Item de orden no encontrado" };
    }

    if (item.manufacture_order.status !== "PENDING") {
      return {
        success: false,
        error: "Solo se pueden quitar items de ordenes en estado PENDIENTE",
      };
    }

    const updatedOrder = await this.db.$transaction(
      async (tx: TransactionClient) => {
        await tx.manufactureOrderItem.delete({
          where: { id: itemId },
        });

        const result = await tx.manufactureOrder.findUniqueOrThrow({
          where: { id: item.manufacture_order_id },
          select: ORDER_SELECT,
        });

        await createAuditLog(tx, {
          user_id: userId,
          action: "UPDATE",
          entity_type: "MANUFACTURE_ORDER",
          entity_id: item.manufacture_order_id,
          old_values: {
            action: "REMOVE_ITEM",
            product_variant_id: item.product_variant_id,
            quantity_ordered: item.quantity_ordered,
          },
          ip_address: ctx?.ip_address,
          user_agent: ctx?.user_agent,
        });

        return result;
      },
    );

    return { success: true, data: updatedOrder as ManufactureOrderData };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INICIAR PRODUCCION (PENDING -> IN_PROGRESS)
  // ─────────────────────────────────────────────────────────────────────────

  async startProduction(
    orderId: string,
    userId: string,
    ctx?: AuditContext,
  ): Promise<ServiceResult<ManufactureOrderData>> {
    const order = await this.db.manufactureOrder.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, order_number: true, items: { select: { id: true } } },
    });

    if (!order) {
      return { success: false, error: "Orden de fabricacion no encontrada" };
    }

    if (order.status !== "PENDING") {
      return {
        success: false,
        error: "Solo se puede iniciar produccion de ordenes en estado PENDIENTE",
      };
    }

    if (order.items.length === 0) {
      return {
        success: false,
        error: "No se puede iniciar produccion de una orden sin items",
      };
    }

    const updatedOrder = await this.db.$transaction(
      async (tx: TransactionClient) => {
        const result = await tx.manufactureOrder.update({
          where: { id: orderId },
          data: { status: "IN_PROGRESS" },
          select: ORDER_SELECT,
        });

        await createAuditLog(tx, {
          user_id: userId,
          action: "UPDATE",
          entity_type: "MANUFACTURE_ORDER",
          entity_id: orderId,
          old_values: { status: "PENDING" },
          new_values: { status: "IN_PROGRESS" },
          ip_address: ctx?.ip_address,
          user_agent: ctx?.user_agent,
        });

        return result;
      },
    );

    return { success: true, data: updatedOrder as ManufactureOrderData };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RECIBIR ITEMS (recepcion parcial o total)
  // ─────────────────────────────────────────────────────────────────────────

  async receiveItems(
    input: unknown,
    userId: string,
    ctx?: AuditContext,
  ): Promise<ServiceResult<ManufactureOrderData>> {
    const parsed = receiveOrderItemsSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? "Datos invalidos",
      };
    }

    const data = parsed.data;

    const order = await this.db.manufactureOrder.findUnique({
      where: { id: data.manufacture_order_id },
      select: {
        id: true,
        status: true,
        order_number: true,
        items: {
          select: {
            id: true,
            product_variant_id: true,
            quantity_ordered: true,
            quantity_received: true,
          },
        },
      },
    });

    if (!order) {
      return { success: false, error: "Orden de fabricacion no encontrada" };
    }

    if (order.status !== "PENDING" && order.status !== "IN_PROGRESS") {
      return {
        success: false,
        error: "Solo se pueden recibir items de ordenes PENDIENTES o EN PROGRESO",
      };
    }

    const itemsMap = new Map(order.items.map((i) => [i.id, i]));

    for (const receiveItem of data.items) {
      const orderItem = itemsMap.get(receiveItem.manufacture_order_item_id);
      if (!orderItem) {
        return {
          success: false,
          error: `Item ${receiveItem.manufacture_order_item_id} no pertenece a esta orden`,
        };
      }

      const remaining =
        orderItem.quantity_ordered - orderItem.quantity_received;
      if (receiveItem.quantity_received > remaining) {
        return {
          success: false,
          error: `No se puede recibir ${receiveItem.quantity_received} unidades del item ${orderItem.id}. Pendiente: ${remaining}`,
        };
      }
    }

    const updatedOrder = await this.db.$transaction(
      async (tx: TransactionClient) => {
        // Crear movimiento DRAFT de tipo ENTRY via InventoryMovementService
        const createResult = await this.movementService.createMovement(
          {
            movement_type: "ENTRY",
            manufacture_order_id: order.id,
            notes: `Recepcion de orden ${order.order_number}`,
          },
          userId,
          ctx,
          tx,
        );

        if (!createResult.success) {
          throw new Error(createResult.error);
        }

        const movementId = createResult.data.id;

        // Agregar items al movimiento
        // (quantity_received y stock se actualizan via confirmMovement)
        for (const receiveItem of data.items) {
          const orderItem = itemsMap.get(
            receiveItem.manufacture_order_item_id,
          )!;

          const addResult = await this.movementService.addItem(
            {
              movement_id: movementId,
              product_variant_id: orderItem.product_variant_id,
              quantity: receiveItem.quantity_received,
            },
            userId,
            ctx,
            tx,
          );

          if (!addResult.success) {
            throw new Error(addResult.error);
          }
        }

        // Confirmar el movimiento (actualiza stock atomicamente)
        const confirmResult = await this.movementService.confirmMovement(
          { movement_id: movementId },
          userId,
          ctx,
          tx,
        );

        if (!confirmResult.success) {
          throw new Error(confirmResult.error);
        }

        // Verificar si todas las lineas estan completas para auto-completar
        const updatedItems = await tx.manufactureOrderItem.findMany({
          where: { manufacture_order_id: order.id },
          select: { quantity_ordered: true, quantity_received: true },
        });

        const allComplete = updatedItems.every(
          (i) => i.quantity_received >= i.quantity_ordered,
        );

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const orderUpdate: Record<string, any> = {};
        if (order.status === "PENDING") {
          orderUpdate.status = allComplete ? "COMPLETED" : "IN_PROGRESS";
        } else if (allComplete) {
          orderUpdate.status = "COMPLETED";
        }

        if (orderUpdate.status === "COMPLETED") {
          orderUpdate.completed_at = new Date();
        }

        if (Object.keys(orderUpdate).length > 0) {
          await tx.manufactureOrder.update({
            where: { id: order.id },
            data: orderUpdate,
          });
        }

        const result = await tx.manufactureOrder.findUniqueOrThrow({
          where: { id: order.id },
          select: ORDER_SELECT,
        });

        await createAuditLog(tx, {
          user_id: userId,
          action: "CONFIRM",
          entity_type: "MANUFACTURE_ORDER",
          entity_id: order.id,
          new_values: {
            action: "RECEIVE_ITEMS",
            movement_id: movementId,
            movement_number: confirmResult.data.movement_number,
            items_received: data.items.map((i) => ({
              item_id: i.manufacture_order_item_id,
              quantity: i.quantity_received,
            })),
            new_status: result.status,
          },
          ip_address: ctx?.ip_address,
          user_agent: ctx?.user_agent,
        });

        return result;
      },
    );

    return { success: true, data: updatedOrder as ManufactureOrderData };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CANCELAR ORDEN
  // ─────────────────────────────────────────────────────────────────────────

  async cancelOrder(
    input: unknown,
    userId: string,
    ctx?: AuditContext,
  ): Promise<ServiceResult<ManufactureOrderData>> {
    const parsed = cancelOrderSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? "Datos invalidos",
      };
    }

    const data = parsed.data;

    const order = await this.db.manufactureOrder.findUnique({
      where: { id: data.manufacture_order_id },
      select: { id: true, status: true, order_number: true },
    });

    if (!order) {
      return { success: false, error: "Orden de fabricacion no encontrada" };
    }

    if (order.status !== "PENDING" && order.status !== "IN_PROGRESS") {
      return {
        success: false,
        error: "Solo se pueden cancelar ordenes en estado PENDIENTE o EN PROGRESO",
      };
    }

    const updatedOrder = await this.db.$transaction(
      async (tx: TransactionClient) => {
        const result = await tx.manufactureOrder.update({
          where: { id: order.id },
          data: {
            status: "CANCELLED",
            cancel_reason: data.cancel_reason,
            cancelled_at: new Date(),
          },
          select: ORDER_SELECT,
        });

        await createAuditLog(tx, {
          user_id: userId,
          action: "CANCEL",
          entity_type: "MANUFACTURE_ORDER",
          entity_id: order.id,
          old_values: { status: order.status },
          new_values: {
            status: "CANCELLED",
            cancel_reason: data.cancel_reason,
          },
          ip_address: ctx?.ip_address,
          user_agent: ctx?.user_agent,
        });

        return result;
      },
    );

    return { success: true, data: updatedOrder as ManufactureOrderData };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // OBTENER ORDEN POR ID
  // ─────────────────────────────────────────────────────────────────────────

  async getOrderById(
    id: string,
  ): Promise<ServiceResult<ManufactureOrderData>> {
    const order = await this.db.manufactureOrder.findUnique({
      where: { id },
      select: ORDER_SELECT,
    });

    if (!order) {
      return { success: false, error: "Orden de fabricacion no encontrada" };
    }

    return { success: true, data: order as ManufactureOrderData };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LISTAR ORDENES CON FILTROS Y PAGINACION
  // ─────────────────────────────────────────────────────────────────────────

  async listOrders(input?: unknown): Promise<
    ServiceResult<{
      orders: ManufactureOrderData[];
      total: number;
      page: number;
      per_page: number;
    }>
  > {
    const parsed = orderFiltersSchema.safeParse(input ?? {});
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? "Filtros invalidos",
      };
    }

    const { search, status, manufacturer_id, date_from, date_to, page, per_page } =
      parsed.data;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    if (status) where.status = status;
    if (manufacturer_id) where.manufacturer_id = manufacturer_id;

    if (date_from || date_to) {
      where.ordered_at = {};
      if (date_from) where.ordered_at.gte = date_from;
      if (date_to) where.ordered_at.lte = date_to;
    }

    if (search) {
      where.OR = [
        { order_number: { contains: search, mode: "insensitive" } },
        {
          manufacturer: {
            name: { contains: search, mode: "insensitive" },
          },
        },
      ];
    }

    const [orders, total] = await this.db.$transaction([
      this.db.manufactureOrder.findMany({
        where,
        select: ORDER_SELECT,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * per_page,
        take: per_page,
      }),
      this.db.manufactureOrder.count({ where }),
    ]);

    return {
      success: true,
      data: {
        orders: orders as ManufactureOrderData[],
        total,
        page,
        per_page,
      },
    };
  }
}
