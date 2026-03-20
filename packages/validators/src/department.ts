// ═══════════════════════════════════════════════════════════════════════════════
// @upds/validators — Schemas de Departamentos
// Departamentos internos de la universidad. Destinatarios exclusivos
// de entregas de material de oficina (DEPARTMENT_DELIVERY).
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// Crear departamento
// ─────────────────────────────────────────────────────────────────────────────

export const createDepartmentSchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(255, "El nombre no puede exceder 255 caracteres")
    .transform((v) => v.trim()),
  code: z
    .string()
    .min(1, "El codigo es obligatorio")
    .max(20, "El codigo no puede exceder 20 caracteres")
    .transform((v) => v.toUpperCase().trim()),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Actualizar departamento
// ─────────────────────────────────────────────────────────────────────────────

export const updateDepartmentSchema = z.object({
  id: z.string().uuid("ID de departamento invalido"),
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(255, "El nombre no puede exceder 255 caracteres")
    .transform((v) => v.trim()),
  code: z
    .string()
    .min(1, "El codigo es obligatorio")
    .max(20, "El codigo no puede exceder 20 caracteres")
    .transform((v) => v.toUpperCase().trim()),
});

export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Filtros para listado
// ─────────────────────────────────────────────────────────────────────────────

export const departmentFiltersSchema = z.object({
  search: z.string().optional(),
  is_active: z.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().max(100).default(20),
});

export type DepartmentFiltersInput = z.infer<typeof departmentFiltersSchema>;
