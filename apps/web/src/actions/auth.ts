"use server";

// ═══════════════════════════════════════════════════════════════════════════════
// Server Actions — Auth Domain
// Capa fina: auth gate + delegacion al servicio. Sin logica de negocio.
// ═══════════════════════════════════════════════════════════════════════════════

import { AuthService } from "@upds/services";
import { prisma } from "@upds/db";
import { signIn, signOut } from "@/lib/auth";
import { requireAuth, requirePermission } from "@/lib/session";

const authService = new AuthService(prisma);

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────────────────────

export async function loginAction(input: { email: string; password: string }) {
  try {
    const result = await signIn("credentials", {
      email: input.email,
      password: input.password,
      redirect: false,
    });

    // signIn con redirect:false retorna la URL de callback o undefined
    if (!result) {
      return { success: false, error: "Credenciales invalidas" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "Credenciales invalidas" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────────────────────────────────────

export async function logoutAction() {
  await signOut({ redirect: false });
}

// ─────────────────────────────────────────────────────────────────────────────
// CREAR USUARIO
// ─────────────────────────────────────────────────────────────────────────────

export async function createUserAction(input: unknown) {
  const session = await requirePermission("user:manage");
  return authService.createUser(input, session.id);
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTUALIZAR USUARIO
// ─────────────────────────────────────────────────────────────────────────────

export async function updateUserAction(input: unknown) {
  const session = await requirePermission("user:manage");
  return authService.updateUser(input, session.id);
}

// ─────────────────────────────────────────────────────────────────────────────
// DESACTIVAR USUARIO (Soft Delete)
// ─────────────────────────────────────────────────────────────────────────────

export async function deactivateUserAction(userId: string) {
  const session = await requirePermission("user:manage");
  return authService.deactivateUser(userId, session.id);
}

// ─────────────────────────────────────────────────────────────────────────────
// REACTIVAR USUARIO
// ─────────────────────────────────────────────────────────────────────────────

export async function reactivateUserAction(userId: string) {
  const session = await requirePermission("user:manage");
  return authService.reactivateUser(userId, session.id);
}

// ─────────────────────────────────────────────────────────────────────────────
// CAMBIAR PASSWORD (usuario propio)
// ─────────────────────────────────────────────────────────────────────────────

export async function changePasswordAction(input: unknown) {
  await requireAuth();
  return authService.changePassword(input);
}

// ─────────────────────────────────────────────────────────────────────────────
// RESET PASSWORD POR ADMIN
// ─────────────────────────────────────────────────────────────────────────────

export async function adminResetPasswordAction(input: unknown) {
  const session = await requirePermission("user:manage");
  return authService.adminResetPassword(input, session.id);
}

// ─────────────────────────────────────────────────────────────────────────────
// LISTAR USUARIOS
// ─────────────────────────────────────────────────────────────────────────────

export async function listUsersAction(input?: unknown) {
  await requirePermission("user:manage");
  return authService.listUsers(input);
}

// ─────────────────────────────────────────────────────────────────────────────
// OBTENER USUARIO POR ID
// ─────────────────────────────────────────────────────────────────────────────

export async function getUserByIdAction(userId: string) {
  await requirePermission("user:manage");
  return authService.getUserById(userId);
}
