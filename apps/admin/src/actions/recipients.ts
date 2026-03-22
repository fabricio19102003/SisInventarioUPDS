"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@upds/db";
import { RecipientService } from "@upds/services";
import { revalidatePath } from "next/cache";
import type {
  RecipientFiltersInput,
  CreateRecipientInput,
  UpdateRecipientInput,
} from "@upds/validators";

export async function getRecipients(filters?: RecipientFiltersInput) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "No autorizado" };

  const service = new RecipientService(prisma);
  return service.list(filters);
}

export async function getRecipient(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "No autorizado" };

  const service = new RecipientService(prisma);
  return service.getById(id);
}

export async function createRecipient(data: CreateRecipientInput) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "No autorizado" };

  const service = new RecipientService(prisma);
  const result = await service.create(data, session.user.id);

  if (result.success) {
    revalidatePath("/recipients");
  }

  return result;
}

export async function updateRecipient(data: UpdateRecipientInput) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "No autorizado" };

  const service = new RecipientService(prisma);
  const result = await service.update(data, session.user.id);

  if (result.success) {
    revalidatePath("/recipients");
    revalidatePath(`/recipients/${data.id}`);
  }

  return result;
}

export async function deactivateRecipient(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "No autorizado" };

  const service = new RecipientService(prisma);
  const result = await service.deactivate(id, session.user.id);

  if (result.success) {
    revalidatePath("/recipients");
    revalidatePath(`/recipients/${id}`);
  }

  return result;
}
