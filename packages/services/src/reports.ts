// ═══════════════════════════════════════════════════════════════════════════════
// @upds/services — Servicio de Reportes
// Queries de lectura para los 6 tipos de reporte del sistema.
// Solo lectura: no muta datos ni registra audit.
// Aprovecha los indices compuestos del schema:
//   [movement_type, status, processed_at]
//   [movement_type, is_donated, processed_at]
// ═══════════════════════════════════════════════════════════════════════════════

import { type PrismaClient, Prisma } from "@upds/db";
import type { ServiceResult } from "./auth";
import type {
  FinancialReportFilters,
  InventoryReportFilters,
  MovementsReportFilters,
  DonationsReportFilters,
  DepartmentConsumptionFilters,
  WriteOffsReportFilters,
} from "@upds/validators";

// ─────────────────────────────────────────────────────────────────────────────
// Interfaces de respuesta
// ─────────────────────────────────────────────────────────────────────────────

// --- Financiero ---

export interface FinancialReportRow {
  movement_number: string;
  processed_at: Date;
  recipient_full_name: string | null;
  recipient_document: string | null;
  total_amount: Prisma.Decimal;
  items_count: number;
}

export interface FinancialReportSummary {
  total_amount: Prisma.Decimal;
  total_movements: number;
  total_items: number;
}

export interface FinancialReport {
  summary: FinancialReportSummary;
  rows: FinancialReportRow[];
}

// --- Inventario ---

export interface InventoryVariantRow {
  variant_id: string;
  sku_suffix: string;
  size: string | null;
  gender: string | null;
  color: string | null;
  current_stock: number;
  is_low_stock: boolean;
}

export interface InventoryProductRow {
  product_id: string;
  product_name: string;
  product_sku: string;
  category: string;
  garment_type: string | null;
  warehouse_area: string;
  min_stock: number;
  total_stock: number;
  has_low_stock: boolean;
  variants: InventoryVariantRow[];
}

export interface InventoryReport {
  products: InventoryProductRow[];
  total_products: number;
  total_variants: number;
  low_stock_variants: number;
}

// --- Movimientos ---

export interface MovementReportRow {
  id: string;
  movement_number: string;
  movement_type: string;
  status: string;
  is_donated: boolean;
  total_amount: Prisma.Decimal;
  processed_at: Date | null;
  processed_by_name: string;
  items_count: number;
  recipient_name: string | null;
  department_name: string | null;
}

export interface PaginatedMovementsReport {
  rows: MovementReportRow[];
  total: number;
  page: number;
  per_page: number;
}

// --- Donaciones ---

export interface DonationItemRow {
  product_name: string;
  product_sku: string;
  size: string | null;
  gender: string | null;
  color: string | null;
  quantity: number;
}

export interface DonationReportRow {
  movement_number: string;
  processed_at: Date;
  recipient_full_name: string;
  recipient_document: string;
  items: DonationItemRow[];
  total_items: number;
}

export interface DonationReportSummary {
  total_donations: number;
  total_items: number;
}

export interface DonationsReport {
  summary: DonationReportSummary;
  rows: DonationReportRow[];
}

// --- Consumo por Departamento ---

export interface DepartmentConsumptionRow {
  department_id: string;
  department_name: string;
  department_code: string;
  total_deliveries: number;
  total_items: number;
  last_delivery_at: Date | null;
}

export interface DepartmentConsumptionReport {
  rows: DepartmentConsumptionRow[];
  total_departments: number;
  total_deliveries: number;
  total_items: number;
}

// --- Bajas ---

export interface WriteOffItemRow {
  product_name: string;
  product_sku: string;
  size: string | null;
  gender: string | null;
  color: string | null;
  quantity: number;
}

export interface WriteOffReportRow {
  movement_number: string;
  processed_at: Date;
  processed_by_name: string;
  notes: string | null;
  items: WriteOffItemRow[];
  total_items: number;
}

export interface WriteOffReportSummary {
  total_write_offs: number;
  total_items_lost: number;
}

