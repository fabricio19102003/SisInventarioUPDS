// ═══════════════════════════════════════════════════════════════════════════════
// @upds/validators — Schemas de Productos y Variantes
// Validacion condicional: MEDICAL_GARMENT requiere garment_type + talla + genero.
//                         OFFICE_SUPPLY no permite garment_type, una sola variante.
// Campos inmutables post-creacion: sku, category, garment_type, warehouse_area.
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from "zod";
import {
  ProductCategorySchema,
  GarmentTypeSchema,
  WarehouseAreaSchema,
  SizeSchema,
  GenderSchema,
} from "./enums";

// ─────────────────────────────────────────────────────────────────────────────
// Variante de producto
// ─────────────────────────────────────────────────────────────────────────────

/** Schema para crear una variante dentro del formulario de producto medico. */
export const createMedicalVariantSchema = z.object({
  size: SizeSchema,
  gender: GenderSchema,
  color: z
    .string()
    .min(1, "El color es obligatorio")
    .max(100, "El color no puede exceder 100 caracteres")
    .transform((v) => v.trim()),
  initial_stock: z.coerce
    .number()
    .int("El stock debe ser un numero entero")
    .min(0, "El stock no puede ser negativo")
    .default(0),
});

export type CreateMedicalVariantInput = z.infer<
  typeof createMedicalVariantSchema
>;

/** Schema para crear la variante unica de un producto de oficina. */
export const createOfficeVariantSchema = z.object({
  initial_stock: z.coerce
    .number()
    .int("El stock debe ser un numero entero")
    .min(0, "El stock no puede ser negativo")
    .default(0),
});

export type CreateOfficeVariantInput = z.infer<
  typeof createOfficeVariantSchema
>;

// ─────────────────────────────────────────────────────────────────────────────
// Crear producto
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Schema base con los campos comunes a ambas categorias.
 * La validacion condicional se aplica via superRefine.
 */
export const createProductSchema = z
  .object({
    sku: z
      .string()
      .min(1, "El SKU es obligatorio")
      .max(50, "El SKU no puede exceder 50 caracteres")
      .transform((v) => v.toUpperCase().trim()),
    name: z
      .string()
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(255, "El nombre no puede exceder 255 caracteres")
      .transform((v) => v.trim()),
    description: z
      .string()
      .max(2000, "La descripcion no puede exceder 2000 caracteres")
      .transform((v) => v.trim())
      .nullable()
      .optional(),
    category: ProductCategorySchema,
    garment_type: GarmentTypeSchema.nullable().optional(),
    warehouse_area: WarehouseAreaSchema,
    min_stock: z.coerce
      .number()
      .int("El stock minimo debe ser un numero entero")
      .min(0, "El stock minimo no puede ser negativo")
      .default(5),
    // Variantes: array para medico, no se envia para oficina (se crea automaticamente)
    variants: z.array(createMedicalVariantSchema).optional(),
    // Stock inicial para producto de oficina (una sola variante)
    initial_stock: z.coerce
      .number()
      .int("El stock debe ser un numero entero")
      .min(0, "El stock no puede ser negativo")
      .default(0)
      .optional(),
  })
  .superRefine((data, ctx) => {
    // ── MEDICAL_GARMENT ──────────────────────────────────────────────────
    if (data.category === "MEDICAL_GARMENT") {
      // garment_type obligatorio
      if (!data.garment_type) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El tipo de prenda es obligatorio para indumentaria medica",
          path: ["garment_type"],
        });
      }

      // warehouse_area debe ser MEDICAL
      if (data.warehouse_area !== "MEDICAL") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "El area de almacen debe ser 'Sector Medico' para indumentaria medica",
          path: ["warehouse_area"],
        });
      }

      // Debe tener al menos una variante
      if (!data.variants || data.variants.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Debe agregar al menos una variante (talla + genero + color)",
          path: ["variants"],
        });
      }
    }

    // ── OFFICE_SUPPLY ────────────────────────────────────────────────────
    if (data.category === "OFFICE_SUPPLY") {
      // garment_type debe ser null
      if (data.garment_type) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El tipo de prenda no aplica para material de oficina",
          path: ["garment_type"],
        });
      }

      // warehouse_area debe ser OFFICE
      if (data.warehouse_area !== "OFFICE") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "El area de almacen debe ser 'Sector Oficina' para material de oficina",
          path: ["warehouse_area"],
        });
      }

      // No debe tener variantes medicas
      if (data.variants && data.variants.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Los materiales de oficina no tienen variantes con talla/genero",
          path: ["variants"],
        });
      }
    }
  });

export type CreateProductInput = z.infer<typeof createProductSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Actualizar producto
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Solo se pueden editar: name, description, min_stock.
 * Los campos inmutables (sku, category, garment_type, warehouse_area) NO se incluyen.
 */
export const updateProductSchema = z.object({
  id: z.string().uuid("ID de producto invalido"),
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(255, "El nombre no puede exceder 255 caracteres")
    .transform((v) => v.trim()),
  description: z
    .string()
    .max(2000, "La descripcion no puede exceder 2000 caracteres")
    .transform((v) => v.trim())
    .nullable()
    .optional(),
  min_stock: z.coerce
    .number()
    .int("El stock minimo debe ser un numero entero")
    .min(0, "El stock minimo no puede ser negativo"),
});

export type UpdateProductInput = z.infer<typeof updateProductSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Agregar variante a producto existente (solo MEDICAL_GARMENT)
// ─────────────────────────────────────────────────────────────────────────────

export const addVariantSchema = z.object({
  product_id: z.string().uuid("ID de producto invalido"),
  size: SizeSchema,
  gender: GenderSchema,
  color: z
    .string()
    .min(1, "El color es obligatorio")
    .max(100, "El color no puede exceder 100 caracteres")
    .transform((v) => v.trim()),
  initial_stock: z.coerce
    .number()
    .int("El stock debe ser un numero entero")
    .min(0, "El stock no puede ser negativo")
    .default(0),
});

export type AddVariantInput = z.infer<typeof addVariantSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Filtros para listado de productos
// ─────────────────────────────────────────────────────────────────────────────

export const productFiltersSchema = z.object({
  search: z.string().optional(),
  category: ProductCategorySchema.optional(),
  garment_type: GarmentTypeSchema.optional(),
  warehouse_area: WarehouseAreaSchema.optional(),
  is_active: z.boolean().optional(),
  low_stock: z.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().max(100).default(20),
});

export type ProductFiltersInput = z.infer<typeof productFiltersSchema>;
