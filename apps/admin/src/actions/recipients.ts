"use server";

import { requirePermission } from "@/lib/session";
import { prisma } from "@upds/db";
import { RecipientService } from "@upds/services";
import { revalidatePath } from "next/cache";
import type {
  RecipientFiltersInput,
  CreateRecipientInput,
  UpdateRecipientInput,
} from "@upds/validators";

export async function getRecipients(filters?: Partial<RecipientFiltersInput>) {
  await requirePermission("catalog:view");

  const service = new RecipientService(prisma);
  return service.list(filters);
}

export async function getRecipient(id: string) {
  await requirePermission("catalog:view");

  const service = new RecipientService(prisma);
  return service.getById(id);
}

export async function createRecipient(data: CreateRecipientInput) {
  const session = await requirePermission("catalog:create");

  const service = new RecipientService(prisma);
  const result = await service.create(data, session.id);

  if (result.success) {
    revalidatePath("/recipients");
  }

  return result;
}

export async function updateRecipient(data: UpdateRecipientInput) {
  const session = await requirePermission("catalog:edit");

  const service = new RecipientService(prisma);
  const result = await service.update(data, session.id);

  if (result.success) {
    revalidatePath("/recipients");
    revalidatePath(`/recipients/${data.id}`);
  }

  return result;
}

export async function deactivateRecipient(id: string) {
  const session = await requirePermission("catalog:edit");

  const service = new RecipientService(prisma);
  const result = await service.deactivate(id, session.id);

  if (result.success) {
    revalidatePath("/recipients");
    revalidatePath(`/recipients/${id}`);
  }

  return result;
}
