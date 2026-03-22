"use server";

import { prisma } from "@upds/db";
import { DepartmentService } from "@upds/services";
import { requirePermission } from "@/lib/session";

const service = new DepartmentService(prisma);

export async function createDepartmentAction(input: unknown) {
  const session = await requirePermission("catalog:create");
  return service.create(input, session.id);
}

export async function updateDepartmentAction(input: unknown) {
  const session = await requirePermission("catalog:edit");
  return service.update(input, session.id);
}

export async function deactivateDepartmentAction(departmentId: string) {
  const session = await requirePermission("catalog:edit");
  return service.deactivate(departmentId, session.id);
}

export async function getDepartmentByIdAction(departmentId: string) {
  await requirePermission("catalog:view");
  return service.getById(departmentId);
}

export async function listDepartmentsAction(input?: unknown) {
  await requirePermission("catalog:view");
  return service.list(input);
}
