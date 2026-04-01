"use server";

import { requirePermission } from "@/lib/session";
import { prisma } from "@upds/db";
import { DepartmentService } from "@upds/services";
import { revalidatePath } from "next/cache";
import type {
  DepartmentFiltersInput,
  CreateDepartmentInput,
  UpdateDepartmentInput,
} from "@upds/validators";

export async function getDepartments(
  filters?: Partial<DepartmentFiltersInput>,
) {
  await requirePermission("catalog:view");

  const service = new DepartmentService(prisma);
  return service.list(filters);
}

export async function getDepartment(id: string) {
  await requirePermission("catalog:view");

  const service = new DepartmentService(prisma);
  return service.getById(id);
}

export async function createDepartment(data: CreateDepartmentInput) {
  const session = await requirePermission("catalog:create");

  const service = new DepartmentService(prisma);
  const result = await service.create(data, session.id);

  if (result.success) {
    revalidatePath("/departments");
  }

  return result;
}

export async function updateDepartment(data: UpdateDepartmentInput) {
  const session = await requirePermission("catalog:edit");

  const service = new DepartmentService(prisma);
  const result = await service.update(data, session.id);

  if (result.success) {
    revalidatePath("/departments");
    revalidatePath(`/departments/${data.id}`);
  }

  return result;
}

export async function deactivateDepartment(id: string) {
  const session = await requirePermission("catalog:edit");

  const service = new DepartmentService(prisma);
  const result = await service.deactivate(id, session.id);

  if (result.success) {
    revalidatePath("/departments");
    revalidatePath(`/departments/${id}`);
  }

  return result;
}
