"use server";

import { prisma } from "@upds/db";
import { RecipientService } from "@upds/services";
import { requirePermission } from "@/lib/session";

const service = new RecipientService(prisma);

export async function createRecipientAction(input: unknown) {
  const session = await requirePermission("catalog:create");
  return service.create(input, session.id);
}

export async function updateRecipientAction(input: unknown) {
  const session = await requirePermission("catalog:edit");
  return service.update(input, session.id);
}

export async function deactivateRecipientAction(recipientId: string) {
  const session = await requirePermission("catalog:edit");
  return service.deactivate(recipientId, session.id);
}

export async function getRecipientByIdAction(recipientId: string) {
  await requirePermission("catalog:view");
  return service.getById(recipientId);
}

export async function listRecipientsAction(input?: unknown) {
  await requirePermission("catalog:view");
  return service.list(input);
}
