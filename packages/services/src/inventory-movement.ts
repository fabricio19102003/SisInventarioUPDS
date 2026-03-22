// ═══════════════════════════════════════════════════════════════════════════════
// @upds/services — Servicio de Movimientos de Inventario
// Corazon del sistema: toda operacion que afecte stock pasa por aqui.
// Ciclo de vida: DRAFT -> CONFIRMED (irreversible) | DRAFT -> CANCELLED.
// El stock solo se modifica al confirmar, dentro de una transaccion atomica.
// ═══════════════════════════════════════════════════════════════════════════════

import { type PrismaClient, type TransactionClient, type Prisma } from "@upds/db";
import {
  createMovementSchema,
  addMovementItemSchema,
  confirmMovementSchema,
  cancelMovementSchema,
  movementFiltersSchema,
} from "@upds/validators";
import { createAuditLog } from "./audit";
import type { ServiceResult, AuditContext } from "./auth";

// ─────────────────────────────────────────────────────────────────────────────
// Selects reutilizables
// ─────────────────────────────────────────────────────────────────────────────

const MOVEMENT_ITEM_SELECT = {
  id: true,
  inventory_movement_id: true,
  product_variant_id: true,
  quantity: true,
  unit_price: true,
  subtotal: true,
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
          category: true,
          warehouse_area: true,
        },
      },
    },
  },
} as const;

const MOVEMENT_SELECT = {
  id: true,
  movement_number: true,
  movement_type: true,
  status: true,
  is_donated: true,
  total_amount: true,
  notes: true,
  cancel_reason: true,
  recipient_id: true,
  department_id: true,
  manufacture_order_id: true,
  processed_by: true,
  processed_at: true,
  cancelled_at: true,
  created_at: true,
  updated_at: true,
  recipient: {
    select: {
      id: true,
      document_number: true,
      full_name: true,
      type: true,
    },
  },
  department: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
  manufacture_order: {
    select: {
      id: true,
      order_number: true,
      status: true,
    },
  },
  processed_by_user: {
    select: {
      id: true,
      full_name: true,
      email: true,
    },
  },
  items: {
    select: MOVEMENT_ITEM_SELECT,
    orderBy: { created_at: "asc" as const },
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Tipos de respuesta
// ─────────────────────────────────────────────────────────────────────────────

export interface MovementItemData {
  id: string;
  inventory_movement_id: string;
  product_variant_id: string;
  quantity: number;
  unit_price: Prisma.Decimal | number | string;
  subtotal: Prisma.Decimal | number | string;
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
      category: string;
      warehouse_area: string;
    };
  };
}

