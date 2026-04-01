import { redirect } from "next/navigation";
import { auth } from "./auth";
import { can, canAll } from "@upds/validators";
import type { Permission, UserRole } from "@upds/validators";

export interface SessionUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
}

export async function requireAuth(): Promise<SessionUser> {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return {
    id: session.user.id,
    email: session.user.email,
    full_name: session.user.full_name,
    role: session.user.role,
  };
}

export async function requirePermission(
  permission: Permission,
): Promise<SessionUser> {
  const user = await requireAuth();

  if (!can(user.role, permission)) {
    throw new Error("No autorizado");
  }

  return user;
}

export async function requireAllPermissions(
  permissions: Permission[],
): Promise<SessionUser> {
  const user = await requireAuth();

  if (!canAll(user.role, permissions)) {
    throw new Error("No autorizado");
  }

  return user;
}
