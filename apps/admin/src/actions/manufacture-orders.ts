"use server";

import { auth } from "@/lib/auth";
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

export async function getManufactureOrders(filters?: OrderFiltersInput) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "No autorizado" };

  const service = new ManufactureOrderService(prisma);
  return serialize(await service.listOrders(filters));
}

export async function getManufactureOrder(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "No autorizado" };

  const service = new ManufactureOrderService(prisma);
  return serialize(await service.getOrderById(id));
}

export async function createManufactureOrder(data: CreateManufactureOrderInput) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "No autorizado" };

  const service = new ManufactureOrderService(prisma);
  const result = await service.createOrder(data, session.user.id);

  if (result.success) {
    revalidatePath("/manufacture-orders");
  }

  return result;
}

export async function addOrderItem(data: AddOrderItemInput) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "No autorizado" };

  const service = new ManufactureOrderService(prisma);
  const result = await service.addItem(data, session.user.id);

  if (result.success) {
    revalidatePath("/manufacture-orders");
    revalidatePath(`/manufacture-orders/${data.manufacture_order_id}`);
  }

  return result;
}

export async function removeOrderItem(orderId: string, itemId: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "No autorizado" };

  const service = new ManufactureOrderService(prisma);
  const result = await service.removeItem(itemId, session.user.id);

  if (result.success) {
    revalidatePath("/manufacture-orders");
    revalidatePath(`/manufacture-orders/${orderId}`);
  }

  return result;
}

export async function receiveOrderItems(data: ReceiveOrderItemsInput) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "No autorizado" };

  const service = new ManufactureOrderService(prisma);
  const result = await service.receiveItems(data, session.user.id);

  if (result.success) {
    revalidatePath("/manufacture-orders");
    revalidatePath(`/manufacture-orders/${data.manufacture_order_id}`);
    revalidatePath("/products");
    revalidatePath("/inventory-movements");
  }

  return result;
}

export async function cancelOrder(data: CancelOrderInput) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "No autorizado" };

  const service = new ManufactureOrderService(prisma);
  const result = await service.cancelOrder(data, session.user.id);

  if (result.success) {
    revalidatePath("/manufacture-orders");
    revalidatePath(`/manufacture-orders/${data.manufacture_order_id}`);
  }

  return result;
}
