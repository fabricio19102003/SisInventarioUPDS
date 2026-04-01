// ═══════════════════════════════════════════════════════════════════════════════
// @upds/validators — Schemas de Movimientos de Inventario
// Validacion estricta por tipo de movimiento usando discriminatedUnion.
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from "zod";
import { MovementStatusSchema } from "./enums";

const uuidField = (message: string) => z.string().uuid(message);

const optionalNotes = z
  .string()
  .max(5000, "Las notas no pueden exceder 5000 caracteres")
  .optional();

const requiredNotes = z
  .string()
  .min(10, "Las notas son obligatorias (minimo 10 caracteres)")
  .max(5000, "Las notas no pueden exceder 5000 caracteres");

const entryMovementSchema = z.object({
  movement_type: z.literal("ENTRY"),
  recipient_id: z.undefined().optional(),
  department_id: z.undefined().optional(),
  manufacture_order_id: uuidField("ID de orden de fabricacion invalido"),
  notes: optionalNotes,
});

const saleMovementSchema = z.object({
  movement_type: z.literal("SALE"),
  recipient_id: uuidField("ID de destinatario invalido"),
  department_id: z.undefined().optional(),
  manufacture_order_id: z.undefined().optional(),
  notes: optionalNotes,
});

const donationMovementSchema = z.object({
  movement_type: z.literal("DONATION"),
  recipient_id: uuidField("ID de destinatario invalido"),
  department_id: z.undefined().optional(),
  manufacture_order_id: z.undefined().optional(),
  notes: optionalNotes,
});

const writeOffMovementSchema = z.object({
  movement_type: z.literal("WRITE_OFF"),
  recipient_id: z.undefined().optional(),
  department_id: z.undefined().optional(),
  manufacture_order_id: z.undefined().optional(),
  notes: requiredNotes,
});

const adjustmentMovementSchema = z.object({
  movement_type: z.literal("ADJUSTMENT"),
  recipient_id: z.undefined().optional(),
  department_id: z.undefined().optional(),
  manufacture_order_id: z.undefined().optional(),
  notes: requiredNotes,
});

const departmentDeliveryMovementSchema = z.object({
  movement_type: z.literal("DEPARTMENT_DELIVERY"),
  recipient_id: z.undefined().optional(),
  department_id: uuidField("ID de departamento invalido"),
  manufacture_order_id: z.undefined().optional(),
  notes: optionalNotes,
});

export const createMovementSchema = z.discriminatedUnion("movement_type", [
  entryMovementSchema,
  saleMovementSchema,
  donationMovementSchema,
  writeOffMovementSchema,
  adjustmentMovementSchema,
  departmentDeliveryMovementSchema,
]);

export type CreateMovementInput = z.infer<typeof createMovementSchema>;

export const addMovementItemSchema = z
  .object({
    movement_id: z.string().uuid("ID de movimiento invalido"),
    product_variant_id: z.string().uuid("ID de variante invalido"),
    quantity: z.coerce.number().int("La cantidad debe ser un numero entero"),
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

export const confirmMovementSchema = z.object({
  movement_id: z.string().uuid("ID de movimiento invalido"),
});

export type ConfirmMovementInput = z.infer<typeof confirmMovementSchema>;

export const cancelMovementSchema = z.object({
  movement_id: z.string().uuid("ID de movimiento invalido"),
  cancel_reason: z
    .string()
    .min(10, "El motivo de cancelacion debe tener al menos 10 caracteres")
    .max(5000, "El motivo no puede exceder 5000 caracteres"),
});

export type CancelMovementInput = z.infer<typeof cancelMovementSchema>;

export const movementFiltersSchema = z.object({
  search: z.string().max(255).optional(),
  movement_type: z
    .enum([
      "ENTRY",
      "SALE",
      "DONATION",
      "WRITE_OFF",
      "ADJUSTMENT",
      "DEPARTMENT_DELIVERY",
    ])
    .optional(),
  status: MovementStatusSchema.optional(),
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
});

export type MovementFiltersInput = z.infer<typeof movementFiltersSchema>;
