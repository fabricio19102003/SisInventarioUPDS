// Tests para ManufactureOrderService.cancelOrder — flujo de cancelación.
// Cubre: cancelación de orden PENDING, IN_PROGRESS sin recepciones,
// IN_PROGRESS con recepciones parciales, COMPLETED rechazada y ya CANCELLED.

import { describe, it, expect, beforeEach } from "vitest";
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
const VARIANT_ID_1 = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const VARIANT_ID_2 = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const USER_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd";
const MANUFACTURER_ID = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";

const VALID_CANCEL_INPUT = {
  manufacture_order_id: ORDER_ID,
  cancel_reason: "Motivo válido de cancelación (más de 10 chars)",
};

// Orden completa con items parametrizable por status + items
function makeMockOrder(
  status: string,
  items: Array<{
    id: string;
    quantity_ordered: number;
    quantity_received: number;
    product_variant: {
      sku_suffix: string;
      product: { name: string };
    };
  }>,
) {
  return {
    id: ORDER_ID,
    status,
    order_number: "ORD-20260411-0001",
    items,
  };
}

function makeOrderItem(
  id: string,
  variantId: string,
  ordered: number,
  received: number,
  productName = "Pijama Quirurgico",
  skuSuffix = "M-MASC-AZUL",
) {
  return {
    id,
    product_variant_id: variantId,
    quantity_ordered: ordered,
    quantity_received: received,
    product_variant: {
      sku_suffix: skuSuffix,
      product: { name: productName },
    },
  };
}

