"use server";

import { prisma } from "@upds/db";
import { ManufacturerService } from "@upds/services";
import { requirePermission } from "@/lib/session";
import { getAuditContext } from "@/lib/audit-context";

const service = new ManufacturerService(prisma);

export async function createManufacturerAction(input: unknown) {
  const session = await requirePermission("catalog:create");
  const auditCtx = await getAuditContext();
  return service.create(input, session.id, auditCtx);
}

export async function updateManufacturerAction(input: unknown) {
  const session = await requirePermission("catalog:edit");
  const auditCtx = await getAuditContext();
  return service.update(input, session.id, auditCtx);
}

export async function deactivateManufacturerAction(manufacturerId: string) {
  const session = await requirePermission("catalog:edit");
  const auditCtx = await getAuditContext();
  return service.deactivate(manufacturerId, session.id, auditCtx);
}

export async function getManufacturerByIdAction(manufacturerId: string) {
  await requirePermission("catalog:view");
  return service.getById(manufacturerId);
}

export async function listManufacturersAction(input?: unknown) {
  await requirePermission("catalog:view");
  return service.list(input);
}
