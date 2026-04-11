// ═══════════════════════════════════════════════════════════════════════════════
// @upds/services — Helper de Auditoria
// Toda accion de escritura debe generar una entrada inmutable en AuditLog.
// Este modulo centraliza la creacion de logs para uso en todos los services.
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

import type { PrismaClient, TransactionClient, Prisma } from "@upds/db";

/**
 * Tipo recursivo que representa cualquier valor JSON valido.
 * Compatible con el tipo Json de Prisma (Prisma.InputJsonValue).
 *
 * Soporta payloads anidados como:
 * - Stock changes: { variant_id, old_stock, new_stock }[]
 * - Items arrays: { product, variant, quantity, unit_price }[]
 * - Metadatos de objetos: { sku, name, category, ... }
 */
export type AuditValue =
  | string
  | number
  | boolean
  | null
  | AuditValue[]
  | { [key: string]: AuditValue };

/**
 * Payload de auditoria tipado: mapa de clave → valor JSON arbitrario.
 * Reemplaza Record<string, string | number | boolean | null> que no admitia
 * arrays ni objetos anidados.
 */
export type AuditPayload = { [key: string]: AuditValue };

/** Alias del tipo de entrada JSON de Prisma para uso interno. */
type PrismaInputJson = Prisma.InputJsonValue;

/** Acepta tanto PrismaClient como TransactionClient (dentro de $transaction). */
export type DbClient = PrismaClient | TransactionClient;

/** Acciones registrables en el audit log. */
export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "CONFIRM"
  | "CANCEL"
  | "LOGIN"
  | "LOGIN_FAILED"
  | "PASSWORD_CHANGE"
  | "PASSWORD_RESET";

/** Entidades del sistema que pueden auditarse. */
export type AuditEntityType =
  | "USER"
  | "PRODUCT"
  | "PRODUCT_VARIANT"
  | "MANUFACTURER"
  | "MANUFACTURE_ORDER"
  | "INVENTORY_MOVEMENT"
  | "RECIPIENT"
  | "DEPARTMENT";

