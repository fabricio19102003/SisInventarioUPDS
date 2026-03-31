// ═══════════════════════════════════════════════════════════════════════════════
// @upds/validators — Schemas de Movimientos de Inventario
// Validacion condicional por tipo de movimiento usando superRefine.
// Cada tipo tiene sus campos obligatorios y restricciones especificas.
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from "zod";
import { MovementTypeSchema, MovementStatusSchema } from "./enums";

// ─────────────────────────────────────────────────────────────────────────────
// Crear movimiento (cabecera)
// ─────────────────────────────────────────────────────────────────────────────

export const createMovementSchema = z
  .object({
    movement_type: MovementTypeSchema,
    recipient_id: z.string().uuid("ID de destinatario invalido").optional(),
    department_id: z.string().uuid("ID de departamento invalido").optional(),
    manufacture_order_id: z
      .string()
      .uuid("ID de orden de fabricacion invalido")
      .optional(),
    notes: z.string().max(5000, "Las notas no pueden exceder 5000 caracteres").optional(),
  })
  .superRefine((data, ctx) => {
    if (data.movement_type === "SALE") {
      if (!data.recipient_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El destinatario es obligatorio para ventas",
          path: ["recipient_id"],
        });
      }
    }

    if (data.movement_type === "DONATION") {
      if (!data.recipient_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El destinatario es obligatorio para dotaciones",
          path: ["recipient_id"],
        });
      }
    }

    if (data.movement_type === "ENTRY") {
      if (!data.manufacture_order_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "La orden de fabricacion es obligatoria para entradas",
          path: ["manufacture_order_id"],
        });
      }
    }

    if (data.movement_type === "DEPARTMENT_DELIVERY") {
      if (!data.department_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "El departamento es obligatorio para entregas a departamento",
          path: ["department_id"],
        });
      }
    }

    if (data.movement_type === "WRITE_OFF") {
      if (!data.notes || data.notes.trim().length < 10) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Las notas son obligatorias para bajas (minimo 10 caracteres)",
          path: ["notes"],
        });
      }
    }

    if (data.movement_type === "ADJUSTMENT") {
      if (!data.notes || data.notes.trim().length < 10) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Las notas son obligatorias para ajustes (minimo 10 caracteres)",
          path: ["notes"],
        });
      }
    }
  });

export type CreateMovementInput = z.infer<typeof createMovementSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Agregar item a movimiento
// ─────────────────────────────────────────────────────────────────────────────

export const addMovementItemSchema = z
  .object({
    movement_id: z.string().uuid("ID de movimiento invalido"),
    product_variant_id: z.string().uuid("ID de variante invalido"),
    quantity: z.coerce
      .number()
      .int("La cantidad debe ser un numero entero"),
    unit_price: z.coerce
      .number()
      .min(0, "El precio unitario no puede ser negativo")
      .optional()
      .default(0),
  })
  .superRefine((data, ctx) => {
    if (data.quantity === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La cantidad no puede ser cero",
        path: ["quantity"],
      });
    }
  });

export type AddMovementItemInput = z.infer<typeof addMovementItemSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Confirmar movimiento
// ─────────────────────────────────────────────────────────────────────────────

export const confirmMovementSchema = z.object({
  movement_id: z.string().uuid("ID de movimiento invalido"),
});

export type ConfirmMovementInput = z.infer<typeof confirmMovementSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Cancelar movimiento
// ─────────────────────────────────────────────────────────────────────────────

export const cancelMovementSchema = z.object({
  movement_id: z.string().uuid("ID de movimiento invalido"),
  cancel_reason: z
    .string()
    .min(10, "El motivo de cancelacion debe tener al menos 10 caracteres")
    .max(5000, "El motivo no puede exceder 5000 caracteres"),
});

export type CancelMovementInput = z.infer<typeof cancelMovementSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Filtros de listado
// ─────────────────────────────────────────────────────────────────────────────

export const movementFiltersSchema = z.object({
  search: z.string().max(255).optional(),
  movement_type: MovementTypeSchema.optional(),
  status: MovementStatusSchema.optional(),
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
});

export type MovementFiltersInput = z.infer<typeof movementFiltersSchema>;
