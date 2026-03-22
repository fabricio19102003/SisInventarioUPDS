// ═══════════════════════════════════════════════════════════════════════════════
// @upds/services — Dashboard / Reportes
// Queries de resumen para la pantalla principal del sistema.
// Solo lectura: no muta datos ni registra audit.
// ═══════════════════════════════════════════════════════════════════════════════

import { type PrismaClient, type Prisma } from "@upds/db";
import type { ServiceResult } from "./auth";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos de respuesta
// ─────────────────────────────────────────────────────────────────────────────

export interface StockByArea {
  warehouse_area: string;
  total_variants: number;
  total_stock: number;
  low_stock_variants: number;
}

export interface OrderStatusSummary {
  status: string;
  count: number;
}

export interface RecentMovement {
  id: string;
  movement_number: string;
  movement_type: string;
  status: string;
  total_amount: Prisma.Decimal | number | string;
  created_at: Date;
  recipient_name: string | null;
  department_name: string | null;
}

export interface DashboardStats {
  total_active_products: number;
  total_active_variants: number;
  low_stock_alerts: number;
  pending_manufacture_orders: number;
  draft_movements: number;
  stock_by_area: StockByArea[];
  manufacture_orders_by_status: OrderStatusSummary[];
  recent_movements: RecentMovement[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Servicio
// ─────────────────────────────────────────────────────────────────────────────

export class DashboardService {
  constructor(private readonly db: PrismaClient) {}

  async getStats(): Promise<ServiceResult<DashboardStats>> {
    const [
      totalActiveProducts,
      totalActiveVariants,
      allVariantsForLowStock,
      pendingOrders,
      draftMovements,
      variantsByArea,
      ordersByStatus,
      recentMovements,
    ] = await Promise.all([
      // Total de productos activos
      this.db.product.count({ where: { is_active: true } }),

      // Total de variantes activas
      this.db.productVariant.count({
        where: { is_active: true, product: { is_active: true } },
      }),

      // Variantes para calcular alertas de stock bajo
      this.db.productVariant.findMany({
        where: { is_active: true, product: { is_active: true } },
        select: {
          current_stock: true,
          product: { select: { min_stock: true } },
        },
      }),

      // Ordenes de fabricacion pendientes (PENDING + IN_PROGRESS)
      this.db.manufactureOrder.count({
        where: { status: { in: ["PENDING", "IN_PROGRESS"] } },
      }),

      // Movimientos en borrador
      this.db.inventoryMovement.count({ where: { status: "DRAFT" } }),

      // Stock por area de almacen
      this.db.productVariant.groupBy({
        by: ["product_id"],
        where: { is_active: true, product: { is_active: true } },
        _sum: { current_stock: true },
        _count: { id: true },
      }),

      // Ordenes por estado
      this.db.manufactureOrder.groupBy({
        by: ["status"],
        _count: { id: true },
      }),

      // Ultimos 10 movimientos
      this.db.inventoryMovement.findMany({
        take: 10,
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          movement_number: true,
          movement_type: true,
          status: true,
          total_amount: true,
          created_at: true,
          recipient: { select: { full_name: true } },
          department: { select: { name: true } },
        },
      }),
    ]);

    // Calcular alertas de stock bajo
    const lowStockAlerts = allVariantsForLowStock.filter(
      (v) => v.current_stock < v.product.min_stock,
    ).length;

    // Para stock_by_area necesitamos cruzar con el warehouse_area del producto
    // Hacemos una query separada mas directa
    const variantsWithArea = await this.db.productVariant.findMany({
      where: { is_active: true, product: { is_active: true } },
      select: {
        current_stock: true,
        product: {
          select: {
            warehouse_area: true,
            min_stock: true,
          },
        },
      },
    });

    // Agrupar por area en aplicacion
    const areaMap = new Map<
      string,
      { total_variants: number; total_stock: number; low_stock_variants: number }
    >();

    for (const v of variantsWithArea) {
      const area = v.product.warehouse_area;
      const entry = areaMap.get(area) ?? {
        total_variants: 0,
        total_stock: 0,
        low_stock_variants: 0,
      };
      entry.total_variants++;
      entry.total_stock += v.current_stock;
      if (v.current_stock < v.product.min_stock) {
        entry.low_stock_variants++;
      }
      areaMap.set(area, entry);
    }

    const stockByArea: StockByArea[] = Array.from(areaMap.entries()).map(
      ([warehouse_area, data]) => ({ warehouse_area, ...data }),
    );

    const manufactureOrdersByStatus: OrderStatusSummary[] = ordersByStatus.map(
      (row) => ({ status: row.status, count: row._count.id }),
    );

    const recentMovementsData: RecentMovement[] = recentMovements.map((m) => ({
      id: m.id,
      movement_number: m.movement_number,
      movement_type: m.movement_type,
      status: m.status,
      total_amount: m.total_amount,
      created_at: m.created_at,
      recipient_name: m.recipient?.full_name ?? null,
      department_name: m.department?.name ?? null,
    }));

    // Suprimir advertencias de variables no usadas de groupBy (solo usamos variantsWithArea)
    void variantsByArea;

    return {
      success: true,
      data: {
        total_active_products: totalActiveProducts,
        total_active_variants: totalActiveVariants,
        low_stock_alerts: lowStockAlerts,
        pending_manufacture_orders: pendingOrders,
        draft_movements: draftMovements,
        stock_by_area: stockByArea,
        manufacture_orders_by_status: manufactureOrdersByStatus,
        recent_movements: recentMovementsData,
      },
    };
  }
}
