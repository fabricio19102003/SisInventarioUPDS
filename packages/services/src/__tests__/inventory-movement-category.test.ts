// Tests de restricciones de categoría en movimientos de inventario.
// Verifica que SALE/DONATION solo acepten MEDICAL_GARMENT,
// DEPARTMENT_DELIVERY solo acepte OFFICE_SUPPLY, y que
// WRITE_OFF/ADJUSTMENT acepten cualquier categoría.

import { describe, it, expect, beforeEach, vi } from "vitest";
import { InventoryMovementService } from "../inventory-movement";
import {
  createMockPrisma,
  resetMockPrisma,
  type MockPrismaClient,
} from "./helpers/prisma-mock";

// ─────────────────────────────────────────────────────────────────────────────
// Datos de prueba
// ─────────────────────────────────────────────────────────────────────────────

const MOVEMENT_ID = "11111111-1111-1111-1111-111111111111";
const VARIANT_ID = "22222222-2222-2222-2222-222222222222";
const USER_ID = "33333333-3333-3333-3333-333333333333";

const VALID_ITEM_INPUT = {
  movement_id: MOVEMENT_ID,
  product_variant_id: VARIANT_ID,
  quantity: 1,
  unit_price: 10,
};

const VALID_ITEM_INPUT_FREE = {
  movement_id: MOVEMENT_ID,
  product_variant_id: VARIANT_ID,
  quantity: 1,
  unit_price: 0,
};

// Movimiento en estado DRAFT con tipo parametrizable
function makeMockMovement(
  movement_type: string,
  extra: Record<string, unknown> = {},
) {
  return {
    id: MOVEMENT_ID,
    status: "DRAFT",
    movement_type,
    manufacture_order_id: null,
    ...extra,
  };
}

// Variante con categoría parametrizable
function makeMockVariant(category: string, name: string) {
  return {
    id: VARIANT_ID,
    is_active: true,
    current_stock: 50,
    product: {
      id: "prod-1",
      warehouse_area: category === "MEDICAL_GARMENT" ? "MEDICAL" : "OFFICE",
      name,
      sku: "SKU-001",
      category,
    },
  };
}

