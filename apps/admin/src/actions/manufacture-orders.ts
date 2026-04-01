"use server";

import { requirePermission } from "@/lib/session";
import { serialize } from "@/lib/serialize";
import { prisma } from "@upds/db";
import { ManufactureOrderService } from "@upds/services";
import { revalidatePath } from "next/cache";
import type {
  OrderFiltersInput,
  CreateManufactureOrderInput,
  AddOrderItemInput,
  ReceiveOrderItemsInput,
  CancelOrderInput,
} from "@upds/validators";

export async function getManufactureOrders(
  filters?: Partial<OrderFiltersInput>,
) {
  await requirePermission("manufacture_order:view");

  const service = new ManufactureOrderService(prisma);
  return serialize(await service.listOrders(filters));
}

export async function getManufactureOrder(id: string) {
  await requirePermission("manufacture_order:view");

  const service = new ManufactureOrderService(prisma);
  return serialize(await service.getOrderById(id));
}

export async function createManufactureOrder(
  data: CreateManufactureOrderInput,
) {
  const session = await requirePermission("manufacture_order:create");

  const service = new ManufactureOrderService(prisma);
  const result = await service.createOrder(data, session.id);

  if (result.success) {
    revalidatePath("/manufacture-orders");
  }

  return result;
}

export async function addOrderItem(data: AddOrderItemInput) {
  const session = await requirePermission("manufacture_order:create");

  const service = new ManufactureOrderService(prisma);
  const result = await service.addItem(data, session.id);

  if (result.success) {
    revalidatePath("/manufacture-orders");
    revalidatePath(`/manufacture-orders/${data.manufacture_order_id}`);
  }

  return result;
}

export async function removeOrderItem(orderId: string, itemId: string) {
  const session = await requirePermission("manufacture_order:create");

  const service = new ManufactureOrderService(prisma);
  const result = await service.removeItem(itemId, session.id);

  if (result.success) {
    revalidatePath("/manufacture-orders");
    revalidatePath(`/manufacture-orders/${orderId}`);
  }

  return result;
}

export async function receiveOrderItems(data: ReceiveOrderItemsInput) {
  const session = await requirePermission("manufacture_order:receive");

  const service = new ManufactureOrderService(prisma);
  const result = await service.receiveItems(data, session.id);

  if (result.success) {
    revalidatePath("/manufacture-orders");
    revalidatePath(`/manufacture-orders/${data.manufacture_order_id}`);
    revalidatePath("/products");
    revalidatePath("/inventory-movements");
  }

  return result;
}

export async function cancelOrder(data: CancelOrderInput) {
  const session = await requirePermission("manufacture_order:cancel");

  const service = new ManufactureOrderService(prisma);
  const result = await service.cancelOrder(data, session.id);

  if (result.success) {
    revalidatePath("/manufacture-orders");
    revalidatePath(`/manufacture-orders/${data.manufacture_order_id}`);
  }

  return result;
}
