// Tests para ManufactureOrderService.receiveItems — flujo de recepción.
// Cubre: recepción parcial, recepción completa (auto-complete), exceso,
// órdenes en estados inválidos, y generación de movimiento ENTRY.

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
const ORDER_ITEM_ID_1 = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const ORDER_ITEM_ID_2 = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const VARIANT_ID_1 = "dddddddd-dddd-dddd-dddd-dddddddddddd";
const VARIANT_ID_2 = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";
const USER_ID = "ffffffff-ffff-ffff-ffff-ffffffffffff";
const MOVEMENT_ID = "11111111-1111-1111-1111-111111111111";
const MANUFACTURER_ID = "22222222-2222-2222-2222-222222222222";

// Orden con items parametrizable
function makeMockOrder(
  status: string,
  items: Array<{
    id: string;
    product_variant_id: string;
    quantity_ordered: number;
    quantity_received: number;
  }>,
) {
  return {
    id: ORDER_ID,
    status,
    order_number: "ORD-20260409-0001",
    items,
  };
}

// Item de orden
function makeOrderItem(
  id: string,
  variantId: string,
  ordered: number,
  received: number,
) {
  return {
    id,
    product_variant_id: variantId,
    quantity_ordered: ordered,
    quantity_received: received,
  };
}

// Orden completa retornada (para findUniqueOrThrow)
function makeFinalOrder(status: string) {
  return {
    id: ORDER_ID,
    order_number: "ORD-20260409-0001",
    manufacturer_id: MANUFACTURER_ID,
    status,
    notes: null,
    cancel_reason: null,
    ordered_at: new Date(),
    expected_at: null,
    completed_at: status === "COMPLETED" ? new Date() : null,
    cancelled_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    manufacturer: {
      id: MANUFACTURER_ID,
      name: "Taller Central",
      contact_name: null,
    },
    items: [],
  };
}

// Movimiento ENTRY creado internamente
const MOCK_CREATED_MOVEMENT = {
  id: MOVEMENT_ID,
  movement_number: "MOV-20260409-0001",
  movement_type: "ENTRY",
  status: "DRAFT",
  is_donated: false,
  total_amount: 0,
  notes: "Recepcion de orden ORD-20260409-0001",
  cancel_reason: null,
  recipient_id: null,
  department_id: null,
  manufacture_order_id: ORDER_ID,
  processed_by: USER_ID,
  processed_at: null,
  cancelled_at: null,
  created_at: new Date(),
  updated_at: new Date(),
  recipient: null,
  department: null,
  manufacture_order: {
    id: ORDER_ID,
    order_number: "ORD-20260409-0001",
    status: "IN_PROGRESS",
  },
  processed_by_user: {
    id: USER_ID,
    full_name: "Test User",
    email: "test@upds.edu.bo",
  },
  items: [],
};

// Movimiento CONFIRMED (retornado por confirmMovement)
const MOCK_CONFIRMED_MOVEMENT = {
  ...MOCK_CREATED_MOVEMENT,
  status: "CONFIRMED",
  processed_at: new Date(),
  movement_number: "MOV-20260409-0001",
};

// Variante médica
function makeMockVariant(variantId: string, stock: number) {
  return {
    id: variantId,
    is_active: true,
    current_stock: stock,
    product: {
      id: "prod-1",
      warehouse_area: "MEDICAL",
      name: "Pijama Quirurgico",
      sku: "PQ-001",
      category: "MEDICAL_GARMENT",
    },
  };
}

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

/**
 * Builds a full transaction mock that handles all internal DB calls from receiveItems.
 * receiveItems internally calls:
 *   1. movementService.createMovement(tx) → needs tx.inventoryMovement.findFirst, tx.inventoryMovement.create, tx.auditLog.create
 *   2. movementService.addItem(tx) → needs tx.inventoryMovement.findUnique, tx.productVariant.findUnique, tx.movementItem.create, tx.movementItem.findMany, tx.inventoryMovement.update, tx.auditLog.create
 *   3. movementService.confirmMovement(tx) → needs tx.inventoryMovement.findUnique (with items), tx.productVariant.findUniqueOrThrow, tx.productVariant.update, tx.manufactureOrderItem.findUnique, tx.manufactureOrderItem.update, tx.manufactureOrderItem.findMany, tx.manufactureOrder.update, tx.inventoryMovement.update, tx.auditLog.create
 *   4. tx.manufactureOrderItem.findMany (auto-complete check)
 *   5. tx.manufactureOrder.update (status change)
 *   6. tx.manufactureOrder.findUniqueOrThrow (final result)
 *   7. tx.auditLog.create (final audit)
 */
