// ═══════════════════════════════════════════════════════════════════════════════
// Helpers de sesion para Server Components y Server Actions
// Wrappers tipados sobre NextAuth auth() con chequeo de permisos.
// ═══════════════════════════════════════════════════════════════════════════════

import { redirect } from "next/navigation";
import { auth } from "./auth";
import { can } from "@upds/validators";
import type { UserRole, Permission } from "@upds/validators";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

export interface SessionUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
}

// ─────────────────────────────────────────────────────────────────────────────
// getServerSession
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Obtiene la sesion actual del usuario.
 * Retorna null si no hay sesion activa.
 */
export async function getServerSession(): Promise<SessionUser | null> {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    full_name: session.user.full_name,
    role: session.user.role,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// requireAuth
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Exige que el usuario este autenticado.
 * Redirige a /login si no hay sesion.
 * Usar en Server Components y Server Actions.
 */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getServerSession();

  if (!user) {
    redirect("/login");
  }

  return user;
}

// ─────────────────────────────────────────────────────────────────────────────
// requirePermission
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Exige que el usuario tenga un permiso especifico.
 * Redirige a /login si no hay sesion.
 * Redirige a /forbidden si el usuario no tiene el permiso requerido.
 *
 * @example
 * const user = await requirePermission("user:manage");
 */
export async function requirePermission(
  permission: Permission,
): Promise<SessionUser> {
  const user = await requireAuth();

  if (!can(user.role, permission)) {
    redirect("/forbidden");
  }

  return user;
}