export interface WriteOffsReport {
  summary: WriteOffReportSummary;
  rows: WriteOffReportRow[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Servicio
// ─────────────────────────────────────────────────────────────────────────────

export class ReportsService {
  constructor(private readonly db: PrismaClient) {}

  // ─────────────────────────────────────────────────────────────────────────
  // 1. REPORTE FINANCIERO (Ventas confirmadas, sin donaciones)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Genera el reporte financiero de ventas confirmadas.
   *
   * WHERE: movement_type = SALE AND status = CONFIRMED AND is_donated = false
   * Aprovecha el indice: [movement_type, is_donated, processed_at]
   *
   * Segun AGENTS.md: is_donated=false + total_amount > 0 + status=CONFIRMED.
   */
  async getFinancialReport(
    filters: FinancialReportFilters,
  ): Promise<ServiceResult<FinancialReport>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma where dinamico validado por Zod
    const where: Record<string, any> = {
      movement_type: "SALE" as const,
      status: "CONFIRMED" as const,
      is_donated: false,
      processed_at: {
        gte: filters.date_from,
        lte: filters.date_to,
      },
    };

    // Filtro por categoria: navega items → variante → producto
    if (filters.product_category) {
      where.items = {
        some: {
          product_variant: {
            product: {
              category: filters.product_category,
            },
          },
        },
      };
    }

    const [aggregate, movements] = await Promise.all([
      // Agregado para el resumen
      this.db.inventoryMovement.aggregate({
        where,
        _sum: { total_amount: true },
        _count: { id: true },
      }),

      // Filas de detalle con conteo de items
      this.db.inventoryMovement.findMany({
        where,
        orderBy: { processed_at: "desc" },
        select: {
          movement_number: true,
          processed_at: true,
          total_amount: true,
          recipient: {
            select: {
              full_name: true,
              document_number: true,
            },
          },
          _count: {
            select: { items: true },
          },
        },
      }),
    ]);

    // Calcular total de items desde las filas de detalle
    const totalItems = movements.reduce((acc, m) => acc + m._count.items, 0);

    const summary: FinancialReportSummary = {
      total_amount: aggregate._sum.total_amount ?? new Prisma.Decimal(0),
      total_movements: aggregate._count.id,
      total_items: totalItems,
    };

    const rows: FinancialReportRow[] = movements.map((m) => ({
      movement_number: m.movement_number,
      processed_at: m.processed_at!,
      recipient_full_name: m.recipient?.full_name ?? null,
      recipient_document: m.recipient?.document_number ?? null,
      total_amount: m.total_amount,
      items_count: m._count.items,
    }));

    return { success: true, data: { summary, rows } };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. REPORTE DE INVENTARIO ACTUAL
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Muestra el estado actual del inventario por variante.
   * No tiene rango de fechas — snapshot en tiempo real.
   *
   * Segun AGENTS.md: ProductVariant WHERE is_active=true, agrupado por producto.
   * Flag low_stock: current_stock < product.min_stock.
   */
  async getInventoryReport(
    filters: InventoryReportFilters,
  ): Promise<ServiceResult<InventoryReport>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma where dinamico validado por Zod
    const productWhere: Record<string, any> = {
      is_active: true,
    };

    if (filters.warehouse_area) {
      productWhere.warehouse_area = filters.warehouse_area;
    }
    if (filters.category) {
      productWhere.category = filters.category;
    }
    if (filters.search) {
      productWhere.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { sku: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const products = await this.db.product.findMany({
      where: productWhere,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        sku: true,
        category: true,
        garment_type: true,
        warehouse_area: true,
        min_stock: true,
        variants: {
          where: { is_active: true },
          orderBy: { created_at: "asc" },
          select: {
            id: true,
            sku_suffix: true,
            size: true,
            gender: true,
            color: true,
            current_stock: true,
          },
        },
      },
    });

    const productRows: InventoryProductRow[] = products.map((product) => {
      const variants: InventoryVariantRow[] = product.variants.map((v) => {
        const isLowStock = v.current_stock < product.min_stock;

        return {
          variant_id: v.id,
          sku_suffix: v.sku_suffix,
          size: v.size,
          gender: v.gender,
          color: v.color,
          current_stock: v.current_stock,
          is_low_stock: isLowStock,
        };
      });

      const totalStock = variants.reduce((acc, v) => acc + v.current_stock, 0);
      const hasLowStock = variants.some((v) => v.is_low_stock);

      return {
        product_id: product.id,
        product_name: product.name,
        product_sku: product.sku,
        category: product.category,
        garment_type: product.garment_type,
        warehouse_area: product.warehouse_area,
        min_stock: product.min_stock,
        total_stock: totalStock,
        has_low_stock: hasLowStock,
        variants,
      };
    });

    // Aplicar filtro low_stock_only en aplicacion
    // (cross-field comparison current_stock < min_stock no es directo en Prisma)
    const filteredProducts = filters.low_stock_only
      ? productRows.filter((p) => p.has_low_stock)
      : productRows;

    // Calcular contadores DESPUES del filtro para que coincidan con lo que ve el usuario
    let totalVariants = 0;
    let lowStockVariants = 0;
    for (const p of filteredProducts) {
      totalVariants += p.variants.length;
      lowStockVariants += p.variants.filter((v) => v.is_low_stock).length;
    }

    return {
      success: true,
      data: {
        products: filteredProducts,
        total_products: filteredProducts.length,
        total_variants: totalVariants,
        low_stock_variants: lowStockVariants,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. REPORTE DE MOVIMIENTOS (Paginado)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Lista paginada de movimientos con filtros.
   * Aprovecha el indice compuesto: [movement_type, status, processed_at].
   */
  async getMovementsReport(
    filters: MovementsReportFilters,
  ): Promise<ServiceResult<PaginatedMovementsReport>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma where dinamico validado por Zod
    const where: Record<string, any> = {
      processed_at: {
        gte: filters.date_from,
        lte: filters.date_to,
      },
    };

    if (filters.movement_type) {
      where.movement_type = filters.movement_type;
    }
    if (filters.status) {
      where.status = filters.status;
    }

    // Filtro por producto: a traves de los items del movimiento
    if (filters.product_id) {
      where.items = {
        some: {
          product_variant: {
            product_id: filters.product_id,
          },
        },
      };
    }

    // per_page = 0 significa "sin paginacion" — exportar todos los registros
    const exportAll = filters.per_page === 0;
    const skip = exportAll ? undefined : (filters.page - 1) * filters.per_page;
    const take = exportAll ? undefined : filters.per_page;

    const [movements, total] = await this.db.$transaction([
      this.db.inventoryMovement.findMany({
        where,
        orderBy: { processed_at: "desc" },
        skip,
        take,
        select: {
          id: true,
          movement_number: true,
          movement_type: true,
          status: true,
          is_donated: true,
          total_amount: true,
          processed_at: true,
          processed_by_user: {
            select: { full_name: true },
          },
          recipient: {
            select: { full_name: true },
          },
          department: {
            select: { name: true },
          },
          _count: {
            select: { items: true },
          },
        },
      }),
      this.db.inventoryMovement.count({ where }),
    ]);

    const rows: MovementReportRow[] = movements.map((m) => ({
      id: m.id,
      movement_number: m.movement_number,
      movement_type: m.movement_type,
      status: m.status,
      is_donated: m.is_donated,
      total_amount: m.total_amount,
      processed_at: m.processed_at,
      processed_by_name: m.processed_by_user.full_name,
      items_count: m._count.items,
      recipient_name: m.recipient?.full_name ?? null,
      department_name: m.department?.name ?? null,
    }));

    return {
      success: true,
      data: {
        rows,
        total,
        page: filters.page,
        per_page: filters.per_page,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. REPORTE DE DOTACIONES A BECARIOS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Reporte de dotaciones gratuitas a becarios.
   *
   * WHERE: movement_type = DONATION AND status = CONFIRMED.
   * Incluye: datos del becario + detalle de items (variante, talla, genero, color).
   * Segun AGENTS.md: is_donated=true, excluido de reportes financieros.
   */
  async getDonationsReport(
    filters: DonationsReportFilters,
  ): Promise<ServiceResult<DonationsReport>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma where dinamico validado por Zod
    const where: Record<string, any> = {
      movement_type: "DONATION" as const,
      status: "CONFIRMED" as const,
      processed_at: {
        gte: filters.date_from,
        lte: filters.date_to,
      },
    };

    if (filters.recipient_id) {
      where.recipient_id = filters.recipient_id;
    }

    const movements = await this.db.inventoryMovement.findMany({
      where,
      orderBy: { processed_at: "desc" },
      select: {
        movement_number: true,
        processed_at: true,
        recipient: {
          select: {
            full_name: true,
            document_number: true,
            type: true,
          },
        },
        items: {
          select: {
            quantity: true,
            product_variant: {
              select: {
                size: true,
                gender: true,
                color: true,
                product: {
                  select: {
                    name: true,
                    sku: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    let totalItems = 0;

    const rows: DonationReportRow[] = movements.map((m) => {
      const items: DonationItemRow[] = m.items.map((item) => {
        totalItems += item.quantity;
        return {
          product_name: item.product_variant.product.name,
          product_sku: item.product_variant.product.sku,
          size: item.product_variant.size,
          gender: item.product_variant.gender,
          color: item.product_variant.color,
          quantity: item.quantity,
        };
      });

      return {
        movement_number: m.movement_number,
        processed_at: m.processed_at!,
        recipient_full_name: m.recipient?.full_name ?? "",
        recipient_document: m.recipient?.document_number ?? "",
        items,
        total_items: items.reduce((acc, i) => acc + i.quantity, 0),
      };
    });

    const summary: DonationReportSummary = {
      total_donations: rows.length,
      total_items: totalItems,
    };

    return { success: true, data: { summary, rows } };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. REPORTE DE CONSUMO POR DEPARTAMENTO
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Reporte de entregas a departamentos internos de la universidad.
   *
   * WHERE: movement_type = DEPARTMENT_DELIVERY AND status = CONFIRMED.
   * Agrupado por departamento: total entregas + total items.
   * Solo productos con warehouse_area = OFFICE (por regla de negocio).
   */
  async getDepartmentConsumptionReport(
    filters: DepartmentConsumptionFilters,
  ): Promise<ServiceResult<DepartmentConsumptionReport>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma where dinamico validado por Zod
    const where: Record<string, any> = {
      movement_type: "DEPARTMENT_DELIVERY" as const,
      status: "CONFIRMED" as const,
      processed_at: {
        gte: filters.date_from,
        lte: filters.date_to,
      },
    };

    if (filters.department_id) {
      where.department_id = filters.department_id;
    }

    const movements = await this.db.inventoryMovement.findMany({
      where,
      orderBy: { processed_at: "desc" },
      select: {
        processed_at: true,
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        items: {
          select: {
            quantity: true,
          },
        },
      },
    });

    // Agregar por departamento en aplicacion
    const deptMap = new Map<
      string,
      {
        department_id: string;
        department_name: string;
        department_code: string;
        total_deliveries: number;
        total_items: number;
        last_delivery_at: Date | null;
      }
    >();

    for (const m of movements) {
      if (!m.department) continue;

      const deptId = m.department.id;
      const existing = deptMap.get(deptId) ?? {
        department_id: deptId,
        department_name: m.department.name,
        department_code: m.department.code,
        total_deliveries: 0,
        total_items: 0,
        last_delivery_at: null,
      };

      existing.total_deliveries++;
      existing.total_items += m.items.reduce((acc, i) => acc + i.quantity, 0);

      // Mantener la fecha de entrega mas reciente
      if (
        m.processed_at &&
        (existing.last_delivery_at === null ||
          m.processed_at > existing.last_delivery_at)
      ) {
        existing.last_delivery_at = m.processed_at;
      }

      deptMap.set(deptId, existing);
    }

    const rows: DepartmentConsumptionRow[] = Array.from(deptMap.values()).sort(
      (a, b) => a.department_name.localeCompare(b.department_name),
    );

    const totalDeliveries = rows.reduce(
      (acc, r) => acc + r.total_deliveries,
      0,
    );
    const totalItems = rows.reduce((acc, r) => acc + r.total_items, 0);

    return {
      success: true,
      data: {
        rows,
        total_departments: rows.length,
        total_deliveries: totalDeliveries,
        total_items: totalItems,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 6. REPORTE DE BAJAS POR DETERIORO
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Reporte de bajas de inventario por deterioro.
   *
   * WHERE: movement_type = WRITE_OFF AND status = CONFIRMED.
   * Incluye: justificacion (notes obligatorio >= 10 chars), items con variante.
   * Segun AGENTS.md: sin destinatario, sin depto, unit_price=0.
   */
  async getWriteOffsReport(
    filters: WriteOffsReportFilters,
  ): Promise<ServiceResult<WriteOffsReport>> {
    const where = {
      movement_type: "WRITE_OFF" as const,
      status: "CONFIRMED" as const,
      processed_at: {
        gte: filters.date_from,
        lte: filters.date_to,
      },
    };

    const [aggregate, movements] = await Promise.all([
      this.db.inventoryMovement.aggregate({
        where,
        _count: { id: true },
      }),
      this.db.inventoryMovement.findMany({
        where,
        orderBy: { processed_at: "desc" },
        select: {
          movement_number: true,
          processed_at: true,
          notes: true,
          processed_by_user: {
            select: { full_name: true },
          },
          items: {
            select: {
              quantity: true,
              product_variant: {
                select: {
                  size: true,
                  gender: true,
                  color: true,
                  product: {
                    select: {
                      name: true,
                      sku: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    let totalItemsLost = 0;

    const rows: WriteOffReportRow[] = movements.map((m) => {
      const items: WriteOffItemRow[] = m.items.map((item) => {
        totalItemsLost += item.quantity;
        return {
          product_name: item.product_variant.product.name,
          product_sku: item.product_variant.product.sku,
          size: item.product_variant.size,
          gender: item.product_variant.gender,
          color: item.product_variant.color,
          quantity: item.quantity,
        };
      });

      return {
        movement_number: m.movement_number,
        processed_at: m.processed_at!,
        processed_by_name: m.processed_by_user.full_name,
        notes: m.notes,
        items,
        total_items: items.reduce((acc, i) => acc + i.quantity, 0),
      };
    });

    const summary: WriteOffReportSummary = {
      total_write_offs: aggregate._count.id,
      total_items_lost: totalItemsLost,
    };

    return { success: true, data: { summary, rows } };
  }
}