function buildTransactionMock(opts: {
  orderItemsAfterReceive: Array<{
    quantity_ordered: number;
    quantity_received: number;
  }>;
  variantStockForVariant1: number;
  movementItemsForMovement: Array<{
    product_variant_id: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }>;
  finalOrderStatus: string;
}) {
  return {
    // For generateMovementNumber (createMovement internal)
    inventoryMovement: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(MOCK_CREATED_MOVEMENT),
      // For addItem internal — returns DRAFT movement with items info
      findUnique: vi
        .fn()
        .mockResolvedValueOnce({
          // First call in addItem: get movement for status/type check
          id: MOVEMENT_ID,
          status: "DRAFT",
          movement_type: "ENTRY",
          manufacture_order_id: ORDER_ID,
        })
        // Second call in confirmMovement: get movement with items
        .mockResolvedValueOnce({
          id: MOVEMENT_ID,
          status: "DRAFT",
          movement_type: "ENTRY",
          manufacture_order_id: ORDER_ID,
          items: opts.movementItemsForMovement.map((item, idx) => ({
            id: `item-${idx}`,
            product_variant_id: item.product_variant_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.subtotal,
          })),
        }),
      update: vi.fn().mockResolvedValue(MOCK_CONFIRMED_MOVEMENT),
    },
    productVariant: {
      // addItem calls findUnique, confirmMovement calls findUniqueOrThrow
      findUnique: vi
        .fn()
        .mockResolvedValue(
          makeMockVariant(VARIANT_ID_1, opts.variantStockForVariant1),
        ),
      findUniqueOrThrow: vi
        .fn()
        .mockResolvedValue(
          makeMockVariant(VARIANT_ID_1, opts.variantStockForVariant1),
        ),
      update: vi.fn().mockResolvedValue({}),
    },
    movementItem: {
      create: vi.fn().mockResolvedValue({}),
      findMany: vi
        .fn()
        // First call in addItem: get items for total recalculation
        .mockResolvedValueOnce([{ subtotal: 0 }])
        // Second call in addItem entry validation: existing draft items
        .mockResolvedValueOnce([]),
    },
    manufactureOrderItem: {
      // For entry qty validation in addItem
      findUnique: vi.fn().mockResolvedValue({
        quantity_ordered: 20,
        quantity_received: 0,
      }),
      // For confirmMovement ENTRY: validate + update
      update: vi.fn().mockResolvedValue({}),
      // For confirmMovement auto-complete check AND receiveItems auto-complete check
      findMany: vi.fn().mockResolvedValue(opts.orderItemsAfterReceive),
    },
    manufactureOrder: {
      // createMovement validates the order_id using externalTx.manufactureOrder.findUnique
      findUnique: vi.fn().mockResolvedValue({
        id: ORDER_ID,
        status: "IN_PROGRESS",
      }),
      update: vi.fn().mockResolvedValue({}),
      findUniqueOrThrow: vi
        .fn()
        .mockResolvedValue(makeFinalOrder(opts.finalOrderStatus)),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// T1: Recepción parcial — order stays IN_PROGRESS
// ─────────────────────────────────────────────────────────────────────────────

describe("receiveItems — partial reception", () => {
  it("T1: partial receive → quantity_received updated, order stays IN_PROGRESS", async () => {
    // Order has 20 ordered, 0 received; we receive 10
    const order = makeMockOrder("IN_PROGRESS", [
      makeOrderItem(ORDER_ITEM_ID_1, VARIANT_ID_1, 20, 0),
    ]);
    mockPrisma.manufactureOrder.findUnique.mockResolvedValue(order as never);

    // After receiving 10, still 10 pending → stays IN_PROGRESS
    const txMock = buildTransactionMock({
      orderItemsAfterReceive: [{ quantity_ordered: 20, quantity_received: 10 }],
      variantStockForVariant1: 5,
      movementItemsForMovement: [
        {
          product_variant_id: VARIANT_ID_1,
          quantity: 10,
          unit_price: 0,
          subtotal: 0,
        },
      ],
      finalOrderStatus: "IN_PROGRESS",
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockPrisma.$transaction as any).mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (fn: (tx: any) => Promise<unknown>) => fn(txMock),
    );

    const result = await service.receiveItems(
      {
        manufacture_order_id: ORDER_ID,
        items: [
          { manufacture_order_item_id: ORDER_ITEM_ID_1, quantity_received: 10 },
        ],
      },
      USER_ID,
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("IN_PROGRESS");
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T2: Recepción completa — auto-completes to COMPLETED
// ─────────────────────────────────────────────────────────────────────────────

describe("receiveItems — full reception auto-completes order", () => {
  it("T2: receive full quantity → order transitions to COMPLETED", async () => {
    // Order has 20 ordered, 0 received; we receive all 20
    const order = makeMockOrder("IN_PROGRESS", [
      makeOrderItem(ORDER_ITEM_ID_1, VARIANT_ID_1, 20, 0),
    ]);
    mockPrisma.manufactureOrder.findUnique.mockResolvedValue(order as never);

    // After receiving 20, all complete → COMPLETED
    const txMock = buildTransactionMock({
      orderItemsAfterReceive: [{ quantity_ordered: 20, quantity_received: 20 }],
      variantStockForVariant1: 5,
      movementItemsForMovement: [
        {
          product_variant_id: VARIANT_ID_1,
          quantity: 20,
          unit_price: 0,
          subtotal: 0,
        },
      ],
      finalOrderStatus: "COMPLETED",
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockPrisma.$transaction as any).mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (fn: (tx: any) => Promise<unknown>) => fn(txMock),
    );

    const result = await service.receiveItems(
      {
        manufacture_order_id: ORDER_ID,
        items: [
          { manufacture_order_item_id: ORDER_ITEM_ID_1, quantity_received: 20 },
        ],
      },
      USER_ID,
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("COMPLETED");
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T3: Over-receive — rejected before transaction
// ─────────────────────────────────────────────────────────────────────────────

describe("receiveItems — over-receipt rejected", () => {
  it("T3: quantity_received exceeds remaining → returns error before transaction", async () => {
    // Order has 20 ordered, 15 received → only 5 remaining; trying to receive 10
    const order = makeMockOrder("IN_PROGRESS", [
      makeOrderItem(ORDER_ITEM_ID_1, VARIANT_ID_1, 20, 15),
    ]);
    mockPrisma.manufactureOrder.findUnique.mockResolvedValue(order as never);

    const result = await service.receiveItems(
      {
        manufacture_order_id: ORDER_ID,
        items: [
          { manufacture_order_item_id: ORDER_ITEM_ID_1, quantity_received: 10 },
        ],
      },
      USER_ID,
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/No se puede recibir|excede|pendiente/i);
    }
    // Transaction should NOT have been called
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("T3b: exact remaining quantity → passes", async () => {
    // Order has 20 ordered, 15 received → 5 remaining; receiving exactly 5
    const order = makeMockOrder("IN_PROGRESS", [
      makeOrderItem(ORDER_ITEM_ID_1, VARIANT_ID_1, 20, 15),
    ]);
    mockPrisma.manufactureOrder.findUnique.mockResolvedValue(order as never);

    const txMock = buildTransactionMock({
      orderItemsAfterReceive: [{ quantity_ordered: 20, quantity_received: 20 }],
      variantStockForVariant1: 5,
      movementItemsForMovement: [
        {
          product_variant_id: VARIANT_ID_1,
          quantity: 5,
          unit_price: 0,
          subtotal: 0,
        },
      ],
      finalOrderStatus: "COMPLETED",
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockPrisma.$transaction as any).mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (fn: (tx: any) => Promise<unknown>) => fn(txMock),
    );

    const result = await service.receiveItems(
      {
        manufacture_order_id: ORDER_ID,
        items: [
          { manufacture_order_item_id: ORDER_ITEM_ID_1, quantity_received: 5 },
        ],
      },
      USER_ID,
    );

    expect(result.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T4: Order status guards
// ─────────────────────────────────────────────────────────────────────────────

describe("receiveItems — order status guards", () => {
  it("T4: receive on CANCELLED order → error", async () => {
    const order = makeMockOrder("CANCELLED", [
      makeOrderItem(ORDER_ITEM_ID_1, VARIANT_ID_1, 20, 0),
    ]);
    mockPrisma.manufactureOrder.findUnique.mockResolvedValue(order as never);

    const result = await service.receiveItems(
      {
        manufacture_order_id: ORDER_ID,
        items: [
          { manufacture_order_item_id: ORDER_ITEM_ID_1, quantity_received: 5 },
        ],
      },
      USER_ID,
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/PENDIENTE|PROGRESO|pendientes|progreso/i);
    }
  });

  it("T5: receive on COMPLETED order → error", async () => {
    const order = makeMockOrder("COMPLETED", [
      makeOrderItem(ORDER_ITEM_ID_1, VARIANT_ID_1, 20, 20),
    ]);
    mockPrisma.manufactureOrder.findUnique.mockResolvedValue(order as never);

    const result = await service.receiveItems(
      {
        manufacture_order_id: ORDER_ID,
        items: [
          { manufacture_order_item_id: ORDER_ITEM_ID_1, quantity_received: 5 },
        ],
      },
      USER_ID,
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/PENDIENTE|PROGRESO|pendientes|progreso/i);
    }
  });

  it("T6: receive on PENDING order → allowed (PENDING is valid per service code)", async () => {
    // The service allows PENDING or IN_PROGRESS for receiveItems
    const order = makeMockOrder("PENDING", [
      makeOrderItem(ORDER_ITEM_ID_1, VARIANT_ID_1, 20, 0),
    ]);
    mockPrisma.manufactureOrder.findUnique.mockResolvedValue(order as never);

    const txMock = buildTransactionMock({
      orderItemsAfterReceive: [{ quantity_ordered: 20, quantity_received: 10 }],
      variantStockForVariant1: 0,
      movementItemsForMovement: [
        {
          product_variant_id: VARIANT_ID_1,
          quantity: 10,
          unit_price: 0,
          subtotal: 0,
        },
      ],
      finalOrderStatus: "IN_PROGRESS",
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockPrisma.$transaction as any).mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (fn: (tx: any) => Promise<unknown>) => fn(txMock),
    );

    const result = await service.receiveItems(
      {
        manufacture_order_id: ORDER_ID,
        items: [
          { manufacture_order_item_id: ORDER_ITEM_ID_1, quantity_received: 10 },
        ],
      },
      USER_ID,
    );

    // PENDING is a valid status for receiving (per the service: status !== PENDING && status !== IN_PROGRESS → error)
    expect(result.success).toBe(true);
  });

  it("T6b: order not found → error", async () => {
    mockPrisma.manufactureOrder.findUnique.mockResolvedValue(null as never);

    const result = await service.receiveItems(
      {
        manufacture_order_id: ORDER_ID,
        items: [
          { manufacture_order_item_id: ORDER_ITEM_ID_1, quantity_received: 5 },
        ],
      },
      USER_ID,
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/no encontrada/i);
    }
  });

  it("T6c: item does not belong to order → error", async () => {
    const order = makeMockOrder("IN_PROGRESS", [
      // Only has ORDER_ITEM_ID_1, but we'll try to receive ORDER_ITEM_ID_2
      makeOrderItem(ORDER_ITEM_ID_1, VARIANT_ID_1, 20, 0),
    ]);
    mockPrisma.manufactureOrder.findUnique.mockResolvedValue(order as never);

    const result = await service.receiveItems(
      {
        manufacture_order_id: ORDER_ID,
        items: [
          { manufacture_order_item_id: ORDER_ITEM_ID_2, quantity_received: 5 }, // Unknown item
        ],
      },
      USER_ID,
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/no pertenece/i);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T7: Reception creates ENTRY movement linked to order
// ─────────────────────────────────────────────────────────────────────────────

describe("receiveItems — creates ENTRY movement", () => {
  it("T7: reception creates ENTRY movement linked to the order", async () => {
    const order = makeMockOrder("IN_PROGRESS", [
      makeOrderItem(ORDER_ITEM_ID_1, VARIANT_ID_1, 20, 0),
    ]);
    mockPrisma.manufactureOrder.findUnique.mockResolvedValue(order as never);

    const movementCreate = vi.fn().mockResolvedValue(MOCK_CREATED_MOVEMENT);
    const txMock = {
      inventoryMovement: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: movementCreate,
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({
            id: MOVEMENT_ID,
            status: "DRAFT",
            movement_type: "ENTRY",
            manufacture_order_id: ORDER_ID,
          })
          .mockResolvedValueOnce({
            id: MOVEMENT_ID,
            status: "DRAFT",
            movement_type: "ENTRY",
            manufacture_order_id: ORDER_ID,
            items: [
              {
                id: "item-1",
                product_variant_id: VARIANT_ID_1,
                quantity: 10,
                unit_price: 0,
                subtotal: 0,
              },
            ],
          }),
        update: vi.fn().mockResolvedValue(MOCK_CONFIRMED_MOVEMENT),
      },
      productVariant: {
        findUnique: vi.fn().mockResolvedValue(makeMockVariant(VARIANT_ID_1, 0)),
        findUniqueOrThrow: vi
          .fn()
          .mockResolvedValue(makeMockVariant(VARIANT_ID_1, 0)),
        update: vi.fn().mockResolvedValue({}),
      },
      movementItem: {
        create: vi.fn().mockResolvedValue({}),
        findMany: vi
          .fn()
          .mockResolvedValueOnce([{ subtotal: 0 }])
          .mockResolvedValueOnce([]),
      },
      manufactureOrderItem: {
        findUnique: vi.fn().mockResolvedValue({
          quantity_ordered: 20,
          quantity_received: 0,
        }),
        update: vi.fn().mockResolvedValue({}),
        findMany: vi
          .fn()
          .mockResolvedValue([{ quantity_ordered: 20, quantity_received: 10 }]),
      },
      manufactureOrder: {
        // createMovement validates order_id via externalTx.manufactureOrder.findUnique
        findUnique: vi.fn().mockResolvedValue({
          id: ORDER_ID,
          status: "IN_PROGRESS",
        }),
        update: vi.fn().mockResolvedValue({}),
        findUniqueOrThrow: vi
          .fn()
          .mockResolvedValue(makeFinalOrder("IN_PROGRESS")),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({}),
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockPrisma.$transaction as any).mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (fn: (tx: any) => Promise<unknown>) => fn(txMock),
    );

    const result = await service.receiveItems(
      {
        manufacture_order_id: ORDER_ID,
        items: [
          { manufacture_order_item_id: ORDER_ITEM_ID_1, quantity_received: 10 },
        ],
      },
      USER_ID,
    );

    expect(result.success).toBe(true);
    // Verify an ENTRY movement was created linked to the order
    expect(movementCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          movement_type: "ENTRY",
          manufacture_order_id: ORDER_ID,
        }),
      }),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Input validation
// ─────────────────────────────────────────────────────────────────────────────

describe("receiveItems — input validation", () => {
  it("invalid manufacture_order_id (not UUID) → fails before DB", async () => {
    const result = await service.receiveItems(
      {
        manufacture_order_id: "not-a-uuid",
        items: [
          { manufacture_order_item_id: ORDER_ITEM_ID_1, quantity_received: 5 },
        ],
      },
      USER_ID,
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/invalido/i);
    }
    expect(mockPrisma.manufactureOrder.findUnique).not.toHaveBeenCalled();
  });

  it("empty items array → fails validation", async () => {
    const result = await service.receiveItems(
      {
        manufacture_order_id: ORDER_ID,
        items: [],
      },
      USER_ID,
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/al menos un item/i);
    }
  });

  it("quantity_received = 0 → fails validation", async () => {
    const result = await service.receiveItems(
      {
        manufacture_order_id: ORDER_ID,
        items: [
          { manufacture_order_item_id: ORDER_ITEM_ID_1, quantity_received: 0 },
        ],
      },
      USER_ID,
    );

    expect(result.success).toBe(false);
  });
});
