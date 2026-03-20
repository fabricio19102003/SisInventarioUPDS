// ═══════════════════════════════════════════════════════════════════════════════
// @upds/validators — Enums del Sistema
// Enums espejo de Prisma con labels en espanol para la UI.
// Estos enums son la fuente de verdad para formularios, selects y filtros.
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// UserRole
// ─────────────────────────────────────────────────────────────────────────────

export const UserRole = {
  ADMIN: "ADMIN",
  INVENTORY_MANAGER: "INVENTORY_MANAGER",
  VIEWER: "VIEWER",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const UserRoleSchema = z.enum(["ADMIN", "INVENTORY_MANAGER", "VIEWER"]);

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrador",
  INVENTORY_MANAGER: "Encargado de Inventario",
  VIEWER: "Solo Lectura",
};

// ─────────────────────────────────────────────────────────────────────────────
// ProductCategory
// ─────────────────────────────────────────────────────────────────────────────

export const ProductCategory = {
  MEDICAL_GARMENT: "MEDICAL_GARMENT",
  OFFICE_SUPPLY: "OFFICE_SUPPLY",
} as const;

export type ProductCategory =
  (typeof ProductCategory)[keyof typeof ProductCategory];

export const ProductCategorySchema = z.enum([
  "MEDICAL_GARMENT",
  "OFFICE_SUPPLY",
]);

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  MEDICAL_GARMENT: "Indumentaria Medica",
  OFFICE_SUPPLY: "Material de Oficina",
};

// ─────────────────────────────────────────────────────────────────────────────
// GarmentType
// ─────────────────────────────────────────────────────────────────────────────

export const GarmentType = {
  PIJAMA: "PIJAMA",
  BATA: "BATA",
  MANDIL: "MANDIL",
  POLERA: "POLERA",
  GORRO: "GORRO",
} as const;

export type GarmentType = (typeof GarmentType)[keyof typeof GarmentType];

export const GarmentTypeSchema = z.enum([
  "PIJAMA",
  "BATA",
  "MANDIL",
  "POLERA",
  "GORRO",
]);

export const GARMENT_TYPE_LABELS: Record<GarmentType, string> = {
  PIJAMA: "Pijama Quirurgico",
  BATA: "Bata",
  MANDIL: "Mandil",
  POLERA: "Polera",
  GORRO: "Gorro Quirurgico",
};

// ─────────────────────────────────────────────────────────────────────────────
// Size
// ─────────────────────────────────────────────────────────────────────────────

export const Size = {
  XS: "XS",
  S: "S",
  M: "M",
  L: "L",
  XL: "XL",
  XXL: "XXL",
} as const;

export type Size = (typeof Size)[keyof typeof Size];

export const SizeSchema = z.enum(["XS", "S", "M", "L", "XL", "XXL"]);

export const SIZE_LABELS: Record<Size, string> = {
  XS: "XS - Extra Pequeno",
  S: "S - Pequeno",
  M: "M - Mediano",
  L: "L - Grande",
  XL: "XL - Extra Grande",
  XXL: "XXL - Doble Extra Grande",
};

// ─────────────────────────────────────────────────────────────────────────────
// Gender
// ─────────────────────────────────────────────────────────────────────────────

export const Gender = {
  MASCULINO: "MASCULINO",
  FEMENINO: "FEMENINO",
  UNISEX: "UNISEX",
} as const;

export type Gender = (typeof Gender)[keyof typeof Gender];

export const GenderSchema = z.enum(["MASCULINO", "FEMENINO", "UNISEX"]);

export const GENDER_LABELS: Record<Gender, string> = {
  MASCULINO: "Masculino",
  FEMENINO: "Femenino",
  UNISEX: "Unisex",
};

// ─────────────────────────────────────────────────────────────────────────────
// WarehouseArea
// ─────────────────────────────────────────────────────────────────────────────

export const WarehouseArea = {
  MEDICAL: "MEDICAL",
  OFFICE: "OFFICE",
} as const;

