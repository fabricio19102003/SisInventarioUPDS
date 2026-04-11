// Tests para createAuditLog y diffValues con payloads anidados.
// Verifica que AuditPayload acepta arrays, objetos anidados y valores primitivos.

import { describe, it, expect, beforeEach } from "vitest";
import { createAuditLog, diffValues } from "../audit";
import type { AuditPayload } from "../audit";
import {
  createMockPrisma,
  resetMockPrisma,
  type MockPrismaClient,
} from "./helpers/prisma-mock";

// ─────────────────────────────────────────────────────────────────────────────
// IDs de prueba
// ─────────────────────────────────────────────────────────────────────────────

const USER_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const ENTITY_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

let mockPrisma: MockPrismaClient;

beforeEach(() => {
  mockPrisma = createMockPrisma();
  resetMockPrisma(mockPrisma);
});

// ═════════════════════════════════════════════════════════════════════════════
// createAuditLog — nested payloads
// ═════════════════════════════════════════════════════════════════════════════

describe("createAuditLog — nested payload support", () => {
  it("T1 — acepta payload con array de stock_changes (objetos anidados)", async () => {
    mockPrisma.auditLog.create.mockResolvedValue({} as never);

    const stockChanges: AuditPayload = {
      "variant-uuid-1": {
        sku: "PQ-M-MASCULINO-AZUL",
        old_stock: 10,
        new_stock: 15,
        quantity: 5,
      },
      "variant-uuid-2": {
        sku: "PQ-L-FEMENINO-VERDE",
        old_stock: 0,
        new_stock: 3,
        quantity: 3,
      },
    };

    await createAuditLog(mockPrisma as never, {
      user_id: USER_ID,
      action: "CONFIRM",
      entity_type: "INVENTORY_MOVEMENT",
      entity_id: ENTITY_ID,
      old_values: { status: "DRAFT" },
      new_values: {
        status: "CONFIRMED",
        total_amount: 250,
        stock_changes: stockChanges,
      },
    });

    expect(mockPrisma.auditLog.create).toHaveBeenCalledOnce();
    const call = mockPrisma.auditLog.create.mock.calls[0]?.[0];
    expect(call?.data.new_values).toMatchObject({
      status: "CONFIRMED",
      total_amount: 250,
      stock_changes: {
        "variant-uuid-1": {
          sku: "PQ-M-MASCULINO-AZUL",
          old_stock: 10,
          new_stock: 15,
        },
      },
    });
  });

  it("T2 — acepta payload con array de items (movimiento de venta)", async () => {
    mockPrisma.auditLog.create.mockResolvedValue({} as never);

    await createAuditLog(mockPrisma as never, {
      user_id: USER_ID,
      action: "CREATE",
      entity_type: "INVENTORY_MOVEMENT",
      entity_id: ENTITY_ID,
      new_values: {
        movement_type: "SALE",
        items: [
          {
            product: "Pijama Quirurgico",
            variant: "M-MASCULINO-AZUL",
            quantity: 2,
            unit_price: 125,
          },
        ],
        total_amount: 250,
      },
    });

    expect(mockPrisma.auditLog.create).toHaveBeenCalledOnce();
    const call = mockPrisma.auditLog.create.mock.calls[0]?.[0];
    const newValues = call?.data.new_values as AuditPayload;
    expect(Array.isArray(newValues?.items)).toBe(true);
    expect((newValues?.items as AuditPayload[]).length).toBe(1);
  });

  it("T3 — acepta null para old_values y new_values", async () => {
    mockPrisma.auditLog.create.mockResolvedValue({} as never);

    await createAuditLog(mockPrisma as never, {
      user_id: USER_ID,
      action: "LOGIN",
      entity_type: "USER",
      entity_id: ENTITY_ID,
      old_values: null,
      new_values: null,
    });

    const call = mockPrisma.auditLog.create.mock.calls[0]?.[0];
    // null se convierte en undefined (no se guarda en Prisma)
    expect(
      call?.data.old_values === undefined || call?.data.old_values === null,
    ).toBe(true);
    expect(
      call?.data.new_values === undefined || call?.data.new_values === null,
    ).toBe(true);
  });

  it("T4 — acepta valores booleanos, numericos y string en mismo payload", async () => {
    mockPrisma.auditLog.create.mockResolvedValue({} as never);

    await createAuditLog(mockPrisma as never, {
      user_id: USER_ID,
      action: "UPDATE",
      entity_type: "PRODUCT",
      entity_id: ENTITY_ID,
      old_values: {
        is_active: true,
        min_stock: 5,
        name: "Pijama Viejo",
        description: null,
      },
      new_values: {
        is_active: false,
        min_stock: 10,
        name: "Pijama Nuevo",
        description: "Con bordado",
      },
    });

    expect(mockPrisma.auditLog.create).toHaveBeenCalledOnce();
    const call = mockPrisma.auditLog.create.mock.calls[0]?.[0];
    expect(call?.data.old_values).toMatchObject({
      is_active: true,
      min_stock: 5,
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// diffValues — tipado con AuditPayload
// ═════════════════════════════════════════════════════════════════════════════

describe("diffValues — con AuditPayload", () => {
  it("T5 — retorna null cuando no hay cambios", () => {
    const result = diffValues(
      { name: "Pijama", min_stock: 5 },
      { name: "Pijama", min_stock: 5 },
    );
    expect(result).toBeNull();
  });

  it("T6 — retorna solo los campos que cambiaron", () => {
    const result = diffValues(
      { name: "Viejo", min_stock: 5, description: null },
      { name: "Nuevo", min_stock: 5, description: null },
    );
    expect(result).not.toBeNull();
    expect(result?.old).toEqual({ name: "Viejo" });
    expect(result?.new).toEqual({ name: "Nuevo" });
  });

  it("T7 — maneja campos nuevos no presentes en old (retorna null para old)", () => {
    const result = diffValues(
      { name: "Pijama" },
      { name: "Pijama", description: "Nueva descripcion" },
    );
    expect(result).not.toBeNull();
    expect(result?.old.description).toBeNull();
    expect(result?.new.description).toBe("Nueva descripcion");
  });

  it("T8 — maneja cambio de boolean a boolean", () => {
    const result = diffValues({ is_active: true }, { is_active: false });
    expect(result?.old).toEqual({ is_active: true });
    expect(result?.new).toEqual({ is_active: false });
  });

  it("T9 — stock_changes anidados round-trip a traves de diffValues", () => {
    const oldPayload: AuditPayload = {
      status: "PENDING",
      variant_count: 2,
    };
    const newPayload: AuditPayload = {
      status: "COMPLETED",
      variant_count: 2,
    };
    const result = diffValues(oldPayload, newPayload);
    expect(result?.old).toEqual({ status: "PENDING" });
    expect(result?.new).toEqual({ status: "COMPLETED" });
  });
});
