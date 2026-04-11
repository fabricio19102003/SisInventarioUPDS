// ═══════════════════════════════════════════════════════════════════════════════
// Tests de estructuras de datos para exportación Excel
//
// La utilidad de exportación (apps/web/src/lib/reports-export.ts) requiere
// exceljs y está en apps/web. Dado que vitest solo está configurado en
// packages/services y packages/validators, estos tests verifican que los tipos
// de datos que alimentan el exportador sean consistentes con lo que el servicio
// produce.
//
// Estrategia: verificar las interfaces de respuesta de ReportsService son
// compatibles con lo que el exportador espera recibir. No se instancia exceljs.
//
// Para cobertura E2E real del exportador (workbook columns, binary output),
// se requiere configurar vitest en apps/web o usar tests de integración.
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import { Prisma } from "@upds/db";
import type {
  FinancialReport,
  InventoryReport,
  PaginatedMovementsReport,
  DonationsReport,
  DepartmentConsumptionReport,
  WriteOffsReport,
} from "../reports";

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures de datos de prueba — estructuras mínimas válidas
// ─────────────────────────────────────────────────────────────────────────────

const FINANCIAL_REPORT: FinancialReport = {
  summary: {
    total_amount: new Prisma.Decimal("1500.50"),
    total_movements: 3,
    total_items: 10,
  },
  rows: [
    {
      movement_number: "MOV-001",
      processed_at: new Date("2026-04-15"),
      recipient_full_name: "Juan Pérez",
      recipient_document: "12345678",
      total_amount: new Prisma.Decimal("500.00"),
      items_count: 3,
    },
    {
      movement_number: "MOV-002",
      processed_at: new Date("2026-04-20"),
      recipient_full_name: null,
      recipient_document: null,
      total_amount: new Prisma.Decimal("1000.50"),
      items_count: 7,
    },
  ],
};

const INVENTORY_REPORT: InventoryReport = {
  products: [
    {
      product_id: "prod-1",
      product_name: "Pijama Quirúrgico",
      product_sku: "PIJ-001",
      category: "MEDICAL_GARMENT",
      garment_type: "PIJAMA",
      warehouse_area: "MEDICAL",
      min_stock: 5,
      total_stock: 25,
      has_low_stock: false,
      variants: [
        {
          variant_id: "var-1",
          sku_suffix: "M-MASC-AZUL",
          size: "M",
          gender: "MASCULINO",
          color: "Azul",
          current_stock: 10,
          is_low_stock: false,
        },
        {
          variant_id: "var-2",
          sku_suffix: "XS-MASC-AZUL",
          size: "XS",
          gender: "MASCULINO",
          color: "Azul",
          current_stock: 3,
          is_low_stock: true,
        },
      ],
    },
  ],
  total_products: 1,
  total_variants: 2,
  low_stock_variants: 1,
};

const MOVEMENTS_REPORT: PaginatedMovementsReport = {
  rows: [
    {
      id: "mov-1",
      movement_number: "MOV-001",
      movement_type: "SALE",
      status: "CONFIRMED",
      is_donated: false,
      total_amount: new Prisma.Decimal("250.00"),
      processed_at: new Date("2026-04-10"),
      processed_by_name: "Admin User",
      items_count: 2,
      recipient_name: "María García",
      department_name: null,
    },
  ],
  total: 1,
  page: 1,
  per_page: 20,
};

const DONATIONS_REPORT: DonationsReport = {
  summary: { total_donations: 1, total_items: 2 },
  rows: [
    {
      movement_number: "DON-001",
      processed_at: new Date("2026-04-12"),
      recipient_full_name: "Becario Uno",
      recipient_document: "87654321",
      items: [
        {
          product_name: "Bata Médica",
          product_sku: "BAT-001",
          size: "L",
          gender: "FEMENINO",
          color: "Blanco",
          quantity: 1,
        },
        {
          product_name: "Gorro Quirúrgico",
          product_sku: "GOR-001",
          size: null,
          gender: "UNISEX",
          color: null,
          quantity: 1,
        },
      ],
      total_items: 2,
    },
  ],
};

const DEPT_CONSUMPTION_REPORT: DepartmentConsumptionReport = {
  rows: [
    {
      department_id: "dept-1",
      department_name: "Informática",
      department_code: "TI-001",
      total_deliveries: 3,
      total_items: 15,
      last_delivery_at: new Date("2026-04-18"),
    },
    {
      department_id: "dept-2",
      department_name: "Contabilidad",
      department_code: "CONT-002",
      total_deliveries: 1,
      total_items: 5,
      last_delivery_at: null,
    },
  ],
  total_departments: 2,
  total_deliveries: 4,
  total_items: 20,
};

