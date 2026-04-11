// Tests unitarios para getLowStockAlerts y listProducts con low_stock=true.
// Verifica que las queries optimizadas retornan solo las filas de bajo stock
// y que el shape de la respuesta es identico al contrato previo.

import { describe, it, expect, beforeEach } from "vitest";
import { ProductService } from "../product";
import {
  createMockPrisma,
  resetMockPrisma,
  type MockPrismaClient,
} from "./helpers/prisma-mock";

// ─────────────────────────────────────────────────────────────────────────────
// IDs / fixtures
// ─────────────────────────────────────────────────────────────────────────────

const PRODUCT_ID_1 = "11111111-1111-1111-1111-111111111111";
const PRODUCT_ID_2 = "22222222-2222-2222-2222-222222222222";
const VARIANT_ID_1 = "aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const VARIANT_ID_2 = "aaaaaaa2-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

/** Fila que $queryRaw retornaria para getLowStockAlerts */
function makeLowStockRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    variant_id: VARIANT_ID_1,
    sku_suffix: "M-MASCULINO-AZUL",
    size: "M",
    gender: "MASCULINO",
    color: "AZUL",
    current_stock: 2,
    product_id: PRODUCT_ID_1,
    product_name: "Pijama Quirurgico",
    product_sku: "PQ-001",
    min_stock: 5,
    ...overrides,
  };
}

/** Fila que $queryRaw retornaria para listProducts low_stock */
function makeLowStockProductId(id: string) {
  return { product_id: id };
}

/** Producto completo que Prisma findMany retornaria */
function makeProductRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: PRODUCT_ID_1,
    sku: "PQ-001",
    name: "Pijama Quirurgico",
    description: null,
    category: "MEDICAL_GARMENT",
    garment_type: "PIJAMA",
    warehouse_area: "MEDICAL",
    min_stock: 5,
    is_active: true,
    created_at: new Date("2026-01-01"),
    updated_at: new Date("2026-01-01"),
    variants: [
      {
        id: VARIANT_ID_1,
        product_id: PRODUCT_ID_1,
        sku_suffix: "M-MASCULINO-AZUL",
        size: "M",
        gender: "MASCULINO",
        color: "AZUL",
        current_stock: 2,
        is_active: true,
        created_at: new Date("2026-01-01"),
        updated_at: new Date("2026-01-01"),
      },
    ],
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

let mockPrisma: MockPrismaClient;
let service: ProductService;

beforeEach(() => {
  mockPrisma = createMockPrisma();
  resetMockPrisma(mockPrisma);
  service = new ProductService(mockPrisma as never);
});

// ═════════════════════════════════════════════════════════════════════════════
// getLowStockAlerts — optimizado con $queryRaw
// ═════════════════════════════════════════════════════════════════════════════

describe("getLowStockAlerts", () => {
  it("T1 — retorna LowStockAlert[] con los campos esperados", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([makeLowStockRow()] as never);

    const result = await service.getLowStockAlerts();

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data).toHaveLength(1);
    const alert = result.data[0]!;
    expect(alert.product_id).toBe(PRODUCT_ID_1);
    expect(alert.product_name).toBe("Pijama Quirurgico");
    expect(alert.product_sku).toBe("PQ-001");
    expect(alert.min_stock).toBe(5);
    expect(alert.variant_id).toBe(VARIANT_ID_1);
    expect(alert.variant_sku_suffix).toBe("M-MASCULINO-AZUL");
    expect(alert.size).toBe("M");
    expect(alert.gender).toBe("MASCULINO");
    expect(alert.color).toBe("AZUL");
    expect(alert.current_stock).toBe(2);
  });

  it("T2 — retorna array vacio cuando $queryRaw no devuelve filas", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([] as never);

    const result = await service.getLowStockAlerts();

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toHaveLength(0);
  });

  it("T3 — retorna multiples alertas cuando hay multiples variantes bajo stock", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([
      makeLowStockRow({ variant_id: VARIANT_ID_1, current_stock: 1 }),
      makeLowStockRow({
        variant_id: VARIANT_ID_2,
        sku_suffix: "L-FEMENINO-VERDE",
        size: "L",
        gender: "FEMENINO",
        color: "VERDE",
        current_stock: 0,
        product_id: PRODUCT_ID_2,
        product_name: "Bata Clinica",
        product_sku: "BC-001",
        min_stock: 5,
      }),
    ] as never);

    const result = await service.getLowStockAlerts();

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toHaveLength(2);
  });

  it("T4 — convierte current_stock y min_stock a Number (manejo de BigInt de $queryRaw)", async () => {
    // PostgreSQL puede retornar BigInt para columnas de tipo Int en $queryRaw
    mockPrisma.$queryRaw.mockResolvedValue([
      makeLowStockRow({ current_stock: BigInt(3), min_stock: BigInt(5) }),
    ] as never);

    const result = await service.getLowStockAlerts();

    expect(result.success).toBe(true);
    if (!result.success) return;
    const alert = result.data[0]!;
    expect(typeof alert.current_stock).toBe("number");
    expect(typeof alert.min_stock).toBe("number");
    expect(alert.current_stock).toBe(3);
    expect(alert.min_stock).toBe(5);
  });

  it("T5 — usa $queryRaw (no findMany) para la consulta de bajo stock", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([] as never);

    await service.getLowStockAlerts();

    expect(mockPrisma.$queryRaw).toHaveBeenCalledOnce();
    // findMany NO debe ser llamado para la query de bajo stock
    expect(mockPrisma.productVariant.findMany).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// listProducts con low_stock = true — optimizado con $queryRaw
// ═════════════════════════════════════════════════════════════════════════════

describe("listProducts — low_stock filter", () => {
  it("T6 — retorna productos cuyo ID fue devuelto por $queryRaw", async () => {
    // Primera llamada a $queryRaw: IDs de productos con bajo stock
    mockPrisma.$queryRaw.mockResolvedValue([
      makeLowStockProductId(PRODUCT_ID_1),
    ] as never);
    // $transaction: [findMany, count]
    mockPrisma.$transaction.mockResolvedValue([[makeProductRow()], 1] as never);

    const result = await service.listProducts({ low_stock: true });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.products).toHaveLength(1);
    expect(result.data.total).toBe(1);
    expect(result.data.products[0]!.id).toBe(PRODUCT_ID_1);
  });

  it("T7 — retorna vacio sin query adicional si $queryRaw no devuelve IDs", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([] as never);

    const result = await service.listProducts({ low_stock: true });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.products).toHaveLength(0);
    expect(result.data.total).toBe(0);
    // $transaction no debe ejecutarse si no hay IDs
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("T8 — paginacion: page y per_page se propagan correctamente", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([
      makeLowStockProductId(PRODUCT_ID_1),
      makeLowStockProductId(PRODUCT_ID_2),
    ] as never);
    mockPrisma.$transaction.mockResolvedValue([[], 2] as never);

    const result = await service.listProducts({
      low_stock: true,
      page: 2,
      per_page: 10,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.page).toBe(2);
    expect(result.data.per_page).toBe(10);
    expect(result.data.total).toBe(2);
  });

  it("T9 — usa $queryRaw para obtener IDs de bajo stock (no findMany de todos los productos)", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([] as never);

    await service.listProducts({ low_stock: true });

    expect(mockPrisma.$queryRaw).toHaveBeenCalledOnce();
    // Nunca debe llamar a product.findMany sin pasar por la query de IDs
    expect(mockPrisma.product.findMany).not.toHaveBeenCalled();
  });
});
