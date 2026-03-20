// ═══════════════════════════════════════════════════════════════════════════════
// @upds/services — Servicio de Autenticacion y Usuarios
// CRUD completo de usuarios, hash de passwords, validacion de credenciales.
// Toda mutacion genera entrada en AuditLog.
// ═══════════════════════════════════════════════════════════════════════════════

import { type PrismaClient, type TransactionClient } from "@upds/db";
import {
  loginSchema,
  createUserSchema,
  updateUserSchema,
  changePasswordSchema,
  adminResetPasswordSchema,
  userFiltersSchema,
  type LoginInput,
  type CreateUserInput,
  type UpdateUserInput,
  type ChangePasswordInput,
  type AdminResetPasswordInput,
  type UserFiltersInput,
} from "@upds/validators";
import bcrypt from "bcryptjs";
import { createAuditLog, diffValues } from "./audit";

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

const SALT_ROUNDS = 12;

/** Campos que se retornan al frontend. Nunca exponer password_hash. */
const USER_SELECT = {
  id: true,
  email: true,
  full_name: true,
  role: true,
  is_active: true,
  last_login_at: true,
  created_at: true,
  updated_at: true,
} as const;

/** Tipo seguro de usuario sin password_hash. */
export interface SafeUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Resultado estandar de operaciones
// ─────────────────────────────────────────────────────────────────────────────

export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─────────────────────────────────────────────────────────────────────────────
// Contexto de auditoria (IP, user_agent)
// ─────────────────────────────────────────────────────────────────────────────

export interface AuditContext {
  ip_address?: string | null;
  user_agent?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Servicio
// ─────────────────────────────────────────────────────────────────────────────

export class AuthService {
  constructor(private readonly db: PrismaClient) {}

  // ─────────────────────────────────────────────────────────────────────────
  // LOGIN
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Valida credenciales y registra el login en audit_log.
   * Retorna el usuario sin password_hash si las credenciales son correctas.
   */
  async login(
    input: LoginInput,
    ctx?: AuditContext,
  ): Promise<ServiceResult<SafeUser>> {
    const parsed = loginSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? "Datos invalidos",
      };
    }

    const { email, password } = parsed.data;

