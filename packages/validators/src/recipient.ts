// ═══════════════════════════════════════════════════════════════════════════════
// @upds/validators — Schemas de Destinatarios/Beneficiarios
// Personas que reciben productos: estudiantes (STUDENT), personal (STAFF),
// becarios (SCHOLAR). Campo inmutable: document_number.
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from "zod";
import { RecipientTypeSchema } from "./enums";

// ─────────────────────────────────────────────────────────────────────────────
// Crear destinatario
// ─────────────────────────────────────────────────────────────────────────────

export const createRecipientSchema = z.object({
  document_number: z
    .string()
    .min(1, "El numero de documento es obligatorio")
    .max(50, "El numero de documento no puede exceder 50 caracteres")
    .transform((v) => v.trim()),
  full_name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(255, "El nombre no puede exceder 255 caracteres")
    .transform((v) => v.trim()),
  type: RecipientTypeSchema,
  phone: z
    .string()
    .max(50, "El telefono no puede exceder 50 caracteres")
    .transform((v) => v.trim())
    .nullable()
    .optional(),
  email: z
    .string()
    .email("Formato de correo invalido")
    .max(255, "El correo no puede exceder 255 caracteres")
    .transform((v) => v.toLowerCase().trim())
    .nullable()
    .optional(),
  career: z
    .string()
    .max(255, "La carrera no puede exceder 255 caracteres")
    .transform((v) => v.trim())
    .nullable()
    .optional(),
});

export type CreateRecipientInput = z.infer<typeof createRecipientSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Actualizar destinatario
// ─────────────────────────────────────────────────────────────────────────────

/**
 * document_number es inmutable (no se incluye).
 * Si necesita cambiar, se desactiva y se crea uno nuevo.
 */
export const updateRecipientSchema = z.object({
  id: z.string().uuid("ID de destinatario invalido"),
  full_name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(255, "El nombre no puede exceder 255 caracteres")
    .transform((v) => v.trim()),
  type: RecipientTypeSchema,
  phone: z
    .string()
    .max(50, "El telefono no puede exceder 50 caracteres")
    .transform((v) => v.trim())
    .nullable()
    .optional(),
  email: z
    .string()
    .email("Formato de correo invalido")
    .max(255, "El correo no puede exceder 255 caracteres")
    .transform((v) => v.toLowerCase().trim())
    .nullable()
    .optional(),
  career: z
    .string()
    .max(255, "La carrera no puede exceder 255 caracteres")
    .transform((v) => v.trim())
    .nullable()
    .optional(),
});

export type UpdateRecipientInput = z.infer<typeof updateRecipientSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Filtros para listado
// ─────────────────────────────────────────────────────────────────────────────

export const recipientFiltersSchema = z.object({
  search: z.string().optional(),
  type: RecipientTypeSchema.optional(),
  is_active: z.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().max(100).default(20),
});

export type RecipientFiltersInput = z.infer<typeof recipientFiltersSchema>;