// Orden final retornada por la transacción (simplificada para el select)
function makeFinalCancelledOrder() {
  return {
    id: ORDER_ID,
    order_number: "ORD-20260411-0001",
    manufacturer_id: MANUFACTURER_ID,
    status: "CANCELLED",
    notes: null,
    cancel_reason: VALID_CANCEL_INPUT.cancel_reason,
    ordered_at: new Date(),
    expected_at: null,
    completed_at: null,
    cancelled_at: new Date(),
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

// Helper to set up a basic transaction mock for cancel
function setupCancelTransaction() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (mockPrisma.$transaction as any).mockImplementation(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (fn: (tx: any) => Promise<unknown>) => {
      const txMock = {
        manufactureOrder: {
          update: async () => makeFinalCancelledOrder(),
        },
        auditLog: {
          create: async () => ({}),
        },
      };
      return fn(txMock);
    },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// T1: Cancel PENDING order (no receptions) — full cancellation
// ─────────────────────────────────────────────────────────────────────────────

describe("cancelOrder — PENDING order", () => {
  it("T1: cancel PENDING order with no items → status=CANCELLED, plain cancel_reason", async () => {
    const order = makeMockOrder("PENDING", []);
    mockPrisma.manufactureOrder.findUnique.mockResolvedValue(order as never);
    setupCancelTransaction();

    const result = await service.cancelOrder(VALID_CANCEL_INPUT, USER_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("CANCELLED");
    }
    // Transaction was called (cancelation executes)
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("T1b: cancel PENDING order with items but zero receptions → status=CANCELLED, no breakdown in reason", async () => {
    const order = makeMockOrder("PENDING", [
      makeOrderItem("item-1", VARIANT_ID_1, 20, 0),
      makeOrderItem(
        "item-2",
        VARIANT_ID_2,
        10,
        0,
        "Bata Quirurgica",
        "L-FEM-BLANCA",
      ),
    ]);
    mockPrisma.manufactureOrder.findUnique.mockResolvedValue(order as never);

    // Capture what cancel_reason is passed to the transaction
    let capturedCancelReason: string | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockPrisma.$transaction as any).mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (fn: (tx: any) => Promise<unknown>) => {
        const txMock = {
          manufactureOrder: {
            update: async (args: { data: { cancel_reason: string } }) => {
              capturedCancelReason = args.data.cancel_reason;
              return makeFinalCancelledOrder();
            },
          },
          auditLog: {
            create: async () => ({}),
          },
        };
        return fn(txMock);
      },
    );

    const result = await service.cancelOrder(VALID_CANCEL_INPUT, USER_ID);

    expect(result.success).toBe(true);
    // Since totalReceived = 0, no breakdown appended — cancel_reason stays as-is
    expect(capturedCancelReason).toBe(VALID_CANCEL_INPUT.cancel_reason);
    expect(capturedCancelReason).not.toContain(
      "[Cancelacion con recepciones parciales]",
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T2: Cancel IN_PROGRESS order with NO receptions
// ─────────────────────────────────────────────────────────────────────────────

describe("cancelOrder — IN_PROGRESS, no receptions", () => {
  it("T2: cancel IN_PROGRESS order where all quantity_received=0 → no breakdown in cancel_reason", async () => {
    const order = makeMockOrder("IN_PROGRESS", [
      makeOrderItem("item-1", VARIANT_ID_1, 20, 0),
      makeOrderItem("item-2", VARIANT_ID_2, 15, 0, "Mandil", "S-FEM-VERDE"),
    ]);
    mockPrisma.manufactureOrder.findUnique.mockResolvedValue(order as never);

    let capturedCancelReason: string | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockPrisma.$transaction as any).mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (fn: (tx: any) => Promise<unknown>) => {
        const txMock = {
          manufactureOrder: {
            update: async (args: { data: { cancel_reason: string } }) => {
              capturedCancelReason = args.data.cancel_reason;
              return makeFinalCancelledOrder();
            },
          },
          auditLog: { create: async () => ({}) },
        };
        return fn(txMock);
      },
    );

    const result = await service.cancelOrder(VALID_CANCEL_INPUT, USER_ID);

    expect(result.success).toBe(true);
    // totalReceived = 0, so enrichedCancelReason = original cancel_reason, no breakdown
    expect(capturedCancelReason).toBe(VALID_CANCEL_INPUT.cancel_reason);
    expect(capturedCancelReason).not.toContain(
      "[Cancelacion con recepciones parciales]",
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T3: Cancel IN_PROGRESS order WITH partial receptions
// ─────────────────────────────────────────────────────────────────────────────

describe("cancelOrder — IN_PROGRESS with partial receptions", () => {
  it("T3: partial receptions → cancel_reason includes breakdown, stock NOT reverted", async () => {
    const order = makeMockOrder("IN_PROGRESS", [
      makeOrderItem("item-1", VARIANT_ID_1, 20, 10), // received 10 of 20
      makeOrderItem(
        "item-2",
        VARIANT_ID_2,
        15,
        0,
        "Bata Quirurgica",
        "L-FEM-BLANCA",
      ), // none received
    ]);
    mockPrisma.manufactureOrder.findUnique.mockResolvedValue(order as never);

    let capturedCancelReason: string | undefined;
    let capturedUpdateData: Record<string, unknown> | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockPrisma.$transaction as any).mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (fn: (tx: any) => Promise<unknown>) => {
        const txMock = {
          manufactureOrder: {
            update: async (args: { data: Record<string, unknown> }) => {
              capturedUpdateData = args.data;
              capturedCancelReason = args.data.cancel_reason as string;
              return makeFinalCancelledOrder();
            },
          },
          auditLog: { create: async () => ({}) },
        };
        return fn(txMock);
      },
    );

    const result = await service.cancelOrder(VALID_CANCEL_INPUT, USER_ID);

    expect(result.success).toBe(true);

    // Status set to CANCELLED
    expect(capturedUpdateData?.status).toBe("CANCELLED");

    // Cancel reason includes breakdown marker
    expect(capturedCancelReason).toContain(VALID_CANCEL_INPUT.cancel_reason);
    expect(capturedCancelReason).toContain(
      "[Cancelacion con recepciones parciales]",
    );

    // Breakdown includes received/pending totals
    expect(capturedCancelReason).toContain("Recibido: 10");
    expect(capturedCancelReason).toContain("Cancelado: 25"); // 20+15 - 10 = 25 pending

    // Breakdown mentions individual items
    expect(capturedCancelReason).toContain("Pijama Quirurgico");

    // Stock manipulation was NOT called (no productVariant.update calls)
    expect(mockPrisma.productVariant.update).not.toHaveBeenCalled();
  });

  it("T3b: multiple items with various reception states → breakdown includes all items", async () => {
    const order = makeMockOrder("IN_PROGRESS", [
      makeOrderItem(
        "item-1",
        VARIANT_ID_1,
        30,
        15,
        "Pijama Quirurgico",
        "M-MASC-AZUL",
      ),
      makeOrderItem(
        "item-2",
        VARIANT_ID_2,
        20,
        20,
        "Bata Quirurgica",
        "L-FEM-BLANCA",
      ), // fully received
    ]);
    mockPrisma.manufactureOrder.findUnique.mockResolvedValue(order as never);

    let capturedCancelReason: string | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockPrisma.$transaction as any).mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (fn: (tx: any) => Promise<unknown>) => {
        const txMock = {
          manufactureOrder: {
            update: async (args: { data: { cancel_reason: string } }) => {
              capturedCancelReason = args.data.cancel_reason;
              return makeFinalCancelledOrder();
            },
          },
          auditLog: { create: async () => ({}) },
        };
        return fn(txMock);
      },
    );

    await service.cancelOrder(VALID_CANCEL_INPUT, USER_ID);

    // Total received = 15 + 20 = 35 → has partial receptions
    expect(capturedCancelReason).toContain(
      "[Cancelacion con recepciones parciales]",
    );
    // total ordered = 50, total received = 35, pending = 15
    expect(capturedCancelReason).toContain("Recibido: 35");
    expect(capturedCancelReason).toContain("Cancelado: 15");
    expect(capturedCancelReason).toContain("Pijama Quirurgico");
    expect(capturedCancelReason).toContain("Bata Quirurgica");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T4: All items fully received → order should be COMPLETED, not cancellable
// (This tests AGENTS.md rule: if all items received, order should be COMPLETED)
// In practice the service's receiveItems auto-completes. We test that if the
// order somehow has status IN_PROGRESS with all items received, cancelOrder
// still cancels it (the service itself doesn't block this edge case — the
// auto-completion in receiveItems is the guard).
// ─────────────────────────────────────────────────────────────────────────────

describe("cancelOrder — IN_PROGRESS with all items fully received", () => {
  it("T4: all items fully received but order still IN_PROGRESS → cancellation succeeds (enriched reason)", async () => {
    // This is an edge case — normally receiveItems auto-completes. But if status
    // is still IN_PROGRESS, cancelOrder should handle it gracefully.
    const order = makeMockOrder("IN_PROGRESS", [
      makeOrderItem("item-1", VARIANT_ID_1, 20, 20), // fully received
    ]);
    mockPrisma.manufactureOrder.findUnique.mockResolvedValue(order as never);

    let capturedCancelReason: string | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockPrisma.$transaction as any).mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (fn: (tx: any) => Promise<unknown>) => {
        const txMock = {
          manufactureOrder: {
            update: async (args: { data: { cancel_reason: string } }) => {
              capturedCancelReason = args.data.cancel_reason;
              return makeFinalCancelledOrder();
            },
          },
          auditLog: { create: async () => ({}) },
        };
        return fn(txMock);
      },
    );

    const result = await service.cancelOrder(VALID_CANCEL_INPUT, USER_ID);

    // Service allows it (IN_PROGRESS is a cancellable status)
    expect(result.success).toBe(true);
    // total received = 20, pending = 0 → enriched breakdown is added
    // (totalReceived > 0, so hasPartialReceptions = true)
    expect(capturedCancelReason).toContain(
      "[Cancelacion con recepciones parciales]",
    );
    expect(capturedCancelReason).toContain("Cancelado: 0");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T5: Cancel COMPLETED order → error
// ─────────────────────────────────────────────────────────────────────────────

describe("cancelOrder — COMPLETED order", () => {
  it("T5: cancel COMPLETED order → returns error, no transaction", async () => {
    const order = makeMockOrder("COMPLETED", [
      makeOrderItem("item-1", VARIANT_ID_1, 20, 20),
    ]);
    mockPrisma.manufactureOrder.findUnique.mockResolvedValue(order as never);

    const result = await service.cancelOrder(VALID_CANCEL_INPUT, USER_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/COMPLETADO|completado/i);
    }
    // No transaction executed
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T6: Cancel already CANCELLED order → error
// ─────────────────────────────────────────────────────────────────────────────

describe("cancelOrder — already CANCELLED order", () => {
  it("T6: cancel already CANCELLED order → returns error, no transaction", async () => {
    const order = makeMockOrder("CANCELLED", []);
    mockPrisma.manufactureOrder.findUnique.mockResolvedValue(order as never);

    const result = await service.cancelOrder(VALID_CANCEL_INPUT, USER_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/ya se encuentra cancelada/i);
    }
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T7: Cancel with empty / short reason → Zod validation error
// ─────────────────────────────────────────────────────────────────────────────

describe("cancelOrder — input validation", () => {
  it("T7a: empty cancel_reason → Zod error, no DB call", async () => {
    const result = await service.cancelOrder(
      {
        manufacture_order_id: ORDER_ID,
        cancel_reason: "",
      },
      USER_ID,
    );

    expect(result.success).toBe(false);
    expect(mockPrisma.manufactureOrder.findUnique).not.toHaveBeenCalled();
  });

  it("T7b: cancel_reason too short (< 5 chars per schema) → Zod error", async () => {
    const result = await service.cancelOrder(
      {
        manufacture_order_id: ORDER_ID,
        cancel_reason: "abc",
      },
      USER_ID,
    );

    expect(result.success).toBe(false);
    expect(mockPrisma.manufactureOrder.findUnique).not.toHaveBeenCalled();
  });

  it("T7c: invalid UUID for manufacture_order_id → Zod error", async () => {
    const result = await service.cancelOrder(
      {
        manufacture_order_id: "not-a-valid-uuid",
        cancel_reason: "Motivo válido de cancelación",
      },
      USER_ID,
    );

    expect(result.success).toBe(false);
    expect(mockPrisma.manufactureOrder.findUnique).not.toHaveBeenCalled();
  });

  it("T7d: order not found → error before transaction", async () => {
    mockPrisma.manufactureOrder.findUnique.mockResolvedValue(null as never);

    const result = await service.cancelOrder(VALID_CANCEL_INPUT, USER_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/no encontrada/i);
    }
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T8: Cancel audit log records received/pending breakdown
// ─────────────────────────────────────────────────────────────────────────────

describe("cancelOrder — audit log content", () => {
  it("T8: partial reception → audit log includes has_partial_receptions=true, counts", async () => {
    const order = makeMockOrder("IN_PROGRESS", [
      makeOrderItem("item-1", VARIANT_ID_1, 20, 8),
    ]);
    mockPrisma.manufactureOrder.findUnique.mockResolvedValue(order as never);

    let capturedAuditNewValues: Record<string, unknown> | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockPrisma.$transaction as any).mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (fn: (tx: any) => Promise<unknown>) => {
        const txMock = {
          manufactureOrder: {
            update: async () => makeFinalCancelledOrder(),
          },
          auditLog: {
            create: async (args: {
              data: { new_values: Record<string, unknown> };
            }) => {
              capturedAuditNewValues = args.data.new_values;
              return {};
            },
          },
        };
        return fn(txMock);
      },
    );

    await service.cancelOrder(VALID_CANCEL_INPUT, USER_ID);

    expect(capturedAuditNewValues).toBeDefined();
    expect(capturedAuditNewValues?.has_partial_receptions).toBe(true);
    expect(capturedAuditNewValues?.total_received).toBe(8);
    expect(capturedAuditNewValues?.total_pending).toBe(12); // 20 - 8
    expect(capturedAuditNewValues?.status).toBe("CANCELLED");
  });

  it("T8b: no receptions → audit log has_partial_receptions=false", async () => {
    const order = makeMockOrder("PENDING", [
      makeOrderItem("item-1", VARIANT_ID_1, 20, 0),
    ]);
    mockPrisma.manufactureOrder.findUnique.mockResolvedValue(order as never);

    let capturedAuditNewValues: Record<string, unknown> | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockPrisma.$transaction as any).mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (fn: (tx: any) => Promise<unknown>) => {
        const txMock = {
          manufactureOrder: {
            update: async () => makeFinalCancelledOrder(),
          },
          auditLog: {
            create: async (args: {
              data: { new_values: Record<string, unknown> };
            }) => {
              capturedAuditNewValues = args.data.new_values;
              return {};
            },
          },
        };
        return fn(txMock);
      },
    );

    await service.cancelOrder(VALID_CANCEL_INPUT, USER_ID);

    expect(capturedAuditNewValues?.has_partial_receptions).toBe(false);
    expect(capturedAuditNewValues?.total_received).toBe(0);
    expect(capturedAuditNewValues?.total_pending).toBe(20);
  });
});
