// Tests unitarios para ReportsService.
// Cada metodo de reporte tiene al menos 2 casos:
//   - Happy path: datos mockados → verifica estructura y totales
//   - Empty: sin datos → verifica ceros y arrays vacios

import { describe, it, expect, beforeEach } from "vitest";
import { Prisma } from "@upds/db";
import { ReportsService } from "../reports";
import {
  createMockPrisma,
  resetMockPrisma,
  type MockPrismaClient,
} from "./helpers/prisma-mock";
import type {
  FinancialReportFilters,
  InventoryReportFilters,
  MovementsReportFilters,
  DonationsReportFilters,
  DepartmentConsumptionFilters,
  WriteOffsReportFilters,
} from "@upds/validators";

// ─────────────────────────────────────────────────────────────────────────────
// Fechas de prueba — rango fijo para determinismo
// ─────────────────────────────────────────────────────────────────────────────

const DATE_FROM = new Date("2026-04-01T00:00:00.000Z");
const DATE_TO = new Date("2026-04-30T23:59:59.999Z");

// Filtros tipados por reporte

const FINANCIAL_BASE: FinancialReportFilters = {
  date_from: DATE_FROM,
  date_to: DATE_TO,
  product_category: undefined,
};

const MOVEMENTS_BASE: MovementsReportFilters = {
  date_from: DATE_FROM,
  date_to: DATE_TO,
  movement_type: undefined,
  status: undefined,
  product_id: undefined,
  page: 1,
  per_page: 20,
};

const DONATIONS_BASE: DonationsReportFilters = {
  date_from: DATE_FROM,
  date_to: DATE_TO,
  recipient_id: undefined,
};

const DEPT_BASE: DepartmentConsumptionFilters = {
  date_from: DATE_FROM,
  date_to: DATE_TO,
  department_id: undefined,
};

const WRITE_OFFS_BASE: WriteOffsReportFilters = {
  date_from: DATE_FROM,
  date_to: DATE_TO,
};

const INVENTORY_BASE: InventoryReportFilters = {
  warehouse_area: undefined,
  category: undefined,
  low_stock_only: false,
  search: undefined,
};

// ─────────────────────────────────────────────────────────────────────────────
// IDs de prueba
// ─────────────────────────────────────────────────────────────────────────────

const VARIANT_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd";
const PRODUCT_ID = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

let mockPrisma: MockPrismaClient;
let service: ReportsService;

beforeEach(() => {
  mockPrisma = createMockPrisma();
  resetMockPrisma(mockPrisma);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  service = new ReportsService(mockPrisma as any);
});

// ═════════════════════════════════════════════════════════════════════════════
// 1. REPORTE FINANCIERO
// ═════════════════════════════════════════════════════════════════════════════

