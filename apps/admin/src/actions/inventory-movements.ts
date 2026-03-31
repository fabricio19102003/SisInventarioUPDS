"use server";

import { auth } from "@/lib/auth";
import { serialize } from "@/lib/serialize";
import { prisma } from "@upds/db";
import { InventoryMovementService } from "@upds/services";
import { revalidatePath } from "next/cache";
import type {
  MovementFiltersInput,
  CreateMovementInput,
  AddMovementItemInput,
  CancelMovementInput,
} from "@upds/validators";

export async function getInventoryMovements(filters?: MovementFiltersInput) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "No autorizado" };

  const service = new InventoryMovementService(prisma);
  return serialize(await service.listMovements(filters));
}

export async function getInventoryMovement(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "No autorizado" };

  const service = new InventoryMovementService(prisma);
  return serialize(await service.getMovementById(id));
}

export async function createMovement(data: CreateMovementInput) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "No autorizado" };

  const service = new InventoryMovementService(prisma);
  const result = await service.createMovement(data, session.user.id);

  if (result.success) {
    revalidatePath("/inventory-movements");
  }

  return result;
}

export async function addMovementItem(data: AddMovementItemInput) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "No autorizado" };

  const service = new InventoryMovementService(prisma);
  const result = await service.addItem(data, session.user.id);

  if (result.success) {
    revalidatePath("/inventory-movements");
    revalidatePath(`/inventory-movements/${data.movement_id}`);
  }

  return result;
}

export async function removeMovementItem(movementId: string, itemId: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "No autorizado" };

  const service = new InventoryMovementService(prisma);
  const result = await service.removeItem(itemId, session.user.id);

  if (result.success) {
    revalidatePath("/inventory-movements");
    revalidatePath(`/inventory-movements/${movementId}`);
  }

  return result;
}

export async function confirmMovement(movementId: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "No autorizado" };

  const service = new InventoryMovementService(prisma);
  const result = await service.confirmMovement(
    { movement_id: movementId },
    session.user.id,
  );

  if (result.success) {
    revalidatePath("/inventory-movements");
    revalidatePath(`/inventory-movements/${movementId}`);
    revalidatePath("/products");
  }

  return result;
}

export async function cancelMovement(data: CancelMovementInput) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "No autorizado" };

  const service = new InventoryMovementService(prisma);
  const result = await service.cancelMovement(data, session.user.id);

  if (result.success) {
    revalidatePath("/inventory-movements");
    revalidatePath(`/inventory-movements/${data.movement_id}`);
  }

  return result;
}
