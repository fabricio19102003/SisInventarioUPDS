"use server";

import { prisma } from "@upds/db";
import { RecipientService } from "@upds/services";
import { requirePermission } from "@/lib/session";
import { getAuditContext } from "@/lib/audit-context";

const service = new RecipientService(prisma);

export async function createRecipientAction(input: unknown) {
  const session = await requirePermission("catalog:create");
  const auditCtx = await getAuditContext();
  return service.create(input, session.id, auditCtx);
}

export async function updateRecipientAction(input: unknown) {
  const session = await requirePermission("catalog:edit");
  const auditCtx = await getAuditContext();
  return service.update(input, session.id, auditCtx);
}

export async function deactivateRecipientAction(recipientId: string) {
  const session = await requirePermission("catalog:edit");
  const auditCtx = await getAuditContext();
  return service.deactivate(recipientId, session.id, auditCtx);
}

export async function getRecipientByIdAction(recipientId: string) {
  await requirePermission("catalog:view");
  return service.getById(recipientId);
}

export async function listRecipientsAction(input?: unknown) {
  await requirePermission("catalog:view");
  return service.list(input);
}
