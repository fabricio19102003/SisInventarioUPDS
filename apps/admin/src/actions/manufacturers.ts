"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@upds/db";
import { ManufacturerService } from "@upds/services";
import { revalidatePath } from "next/cache";
import type {
  ManufacturerFiltersInput,
  CreateManufacturerInput,
  UpdateManufacturerInput,
} from "@upds/validators";

export async function getManufacturers(filters?: ManufacturerFiltersInput) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "No autorizado" };

  const service = new ManufacturerService(prisma);
  return service.list(filters);
}

export async function getManufacturer(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "No autorizado" };

  const service = new ManufacturerService(prisma);
  return service.getById(id);
}

export async function createManufacturer(data: CreateManufacturerInput) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "No autorizado" };

  const service = new ManufacturerService(prisma);
  const result = await service.create(data, session.user.id);

  if (result.success) {
    revalidatePath("/manufacturers");
  }

  return result;
}

export async function updateManufacturer(data: UpdateManufacturerInput) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "No autorizado" };

  const service = new ManufacturerService(prisma);
  const result = await service.update(data, session.user.id);

  if (result.success) {
    revalidatePath("/manufacturers");
    revalidatePath(`/manufacturers/${data.id}`);
  }

  return result;
}

export async function deactivateManufacturer(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "No autorizado" };

  const service = new ManufacturerService(prisma);
  const result = await service.deactivate(id, session.user.id);

  if (result.success) {
    revalidatePath("/manufacturers");
    revalidatePath(`/manufacturers/${id}`);
  }

  return result;
}
