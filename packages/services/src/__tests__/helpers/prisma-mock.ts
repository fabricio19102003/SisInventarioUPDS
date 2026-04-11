// Helper para crear un mock tipado de PrismaClient para tests unitarios.
// Usa vitest-mock-extended para generar automáticamente mocks de todos los
// métodos del cliente sin necesidad de una base de datos real.

import { mockDeep, mockReset, type DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@upds/db";

export type MockPrismaClient = DeepMockProxy<PrismaClient>;

/**
 * Crea una instancia mock profunda del PrismaClient con todos sus métodos
 * mockeados automáticamente por vitest-mock-extended.
 *
 * Uso en tests:
 * ```ts
 * import { createMockPrisma } from "./__tests__/helpers/prisma-mock";
 *
 * const mockPrisma = createMockPrisma();
 * mockPrisma.productVariant.findUnique.mockResolvedValue({ ... });
 * ```
 */
export function createMockPrisma(): MockPrismaClient {
  return mockDeep<PrismaClient>();
}

/**
 * Reinicia todos los mocks de un MockPrismaClient entre tests.
 * Útil en `beforeEach` para evitar contaminación entre casos.
 */
export function resetMockPrisma(mock: MockPrismaClient): void {
  mockReset(mock);
}
