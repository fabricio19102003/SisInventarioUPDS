// Tests de restricciones de categoría en órdenes de fabricación.
// Verifica que addItem solo acepte variantes de productos MEDICAL_GARMENT
// y rechace productos de categoría OFFICE_SUPPLY.

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ManufactureOrderService } from "../manufacture-order";
import {
  createMockPrisma,
  resetMockPrisma,
  type MockPrismaClient,
} from "./helpers/prisma-mock";

// ─────────────────────────────────────────────────────────────────────────────
// Datos de prueba
// ─────────────────────────────────────────────────────────────────────────────

const ORDER_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const VARIANT_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const USER_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc";

const VALID_ADD_ITEM_INPUT = {
  manufacture_order_id: ORDER_ID,
  product_variant_id: VARIANT_ID,
  quantity_ordered: 10,
  unit_cost: 50,
};

// Orden en estado PENDING (único estado que acepta addItem)
const MOCK_PENDING_ORDER = {
  id: ORDER_ID,
  status: "PENDING",
  order_number: "ORD-20260409-0001",
};

// Variante con categoría parametrizable
function makeMockVariant(category: string, productName: string) {
  return {
    id: VARIANT_ID,
    is_active: true,
    product: {
      category,
      name: productName,
    },
  };
}

// Orden actualizada que retorna la transacción exitosa
const MOCK_UPDATED_ORDER = {
  id: ORDER_ID,
  order_number: "ORD-20260409-0001",
  manufacturer_id: "mfr-1",
  status: "PENDING",
  notes: null,
  cancel_reason: null,
  ordered_at: new Date(),
  expected_at: null,
  completed_at: null,
  cancelled_at: null,
  created_at: new Date(),
  updated_at: new Date(),
  manufacturer: {
    id: "mfr-1",
    name: "Taller Central",
    contact_name: null,
  },
  items: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

let mockPrisma: MockPrismaClient;
let service: ManufactureOrderService;

beforeEach(() => {
  mockPrisma = createMockPrisma();
  resetMockPrisma(mockPrisma);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  service = new ManufactureOrderService(mockPrisma as any);
});

// Helper para configurar los mocks del camino exitoso
function setupSuccessMocks(category: string, productName: string) {
  mockPrisma.manufactureOrder.findUnique.mockResolvedValue(
    MOCK_PENDING_ORDER as never,
  );
  mockPrisma.productVariant.findUnique.mockResolvedValue(
    makeMockVariant(category, productName) as never,
  );
  // No hay item duplicado
  mockPrisma.manufactureOrderItem.findUnique.mockResolvedValue(null as never);

  // Mock $transaction para ejecutar el callback internamente
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (mockPrisma.$transaction as any).mockImplementation(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (fn: (tx: any) => Promise<unknown>, _opts?: unknown) => {
      const txMock = {
        manufactureOrderItem: {
          create: vi.fn().mockResolvedValue({}),
        },
        manufactureOrder: {
          findUniqueOrThrow: vi.fn().mockResolvedValue(MOCK_UPDATED_ORDER),
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
// TESTS — addItem con MEDICAL_GARMENT (debe permitirse)
// ─────────────────────────────────────────────────────────────────────────────

describe("ManufactureOrderService.addItem — category restriction", () => {
  it("T1: addItem + MEDICAL_GARMENT variant → allowed (happy path)", async () => {
    setupSuccessMocks("MEDICAL_GARMENT", "Pijama Quirurgico");

    const result = await service.addItem(VALID_ADD_ITEM_INPUT, USER_ID);

    expect(result.success).toBe(true);
  });

  it("T2: addItem + OFFICE_SUPPLY variant → rejected with clear error message", async () => {
    mockPrisma.manufactureOrder.findUnique.mockResolvedValue(
      MOCK_PENDING_ORDER as never,
    );
    mockPrisma.productVariant.findUnique.mockResolvedValue(
      makeMockVariant("OFFICE_SUPPLY", "Resma A4") as never,
    );

    const result = await service.addItem(VALID_ADD_ITEM_INPUT, USER_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("indumentaria medica");
      expect(result.error).toContain("Resma A4");
      expect(result.error).toContain("material de oficina");
    }
  });

  it("T3: addItem + MEDICAL_GARMENT variant (bata) → allowed", async () => {
    setupSuccessMocks("MEDICAL_GARMENT", "Bata Quirurgica");

    const result = await service.addItem(
      { ...VALID_ADD_ITEM_INPUT, quantity_ordered: 5, unit_cost: 120 },
      USER_ID,
    );

    expect(result.success).toBe(true);
  });

  it("T4: addItem + OFFICE_SUPPLY variant (lapicera) → rejected with product name in error", async () => {
    mockPrisma.manufactureOrder.findUnique.mockResolvedValue(
      MOCK_PENDING_ORDER as never,
    );
    mockPrisma.productVariant.findUnique.mockResolvedValue(
      makeMockVariant("OFFICE_SUPPLY", "Lapicera BIC") as never,
    );

    const result = await service.addItem(VALID_ADD_ITEM_INPUT, USER_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Solo se pueden fabricar");
      expect(result.error).toContain("Lapicera BIC");
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTS — Validaciones previas a la restricción de categoría
// (verifican que el orden de validaciones es correcto)
// ─────────────────────────────────────────────────────────────────────────────

describe("ManufactureOrderService.addItem — pre-category validations", () => {
  it("T5: order not found → returns error before category check", async () => {
    mockPrisma.manufactureOrder.findUnique.mockResolvedValue(null as never);

    const result = await service.addItem(VALID_ADD_ITEM_INPUT, USER_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Orden de fabricacion no encontrada");
    }
  });

  it("T6: order in non-PENDING status → rejected before category check", async () => {
    mockPrisma.manufactureOrder.findUnique.mockResolvedValue({
      ...MOCK_PENDING_ORDER,
      status: "IN_PROGRESS",
    } as never);

    const result = await service.addItem(VALID_ADD_ITEM_INPUT, USER_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("PENDIENTE");
    }
  });

  it("T7: variant not found → returns error", async () => {
    mockPrisma.manufactureOrder.findUnique.mockResolvedValue(
      MOCK_PENDING_ORDER as never,
    );
    mockPrisma.productVariant.findUnique.mockResolvedValue(null as never);

    const result = await service.addItem(VALID_ADD_ITEM_INPUT, USER_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Variante de producto no encontrada");
    }
  });

  it("T8: inactive variant → rejected before category check", async () => {
    mockPrisma.manufactureOrder.findUnique.mockResolvedValue(
      MOCK_PENDING_ORDER as never,
    );
    mockPrisma.productVariant.findUnique.mockResolvedValue({
      id: VARIANT_ID,
      is_active: false,
      product: { category: "MEDICAL_GARMENT", name: "Pijama" },
    } as never);

    const result = await service.addItem(VALID_ADD_ITEM_INPUT, USER_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("desactivada");
    }
  });
});
