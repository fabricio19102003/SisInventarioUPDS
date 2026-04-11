// Tests para confirmMovement — actualizaciones de stock.
// Cubre incremento/decremento de stock para cada tipo de movimiento,
// stock insuficiente, movimiento ya confirmado/cancelado, y sin items.

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

const MOVEMENT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const VARIANT_ID_1 = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const VARIANT_ID_2 = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const USER_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd";
const ORDER_ID = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";

// Item genérico para un movimiento
function makeMovementItem(
  variantId: string,
  quantity: number,
  unitPrice = 0,
  subtotal?: number,
) {
  return {
    id: `item-${variantId}`,
    product_variant_id: variantId,
    quantity,
    unit_price: unitPrice,
    subtotal: subtotal ?? quantity * unitPrice,
  };
}

// Movimiento base parametrizable
function makeMockMovement(
  type: string,
  items: ReturnType<typeof makeMovementItem>[],
  status = "DRAFT",
  orderId: string | null = null,
) {
  return {
    id: MOVEMENT_ID,
    status,
    movement_type: type,
    manufacture_order_id: orderId,
    items,
  };
}

// Variante de producto con stock parametrizable
function makeMockVariant(
  variantId: string,
  currentStock: number,
  name = "Pijama Quirurgico",
) {
  return {
    id: variantId,
    current_stock: currentStock,
    sku_suffix: "M-MASCULINO",
    product: {
      name,
      sku: "PQ-001",
    },
  };
}

