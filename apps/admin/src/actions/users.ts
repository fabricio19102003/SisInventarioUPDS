"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@upds/db";
import { AuthService } from "@upds/services";
import { revalidatePath } from "next/cache";
import type {
  UserFiltersInput,
  CreateUserInput,
  UpdateUserInput,
  AdminResetPasswordInput,
} from "@upds/validators";

export async function getUsers(filters?: UserFiltersInput) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "No autorizado" };

  const service = new AuthService(prisma);
  return service.listUsers(filters);
}

export async function getUser(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "No autorizado" };

  const service = new AuthService(prisma);
  return service.getUserById(id);
}

export async function createUser(data: CreateUserInput) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "No autorizado" };

  const service = new AuthService(prisma);
  const result = await service.createUser(data, session.user.id);

  if (result.success) {
    revalidatePath("/users");
  }

  return result;
}

export async function updateUser(data: UpdateUserInput) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "No autorizado" };

  const service = new AuthService(prisma);
  const result = await service.updateUser(data, session.user.id);

  if (result.success) {
    revalidatePath("/users");
    revalidatePath(`/users/${data.id}`);
  }

  return result;
}

export async function deactivateUser(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "No autorizado" };

  const service = new AuthService(prisma);
  const result = await service.deactivateUser(id, session.user.id);

  if (result.success) {
    revalidatePath("/users");
    revalidatePath(`/users/${id}`);
  }

  return result;
}

export async function reactivateUser(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "No autorizado" };

  const service = new AuthService(prisma);
  const result = await service.reactivateUser(id, session.user.id);

  if (result.success) {
    revalidatePath("/users");
    revalidatePath(`/users/${id}`);
  }

  return result;
}

export async function adminResetPassword(data: AdminResetPasswordInput) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "No autorizado" };

  const service = new AuthService(prisma);
  const result = await service.adminResetPassword(data, session.user.id);

  if (result.success) {
    revalidatePath(`/users/${data.user_id}`);
  }

  return result;
}
