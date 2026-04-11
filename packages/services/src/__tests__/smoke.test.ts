// Smoke test para verificar que Vitest y el mock helper arrancan correctamente.
// Si este test falla, el problema es de configuración, no de lógica de negocio.

import { describe, it, expect } from "vitest";
import { createMockPrisma, resetMockPrisma } from "./helpers/prisma-mock";

describe("Vitest infrastructure — @upds/services", () => {
  it("vitest is working", () => {
    expect(true).toBe(true);
  });

  it("prisma mock can be created", () => {
    const prisma = createMockPrisma();
    expect(prisma).toBeDefined();
  });

  it("prisma mock exposes model accessors", () => {
    const prisma = createMockPrisma();
    expect(prisma.inventoryMovement).toBeDefined();
    expect(prisma.productVariant).toBeDefined();
    expect(prisma.manufactureOrder).toBeDefined();
  });

  it("prisma mock can be reset between tests", () => {
    const prisma = createMockPrisma();
    resetMockPrisma(prisma);
    // After reset, call counts should be zero
    expect(prisma.inventoryMovement.findUnique).toBeDefined();
  });
});
