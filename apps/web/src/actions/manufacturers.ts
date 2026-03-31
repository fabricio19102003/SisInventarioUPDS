"use server";

import { prisma } from "@upds/db";
import { ManufacturerService } from "@upds/services";
import { requirePermission } from "@/lib/session";

const service = new ManufacturerService(prisma);

export async function createManufacturerAction(input: unknown) {
  const session = await requirePermission("catalog:create");
  return service.create(input, session.id);
}

export async function updateManufacturerAction(input: unknown) {
  const session = await requirePermission("catalog:edit");
  return service.update(input, session.id);
}

export async function deactivateManufacturerAction(manufacturerId: string) {
  const session = await requirePermission("catalog:edit");
  return service.deactivate(manufacturerId, session.id);
}

export async function getManufacturerByIdAction(manufacturerId: string) {
  await requirePermission("catalog:view");
  return service.getById(manufacturerId);
}

export async function listManufacturersAction(input?: unknown) {
  await requirePermission("catalog:view");
  return service.list(input);
}
