// ═══════════════════════════════════════════════════════════════════════════════
// Helper de contexto de auditoria — apps/web
// Extrae IP y user-agent de los headers HTTP para pasarlos al AuditLog.
// Solo puede usarse en Server Components y Server Actions (no en Client Components).
// ═══════════════════════════════════════════════════════════════════════════════

import { headers } from "next/headers";
import type { AuditContext } from "@upds/services";
import { parseForwardedIp } from "@upds/services";

/**
 * Extrae el contexto de auditoria (IP y user-agent) desde los headers HTTP.
 *
 * - ip_address: toma el primer valor de x-forwarded-for (proxy/LB) o x-real-ip.
 * - user_agent: toma el header user-agent estandar.
 * - Ambos retornan null si el header no esta presente, sin lanzar errores.
 *
 * @example
 * // En una Server Action
 * export async function createProductAction(input: unknown) {
 *   const session = await requirePermission("product:create");
 *   const auditCtx = await getAuditContext();
 *   return productService.createProduct(input, session.id, auditCtx);
 * }
 */
export async function getAuditContext(): Promise<AuditContext> {
  const headersList = await headers();

  // x-forwarded-for puede contener multiples IPs separadas por coma:
  // "client, proxy1, proxy2" — tomamos solo la primera (IP original del cliente)
  const ip_address =
    parseForwardedIp(headersList.get("x-forwarded-for")) ??
    headersList.get("x-real-ip") ??
    null;

  const user_agent = headersList.get("user-agent") ?? null;

  return { ip_address, user_agent };
}
