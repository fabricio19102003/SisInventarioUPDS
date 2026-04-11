// ═══════════════════════════════════════════════════════════════════════════════
// @upds/validators — Sistema de Permisos
// Principio: DENY por defecto. Solo se permite lo explicitamente listado.
// Formato de permiso: "recurso:accion" (ej: "movement:confirm")
//
// Uso en Server Actions (autorizacion):
//   if (!can(session.user.role, "movement:confirm")) throw new Error("No autorizado");
//
// Uso en UI (visibilidad):
//   {can(user.role, "movement:create") && <NuevoMovimientoButton />}
// ═══════════════════════════════════════════════════════════════════════════════

import type { UserRole } from "./enums";

// ─────────────────────────────────────────────────────────────────────────────
// Definicion de permisos
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lista exhaustiva de permisos del sistema.
 * Cada permiso sigue el patron "recurso:accion".
 */
export const PERMISSIONS = {
  // Productos
  PRODUCT_CREATE: "product:create",
  PRODUCT_EDIT: "product:edit",
  PRODUCT_DEACTIVATE: "product:deactivate",
  PRODUCT_VIEW: "product:view",

  // Stock
  STOCK_VIEW: "stock:view",

  // Movimientos
  MOVEMENT_CREATE: "movement:create",
  MOVEMENT_CONFIRM: "movement:confirm",
  MOVEMENT_CANCEL: "movement:cancel",
  MOVEMENT_VIEW: "movement:view",

  // Donaciones
  DONATION_CREATE: "donation:create",
  DONATION_VIEW: "donation:view",

  // Fabricacion
  MANUFACTURE_ORDER_CREATE: "manufacture_order:create",
  MANUFACTURE_ORDER_RECEIVE: "manufacture_order:receive",
  MANUFACTURE_ORDER_CANCEL: "manufacture_order:cancel",
  MANUFACTURE_ORDER_VIEW: "manufacture_order:view",

  // Catalogos (fabricantes, destinatarios, departamentos)
  CATALOG_CREATE: "catalog:create",
  CATALOG_EDIT: "catalog:edit",
  CATALOG_VIEW: "catalog:view",

  // Reportes
  REPORT_FINANCIAL: "report:financial",
  REPORT_INVENTORY: "report:inventory",
  REPORT_MOVEMENTS: "report:movements",
  REPORT_DONATIONS: "report:donations",
  REPORT_CONSUMPTION: "report:consumption",
  REPORT_WRITE_OFFS: "report:write_offs",
  REPORT_EXPORT: "report:export",

  // Administracion
  USER_MANAGE: "user:manage",
  AUDIT_VIEW: "audit:view",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ─────────────────────────────────────────────────────────────────────────────
// Matriz de roles
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Permisos asignados a cada rol.
 * ADMIN: acceso total.
 * INVENTORY_MANAGER: todo excepto gestion de usuarios y auditoria.
 * VIEWER: solo lectura.
 */
const ROLE_PERMISSIONS: Record<UserRole, ReadonlySet<Permission>> = {
  ADMIN: new Set<Permission>([
    // Productos
    PERMISSIONS.PRODUCT_CREATE,
    PERMISSIONS.PRODUCT_EDIT,
    PERMISSIONS.PRODUCT_DEACTIVATE,
    PERMISSIONS.PRODUCT_VIEW,

    // Stock
    PERMISSIONS.STOCK_VIEW,

    // Movimientos
    PERMISSIONS.MOVEMENT_CREATE,
    PERMISSIONS.MOVEMENT_CONFIRM,
    PERMISSIONS.MOVEMENT_CANCEL,
    PERMISSIONS.MOVEMENT_VIEW,

    // Donaciones
    PERMISSIONS.DONATION_CREATE,
    PERMISSIONS.DONATION_VIEW,

    // Fabricacion
    PERMISSIONS.MANUFACTURE_ORDER_CREATE,
    PERMISSIONS.MANUFACTURE_ORDER_RECEIVE,
    PERMISSIONS.MANUFACTURE_ORDER_CANCEL,
    PERMISSIONS.MANUFACTURE_ORDER_VIEW,

    // Catalogos
    PERMISSIONS.CATALOG_CREATE,
    PERMISSIONS.CATALOG_EDIT,
    PERMISSIONS.CATALOG_VIEW,

    // Reportes
    PERMISSIONS.REPORT_FINANCIAL,
    PERMISSIONS.REPORT_INVENTORY,
    PERMISSIONS.REPORT_MOVEMENTS,
    PERMISSIONS.REPORT_DONATIONS,
    PERMISSIONS.REPORT_CONSUMPTION,
    PERMISSIONS.REPORT_WRITE_OFFS,
    PERMISSIONS.REPORT_EXPORT,

    // Administracion (exclusivo ADMIN)
    PERMISSIONS.USER_MANAGE,
    PERMISSIONS.AUDIT_VIEW,
  ]),

  INVENTORY_MANAGER: new Set<Permission>([
    // Productos
    PERMISSIONS.PRODUCT_CREATE,
    PERMISSIONS.PRODUCT_EDIT,
    PERMISSIONS.PRODUCT_DEACTIVATE,
    PERMISSIONS.PRODUCT_VIEW,

    // Stock
    PERMISSIONS.STOCK_VIEW,

    // Movimientos
    PERMISSIONS.MOVEMENT_CREATE,
    PERMISSIONS.MOVEMENT_CONFIRM,
    PERMISSIONS.MOVEMENT_CANCEL,
    PERMISSIONS.MOVEMENT_VIEW,

    // Donaciones
    PERMISSIONS.DONATION_CREATE,
    PERMISSIONS.DONATION_VIEW,

    // Fabricacion
    PERMISSIONS.MANUFACTURE_ORDER_CREATE,
    PERMISSIONS.MANUFACTURE_ORDER_RECEIVE,
    PERMISSIONS.MANUFACTURE_ORDER_CANCEL,
    PERMISSIONS.MANUFACTURE_ORDER_VIEW,

    // Catalogos
    PERMISSIONS.CATALOG_CREATE,
    PERMISSIONS.CATALOG_EDIT,
    PERMISSIONS.CATALOG_VIEW,

    // Reportes
    PERMISSIONS.REPORT_FINANCIAL,
    PERMISSIONS.REPORT_INVENTORY,
    PERMISSIONS.REPORT_MOVEMENTS,
    PERMISSIONS.REPORT_DONATIONS,
    PERMISSIONS.REPORT_CONSUMPTION,
    PERMISSIONS.REPORT_WRITE_OFFS,
    PERMISSIONS.REPORT_EXPORT,

    // Sin acceso a: USER_MANAGE, AUDIT_VIEW
  ]),

  VIEWER: new Set<Permission>([
    // Solo lectura
    PERMISSIONS.PRODUCT_VIEW,
    PERMISSIONS.STOCK_VIEW,
    PERMISSIONS.MOVEMENT_VIEW,
    PERMISSIONS.DONATION_VIEW,
    PERMISSIONS.MANUFACTURE_ORDER_VIEW,
    PERMISSIONS.CATALOG_VIEW,
    PERMISSIONS.REPORT_INVENTORY,
    PERMISSIONS.REPORT_MOVEMENTS,
    PERMISSIONS.REPORT_DONATIONS,

    // Sin acceso a: crear, editar, confirmar, cancelar, exportar, financieros, consumo, bajas, admin
  ]),
};

// ─────────────────────────────────────────────────────────────────────────────
// Funciones de autorizacion
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifica si un rol tiene un permiso especifico.
 *
 * @example
 * if (!can(session.user.role, "movement:confirm")) {
 *   throw new Error("No autorizado");
 * }
 */
export function can(role: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions.has(permission);
}

/**
 * Verifica si un rol tiene TODOS los permisos indicados.
 *
 * @example
 * if (!canAll(role, ["movement:create", "movement:confirm"])) { ... }
 */
export function canAll(role: UserRole, permissions: Permission[]): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role];
  return permissions.every((p) => rolePermissions.has(p));
}

/**
 * Verifica si un rol tiene AL MENOS UNO de los permisos indicados.
 *
 * @example
 * if (canAny(role, ["report:financial", "report:inventory"])) { ... }
 */
export function canAny(role: UserRole, permissions: Permission[]): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role];
  return permissions.some((p) => rolePermissions.has(p));
}

/**
 * Retorna la lista completa de permisos de un rol.
 * Util para debugging o para mostrar en UI de administracion.
 */
export function getPermissions(role: UserRole): Permission[] {
  return Array.from(ROLE_PERMISSIONS[role]);
}