export type WarehouseArea = (typeof WarehouseArea)[keyof typeof WarehouseArea];

export const WarehouseAreaSchema = z.enum(["MEDICAL", "OFFICE"]);

export const WAREHOUSE_AREA_LABELS: Record<WarehouseArea, string> = {
  MEDICAL: "Sector Medico",
  OFFICE: "Sector Oficina",
};

// ─────────────────────────────────────────────────────────────────────────────
// MovementType
// ─────────────────────────────────────────────────────────────────────────────

export const MovementType = {
  ENTRY: "ENTRY",
  SALE: "SALE",
  DONATION: "DONATION",
  WRITE_OFF: "WRITE_OFF",
  ADJUSTMENT: "ADJUSTMENT",
  DEPARTMENT_DELIVERY: "DEPARTMENT_DELIVERY",
} as const;

export type MovementType = (typeof MovementType)[keyof typeof MovementType];

export const MovementTypeSchema = z.enum([
  "ENTRY",
  "SALE",
  "DONATION",
  "WRITE_OFF",
  "ADJUSTMENT",
  "DEPARTMENT_DELIVERY",
]);

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  ENTRY: "Entrada por Fabricacion",
  SALE: "Venta",
  DONATION: "Dotacion a Becario",
  WRITE_OFF: "Baja por Deterioro",
  ADJUSTMENT: "Ajuste de Inventario",
  DEPARTMENT_DELIVERY: "Entrega a Departamento",
};

// ─────────────────────────────────────────────────────────────────────────────
// MovementStatus
// ─────────────────────────────────────────────────────────────────────────────

export const MovementStatus = {
  DRAFT: "DRAFT",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
} as const;

export type MovementStatus =
  (typeof MovementStatus)[keyof typeof MovementStatus];

export const MovementStatusSchema = z.enum(["DRAFT", "CONFIRMED", "CANCELLED"]);

export const MOVEMENT_STATUS_LABELS: Record<MovementStatus, string> = {
  DRAFT: "Borrador",
  CONFIRMED: "Confirmado",
  CANCELLED: "Cancelado",
};

// ─────────────────────────────────────────────────────────────────────────────
// ManufactureOrderStatus
// ─────────────────────────────────────────────────────────────────────────────

export const ManufactureOrderStatus = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

export type ManufactureOrderStatus =
  (typeof ManufactureOrderStatus)[keyof typeof ManufactureOrderStatus];

export const ManufactureOrderStatusSchema = z.enum([
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);

export const MANUFACTURE_ORDER_STATUS_LABELS: Record<
  ManufactureOrderStatus,
  string
> = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En Progreso",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
};

// ─────────────────────────────────────────────────────────────────────────────
// RecipientType
// ─────────────────────────────────────────────────────────────────────────────

export const RecipientType = {
  STUDENT: "STUDENT",
  STAFF: "STAFF",
  SCHOLAR: "SCHOLAR",
} as const;

export type RecipientType = (typeof RecipientType)[keyof typeof RecipientType];

export const RecipientTypeSchema = z.enum(["STUDENT", "STAFF", "SCHOLAR"]);

export const RECIPIENT_TYPE_LABELS: Record<RecipientType, string> = {
  STUDENT: "Estudiante",
  STAFF: "Personal",
  SCHOLAR: "Becario",
};

// ─────────────────────────────────────────────────────────────────────────────
// Utilidades
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Genera un array de opciones {value, label} a partir de un enum y sus labels.
 * Util para <Select>, <RadioGroup> y otros componentes de formulario.
 *
 * @example
 * const options = enumToOptions(UserRole, USER_ROLE_LABELS);
 * // [{ value: "ADMIN", label: "Administrador" }, ...]
 */
export function enumToOptions<T extends string>(
  enumObj: Record<string, T>,
  labels: Record<T, string>,
): Array<{ value: T; label: string }> {
  return Object.values(enumObj).map((value) => ({
    value,
    label: labels[value],
  }));
}
