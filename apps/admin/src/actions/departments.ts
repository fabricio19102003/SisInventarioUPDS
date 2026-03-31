"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@upds/db";
import { DepartmentService } from "@upds/services";
import { revalidatePath } from "next/cache";
import type {
  DepartmentFiltersInput,
  CreateDepartmentInput,
  UpdateDepartmentInput,
} from "@upds/validators";

export async function getDepartments(filters?: DepartmentFiltersInput) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "No autorizado" };

  const service = new DepartmentService(prisma);
  return service.list(filters);
}

export async function getDepartment(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "No autorizado" };

  const service = new DepartmentService(prisma);
  return service.getById(id);
}

export async function createDepartment(data: CreateDepartmentInput) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "No autorizado" };

  const service = new DepartmentService(prisma);
  const result = await service.create(data, session.user.id);

  if (result.success) {
    revalidatePath("/departments");
  }

  return result;
}

export async function updateDepartment(data: UpdateDepartmentInput) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "No autorizado" };

  const service = new DepartmentService(prisma);
  const result = await service.update(data, session.user.id);

  if (result.success) {
    revalidatePath("/departments");
    revalidatePath(`/departments/${data.id}`);
  }

  return result;
}

export async function deactivateDepartment(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "No autorizado" };

  const service = new DepartmentService(prisma);
  const result = await service.deactivate(id, session.user.id);

  if (result.success) {
    revalidatePath("/departments");
    revalidatePath(`/departments/${id}`);
  }

  return result;
}
