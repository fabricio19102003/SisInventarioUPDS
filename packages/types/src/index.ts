// @upds/types — Tipos TypeScript compartidos del sistema de inventario
// Tipos utilitarios y de dominio reutilizables entre packages.

// ─────────────────────────────────────────────────────────────────────────────
// Paginacion
// ─────────────────────────────────────────────────────────────────────────────

/** Resultado paginado generico. */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

/** Parametros de paginacion estandar. */
export interface PaginationParams {
  page?: number;
  per_page?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Resultado de operaciones de servicio
// ─────────────────────────────────────────────────────────────────────────────

/** Resultado estandar de todas las operaciones de servicio. */
export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─────────────────────────────────────────────────────────────────────────────
// Auditoria
// ─────────────────────────────────────────────────────────────────────────────

/** Contexto de auditoria: IP y user agent del request. */
export interface AuditContext {
  ip_address?: string | null;
  user_agent?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilitarios
// ─────────────────────────────────────────────────────────────────────────────

/** Hace todos los campos de T opcionales excepto los listados en K. */
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

/** Convierte un tipo a su version con id obligatorio (para updates). */
export type WithId<T> = T & { id: string };

/** Extrae el tipo del dato exitoso de un ServiceResult. */
export type ServiceData<T extends ServiceResult<unknown>> =
  T extends ServiceResult<infer U> ? U : never;