    const user = await this.db.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { success: false, error: "Credenciales invalidas" };
    }

    if (!user.is_active) {
      return { success: false, error: "La cuenta esta desactivada" };
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash);

    if (!passwordValid) {
      await createAuditLog(this.db, {
        user_id: user.id,
        action: "LOGIN_FAILED",
        entity_type: "USER",
        entity_id: user.id,
        new_values: { reason: "Contrasena incorrecta" },
        ip_address: ctx?.ip_address,
        user_agent: ctx?.user_agent,
      });

      return { success: false, error: "Credenciales invalidas" };
    }

    const updatedUser = await this.db.user.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
      select: USER_SELECT,
    });

    await createAuditLog(this.db, {
      user_id: user.id,
      action: "LOGIN",
      entity_type: "USER",
      entity_id: user.id,
      ip_address: ctx?.ip_address,
      user_agent: ctx?.user_agent,
    });

    return { success: true, data: updatedUser };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CREAR USUARIO
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Crea un nuevo usuario. Solo ADMIN puede ejecutar esta accion.
   * El password se hashea antes de almacenar.
   */
  async createUser(
    input: CreateUserInput,
    adminId: string,
    ctx?: AuditContext,
  ): Promise<ServiceResult<SafeUser>> {
    const parsed = createUserSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? "Datos invalidos",
      };
    }

    const { email, full_name, password, role } = parsed.data;

    const existing = await this.db.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      return { success: false, error: "Ya existe un usuario con ese correo" };
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const newUser = await this.db.$transaction(
      async (tx: TransactionClient) => {
        const user = await tx.user.create({
          data: { email, full_name, password_hash, role },
          select: USER_SELECT,
        });

        await createAuditLog(tx, {
          user_id: adminId,
          action: "CREATE",
          entity_type: "USER",
          entity_id: user.id,
          new_values: {
            email: user.email,
            full_name: user.full_name,
            role: user.role,
          },
          ip_address: ctx?.ip_address,
          user_agent: ctx?.user_agent,
        });

        return user;
      },
    );

    return { success: true, data: newUser };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ACTUALIZAR USUARIO
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Actualiza datos de un usuario (sin cambiar password).
   * Registra solo los campos que realmente cambiaron.
   */
  async updateUser(
    input: UpdateUserInput,
    adminId: string,
    ctx?: AuditContext,
  ): Promise<ServiceResult<SafeUser>> {
    const parsed = updateUserSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? "Datos invalidos",
      };
    }

    const { id, email, full_name, role, is_active } = parsed.data;

    const currentUser = await this.db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true,
        is_active: true,
      },
    });

    if (!currentUser) {
      return { success: false, error: "Usuario no encontrado" };
    }

    if (email !== currentUser.email) {
      const emailTaken = await this.db.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (emailTaken) {
        return {
          success: false,
          error: "Ya existe un usuario con ese correo",
        };
      }
    }

    const changes = diffValues(
      {
        email: currentUser.email,
        full_name: currentUser.full_name,
        role: currentUser.role,
        is_active: currentUser.is_active,
      },
      { email, full_name, role, is_active },
    );

    const updatedUser = await this.db.$transaction(
      async (tx: TransactionClient) => {
        const user = await tx.user.update({
          where: { id },
          data: { email, full_name, role, is_active },
          select: USER_SELECT,
        });

        await createAuditLog(tx, {
          user_id: adminId,
          action: "UPDATE",
          entity_type: "USER",
          entity_id: id,
          old_values: changes?.old ?? null,
          new_values: changes?.new ?? null,
          ip_address: ctx?.ip_address,
          user_agent: ctx?.user_agent,
        });

        return user;
      },
    );

    return { success: true, data: updatedUser };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DESACTIVAR USUARIO (Soft Delete)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Desactiva un usuario (soft delete). Nunca borrado fisico.
   * Un admin no puede desactivarse a si mismo.
   */
  async deactivateUser(
    userId: string,
    adminId: string,
    ctx?: AuditContext,
  ): Promise<ServiceResult<SafeUser>> {
    if (userId === adminId) {
      return { success: false, error: "No puede desactivar su propia cuenta" };
    }

    const currentUser = await this.db.user.findUnique({
      where: { id: userId },
      select: { id: true, is_active: true },
    });

    if (!currentUser) {
      return { success: false, error: "Usuario no encontrado" };
    }

    if (!currentUser.is_active) {
      return { success: false, error: "El usuario ya esta desactivado" };
    }

    const updatedUser = await this.db.$transaction(
      async (tx: TransactionClient) => {
        const user = await tx.user.update({
          where: { id: userId },
          data: { is_active: false },
          select: USER_SELECT,
        });

        await createAuditLog(tx, {
          user_id: adminId,
          action: "DELETE",
          entity_type: "USER",
          entity_id: userId,
          old_values: { is_active: true },
          new_values: { is_active: false },
          ip_address: ctx?.ip_address,
          user_agent: ctx?.user_agent,
        });

        return user;
      },
    );

    return { success: true, data: updatedUser };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // REACTIVAR USUARIO
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Reactiva un usuario previamente desactivado.
   */
  async reactivateUser(
    userId: string,
    adminId: string,
    ctx?: AuditContext,
  ): Promise<ServiceResult<SafeUser>> {
    const currentUser = await this.db.user.findUnique({
      where: { id: userId },
      select: { id: true, is_active: true },
    });

    if (!currentUser) {
      return { success: false, error: "Usuario no encontrado" };
    }

    if (currentUser.is_active) {
      return { success: false, error: "El usuario ya esta activo" };
    }

    const updatedUser = await this.db.$transaction(
      async (tx: TransactionClient) => {
        const user = await tx.user.update({
          where: { id: userId },
          data: { is_active: true },
          select: USER_SELECT,
        });

        await createAuditLog(tx, {
          user_id: adminId,
          action: "UPDATE",
          entity_type: "USER",
          entity_id: userId,
          old_values: { is_active: false },
          new_values: { is_active: true },
          ip_address: ctx?.ip_address,
          user_agent: ctx?.user_agent,
        });

        return user;
      },
    );

    return { success: true, data: updatedUser };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CAMBIAR PASSWORD (usuario propio)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Permite a un usuario cambiar su propia contrasena.
   * Requiere la contrasena actual para validar identidad.
   */
  async changePassword(
    input: ChangePasswordInput,
    ctx?: AuditContext,
  ): Promise<ServiceResult<{ message: string }>> {
    const parsed = changePasswordSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? "Datos invalidos",
      };
    }

    const { user_id, current_password, new_password } = parsed.data;

    const user = await this.db.user.findUnique({
      where: { id: user_id },
      select: { id: true, password_hash: true, is_active: true },
    });

    if (!user) {
      return { success: false, error: "Usuario no encontrado" };
    }

    if (!user.is_active) {
      return { success: false, error: "La cuenta esta desactivada" };
    }

    const currentValid = await bcrypt.compare(
      current_password,
      user.password_hash,
    );
    if (!currentValid) {
      return { success: false, error: "La contrasena actual es incorrecta" };
    }

    const new_hash = await bcrypt.hash(new_password, SALT_ROUNDS);

    await this.db.$transaction(async (tx: TransactionClient) => {
      await tx.user.update({
        where: { id: user_id },
        data: { password_hash: new_hash },
      });

      await createAuditLog(tx, {
        user_id: user_id,
        action: "PASSWORD_CHANGE",
        entity_type: "USER",
        entity_id: user_id,
        ip_address: ctx?.ip_address,
        user_agent: ctx?.user_agent,
      });
    });

    return {
      success: true,
      data: { message: "Contrasena actualizada correctamente" },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RESET PASSWORD POR ADMIN
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Permite a un admin resetear la contrasena de otro usuario
   * sin necesidad de conocer la contrasena actual.
   */
  async adminResetPassword(
    input: AdminResetPasswordInput,
    adminId: string,
    ctx?: AuditContext,
  ): Promise<ServiceResult<{ message: string }>> {
    const parsed = adminResetPasswordSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? "Datos invalidos",
      };
    }

    const { user_id, new_password } = parsed.data;

    const user = await this.db.user.findUnique({
      where: { id: user_id },
      select: { id: true },
    });

    if (!user) {
      return { success: false, error: "Usuario no encontrado" };
    }

    const new_hash = await bcrypt.hash(new_password, SALT_ROUNDS);

    await this.db.$transaction(async (tx: TransactionClient) => {
      await tx.user.update({
        where: { id: user_id },
        data: { password_hash: new_hash },
      });

      await createAuditLog(tx, {
        user_id: adminId,
        action: "PASSWORD_RESET",
        entity_type: "USER",
        entity_id: user_id,
        new_values: { reset_by: adminId },
        ip_address: ctx?.ip_address,
        user_agent: ctx?.user_agent,
      });
    });

    return {
      success: true,
      data: { message: "Contrasena reseteada correctamente" },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // OBTENER USUARIO POR ID
  // ─────────────────────────────────────────────────────────────────────────

  async getUserById(userId: string): Promise<ServiceResult<SafeUser>> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: USER_SELECT,
    });

    if (!user) {
      return { success: false, error: "Usuario no encontrado" };
    }

    return { success: true, data: user };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LISTAR USUARIOS CON FILTROS Y PAGINACION
  // ─────────────────────────────────────────────────────────────────────────

  async listUsers(input?: UserFiltersInput): Promise<
    ServiceResult<{
      users: SafeUser[];
      total: number;
      page: number;
      per_page: number;
    }>
  > {
    const parsed = userFiltersSchema.safeParse(input ?? {});
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? "Filtros invalidos",
      };
    }

    const { search, role, is_active, page, per_page } = parsed.data;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma where types are complex; values are validated by Zod
    const where: Record<string, any> = {};

    if (role) {
      where.role = role;
    }

    if (is_active !== undefined) {
      where.is_active = is_active;
    }

    if (search) {
      where.OR = [
        { full_name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await this.db.$transaction([
      this.db.user.findMany({
        where,
        select: USER_SELECT,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * per_page,
        take: per_page,
      }),
      this.db.user.count({ where }),
    ]);

    return {
      success: true,
      data: { users, total, page, per_page },
    };
  }
}
