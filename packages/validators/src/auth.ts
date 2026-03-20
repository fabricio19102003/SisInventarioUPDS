// ═══════════════════════════════════════════════════════════════════════════════
// @upds/validators — Schemas de Autenticacion y Usuarios
// Validacion de login, creacion/actualizacion de usuarios, cambio de password.
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from "zod";
import { UserRoleSchema } from "./enums";

// ─────────────────────────────────────────────────────────────────────────────
// Login
// ─────────────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "El correo es obligatorio")
    .email("Formato de correo invalido")
    .max(255, "El correo no puede exceder 255 caracteres")
    .transform((v) => v.toLowerCase().trim()),
  password: z
    .string()
    .min(1, "La contrasena es obligatoria")
    .max(128, "La contrasena no puede exceder 128 caracteres"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Crear usuario
// ─────────────────────────────────────────────────────────────────────────────

export const createUserSchema = z
  .object({
    email: z
      .string()
      .min(1, "El correo es obligatorio")
      .email("Formato de correo invalido")
      .max(255, "El correo no puede exceder 255 caracteres")
      .transform((v) => v.toLowerCase().trim()),
    full_name: z
      .string()
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(255, "El nombre no puede exceder 255 caracteres")
      .transform((v) => v.trim()),
    password: z
      .string()
      .min(8, "La contrasena debe tener al menos 8 caracteres")
      .max(128, "La contrasena no puede exceder 128 caracteres")
      .regex(
        /[A-Z]/,
        "La contrasena debe contener al menos una letra mayuscula",
      )
      .regex(
        /[a-z]/,
        "La contrasena debe contener al menos una letra minuscula",
      )
      .regex(/[0-9]/, "La contrasena debe contener al menos un numero"),
    password_confirm: z.string().min(1, "Debe confirmar la contrasena"),
    role: UserRoleSchema,
  })
  .refine((data) => data.password === data.password_confirm, {
    message: "Las contrasenas no coinciden",
    path: ["password_confirm"],
  });

export type CreateUserInput = z.infer<typeof createUserSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Actualizar usuario (sin cambiar password)
// ─────────────────────────────────────────────────────────────────────────────

export const updateUserSchema = z.object({
  id: z.string().uuid("ID de usuario invalido"),
  email: z
    .string()
    .min(1, "El correo es obligatorio")
    .email("Formato de correo invalido")
    .max(255, "El correo no puede exceder 255 caracteres")
    .transform((v) => v.toLowerCase().trim()),
  full_name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(255, "El nombre no puede exceder 255 caracteres")
    .transform((v) => v.trim()),
  role: UserRoleSchema,
  is_active: z.boolean(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Cambiar contrasena
// ─────────────────────────────────────────────────────────────────────────────

export const changePasswordSchema = z
  .object({
    user_id: z.string().uuid("ID de usuario invalido"),
    current_password: z.string().min(1, "La contrasena actual es obligatoria"),
    new_password: z
      .string()
      .min(8, "La nueva contrasena debe tener al menos 8 caracteres")
      .max(128, "La contrasena no puede exceder 128 caracteres")
      .regex(
        /[A-Z]/,
        "La contrasena debe contener al menos una letra mayuscula",
      )
      .regex(
        /[a-z]/,
        "La contrasena debe contener al menos una letra minuscula",
      )
      .regex(/[0-9]/, "La contrasena debe contener al menos un numero"),
    new_password_confirm: z
      .string()
      .min(1, "Debe confirmar la nueva contrasena"),
  })
  .refine((data) => data.new_password === data.new_password_confirm, {
    message: "Las contrasenas no coinciden",
    path: ["new_password_confirm"],
  })
  .refine((data) => data.current_password !== data.new_password, {
    message: "La nueva contrasena debe ser diferente a la actual",
    path: ["new_password"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Reset de contrasena por admin (sin pedir contrasena actual)
// ─────────────────────────────────────────────────────────────────────────────

export const adminResetPasswordSchema = z
  .object({
    user_id: z.string().uuid("ID de usuario invalido"),
    new_password: z
      .string()
      .min(8, "La nueva contrasena debe tener al menos 8 caracteres")
      .max(128, "La contrasena no puede exceder 128 caracteres")
      .regex(
        /[A-Z]/,
        "La contrasena debe contener al menos una letra mayuscula",
      )
      .regex(
        /[a-z]/,
        "La contrasena debe contener al menos una letra minuscula",
      )
      .regex(/[0-9]/, "La contrasena debe contener al menos un numero"),
    new_password_confirm: z
      .string()
      .min(1, "Debe confirmar la nueva contrasena"),
  })
  .refine((data) => data.new_password === data.new_password_confirm, {
    message: "Las contrasenas no coinciden",
    path: ["new_password_confirm"],
  });

export type AdminResetPasswordInput = z.infer<typeof adminResetPasswordSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Filtros para listado de usuarios
// ─────────────────────────────────────────────────────────────────────────────

export const userFiltersSchema = z.object({
  search: z.string().optional(),
  role: UserRoleSchema.optional(),
  is_active: z.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().max(100).default(20),
});

export type UserFiltersInput = z.infer<typeof userFiltersSchema>;