describe("ReportsService.getFinancialReport", () => {
  it("T1 — happy path: retorna totales y filas desde movimientos SALE confirmados", async () => {
    const mockAggregate = {
      _sum: { total_amount: new Prisma.Decimal("1500.00") },
      _count: { id: 2 },
    };

    const mockMovements = [
      {
        movement_number: "MOV-20260401-0001",
        processed_at: new Date("2026-04-10T10:00:00Z"),
        total_amount: new Prisma.Decimal("900.00"),
        recipient: { full_name: "Juan Perez", document_number: "12345678" },
        _count: { items: 3 },
      },
      {
        movement_number: "MOV-20260401-0002",
        processed_at: new Date("2026-04-15T12:00:00Z"),
        total_amount: new Prisma.Decimal("600.00"),
        recipient: { full_name: "Maria Lopez", document_number: "87654321" },
        _count: { items: 2 },
      },
    ];

    mockPrisma.inventoryMovement.aggregate.mockResolvedValue(
      mockAggregate as never,
    );
    mockPrisma.inventoryMovement.findMany.mockResolvedValue(
      mockMovements as never,
    );

    const result = await service.getFinancialReport(FINANCIAL_BASE);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const { summary, rows } = result.data;

    // Resumen
    expect(summary.total_movements).toBe(2);
    expect(summary.total_amount).toEqual(new Prisma.Decimal("1500.00"));
    expect(summary.total_items).toBe(5); // 3 + 2

    // Filas
    expect(rows).toHaveLength(2);
    expect(rows[0]?.movement_number).toBe("MOV-20260401-0001");
    expect(rows[0]?.recipient_full_name).toBe("Juan Perez");
    expect(rows[0]?.items_count).toBe(3);
    expect(rows[1]?.movement_number).toBe("MOV-20260401-0002");
    expect(rows[1]?.recipient_full_name).toBe("Maria Lopez");
  });

  it("T2 — empty: sin movimientos → totales en cero y filas vacias", async () => {
    const mockAggregate = {
      _sum: { total_amount: null },
      _count: { id: 0 },
    };

    mockPrisma.inventoryMovement.aggregate.mockResolvedValue(
      mockAggregate as never,
    );
    mockPrisma.inventoryMovement.findMany.mockResolvedValue([] as never);

    const result = await service.getFinancialReport(FINANCIAL_BASE);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const { summary, rows } = result.data;

    expect(summary.total_movements).toBe(0);
    expect(summary.total_amount).toEqual(new Prisma.Decimal(0));
    expect(summary.total_items).toBe(0);
    expect(rows).toHaveLength(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. REPORTE DE INVENTARIO
// ═════════════════════════════════════════════════════════════════════════════

describe("ReportsService.getInventoryReport", () => {
  // Fabrica un producto con variantes configurables
  function makeProduct(
    overrides: {
      id?: string;
      name?: string;
      sku?: string;
      category?: string;
      garment_type?: string | null;
      warehouse_area?: string;
      min_stock?: number;
    } = {},
    variantStocks: Array<{
      id: string;
      sku_suffix: string;
      size: string | null;
      gender: string | null;
      color: string | null;
      current_stock: number;
    }> = [],
  ) {
    return {
      id: overrides.id ?? PRODUCT_ID,
      name: overrides.name ?? "Pijama Quirurgico",
      sku: overrides.sku ?? "PQ-001",
      category: overrides.category ?? "MEDICAL_GARMENT",
      garment_type: overrides.garment_type ?? "PIJAMA",
      warehouse_area: overrides.warehouse_area ?? "MEDICAL",
      min_stock: overrides.min_stock ?? 5,
      variants: variantStocks.length
        ? variantStocks
        : [
            {
              id: VARIANT_ID,
              sku_suffix: "M-MASC",
              size: "M",
              gender: "MASCULINO",
              color: null,
              current_stock: 20,
            },
          ],
    };
  }

  it("T3 — happy path: retorna variantes con flag is_low_stock correcto", async () => {
    const products = [
      makeProduct({}, [
        {
          id: "var-1",
          sku_suffix: "M-MASC",
          size: "M",
          gender: "MASCULINO",
          color: null,
          current_stock: 2, // low stock (min_stock=5)
        },
        {
          id: "var-2",
          sku_suffix: "L-FEM",
          size: "L",
          gender: "FEMENINO",
          color: null,
          current_stock: 10, // ok
        },
      ]),
    ];

    mockPrisma.product.findMany.mockResolvedValue(products as never);

    const result = await service.getInventoryReport({
      ...INVENTORY_BASE,
      low_stock_only: false,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    const {
      products: productRows,
      total_products,
      total_variants,
      low_stock_variants,
    } = result.data;

    expect(total_products).toBe(1);
    expect(total_variants).toBe(2);
    expect(low_stock_variants).toBe(1);

    const productRow = productRows[0];
    expect(productRow).toBeDefined();
    expect(productRow?.product_name).toBe("Pijama Quirurgico");
    expect(productRow?.has_low_stock).toBe(true);

    const lowVar = productRow?.variants.find((v) => v.variant_id === "var-1");
    const okVar = productRow?.variants.find((v) => v.variant_id === "var-2");
    expect(lowVar?.is_low_stock).toBe(true);
    expect(okVar?.is_low_stock).toBe(false);
  });

  it("T4 — filtro low_stock_only: solo retorna productos con variantes bajo minimo", async () => {
    const products = [
      makeProduct({ id: "p1", name: "Pijama OK" }, [
        {
          id: "var-ok",
          sku_suffix: "M",
          size: "M",
          gender: null,
          color: null,
          current_stock: 10, // >= min_stock=5
        },
      ]),
      makeProduct({ id: "p2", name: "Bata Baja" }, [
        {
          id: "var-low",
          sku_suffix: "S",
          size: "S",
          gender: null,
          color: null,
          current_stock: 1, // < min_stock=5
        },
      ]),
    ];

    mockPrisma.product.findMany.mockResolvedValue(products as never);

    const result = await service.getInventoryReport({
      ...INVENTORY_BASE,
      low_stock_only: true,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    const { products: productRows } = result.data;

    // Solo el producto con bajo stock
    expect(productRows).toHaveLength(1);
    expect(productRows[0]?.product_name).toBe("Bata Baja");
    expect(productRows[0]?.has_low_stock).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. REPORTE DE MOVIMIENTOS
// ═════════════════════════════════════════════════════════════════════════════

describe("ReportsService.getMovementsReport", () => {
  function makeMovement(overrides: Record<string, unknown> = {}) {
    return {
      id: "mov-1",
      movement_number: "MOV-20260401-0001",
      movement_type: "SALE",
      status: "CONFIRMED",
      is_donated: false,
      total_amount: new Prisma.Decimal("500.00"),
      processed_at: new Date("2026-04-10T10:00:00Z"),
      processed_by_user: { full_name: "Admin User" },
      recipient: { full_name: "Juan Perez" },
      department: null,
      _count: { items: 2 },
      ...overrides,
    };
  }

  it("T5 — happy path: retorna resultado paginado con rows y total", async () => {
    const movements = [
      makeMovement(),
      makeMovement({ id: "mov-2", movement_number: "MOV-20260401-0002" }),
    ];

    // $transaction con array → mockImplementation que ejecuta Promise.all
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockPrisma.$transaction as any).mockImplementation(
      (queries: Promise<unknown>[]) => Promise.all(queries),
    );
    mockPrisma.inventoryMovement.findMany.mockResolvedValue(movements as never);
    mockPrisma.inventoryMovement.count.mockResolvedValue(2 as never);

    const result = await service.getMovementsReport(MOVEMENTS_BASE);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const { rows, total, page, per_page } = result.data;

    expect(rows).toHaveLength(2);
    expect(total).toBe(2);
    expect(page).toBe(1);
    expect(per_page).toBe(20);

    expect(rows[0]?.movement_number).toBe("MOV-20260401-0001");
    expect(rows[0]?.movement_type).toBe("SALE");
    expect(rows[0]?.processed_by_name).toBe("Admin User");
    expect(rows[0]?.recipient_name).toBe("Juan Perez");
    expect(rows[0]?.department_name).toBeNull();
  });

  it("T6 — filtro por tipo: solo retorna el tipo de movimiento especificado", async () => {
    const donationMovement = makeMovement({
      movement_type: "DONATION",
      is_donated: true,
      total_amount: new Prisma.Decimal("0"),
      recipient: { full_name: "Becario" },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockPrisma.$transaction as any).mockImplementation(
      (queries: Promise<unknown>[]) => Promise.all(queries),
    );
    mockPrisma.inventoryMovement.findMany.mockResolvedValue([
      donationMovement,
    ] as never);
    mockPrisma.inventoryMovement.count.mockResolvedValue(1 as never);

    const result = await service.getMovementsReport({
      ...MOVEMENTS_BASE,
      movement_type: "DONATION",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    const { rows, total } = result.data;

    expect(rows).toHaveLength(1);
    expect(total).toBe(1);
    expect(rows[0]?.movement_type).toBe("DONATION");
    expect(rows[0]?.is_donated).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. REPORTE DE DOTACIONES A BECARIOS
// ═════════════════════════════════════════════════════════════════════════════

describe("ReportsService.getDonationsReport", () => {
  function makeDonationMovement(overrides: Record<string, unknown> = {}) {
    return {
      movement_number: "MOV-20260401-0010",
      processed_at: new Date("2026-04-05T09:00:00Z"),
      recipient: {
        full_name: "Carlos Becario",
        document_number: "99999999",
        type: "SCHOLAR",
      },
      items: [
        {
          quantity: 2,
          product_variant: {
            size: "M",
            gender: "MASCULINO",
            color: "AZUL",
            product: { name: "Pijama Quirurgico", sku: "PQ-001" },
          },
        },
        {
          quantity: 1,
          product_variant: {
            size: null,
            gender: null,
            color: "BLANCO",
            product: { name: "Gorro Quirurgico", sku: "GQ-001" },
          },
        },
      ],
      ...overrides,
    };
  }

  it("T7 — happy path: retorna resumen y filas con datos del becario e items", async () => {
    const movements = [makeDonationMovement()];

    mockPrisma.inventoryMovement.findMany.mockResolvedValue(movements as never);

    const result = await service.getDonationsReport(DONATIONS_BASE);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const { summary, rows } = result.data;

    expect(summary.total_donations).toBe(1);
    expect(summary.total_items).toBe(3); // 2 + 1

    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row).toBeDefined();
    expect(row?.movement_number).toBe("MOV-20260401-0010");
    expect(row?.recipient_full_name).toBe("Carlos Becario");
    expect(row?.recipient_document).toBe("99999999");
    expect(row?.total_items).toBe(3);
    expect(row?.items).toHaveLength(2);
    expect(row?.items[0]?.product_name).toBe("Pijama Quirurgico");
    expect(row?.items[0]?.quantity).toBe(2);
    expect(row?.items[1]?.product_name).toBe("Gorro Quirurgico");
    expect(row?.items[1]?.quantity).toBe(1);
  });

  it("T8 — empty: sin donaciones → ceros y filas vacias", async () => {
    mockPrisma.inventoryMovement.findMany.mockResolvedValue([] as never);

    const result = await service.getDonationsReport(DONATIONS_BASE);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const { summary, rows } = result.data;

    expect(summary.total_donations).toBe(0);
    expect(summary.total_items).toBe(0);
    expect(rows).toHaveLength(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. REPORTE DE CONSUMO POR DEPARTAMENTO
// ═════════════════════════════════════════════════════════════════════════════

describe("ReportsService.getDepartmentConsumptionReport", () => {
  function makeDelivery(
    deptId: string,
    deptName: string,
    deptCode: string,
    itemQty: number,
    date: Date,
  ) {
    return {
      processed_at: date,
      department: { id: deptId, name: deptName, code: deptCode },
      items: [{ quantity: itemQty }],
    };
  }

  it("T9 — happy path: agrega por departamento y calcula totales", async () => {
    const dept1Id = "dept-1";
    const dept2Id = "dept-2";

    const movements = [
      makeDelivery(
        dept1Id,
        "Medicina",
        "MED",
        5,
        new Date("2026-04-05T10:00:00Z"),
      ),
      makeDelivery(
        dept1Id,
        "Medicina",
        "MED",
        3,
        new Date("2026-04-15T10:00:00Z"),
      ),
      makeDelivery(
        dept2Id,
        "Contabilidad",
        "CONT",
        10,
        new Date("2026-04-10T10:00:00Z"),
      ),
    ];

    mockPrisma.inventoryMovement.findMany.mockResolvedValue(movements as never);

    const result = await service.getDepartmentConsumptionReport(DEPT_BASE);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const { rows, total_departments, total_deliveries, total_items } =
      result.data;

    expect(total_departments).toBe(2);
    expect(total_deliveries).toBe(3); // 2 + 1
    expect(total_items).toBe(18); // 5+3 + 10

    // Ordenados por nombre alphabetically: Contabilidad, Medicina
    expect(rows[0]?.department_name).toBe("Contabilidad");
    expect(rows[0]?.total_deliveries).toBe(1);
    expect(rows[0]?.total_items).toBe(10);

    expect(rows[1]?.department_name).toBe("Medicina");
    expect(rows[1]?.total_deliveries).toBe(2);
    expect(rows[1]?.total_items).toBe(8); // 5 + 3
    // La ultima entrega de Medicina es el 15 de abril
    expect(rows[1]?.last_delivery_at).toEqual(new Date("2026-04-15T10:00:00Z"));
  });

  it("T10 — empty: sin entregas → ceros y filas vacias", async () => {
    mockPrisma.inventoryMovement.findMany.mockResolvedValue([] as never);

    const result = await service.getDepartmentConsumptionReport(DEPT_BASE);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const { rows, total_departments, total_deliveries, total_items } =
      result.data;

    expect(rows).toHaveLength(0);
    expect(total_departments).toBe(0);
    expect(total_deliveries).toBe(0);
    expect(total_items).toBe(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 6. REPORTE DE BAJAS POR DETERIORO
// ═════════════════════════════════════════════════════════════════════════════

describe("ReportsService.getWriteOffsReport", () => {
  function makeWriteOff(overrides: Record<string, unknown> = {}) {
    return {
      movement_number: "MOV-20260401-0020",
      processed_at: new Date("2026-04-08T14:00:00Z"),
      notes: "Deterioro por humedad excesiva en el almacen",
      processed_by_user: { full_name: "Admin User" },
      items: [
        {
          quantity: 5,
          product_variant: {
            size: "M",
            gender: "MASCULINO",
            color: "VERDE",
            product: { name: "Pijama Quirurgico", sku: "PQ-001" },
          },
        },
      ],
      ...overrides,
    };
  }

  it("T11 — happy path: retorna bajas con justificacion y detalle de items", async () => {
    const movements = [makeWriteOff()];
    const mockAggregate = { _count: { id: 1 } };

    mockPrisma.inventoryMovement.aggregate.mockResolvedValue(
      mockAggregate as never,
    );
    mockPrisma.inventoryMovement.findMany.mockResolvedValue(movements as never);

    const result = await service.getWriteOffsReport(WRITE_OFFS_BASE);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const { summary, rows } = result.data;

    expect(summary.total_write_offs).toBe(1);
    expect(summary.total_items_lost).toBe(5);

    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row).toBeDefined();
    expect(row?.movement_number).toBe("MOV-20260401-0020");
    expect(row?.processed_by_name).toBe("Admin User");
    expect(row?.notes).toBe("Deterioro por humedad excesiva en el almacen");
    expect(row?.total_items).toBe(5);
    expect(row?.items).toHaveLength(1);
    expect(row?.items[0]?.product_name).toBe("Pijama Quirurgico");
    expect(row?.items[0]?.quantity).toBe(5);
    expect(row?.items[0]?.size).toBe("M");
  });

  it("T12 — empty: sin bajas → ceros y filas vacias", async () => {
    const mockAggregate = { _count: { id: 0 } };

    mockPrisma.inventoryMovement.aggregate.mockResolvedValue(
      mockAggregate as never,
    );
    mockPrisma.inventoryMovement.findMany.mockResolvedValue([] as never);

    const result = await service.getWriteOffsReport(WRITE_OFFS_BASE);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const { summary, rows } = result.data;

    expect(summary.total_write_offs).toBe(0);
    expect(summary.total_items_lost).toBe(0);
    expect(rows).toHaveLength(0);
  });
});
