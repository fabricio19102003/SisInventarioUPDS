// ═══════════════════════════════════════════════════════════════════════════════
// @upds/validators — Schemas de Fabricantes
// Talleres externos que fabrican indumentaria medica.
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// Crear fabricante
// ─────────────────────────────────────────────────────────────────────────────

export const createManufacturerSchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(255, "El nombre no puede exceder 255 caracteres")
    .transform((v) => v.trim()),
  contact_name: z
    .string()
    .max(255, "El nombre de contacto no puede exceder 255 caracteres")
    .transform((v) => v.trim())
    .nullable()
    .optional(),
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
  address: z
    .string()
    .max(2000, "La direccion no puede exceder 2000 caracteres")
    .transform((v) => v.trim())
    .nullable()
    .optional(),
});

export type CreateManufacturerInput = z.infer<typeof createManufacturerSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Actualizar fabricante
// ─────────────────────────────────────────────────────────────────────────────

export const updateManufacturerSchema = z.object({
  id: z.string().uuid("ID de fabricante invalido"),
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(255, "El nombre no puede exceder 255 caracteres")
    .transform((v) => v.trim()),
  contact_name: z
    .string()
    .max(255, "El nombre de contacto no puede exceder 255 caracteres")
    .transform((v) => v.trim())
    .nullable()
    .optional(),
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
  address: z
    .string()
    .max(2000, "La direccion no puede exceder 2000 caracteres")
    .transform((v) => v.trim())
    .nullable()
    .optional(),
});

export type UpdateManufacturerInput = z.infer<typeof updateManufacturerSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Filtros para listado
// ─────────────────────────────────────────────────────────────────────────────

export const manufacturerFiltersSchema = z.object({
  search: z.string().optional(),
  is_active: z.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().max(100).default(20),
});

export type ManufacturerFiltersInput = z.infer<
  typeof manufacturerFiltersSchema
>;