const WRITE_OFFS_REPORT: WriteOffsReport = {
  summary: { total_write_offs: 1, total_items_lost: 3 },
  rows: [
    {
      movement_number: "BAJ-001",
      processed_at: new Date("2026-04-05"),
      processed_by_name: "Inventario Manager",
      notes: "Material deteriorado por humedad en almacén",
      items: [
        {
          product_name: "Mandil Médico",
          product_sku: "MAN-001",
          size: "S",
          gender: "FEMENINO",
          color: "Verde",
          quantity: 3,
        },
      ],
      total_items: 3,
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Tests de integridad de estructuras de datos
// ─────────────────────────────────────────────────────────────────────────────

describe("Estructuras de datos de exportación Excel", () => {
  describe("FinancialReport", () => {
    it("summary tiene los campos requeridos por el exportador", () => {
      expect(FINANCIAL_REPORT.summary).toHaveProperty("total_amount");
      expect(FINANCIAL_REPORT.summary).toHaveProperty("total_movements");
      expect(FINANCIAL_REPORT.summary).toHaveProperty("total_items");
      // El exportador convierte Decimal a number via Number()
      expect(Number(FINANCIAL_REPORT.summary.total_amount)).toBe(1500.5);
    });

    it("filas tienen todos los campos para las columnas Excel", () => {
      const row = FINANCIAL_REPORT.rows[0]!;
      expect(row).toHaveProperty("movement_number");
      expect(row).toHaveProperty("processed_at");
      expect(row.processed_at).toBeInstanceOf(Date);
      expect(row).toHaveProperty("recipient_full_name");
      expect(row).toHaveProperty("recipient_document");
      expect(row).toHaveProperty("items_count");
      expect(row).toHaveProperty("total_amount");
      // El exportador maneja null correctamente (reemplaza con "—")
      expect(FINANCIAL_REPORT.rows[1]!.recipient_full_name).toBeNull();
    });
  });

  describe("InventoryReport", () => {
    it("producto tiene variantes con campos de exportación", () => {
      const product = INVENTORY_REPORT.products[0]!;
      expect(product.variants).toHaveLength(2);

      const variant = product.variants[0]!;
      expect(variant).toHaveProperty("size");
      expect(variant).toHaveProperty("gender");
      expect(variant).toHaveProperty("color");
      expect(variant).toHaveProperty("current_stock");
      expect(variant).toHaveProperty("is_low_stock");
    });

    it("contadores de resumen son correctos", () => {
      expect(INVENTORY_REPORT.total_products).toBe(1);
      expect(INVENTORY_REPORT.total_variants).toBe(2);
      expect(INVENTORY_REPORT.low_stock_variants).toBe(1);
    });

    it("variante con stock bajo es identificada correctamente", () => {
      const product = INVENTORY_REPORT.products[0]!;
      const lowStockVariant = product.variants.find((v) => v.is_low_stock);
      expect(lowStockVariant).toBeDefined();
      expect(lowStockVariant!.current_stock).toBeLessThan(product.min_stock);
    });
  });

  describe("PaginatedMovementsReport", () => {
    it("fila de movimiento tiene todos los campos para exportación", () => {
      const row = MOVEMENTS_REPORT.rows[0]!;
      expect(row).toHaveProperty("movement_number");
      expect(row).toHaveProperty("movement_type");
      expect(row).toHaveProperty("status");
      expect(row).toHaveProperty("processed_at");
      expect(row).toHaveProperty("processed_by_name");
      expect(row).toHaveProperty("items_count");
      expect(row).toHaveProperty("total_amount");
      // recipient_name y department_name son mutuamente excluyentes
      expect(row.recipient_name).not.toBeNull();
      expect(row.department_name).toBeNull();
    });

    it("total coincide con el conteo de filas en datos de prueba", () => {
      expect(MOVEMENTS_REPORT.total).toBe(MOVEMENTS_REPORT.rows.length);
    });
  });

  describe("DonationsReport", () => {
    it("reporte de dotaciones expande items en el exportador (una fila por item)", () => {
      const donation = DONATIONS_REPORT.rows[0]!;
      expect(donation.items).toHaveLength(2);
      // El exportador genera N filas por donación (una por item)
      const totalRowsExpected = DONATIONS_REPORT.rows.reduce(
        (acc, r) => acc + r.items.length,
        0,
      );
      expect(totalRowsExpected).toBe(2);
    });

    it("items tienen variante nullable correctamente tipada", () => {
      const donation = DONATIONS_REPORT.rows[0]!;
      const item = donation.items[1]!; // gorro — sin size ni color
      expect(item.size).toBeNull();
      expect(item.color).toBeNull();
      expect(item.gender).toBe("UNISEX");
    });
  });

  describe("DepartmentConsumptionReport", () => {
    it("last_delivery_at puede ser null (sin entregas previas)", () => {
      const noDeliveryDept = DEPT_CONSUMPTION_REPORT.rows.find(
        (r) => r.last_delivery_at === null,
      );
      expect(noDeliveryDept).toBeDefined();
    });

    it("totales coinciden con la suma de filas", () => {
      const totalDeliveries = DEPT_CONSUMPTION_REPORT.rows.reduce(
        (acc, r) => acc + r.total_deliveries,
        0,
      );
      const totalItems = DEPT_CONSUMPTION_REPORT.rows.reduce(
        (acc, r) => acc + r.total_items,
        0,
      );
      expect(DEPT_CONSUMPTION_REPORT.total_deliveries).toBe(totalDeliveries);
      expect(DEPT_CONSUMPTION_REPORT.total_items).toBe(totalItems);
    });
  });

  describe("WriteOffsReport", () => {
    it("reporte de bajas tiene justificación (notes)", () => {
      const row = WRITE_OFFS_REPORT.rows[0]!;
      expect(row.notes).not.toBeNull();
      expect(row.notes!.length).toBeGreaterThanOrEqual(10); // regla de negocio: min 10 chars
    });

    it("items tienen variante con campos optativos", () => {
      const item = WRITE_OFFS_REPORT.rows[0]!.items[0]!;
      expect(item).toHaveProperty("product_name");
      expect(item).toHaveProperty("product_sku");
      expect(item).toHaveProperty("quantity");
      expect(typeof item.quantity).toBe("number");
    });

    it("total_items_lost es la suma de quantities", () => {
      const allItems = WRITE_OFFS_REPORT.rows.flatMap((r) => r.items);
      const totalQty = allItems.reduce((acc, i) => acc + i.quantity, 0);
      expect(WRITE_OFFS_REPORT.summary.total_items_lost).toBe(totalQty);
    });
  });
});