export interface MovementData {
  id: string;
  movement_number: string;
  movement_type: string;
  status: string;
  is_donated: boolean;
  total_amount: Prisma.Decimal | number | string;
  notes: string | null;
  cancel_reason: string | null;
  recipient_id: string | null;
  department_id: string | null;
  manufacture_order_id: string | null;
  processed_by: string;
  processed_at: Date | null;
  cancelled_at: Date | null;
  created_at: Date;
  updated_at: Date;
  recipient: {
    id: string;
    document_number: string;
    full_name: string;
    type: string;
  } | null;
  department: {
    id: string;
    name: string;
    code: string;
  } | null;
  manufacture_order: {
    id: string;
    order_number: string;
    status: string;
  } | null;
  processed_by_user: {
    id: string;
    full_name: string;
    email: string;
  };
  items: MovementItemData[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilidades
// ─────────────────────────────────────────────────────────────────────────────

export async function generateMovementNumber(
  tx: TransactionClient,
): Promise<string> {
  const today = new Date();
  const dateStr =
    today.getFullYear().toString() +
    (today.getMonth() + 1).toString().padStart(2, "0") +
    today.getDate().toString().padStart(2, "0");

  const prefix = `MOV-${dateStr}-`;

  const lastMovement = await tx.inventoryMovement.findFirst({
    where: { movement_number: { startsWith: prefix } },
    orderBy: { movement_number: "desc" },
    select: { movement_number: true },
  });

  let sequence = 1;
  if (lastMovement) {
    const lastSeq = parseInt(
      lastMovement.movement_number.replace(prefix, ""),
      10,
    );
    if (!isNaN(lastSeq)) {
      sequence = lastSeq + 1;
    }
  }

  return `${prefix}${sequence.toString().padStart(4, "0")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Servicio
// ─────────────────────────────────────────────────────────────────────────────

export type DbClient = PrismaClient | TransactionClient;

export class InventoryMovementService {
  constructor(private readonly db: PrismaClient) {}

  // ─────────────────────────────────────────────────────────────────────────
  // CREAR MOVIMIENTO (cabecera DRAFT)
  // ─────────────────────────────────────────────────────────────────────────

  async createMovement(
    input: unknown,
    userId: string,
    ctx?: AuditContext,
    externalTx?: TransactionClient,
  ): Promise<ServiceResult<MovementData>> {
    const parsed = createMovementSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? "Datos invalidos",
      };
    }

    const data = parsed.data;
    const db: DbClient = externalTx ?? this.db;

    // Validar que el destinatario existe y es del tipo correcto
    if (data.recipient_id) {
      const recipient = await db.recipient.findUnique({
        where: { id: data.recipient_id },
        select: { id: true, type: true, is_active: true },
      });

      if (!recipient) {
        return { success: false, error: "Destinatario no encontrado" };
      }

      if (!recipient.is_active) {
        return { success: false, error: "El destinatario esta desactivado" };
      }

      if (
        data.movement_type === "DONATION" &&
        recipient.type !== "SCHOLAR"
      ) {
        return {
          success: false,
          error:
            "Las dotaciones solo pueden realizarse a becarios (tipo SCHOLAR)",
        };
      }

      if (
        data.movement_type === "SALE" &&
        recipient.type !== "STUDENT" &&
        recipient.type !== "STAFF"
      ) {
        return {
          success: false,
          error:
            "Las ventas solo pueden realizarse a estudiantes o personal (tipo STUDENT o STAFF)",
        };
      }
    }

    // Validar que el departamento existe y esta activo
    if (data.department_id) {
      const department = await db.department.findUnique({
        where: { id: data.department_id },
        select: { id: true, is_active: true },
      });

      if (!department) {
        return { success: false, error: "Departamento no encontrado" };
      }

      if (!department.is_active) {
        return { success: false, error: "El departamento esta desactivado" };
      }
    }

    // Validar que la orden de fabricacion existe y esta en estado valido
    if (data.manufacture_order_id) {
      const order = await db.manufactureOrder.findUnique({
        where: { id: data.manufacture_order_id },
        select: { id: true, status: true },
      });

      if (!order) {
        return {
          success: false,
          error: "Orden de fabricacion no encontrada",
        };
      }

      if (order.status !== "PENDING" && order.status !== "IN_PROGRESS") {
        return {
          success: false,
          error:
            "La orden de fabricacion debe estar en estado PENDING o IN_PROGRESS",
        };
      }
    }

    const execute = async (tx: TransactionClient) => {
      const movementNumber = await generateMovementNumber(tx);

      const newMovement = await tx.inventoryMovement.create({
        data: {
          movement_number: movementNumber,
          movement_type: data.movement_type,
          status: "DRAFT",
          is_donated: data.movement_type === "DONATION",
          recipient_id: data.recipient_id ?? null,
          department_id: data.department_id ?? null,
          manufacture_order_id: data.manufacture_order_id ?? null,
          notes: data.notes ?? null,
          processed_by: userId,
        },
        select: MOVEMENT_SELECT,
      });

      await createAuditLog(tx, {
        user_id: userId,
        action: "CREATE",
        entity_type: "INVENTORY_MOVEMENT",
        entity_id: newMovement.id,
        new_values: {
          movement_number: newMovement.movement_number,
          movement_type: newMovement.movement_type,
          status: "DRAFT",
        },
        ip_address: ctx?.ip_address,
        user_agent: ctx?.user_agent,
      });

      return newMovement;
    };

    const movement = externalTx
      ? await execute(externalTx)
      : await this.db.$transaction(execute);

    return { success: true, data: movement as MovementData };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // AGREGAR ITEM A MOVIMIENTO DRAFT
  // ─────────────────────────────────────────────────────────────────────────

  async addItem(
    input: unknown,
    userId: string,
    ctx?: AuditContext,
    externalTx?: TransactionClient,
  ): Promise<ServiceResult<MovementData>> {
    const parsed = addMovementItemSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? "Datos invalidos",
      };
    }

    const data = parsed.data;
    const db: DbClient = externalTx ?? this.db;

    const movement = await db.inventoryMovement.findUnique({
      where: { id: data.movement_id },
      select: {
        id: true,
        status: true,
        movement_type: true,
        manufacture_order_id: true,
      },
    });

    if (!movement) {
      return { success: false, error: "Movimiento no encontrado" };
    }

    if (movement.status !== "DRAFT") {
      return {
        success: false,
        error: "Solo se pueden agregar items a movimientos en estado DRAFT",
      };
    }

    // Validar que la variante existe y esta activa
    const variant = await db.productVariant.findUnique({
      where: { id: data.product_variant_id },
      select: {
        id: true,
        is_active: true,
        current_stock: true,
        product: {
          select: { id: true, warehouse_area: true, name: true, sku: true },
        },
      },
    });

    if (!variant) {
      return { success: false, error: "Variante de producto no encontrada" };
    }

    if (!variant.is_active) {
      return {
        success: false,
        error: "La variante de producto esta desactivada",
      };
    }

    // DEPARTMENT_DELIVERY solo permite productos de area OFFICE
    if (
      movement.movement_type === "DEPARTMENT_DELIVERY" &&
      variant.product.warehouse_area !== "OFFICE"
    ) {
      return {
        success: false,
        error:
          "Las entregas a departamento solo permiten productos del area OFFICE",
      };
    }

    // Validar cantidad segun tipo
    if (movement.movement_type !== "ADJUSTMENT" && data.quantity < 1) {
      return {
        success: false,
        error:
          "La cantidad debe ser mayor a cero (solo ADJUSTMENT permite cantidades negativas)",
      };
    }

    // Validar unit_price segun tipo
    let unitPrice = data.unit_price ?? 0;

    if (movement.movement_type === "SALE") {
      if (unitPrice <= 0) {
        return {
          success: false,
          error: "El precio unitario debe ser mayor a cero para ventas",
        };
      }
    }

    if (
      movement.movement_type === "DONATION" ||
      movement.movement_type === "WRITE_OFF" ||
      movement.movement_type === "DEPARTMENT_DELIVERY"
    ) {
      unitPrice = 0;
    }

    // Para ENTRY, validar contra orden de fabricacion
    if (
      movement.movement_type === "ENTRY" &&
      movement.manufacture_order_id
    ) {
      const orderItem = await db.manufactureOrderItem.findUnique({
        where: {
          manufacture_order_id_product_variant_id: {
            manufacture_order_id: movement.manufacture_order_id,
            product_variant_id: data.product_variant_id,
          },
        },
        select: {
          quantity_ordered: true,
          quantity_received: true,
        },
      });

      if (!orderItem) {
        return {
          success: false,
          error:
            "La variante no esta incluida en la orden de fabricacion vinculada",
        };
      }

      const remaining =
        orderItem.quantity_ordered - orderItem.quantity_received;
      if (data.quantity > remaining) {
        return {
          success: false,
          error: `La cantidad excede lo pendiente de recibir. Pendiente: ${remaining}`,
        };
      }
    }

    const subtotal = data.quantity * unitPrice;

    const execute = async (tx: TransactionClient) => {
      await tx.movementItem.create({
        data: {
          inventory_movement_id: data.movement_id,
          product_variant_id: data.product_variant_id,
          quantity: data.quantity,
          unit_price: unitPrice,
          subtotal,
        },
      });

      // Recalcular total_amount
      const items = await tx.movementItem.findMany({
        where: { inventory_movement_id: data.movement_id },
        select: { subtotal: true },
      });

      const totalAmount = items.reduce(
        (sum: number, item: { subtotal: unknown }) =>
          sum + Number(item.subtotal),
        0,
      );

      const result = await tx.inventoryMovement.update({
        where: { id: data.movement_id },
        data: { total_amount: totalAmount },
        select: MOVEMENT_SELECT,
      });

      await createAuditLog(tx, {
        user_id: userId,
        action: "UPDATE",
        entity_type: "INVENTORY_MOVEMENT",
        entity_id: data.movement_id,
        new_values: {
          action: "ADD_ITEM",
          product_variant_id: data.product_variant_id,
          quantity: data.quantity,
          unit_price: unitPrice,
          total_amount: totalAmount,
        },
        ip_address: ctx?.ip_address,
        user_agent: ctx?.user_agent,
      });

      return result;
    };

    const updatedMovement = externalTx
      ? await execute(externalTx)
      : await this.db.$transaction(execute);

    return { success: true, data: updatedMovement as MovementData };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // REMOVER ITEM DE MOVIMIENTO DRAFT
  // ─────────────────────────────────────────────────────────────────────────

  async removeItem(
    itemId: string,
    userId: string,
    ctx?: AuditContext,
  ): Promise<ServiceResult<MovementData>> {
    const item = await this.db.movementItem.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        inventory_movement_id: true,
        product_variant_id: true,
        quantity: true,
        inventory_movement: {
          select: { id: true, status: true },
        },
      },
    });

    if (!item) {
      return { success: false, error: "Item no encontrado" };
    }

    if (item.inventory_movement.status !== "DRAFT") {
      return {
        success: false,
        error: "Solo se pueden remover items de movimientos en estado DRAFT",
      };
    }

    const updatedMovement = await this.db.$transaction(
      async (tx: TransactionClient) => {
        await tx.movementItem.delete({
          where: { id: itemId },
        });

        // Recalcular total_amount
        const items = await tx.movementItem.findMany({
          where: { inventory_movement_id: item.inventory_movement_id },
          select: { subtotal: true },
        });

        const totalAmount = items.reduce(
          (sum: number, i: { subtotal: unknown }) => sum + Number(i.subtotal),
          0,
        );

        const result = await tx.inventoryMovement.update({
          where: { id: item.inventory_movement_id },
          data: { total_amount: totalAmount },
          select: MOVEMENT_SELECT,
        });

        await createAuditLog(tx, {
          user_id: userId,
          action: "UPDATE",
          entity_type: "INVENTORY_MOVEMENT",
          entity_id: item.inventory_movement_id,
          new_values: {
            action: "REMOVE_ITEM",
            removed_item_id: itemId,
            product_variant_id: item.product_variant_id,
            quantity: item.quantity,
            total_amount: totalAmount,
          },
          ip_address: ctx?.ip_address,
          user_agent: ctx?.user_agent,
        });

        return result;
      },
    );

    return { success: true, data: updatedMovement as MovementData };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CONFIRMAR MOVIMIENTO — Operacion critica, afecta stock
  // ─────────────────────────────────────────────────────────────────────────

  async confirmMovement(
    input: unknown,
    userId: string,
    ctx?: AuditContext,
    externalTx?: TransactionClient,
  ): Promise<ServiceResult<MovementData>> {
    const parsed = confirmMovementSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? "Datos invalidos",
      };
    }

    const { movement_id } = parsed.data;
    const db: DbClient = externalTx ?? this.db;

    const movement = await db.inventoryMovement.findUnique({
      where: { id: movement_id },
      select: {
        id: true,
        status: true,
        movement_type: true,
        manufacture_order_id: true,
        items: {
          select: {
            id: true,
            product_variant_id: true,
            quantity: true,
            unit_price: true,
            subtotal: true,
          },
        },
      },
    });

    if (!movement) {
      return { success: false, error: "Movimiento no encontrado" };
    }

    if (movement.status !== "DRAFT") {
      return {
        success: false,
        error: "Solo se pueden confirmar movimientos en estado DRAFT",
      };
    }

    if (movement.items.length === 0) {
      return {
        success: false,
        error:
          "No se puede confirmar un movimiento sin items",
      };
    }

    const execute = async (tx: TransactionClient) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Audit log stock tracking
      const stockChanges: Record<string, any> = {};

      for (const item of movement.items) {
        const variant = await tx.productVariant.findUniqueOrThrow({
          where: { id: item.product_variant_id },
          select: {
            id: true,
            current_stock: true,
            sku_suffix: true,
            product: { select: { name: true, sku: true } },
          },
        });

        const oldStock = variant.current_stock;
        let newStock: number;

        switch (movement.movement_type) {
          case "ENTRY": {
            newStock = oldStock + item.quantity;
            break;
          }
          case "ADJUSTMENT": {
            newStock = oldStock + item.quantity;
            if (newStock < 0) {
              throw new Error(
                `Stock insuficiente para ${variant.product.name} (${variant.sku_suffix}). Stock actual: ${oldStock}, ajuste: ${item.quantity}`,
              );
            }
            break;
          }
          case "SALE":
          case "DONATION":
          case "WRITE_OFF":
          case "DEPARTMENT_DELIVERY": {
            if (oldStock < item.quantity) {
              throw new Error(
                `Stock insuficiente para ${variant.product.name} (${variant.sku_suffix}). Stock actual: ${oldStock}, solicitado: ${item.quantity}`,
              );
            }
            newStock = oldStock - item.quantity;
            break;
          }
          default:
            throw new Error(
              `Tipo de movimiento no soportado: ${movement.movement_type}`,
            );
        }

        await tx.productVariant.update({
          where: { id: item.product_variant_id },
          data: { current_stock: newStock },
        });

        stockChanges[item.product_variant_id] = {
          sku: `${variant.product.sku}-${variant.sku_suffix}`,
          old_stock: oldStock,
          new_stock: newStock,
          quantity: item.quantity,
        };
      }

      // Para ENTRY, actualizar quantity_received en ManufactureOrderItem
      if (
        movement.movement_type === "ENTRY" &&
        movement.manufacture_order_id
      ) {
        for (const item of movement.items) {
          await tx.manufactureOrderItem.update({
            where: {
              manufacture_order_id_product_variant_id: {
                manufacture_order_id: movement.manufacture_order_id,
                product_variant_id: item.product_variant_id,
              },
            },
            data: {
              quantity_received: { increment: item.quantity },
            },
          });
        }

        // Verificar si la orden esta completa
        const orderItems = await tx.manufactureOrderItem.findMany({
          where: {
            manufacture_order_id: movement.manufacture_order_id,
          },
          select: {
            quantity_ordered: true,
            quantity_received: true,
          },
        });

        const allComplete = orderItems.every(
          (oi: { quantity_ordered: number; quantity_received: number }) =>
            oi.quantity_received >= oi.quantity_ordered,
        );

        if (allComplete) {
          await tx.manufactureOrder.update({
            where: { id: movement.manufacture_order_id },
            data: {
              status: "COMPLETED",
              completed_at: new Date(),
            },
          });
        }
      }

      // Calcular total_amount final
      const totalAmount = movement.items.reduce(
        (sum: number, item: { subtotal: unknown }) =>
          sum + Number(item.subtotal),
        0,
      );

      const result = await tx.inventoryMovement.update({
        where: { id: movement_id },
        data: {
          status: "CONFIRMED",
          total_amount: totalAmount,
          processed_at: new Date(),
        },
        select: MOVEMENT_SELECT,
      });

      await createAuditLog(tx, {
        user_id: userId,
        action: "CONFIRM",
        entity_type: "INVENTORY_MOVEMENT",
        entity_id: movement_id,
        old_values: { status: "DRAFT" },
        new_values: {
          status: "CONFIRMED",
          total_amount: totalAmount,
          stock_changes: stockChanges,
        },
        ip_address: ctx?.ip_address,
        user_agent: ctx?.user_agent,
      });

      return result;
    };

    const confirmedMovement = externalTx
      ? await execute(externalTx)
      : await this.db.$transaction(execute);

    return { success: true, data: confirmedMovement as MovementData };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CANCELAR MOVIMIENTO
  // ─────────────────────────────────────────────────────────────────────────

  async cancelMovement(
    input: unknown,
    userId: string,
    ctx?: AuditContext,
  ): Promise<ServiceResult<MovementData>> {
    const parsed = cancelMovementSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? "Datos invalidos",
      };
    }

    const { movement_id, cancel_reason } = parsed.data;

    const movement = await this.db.inventoryMovement.findUnique({
      where: { id: movement_id },
      select: { id: true, status: true },
    });

    if (!movement) {
      return { success: false, error: "Movimiento no encontrado" };
    }

    if (movement.status !== "DRAFT") {
      return {
        success: false,
        error: "Solo se pueden cancelar movimientos en estado DRAFT",
      };
    }

    const cancelledMovement = await this.db.$transaction(
      async (tx: TransactionClient) => {
        const result = await tx.inventoryMovement.update({
          where: { id: movement_id },
          data: {
            status: "CANCELLED",
            cancel_reason,
            cancelled_at: new Date(),
          },
          select: MOVEMENT_SELECT,
        });

        await createAuditLog(tx, {
          user_id: userId,
          action: "CANCEL",
          entity_type: "INVENTORY_MOVEMENT",
          entity_id: movement_id,
          old_values: { status: "DRAFT" },
          new_values: {
            status: "CANCELLED",
            cancel_reason,
          },
          ip_address: ctx?.ip_address,
          user_agent: ctx?.user_agent,
        });

        return result;
      },
    );

    return { success: true, data: cancelledMovement as MovementData };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // OBTENER MOVIMIENTO POR ID
  // ─────────────────────────────────────────────────────────────────────────

  async getMovementById(
    movementId: string,
  ): Promise<ServiceResult<MovementData>> {
    const movement = await this.db.inventoryMovement.findUnique({
      where: { id: movementId },
      select: MOVEMENT_SELECT,
    });

    if (!movement) {
      return { success: false, error: "Movimiento no encontrado" };
    }

    return { success: true, data: movement as MovementData };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LISTAR MOVIMIENTOS CON FILTROS Y PAGINACION
  // ─────────────────────────────────────────────────────────────────────────

  async listMovements(input?: unknown): Promise<
    ServiceResult<{
      movements: MovementData[];
      total: number;
      page: number;
      per_page: number;
    }>
  > {
    const parsed = movementFiltersSchema.safeParse(input ?? {});
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? "Filtros invalidos",
      };
    }

    const { search, movement_type, status, date_from, date_to, page, per_page } =
      parsed.data;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma where types; values validated by Zod
    const where: Record<string, any> = {};

    if (movement_type) where.movement_type = movement_type;
    if (status) where.status = status;

    if (date_from || date_to) {
      where.created_at = {};
      if (date_from) where.created_at.gte = date_from;
      if (date_to) where.created_at.lte = date_to;
    }

    if (search) {
      where.OR = [
        { movement_number: { contains: search, mode: "insensitive" } },
        {
          recipient: {
            full_name: { contains: search, mode: "insensitive" },
          },
        },
        {
          recipient: {
            document_number: { contains: search, mode: "insensitive" },
          },
        },
        {
          department: {
            name: { contains: search, mode: "insensitive" },
          },
        },
      ];
    }

    const [movements, total] = await this.db.$transaction([
      this.db.inventoryMovement.findMany({
        where,
        select: MOVEMENT_SELECT,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * per_page,
        take: per_page,
      }),
      this.db.inventoryMovement.count({ where }),
    ]);

    return {
      success: true,
      data: {
        movements: movements as MovementData[],
        total,
        page,
        per_page,
      },
    };
  }
}
