// ═══════════════════════════════════════════════════════════════════════════════
// @upds/validators — Schemas de Ordenes de Fabricacion
// Ordenes enviadas a talleres externos, recepcion parcial, cancelacion.
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from "zod";
import { ManufactureOrderStatusSchema } from "./enums";

// ─────────────────────────────────────────────────────────────────────────────
// Crear orden de fabricacion
// ─────────────────────────────────────────────────────────────────────────────

export const createManufactureOrderSchema = z.object({
  manufacturer_id: z.string().uuid("ID de fabricante invalido"),
  notes: z
    .string()
    .max(2000, "Las notas no pueden exceder 2000 caracteres")
    .transform((v) => v.trim())
    .nullable()
    .optional(),
  expected_at: z.coerce.date().nullable().optional(),
});

export type CreateManufactureOrderInput = z.infer<
  typeof createManufactureOrderSchema
>;

// ─────────────────────────────────────────────────────────────────────────────
// Agregar item a orden
// ─────────────────────────────────────────────────────────────────────────────

export const addOrderItemSchema = z.object({
  manufacture_order_id: z.string().uuid("ID de orden invalido"),
  product_variant_id: z.string().uuid("ID de variante invalido"),
  quantity_ordered: z.coerce
    .number()
    .int("La cantidad debe ser un numero entero")
    .positive("La cantidad debe ser mayor a 0"),
  unit_cost: z.coerce
    .number()
    .min(0, "El costo unitario no puede ser negativo"),
});

export type AddOrderItemInput = z.infer<typeof addOrderItemSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Quitar item de orden
// ─────────────────────────────────────────────────────────────────────────────

export const removeOrderItemSchema = z.object({
  item_id: z.string().uuid("ID de item invalido"),
});

export type RemoveOrderItemInput = z.infer<typeof removeOrderItemSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Recibir items de orden (recepcion parcial o total)
// ─────────────────────────────────────────────────────────────────────────────

export const receiveOrderItemsSchema = z.object({
  manufacture_order_id: z.string().uuid("ID de orden invalido"),
  items: z
    .array(
      z.object({
        manufacture_order_item_id: z.string().uuid("ID de item invalido"),
        quantity_received: z.coerce
          .number()
          .int("La cantidad debe ser un numero entero")
          .positive("La cantidad recibida debe ser mayor a 0"),
      }),
    )
    .min(1, "Debe recibir al menos un item"),
});

export type ReceiveOrderItemsInput = z.infer<
  typeof receiveOrderItemsSchema
>;

// ─────────────────────────────────────────────────────────────────────────────
// Cancelar orden
// ─────────────────────────────────────────────────────────────────────────────

export const cancelOrderSchema = z.object({
  manufacture_order_id: z.string().uuid("ID de orden invalido"),
  cancel_reason: z
    .string()
    .min(10, "El motivo de cancelacion debe tener al menos 10 caracteres")
    .max(2000, "El motivo no puede exceder 2000 caracteres")
    .transform((v) => v.trim()),
});

export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Filtros para listado
// ─────────────────────────────────────────────────────────────────────────────

export const orderFiltersSchema = z.object({
  search: z.string().optional(),
  status: ManufactureOrderStatusSchema.optional(),
  manufacturer_id: z.string().uuid("ID de fabricante invalido").optional(),
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().max(100).default(20),
});

export type OrderFiltersInput = z.infer<typeof orderFiltersSchema>;