/** Parametros para crear una entrada de auditoria. */
export interface CreateAuditLogParams {
  user_id: string;
  action: AuditAction;
  entity_type: AuditEntityType;
  entity_id: string;
  old_values?: AuditPayload | null;
  new_values?: AuditPayload | null;
  ip_address?: string | null;
  user_agent?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Interfaces de lectura
// ─────────────────────────────────────────────────────────────────────────────

export interface AuditLogFilters {
  user_id?: string;
  action?: string;
  entity_type?: string;
  date_from?: Date;
  date_to?: Date;
  page?: number;
  per_page?: number;
}

export interface AuditLogUser {
  id: string;
  full_name: string;
  email: string;
}

export interface AuditLogEntry {
  id: string;
  user_id: string;
  user: AuditLogUser | null;
  action: string;
  entity_type: string;
  entity_id: string;
  old_values: AuditPayload | null;
  new_values: AuditPayload | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface AuditFilterOptions {
  actions: string[];
  entity_types: string[];
}

/** Ventana maxima de busqueda en dias para audit logs (90 dias). */
const MAX_AUDIT_DATE_RANGE_DAYS = 90;

/** Ventana por defecto cuando no se proveen fechas (30 dias hacia atras). */
const DEFAULT_AUDIT_DATE_RANGE_DAYS = 30;

// ─────────────────────────────────────────────────────────────────────────────
// Funcion principal
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Crea una entrada inmutable en la tabla audit_logs.
 *
 * Puede usarse de dos formas:
 * 1. Con un PrismaClient directo (operaciones simples)
 * 2. Dentro de una transaccion prisma.$transaction (operaciones compuestas)
 *
 * @example
 * // Uso directo
 * await createAuditLog(prisma, {
 *   user_id: session.user.id,
 *   action: "CREATE",
 *   entity_type: "USER",
 *   entity_id: newUser.id,
 *   new_values: { email: newUser.email, role: newUser.role },
 * });
 *
 * @example
 * // Dentro de transaccion
 * await prisma.$transaction(async (tx) => {
 *   const user = await tx.user.create({ data: {...} });
 *   await createAuditLog(tx, {
 *     user_id: adminId,
 *     action: "CREATE",
 *     entity_type: "USER",
 *     entity_id: user.id,
 *     new_values: { email: user.email },
 *   });
 * });
 */
export async function createAuditLog(
  db: DbClient,
  params: CreateAuditLogParams,
): Promise<void> {
  await db.auditLog.create({
    data: {
      user_id: params.user_id,
      action: params.action,
      entity_type: params.entity_type,
      entity_id: params.entity_id,
      old_values: (params.old_values as PrismaInputJson) ?? undefined,
      new_values: (params.new_values as PrismaInputJson) ?? undefined,
      ip_address: params.ip_address ?? null,
      user_agent: params.user_agent ?? null,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilidades de contexto de auditoria (puras, sin dependencias de framework)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parsea la IP del cliente desde el valor del header x-forwarded-for.
 *
 * El header puede contener una lista separada por coma en formato:
 * "client, proxy1, proxy2" — se toma solo la primera IP (la del cliente real).
 *
 * Retorna null si el valor es nulo, vacio o no contiene ningun segmento valido.
 *
 * @example
 * parseForwardedIp("10.0.0.1, 172.16.0.1")  // => "10.0.0.1"
 * parseForwardedIp("192.168.1.5")             // => "192.168.1.5"
 * parseForwardedIp(null)                       // => null
 * parseForwardedIp("")                         // => null
 */
export function parseForwardedIp(
  forwardedHeader: string | null,
): string | null {
  if (!forwardedHeader) return null;
  const first = forwardedHeader.split(",")[0]?.trim();
  return first ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Funciones de lectura de audit logs
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retorna una pagina de audit logs con filtros opcionales.
 *
 * Reglas:
 * - Si no se proveen fechas, se usa los ultimos 30 dias.
 * - El rango maximo es 90 dias. Si se excede, retorna error.
 * - Resultados ordenados por created_at DESC (mas reciente primero).
 * - Incluye datos del usuario (full_name, email) via relacion.
 *
 * @example
 * const result = await getAuditLogs(prisma, { action: "CONFIRM", page: 1, per_page: 20 });
 */
export async function getAuditLogs(
  db: PrismaClient,
  filters: AuditLogFilters = {},
): Promise<
  | { success: true; data: PaginatedResult<AuditLogEntry> }
  | { success: false; error: string }
> {
  const page = filters.page ?? 1;
  const per_page = filters.per_page ?? 20;

  // Resolver fechas: si no se proveen, usar los ultimos 30 dias
  const now = new Date();
  const date_to = filters.date_to ?? now;
  const date_from =
    filters.date_from ??
    new Date(
      now.getTime() - DEFAULT_AUDIT_DATE_RANGE_DAYS * 24 * 60 * 60 * 1000,
    );

  // Validar rango maximo de 90 dias
  const diffMs = date_to.getTime() - date_from.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays > MAX_AUDIT_DATE_RANGE_DAYS) {
    return {
      success: false,
      error: `El rango de fechas no puede superar los ${MAX_AUDIT_DATE_RANGE_DAYS} dias. Rango actual: ${Math.ceil(diffDays)} dias.`,
    };
  }

  const where = {
    ...(filters.user_id ? { user_id: filters.user_id } : {}),
    ...(filters.action ? { action: filters.action } : {}),
    ...(filters.entity_type ? { entity_type: filters.entity_type } : {}),
    created_at: {
      gte: date_from,
      lte: date_to,
    },
  };

  const [total, records] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * per_page,
      take: per_page,
      include: {
        user: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
      },
    }),
  ]);

  const data: AuditLogEntry[] = records.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    user: r.user
      ? { id: r.user.id, full_name: r.user.full_name, email: r.user.email }
      : null,
    action: r.action,
    entity_type: r.entity_type,
    entity_id: r.entity_id,
    old_values: r.old_values as AuditPayload | null,
    new_values: r.new_values as AuditPayload | null,
    ip_address: r.ip_address,
    user_agent: r.user_agent,
    created_at: r.created_at,
  }));

  const total_pages = Math.ceil(total / per_page);

  return {
    success: true,
    data: {
      data,
      total,
      page,
      per_page,
      total_pages,
    },
  };
}

/**
 * Retorna los valores distintos de action y entity_type presentes en audit_logs.
 * Util para poblar dropdowns de filtro en la UI.
 */
export async function getAuditFilterOptions(
  db: PrismaClient,
): Promise<AuditFilterOptions> {
  const [actionRecords, entityTypeRecords] = await Promise.all([
    db.auditLog.findMany({
      distinct: ["action"],
      select: { action: true },
      orderBy: { action: "asc" },
    }),
    db.auditLog.findMany({
      distinct: ["entity_type"],
      select: { entity_type: true },
      orderBy: { entity_type: "asc" },
    }),
  ]);

  return {
    actions: actionRecords.map((r) => r.action),
    entity_types: entityTypeRecords.map((r) => r.entity_type),
  };
}

/**
 * Extrae los campos que cambiaron entre el estado anterior y el nuevo.
 * Util para registrar solo las diferencias en old_values / new_values.
 *
 * @example
 * const changes = diffValues(
 *   { email: "old@mail.com", full_name: "Juan", role: "VIEWER" },
 *   { email: "new@mail.com", full_name: "Juan", role: "ADMIN" },
 * );
 * // changes = { old: { email: "old@mail.com", role: "VIEWER" }, new: { email: "new@mail.com", role: "ADMIN" } }
 */
export function diffValues(
  oldObj: AuditPayload,
  newObj: AuditPayload,
): { old: AuditPayload; new: AuditPayload } | null {
  const oldDiff: AuditPayload = {};
  const newDiff: AuditPayload = {};

  for (const key of Object.keys(newObj)) {
    if (oldObj[key] !== newObj[key]) {
      oldDiff[key] = Object.prototype.hasOwnProperty.call(oldObj, key)
        ? (oldObj[key] as AuditValue)
        : null;
      newDiff[key] = newObj[key] as AuditValue;
    }
  }

  if (Object.keys(oldDiff).length === 0) return null;

  return { old: oldDiff, new: newDiff };
}