// Resultado de movimiento actualizado (para las pruebas de éxito)
const MOCK_UPDATED_MOVEMENT = {
  id: MOVEMENT_ID,
  movement_number: "MOV-20260409-0001",
  movement_type: "SALE",
  status: "DRAFT",
  is_donated: false,
  total_amount: 10,
  notes: null,
  cancel_reason: null,
  recipient_id: null,
  department_id: null,
  manufacture_order_id: null,
  processed_by: USER_ID,
  processed_at: null,
  cancelled_at: null,
  created_at: new Date(),
  updated_at: new Date(),
  recipient: null,
  department: null,
  manufacture_order: null,
  processed_by_user: {
    id: USER_ID,
    full_name: "Test User",
    email: "test@test.com",
  },
  items: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

let mockPrisma: MockPrismaClient;
let service: InventoryMovementService;

beforeEach(() => {
  mockPrisma = createMockPrisma();
  resetMockPrisma(mockPrisma);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  service = new InventoryMovementService(mockPrisma as any);
});

// Helper para configurar mocks de éxito (incluyendo $transaction)
function setupSuccessMocks(
  movement_type: string,
  category: string,
  productName: string,
) {
  mockPrisma.inventoryMovement.findUnique.mockResolvedValue(
    makeMockMovement(movement_type) as never,
  );
  mockPrisma.productVariant.findUnique.mockResolvedValue(
    makeMockVariant(category, productName) as never,
  );

  // Mock $transaction para ejecutar el callback internamente
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (mockPrisma.$transaction as any).mockImplementation(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (fn: (tx: any) => Promise<unknown>) => {
      const txMock = {
        movementItem: {
          create: vi.fn().mockResolvedValue({}),
          findMany: vi.fn().mockResolvedValue([{ subtotal: 10 }]),
        },
        inventoryMovement: {
          update: vi.fn().mockResolvedValue(MOCK_UPDATED_MOVEMENT),
        },
        auditLog: {
          create: vi.fn().mockResolvedValue({}),
        },
      };
      return fn(txMock);
    },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS — SALE
// ─────────────────────────────────────────────────────────────────────────────

describe("SALE movement category restrictions", () => {
  it("T1: SALE + MEDICAL_GARMENT variant → allowed (happy path)", async () => {
    setupSuccessMocks("SALE", "MEDICAL_GARMENT", "Pijama Quirurgico");

    const result = await service.addItem(
      { ...VALID_ITEM_INPUT, unit_price: 10 },
      USER_ID,
    );

    expect(result.success).toBe(true);
  });

  it("T2: SALE + OFFICE_SUPPLY variant → rejected with clear error", async () => {
    mockPrisma.inventoryMovement.findUnique.mockResolvedValue(
      makeMockMovement("SALE") as never,
    );
    mockPrisma.productVariant.findUnique.mockResolvedValue(
      makeMockVariant("OFFICE_SUPPLY", "Resma A4") as never,
    );

    const result = await service.addItem(
      { ...VALID_ITEM_INPUT, unit_price: 10 },
      USER_ID,
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("indumentaria medica");
      expect(result.error).toContain("Resma A4");
      expect(result.error).toContain("material de oficina");
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTS — DONATION
// ─────────────────────────────────────────────────────────────────────────────

describe("DONATION movement category restrictions", () => {
  it("T3: DONATION + MEDICAL_GARMENT variant → allowed", async () => {
    setupSuccessMocks("DONATION", "MEDICAL_GARMENT", "Bata Medica");

    const result = await service.addItem(VALID_ITEM_INPUT_FREE, USER_ID);

    expect(result.success).toBe(true);
  });

  it("T4: DONATION + OFFICE_SUPPLY variant → rejected with clear error", async () => {
    mockPrisma.inventoryMovement.findUnique.mockResolvedValue(
      makeMockMovement("DONATION") as never,
    );
    mockPrisma.productVariant.findUnique.mockResolvedValue(
      makeMockVariant("OFFICE_SUPPLY", "Lapicera BIC") as never,
    );

    const result = await service.addItem(VALID_ITEM_INPUT_FREE, USER_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("indumentaria medica");
      expect(result.error).toContain("Lapicera BIC");
      expect(result.error).toContain("material de oficina");
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTS — DEPARTMENT_DELIVERY
// ─────────────────────────────────────────────────────────────────────────────

describe("DEPARTMENT_DELIVERY movement category restrictions", () => {
  it("T5: DEPARTMENT_DELIVERY + OFFICE_SUPPLY variant → allowed", async () => {
    setupSuccessMocks("DEPARTMENT_DELIVERY", "OFFICE_SUPPLY", "Resma A4");

    const result = await service.addItem(VALID_ITEM_INPUT_FREE, USER_ID);

    expect(result.success).toBe(true);
  });

  it("T6: DEPARTMENT_DELIVERY + MEDICAL_GARMENT variant → rejected with clear error", async () => {
    mockPrisma.inventoryMovement.findUnique.mockResolvedValue(
      makeMockMovement("DEPARTMENT_DELIVERY") as never,
    );
    mockPrisma.productVariant.findUnique.mockResolvedValue(
      makeMockVariant("MEDICAL_GARMENT", "Mandil Quirurgico") as never,
    );

    const result = await service.addItem(VALID_ITEM_INPUT_FREE, USER_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("materiales de oficina");
      expect(result.error).toContain("Mandil Quirurgico");
      expect(result.error).toContain("indumentaria medica");
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTS — WRITE_OFF (sin restricción de categoría)
// ─────────────────────────────────────────────────────────────────────────────

describe("WRITE_OFF movement — no category restriction", () => {
  it("T7a: WRITE_OFF + MEDICAL_GARMENT variant → allowed", async () => {
    setupSuccessMocks("WRITE_OFF", "MEDICAL_GARMENT", "Pijama Quirurgico");

    const result = await service.addItem(VALID_ITEM_INPUT_FREE, USER_ID);

    expect(result.success).toBe(true);
  });

  it("T7b: WRITE_OFF + OFFICE_SUPPLY variant → allowed", async () => {
    setupSuccessMocks("WRITE_OFF", "OFFICE_SUPPLY", "Resma A4");

    const result = await service.addItem(VALID_ITEM_INPUT_FREE, USER_ID);

    expect(result.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTS — ADJUSTMENT (sin restricción de categoría)
// ─────────────────────────────────────────────────────────────────────────────

describe("ADJUSTMENT movement — no category restriction", () => {
  it("T8a: ADJUSTMENT + MEDICAL_GARMENT variant → allowed", async () => {
    setupSuccessMocks("ADJUSTMENT", "MEDICAL_GARMENT", "Gorro Quirurgico");

    // ADJUSTMENT permite qty negativa; 0 no es válido. Usamos -1.
    const result = await service.addItem(
      { ...VALID_ITEM_INPUT_FREE, quantity: -1 },
      USER_ID,
    );

    expect(result.success).toBe(true);
  });

  it("T8b: ADJUSTMENT + OFFICE_SUPPLY variant → allowed", async () => {
    setupSuccessMocks("ADJUSTMENT", "OFFICE_SUPPLY", "Boligrafo Azul");

    const result = await service.addItem(
      { ...VALID_ITEM_INPUT_FREE, quantity: 5 },
      USER_ID,
    );

    expect(result.success).toBe(true);
  });
});