// Movimiento confirmado (respuesta del update)
const MOCK_CONFIRMED_MOVEMENT = {
  id: MOVEMENT_ID,
  movement_number: "MOV-20260409-0001",
  movement_type: "SALE",
  status: "CONFIRMED",
  is_donated: false,
  total_amount: 100,
  notes: null,
  cancel_reason: null,
  recipient_id: null,
  department_id: null,
  manufacture_order_id: null,
  processed_by: USER_ID,
  processed_at: new Date(),
  cancelled_at: null,
  created_at: new Date(),
  updated_at: new Date(),
  recipient: null,
  department: null,
  manufacture_order: null,
  processed_by_user: {
    id: USER_ID,
    full_name: "Test User",
    email: "test@upds.edu.bo",
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

// Helper: setup $transaction para ejecutar el callback con el tx mock
function setupTransaction(txMock: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (mockPrisma.$transaction as any).mockImplementation(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (fn: (tx: any) => Promise<unknown>, _opts?: unknown) => {
      return fn(txMock);
    },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIRM SALE — decrementa stock
// ─────────────────────────────────────────────────────────────────────────────

describe("confirmMovement — SALE: stock decrement", () => {
  it("T1: SALE confirmed → productVariant.update called with decremented stock", async () => {
    const items = [makeMovementItem(VARIANT_ID_1, 3, 50, 150)];
    mockPrisma.inventoryMovement.findUnique.mockResolvedValue(
      makeMockMovement("SALE", items) as never,
    );

    const variantUpdate = vi.fn().mockResolvedValue({});
    const txMock = {
      productVariant: {
        findUniqueOrThrow: vi
          .fn()
          .mockResolvedValue(makeMockVariant(VARIANT_ID_1, 20)),
        update: variantUpdate,
      },
      inventoryMovement: {
        update: vi.fn().mockResolvedValue(MOCK_CONFIRMED_MOVEMENT),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({}),
      },
    };
    setupTransaction(txMock);

    const result = await service.confirmMovement(
      { movement_id: MOVEMENT_ID },
      USER_ID,
    );

    expect(result.success).toBe(true);
    // Stock decremented: 20 - 3 = 17
    expect(variantUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: VARIANT_ID_1 },
        data: { current_stock: 17 },
      }),
    );
  });

  it("T2: SALE with insufficient stock → throws error with stock details, NO stock changes", async () => {
    const items = [makeMovementItem(VARIANT_ID_1, 50, 10, 500)];
    mockPrisma.inventoryMovement.findUnique.mockResolvedValue(
      makeMockMovement("SALE", items) as never,
    );

    const variantUpdate = vi.fn().mockResolvedValue({});
    const txMock = {
      productVariant: {
        // Only 5 in stock, but trying to sell 50
        findUniqueOrThrow: vi
          .fn()
          .mockResolvedValue(makeMockVariant(VARIANT_ID_1, 5)),
        update: variantUpdate,
      },
      inventoryMovement: {
        update: vi.fn().mockResolvedValue(MOCK_CONFIRMED_MOVEMENT),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({}),
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockPrisma.$transaction as any).mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (fn: (tx: any) => Promise<unknown>, _opts?: unknown) => {
        return fn(txMock);
      },
    );

    // confirmMovement throws when stock is insufficient (no try/catch in service around runSerializable)
    await expect(
      service.confirmMovement({ movement_id: MOVEMENT_ID }, USER_ID),
    ).rejects.toThrow(/Stock insuficiente|insuficiente/i);

    // The update should NOT have been called because the error is thrown before it
    expect(variantUpdate).not.toHaveBeenCalled();
  });

  it("T2b: SALE with multiple items — one insufficient → throws error with variant info", async () => {
    // Items are sorted by variant_id before processing; VARIANT_ID_1 < VARIANT_ID_2 alphabetically
    const items = [
      makeMovementItem(VARIANT_ID_1, 5, 10, 50), // OK - stock 20
      makeMovementItem(VARIANT_ID_2, 100, 10, 1000), // FAIL - stock 10
    ];
    mockPrisma.inventoryMovement.findUnique.mockResolvedValue(
      makeMockMovement("SALE", items) as never,
    );

    const variantUpdate = vi.fn().mockResolvedValue({});
    const txMock = {
      productVariant: {
        findUniqueOrThrow: vi
          .fn()
          .mockImplementation(
            ({ where: { id } }: { where: { id: string } }) => {
              if (id === VARIANT_ID_1)
                return Promise.resolve(
                  makeMockVariant(VARIANT_ID_1, 20, "Pijama Quirurgico"),
                );
              return Promise.resolve(
                makeMockVariant(VARIANT_ID_2, 10, "Bata Medica"),
              );
            },
          ),
        update: variantUpdate,
      },
      inventoryMovement: {
        update: vi.fn().mockResolvedValue(MOCK_CONFIRMED_MOVEMENT),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({}),
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockPrisma.$transaction as any).mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (fn: (tx: any) => Promise<unknown>, _opts?: unknown) => {
        return fn(txMock);
      },
    );

    // Service throws when stock is insufficient
    await expect(
      service.confirmMovement({ movement_id: MOVEMENT_ID }, USER_ID),
    ).rejects.toThrow(/insuficiente/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CONFIRM ENTRY — incrementa stock
// ─────────────────────────────────────────────────────────────────────────────

describe("confirmMovement — ENTRY: stock increment", () => {
  it("T3: ENTRY confirmed → productVariant.update called with incremented stock", async () => {
    const items = [makeMovementItem(VARIANT_ID_1, 10, 0, 0)];
    mockPrisma.inventoryMovement.findUnique.mockResolvedValue(
      makeMockMovement("ENTRY", items, "DRAFT", ORDER_ID) as never,
    );

    const variantUpdate = vi.fn().mockResolvedValue({});
    const orderItemFindUnique = vi.fn().mockResolvedValue({
      quantity_ordered: 20,
      quantity_received: 0,
    });
    const orderItemUpdate = vi.fn().mockResolvedValue({});
    const orderItemsFindMany = vi
      .fn()
      .mockResolvedValue([{ quantity_ordered: 20, quantity_received: 10 }]);

    const txMock = {
      productVariant: {
        findUniqueOrThrow: vi
          .fn()
          .mockResolvedValue(makeMockVariant(VARIANT_ID_1, 5)),
        update: variantUpdate,
      },
      manufactureOrderItem: {
        findUnique: orderItemFindUnique,
        findMany: orderItemsFindMany,
        update: orderItemUpdate,
      },
      manufactureOrder: {
        update: vi.fn().mockResolvedValue({}),
      },
      inventoryMovement: {
        update: vi.fn().mockResolvedValue({
          ...MOCK_CONFIRMED_MOVEMENT,
          movement_type: "ENTRY",
          manufacture_order_id: ORDER_ID,
        }),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({}),
      },
    };
    setupTransaction(txMock);

    const result = await service.confirmMovement(
      { movement_id: MOVEMENT_ID },
      USER_ID,
    );

    expect(result.success).toBe(true);
    // Stock incremented: 5 + 10 = 15
    expect(variantUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: VARIANT_ID_1 },
        data: { current_stock: 15 },
      }),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CONFIRM DONATION — decrementa stock (misma lógica que SALE)
// ─────────────────────────────────────────────────────────────────────────────

describe("confirmMovement — DONATION: stock decrement", () => {
  it("T4: DONATION confirmed → productVariant.update called with decremented stock", async () => {
    const items = [makeMovementItem(VARIANT_ID_1, 2, 0, 0)];
    mockPrisma.inventoryMovement.findUnique.mockResolvedValue(
      makeMockMovement("DONATION", items) as never,
    );

    const variantUpdate = vi.fn().mockResolvedValue({});
    const txMock = {
      productVariant: {
        findUniqueOrThrow: vi
          .fn()
          .mockResolvedValue(makeMockVariant(VARIANT_ID_1, 15)),
        update: variantUpdate,
      },
      inventoryMovement: {
        update: vi.fn().mockResolvedValue({
          ...MOCK_CONFIRMED_MOVEMENT,
          movement_type: "DONATION",
          is_donated: true,
        }),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({}),
      },
    };
    setupTransaction(txMock);

    const result = await service.confirmMovement(
      { movement_id: MOVEMENT_ID },
      USER_ID,
    );

    expect(result.success).toBe(true);
    // Stock decremented: 15 - 2 = 13
    expect(variantUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: VARIANT_ID_1 },
        data: { current_stock: 13 },
      }),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CONFIRM WRITE_OFF — decrementa stock
// ─────────────────────────────────────────────────────────────────────────────

describe("confirmMovement — WRITE_OFF: stock decrement", () => {
  it("T5: WRITE_OFF confirmed → stock decremented", async () => {
    const items = [makeMovementItem(VARIANT_ID_1, 4, 0, 0)];
    mockPrisma.inventoryMovement.findUnique.mockResolvedValue(
      makeMockMovement("WRITE_OFF", items) as never,
    );

    const variantUpdate = vi.fn().mockResolvedValue({});
    const txMock = {
      productVariant: {
        findUniqueOrThrow: vi
          .fn()
          .mockResolvedValue(makeMockVariant(VARIANT_ID_1, 10)),
        update: variantUpdate,
      },
      inventoryMovement: {
        update: vi.fn().mockResolvedValue({
          ...MOCK_CONFIRMED_MOVEMENT,
          movement_type: "WRITE_OFF",
        }),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({}),
      },
    };
    setupTransaction(txMock);

    const result = await service.confirmMovement(
      { movement_id: MOVEMENT_ID },
      USER_ID,
    );

    expect(result.success).toBe(true);
    // Stock decremented: 10 - 4 = 6
    expect(variantUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: VARIANT_ID_1 },
        data: { current_stock: 6 },
      }),
    );
  });

  it("T5b: WRITE_OFF with insufficient stock → throws error", async () => {
    const items = [makeMovementItem(VARIANT_ID_1, 20, 0, 0)];
    mockPrisma.inventoryMovement.findUnique.mockResolvedValue(
      makeMockMovement("WRITE_OFF", items) as never,
    );

    const variantUpdate = vi.fn().mockResolvedValue({});
    const txMock = {
      productVariant: {
        findUniqueOrThrow: vi
          .fn()
          .mockResolvedValue(makeMockVariant(VARIANT_ID_1, 3)),
        update: variantUpdate,
      },
      inventoryMovement: {
        update: vi.fn().mockResolvedValue({}),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({}),
      },
    };
    setupTransaction(txMock);

    // Service throws (no try/catch around runSerializable)
    await expect(
      service.confirmMovement({ movement_id: MOVEMENT_ID }, USER_ID),
    ).rejects.toThrow(/insuficiente/i);

    expect(variantUpdate).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CONFIRM ADJUSTMENT — incrementa (positivo) o decrementa (negativo)
// ─────────────────────────────────────────────────────────────────────────────

describe("confirmMovement — ADJUSTMENT: positive and negative quantity", () => {
  it("T6: ADJUSTMENT positive quantity → stock incremented", async () => {
    const items = [makeMovementItem(VARIANT_ID_1, 10, 0, 0)];
    mockPrisma.inventoryMovement.findUnique.mockResolvedValue(
      makeMockMovement("ADJUSTMENT", items) as never,
    );

    const variantUpdate = vi.fn().mockResolvedValue({});
    const txMock = {
      productVariant: {
        findUniqueOrThrow: vi
          .fn()
          .mockResolvedValue(makeMockVariant(VARIANT_ID_1, 8)),
        update: variantUpdate,
      },
      inventoryMovement: {
        update: vi.fn().mockResolvedValue({
          ...MOCK_CONFIRMED_MOVEMENT,
          movement_type: "ADJUSTMENT",
        }),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({}),
      },
    };
    setupTransaction(txMock);

    const result = await service.confirmMovement(
      { movement_id: MOVEMENT_ID },
      USER_ID,
    );

    expect(result.success).toBe(true);
    // Stock incremented: 8 + 10 = 18
    expect(variantUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: VARIANT_ID_1 },
        data: { current_stock: 18 },
      }),
    );
  });

  it("T7: ADJUSTMENT negative quantity → stock decremented", async () => {
    const items = [makeMovementItem(VARIANT_ID_1, -3, 0, 0)];
    mockPrisma.inventoryMovement.findUnique.mockResolvedValue(
      makeMockMovement("ADJUSTMENT", items) as never,
    );

    const variantUpdate = vi.fn().mockResolvedValue({});
    const txMock = {
      productVariant: {
        findUniqueOrThrow: vi
          .fn()
          .mockResolvedValue(makeMockVariant(VARIANT_ID_1, 10)),
        update: variantUpdate,
      },
      inventoryMovement: {
        update: vi.fn().mockResolvedValue({
          ...MOCK_CONFIRMED_MOVEMENT,
          movement_type: "ADJUSTMENT",
        }),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({}),
      },
    };
    setupTransaction(txMock);

    const result = await service.confirmMovement(
      { movement_id: MOVEMENT_ID },
      USER_ID,
    );

    expect(result.success).toBe(true);
    // Stock decremented: 10 + (-3) = 7
    expect(variantUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: VARIANT_ID_1 },
        data: { current_stock: 7 },
      }),
    );
  });

  it("T7b: ADJUSTMENT negative that would go below zero → throws error", async () => {
    const items = [makeMovementItem(VARIANT_ID_1, -15, 0, 0)];
    mockPrisma.inventoryMovement.findUnique.mockResolvedValue(
      makeMockMovement("ADJUSTMENT", items) as never,
    );

    const variantUpdate = vi.fn().mockResolvedValue({});
    const txMock = {
      productVariant: {
        findUniqueOrThrow: vi
          .fn()
          .mockResolvedValue(makeMockVariant(VARIANT_ID_1, 5)),
        update: variantUpdate,
      },
      inventoryMovement: {
        update: vi.fn().mockResolvedValue({}),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({}),
      },
    };
    setupTransaction(txMock);

    // Service throws (no try/catch around runSerializable)
    await expect(
      service.confirmMovement({ movement_id: MOVEMENT_ID }, USER_ID),
    ).rejects.toThrow(/insuficiente|ajuste/i);

    expect(variantUpdate).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Status guard — ya CONFIRMED o CANCELLED
// ─────────────────────────────────────────────────────────────────────────────

describe("confirmMovement — status guard", () => {
  it("T8: confirm already CONFIRMED movement → error", async () => {
    mockPrisma.inventoryMovement.findUnique.mockResolvedValue(
      makeMockMovement(
        "SALE",
        [makeMovementItem(VARIANT_ID_1, 1, 10, 10)],
        "CONFIRMED",
      ) as never,
    );

    const result = await service.confirmMovement(
      { movement_id: MOVEMENT_ID },
      USER_ID,
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/DRAFT|borrador|confirmar/i);
    }
  });

  it("T9: confirm CANCELLED movement → error", async () => {
    mockPrisma.inventoryMovement.findUnique.mockResolvedValue(
      makeMockMovement(
        "SALE",
        [makeMovementItem(VARIANT_ID_1, 1, 10, 10)],
        "CANCELLED",
      ) as never,
    );

    const result = await service.confirmMovement(
      { movement_id: MOVEMENT_ID },
      USER_ID,
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/DRAFT|borrador|confirmar/i);
    }
  });

  it("T8b: confirm non-existent movement → not found error", async () => {
    mockPrisma.inventoryMovement.findUnique.mockResolvedValue(null as never);

    const result = await service.confirmMovement(
      { movement_id: MOVEMENT_ID },
      USER_ID,
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/no encontrado/i);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Sin items
// ─────────────────────────────────────────────────────────────────────────────

describe("confirmMovement — no items guard", () => {
  it("T10: confirm movement with no items → error", async () => {
    mockPrisma.inventoryMovement.findUnique.mockResolvedValue(
      makeMockMovement("SALE", [], "DRAFT") as never,
    );

    const result = await service.confirmMovement(
      { movement_id: MOVEMENT_ID },
      USER_ID,
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/sin items|sin item|items/i);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Validación de input
// ─────────────────────────────────────────────────────────────────────────────

describe("confirmMovement — input validation", () => {
  it("invalid movement_id (not UUID) → fails validation before DB call", async () => {
    const result = await service.confirmMovement(
      { movement_id: "not-a-uuid" },
      USER_ID,
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/invalido|invalid/i);
    }
    // Should not call DB
    expect(mockPrisma.inventoryMovement.findUnique).not.toHaveBeenCalled();
  });

  it("missing movement_id → fails validation", async () => {
    const result = await service.confirmMovement({}, USER_ID);

    expect(result.success).toBe(false);
  });
});
