// Tests unitarios para DashboardService.getStats().
// Verifica que la query consolidada de variantes computa correctamente:
//   - low_stock_alerts (de variantsWithAreaAndStock)
//   - stock_by_area    (de variantsWithAreaAndStock)
// Y que el agrupado groupBy de variantsByArea fue eliminado.

import { describe, it, expect, beforeEach } from "vitest";
import { DashboardService } from "../dashboard";
import type { DashboardStats } from "../dashboard";
import {
  createMockPrisma,
  resetMockPrisma,
  type MockPrismaClient,
} from "./helpers/prisma-mock";

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

/** Genera variantes del tipo que retorna productVariant.findMany en el dashboard */
function makeVariantRow(
  warehouse_area: string,
  current_stock: number,
  min_stock: number,
) {
  return {
    current_stock,
    product: { warehouse_area, min_stock },
  };
}

function makeOrderStatusRow(status: string, count: number) {
  return { status, _count: { id: count } };
}

function makeMovementRow(movement_type: string, created_at: Date) {
  return { movement_type, created_at };
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

let mockPrisma: MockPrismaClient;
let service: DashboardService;

beforeEach(() => {
  mockPrisma = createMockPrisma();
  resetMockPrisma(mockPrisma);
  service = new DashboardService(mockPrisma as never);
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper: configura todos los mocks necesarios para getStats()
// ─────────────────────────────────────────────────────────────────────────────

function setupGetStatsMocks(opts: {
  variants?: ReturnType<typeof makeVariantRow>[];
  orderStatuses?: ReturnType<typeof makeOrderStatusRow>[];
  movements?: ReturnType<typeof makeMovementRow>[];
}) {
  const variants = opts.variants ?? [];
  const orderStatuses = opts.orderStatuses ?? [];
  const movements = opts.movements ?? [];

  mockPrisma.product.count.mockResolvedValue(10);
  mockPrisma.productVariant.count.mockResolvedValue(variants.length);
  mockPrisma.productVariant.findMany.mockResolvedValue(variants as never);
  mockPrisma.manufactureOrder.count.mockResolvedValue(2);
  mockPrisma.inventoryMovement.count.mockResolvedValue(3);
  // vitest-mock-extended no expone mockResolvedValue directamente en groupBy
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (mockPrisma.manufactureOrder.groupBy as any).mockResolvedValue(orderStatuses);
  mockPrisma.inventoryMovement.findMany
    .mockResolvedValueOnce([] as never) // recent movements
    .mockResolvedValueOnce(movements as never); // movements last 6 months
}

// ═════════════════════════════════════════════════════════════════════════════
// Consolidacion de queries de variantes
// ═════════════════════════════════════════════════════════════════════════════

describe("DashboardService.getStats — query consolidation", () => {
  it("T1 — productVariant.findMany se llama exactamente una vez (query consolidada)", async () => {
    setupGetStatsMocks({ variants: [] });

    await service.getStats();

    // Solo una llamada: la consolidada con warehouse_area + min_stock
    expect(mockPrisma.productVariant.findMany).toHaveBeenCalledTimes(1);
  });

  it("T2 — productVariant.groupBy NO se llama (variantsByArea eliminado)", async () => {
    setupGetStatsMocks({ variants: [] });

    await service.getStats();

    expect(mockPrisma.productVariant.groupBy).not.toHaveBeenCalled();
  });

  it("T3 — low_stock_alerts se calcula correctamente desde la query consolidada", async () => {
    setupGetStatsMocks({
      variants: [
        // 2 bajo stock en MEDICAL
        makeVariantRow("MEDICAL", 2, 5),
        makeVariantRow("MEDICAL", 0, 5),
        // 1 con stock ok
        makeVariantRow("MEDICAL", 10, 5),
        // 1 bajo stock en OFFICE
        makeVariantRow("OFFICE", 1, 5),
      ],
    });

    const result = await service.getStats();
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.low_stock_alerts).toBe(3); // 2 MEDICAL + 1 OFFICE
  });

  it("T4 — stock_by_area refleja totales correctos por area", async () => {
    setupGetStatsMocks({
      variants: [
        makeVariantRow("MEDICAL", 10, 5),
        makeVariantRow("MEDICAL", 3, 5), // bajo stock
        makeVariantRow("OFFICE", 20, 5),
        makeVariantRow("OFFICE", 15, 5),
      ],
    });

    const result = await service.getStats();
    expect(result.success).toBe(true);
    if (!result.success) return;

    const { stock_by_area } = result.data;
    const medical = stock_by_area.find((a) => a.warehouse_area === "MEDICAL");
    const office = stock_by_area.find((a) => a.warehouse_area === "OFFICE");

    expect(medical).toBeDefined();
    expect(medical?.total_variants).toBe(2);
    expect(medical?.total_stock).toBe(13);
    expect(medical?.low_stock_variants).toBe(1);

    expect(office).toBeDefined();
    expect(office?.total_variants).toBe(2);
    expect(office?.total_stock).toBe(35);
    expect(office?.low_stock_variants).toBe(0);
  });

  it("T5 — low_stock_alerts y stock_by_area.low_stock_variants son consistentes", async () => {
    setupGetStatsMocks({
      variants: [
        makeVariantRow("MEDICAL", 1, 10), // bajo stock
        makeVariantRow("OFFICE", 0, 5), // bajo stock
        makeVariantRow("MEDICAL", 20, 10), // ok
      ],
    });

    const result = await service.getStats();
    expect(result.success).toBe(true);
    if (!result.success) return;

    const { low_stock_alerts, stock_by_area } = result.data;
    const totalLowStockFromAreas = stock_by_area.reduce(
      (sum, a) => sum + a.low_stock_variants,
      0,
    );
    expect(low_stock_alerts).toBe(totalLowStockFromAreas);
    expect(low_stock_alerts).toBe(2);
  });

  it("T6 — retorna contrato DashboardStats completo con todos los campos", async () => {
    setupGetStatsMocks({
      variants: [makeVariantRow("MEDICAL", 5, 5)],
      orderStatuses: [makeOrderStatusRow("PENDING", 3)],
      movements: [
        makeMovementRow("ENTRY", new Date()),
        makeMovementRow("SALE", new Date()),
      ],
    });

    const result = await service.getStats();
    expect(result.success).toBe(true);
    if (!result.success) return;

    const stats: DashboardStats = result.data;

    expect(typeof stats.total_active_products).toBe("number");
    expect(typeof stats.total_active_variants).toBe("number");
    expect(typeof stats.low_stock_alerts).toBe("number");
    expect(typeof stats.pending_manufacture_orders).toBe("number");
    expect(typeof stats.draft_movements).toBe("number");
    expect(Array.isArray(stats.stock_by_area)).toBe(true);
    expect(Array.isArray(stats.manufacture_orders_by_status)).toBe(true);
    expect(Array.isArray(stats.recent_movements)).toBe(true);
    expect(Array.isArray(stats.movements_by_month)).toBe(true);
  });

  it("T7 — movements_by_month siempre tiene exactamente 6 entradas", async () => {
    setupGetStatsMocks({ variants: [] });

    const result = await service.getStats();
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.movements_by_month).toHaveLength(6);
  });

  it("T8 — manufacture_orders_by_status mapea status y count correctamente", async () => {
    setupGetStatsMocks({
      variants: [],
      orderStatuses: [
        makeOrderStatusRow("PENDING", 5),
        makeOrderStatusRow("IN_PROGRESS", 2),
        makeOrderStatusRow("COMPLETED", 10),
      ],
    });

    const result = await service.getStats();
    expect(result.success).toBe(true);
    if (!result.success) return;

    const { manufacture_orders_by_status } = result.data;
    expect(manufacture_orders_by_status).toHaveLength(3);
    const pending = manufacture_orders_by_status.find(
      (r) => r.status === "PENDING",
    );
    expect(pending?.count).toBe(5);
  });
});
