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

export interface MonthlyMovements {
  month: string; // "2026-01", "2026-02", etc.
  entries: number;
  exits: number;
  total: number;
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
  movements_by_month: MonthlyMovements[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Servicio
// ─────────────────────────────────────────────────────────────────────────────

export class DashboardService {
  constructor(private readonly db: PrismaClient) {}

  async getStats(): Promise<ServiceResult<DashboardStats>> {
    // Nota: las variantes con area/min_stock se usan para TANTO stock_by_area
    // COMO el conteo de alertas de stock bajo — una sola query cubre ambos casos.
    // Se elimino el groupBy por product_id que no se usaba (variantsByArea).
    const [
      totalActiveProducts,
      totalActiveVariants,
      variantsWithAreaAndStock,
      pendingOrders,
      draftMovements,
      ordersByStatus,
      recentMovements,
      movementsLast6Months,
    ] = await Promise.all([
      // Total de productos activos
      this.db.product.count({ where: { is_active: true } }),

      // Total de variantes activas
      this.db.productVariant.count({
        where: { is_active: true, product: { is_active: true } },
      }),

      // Variantes con area y min_stock: cubre stock_by_area + alertas de bajo stock
      // en un unico viaje a la base de datos (reemplaza allVariantsForLowStock + variantsWithArea)
      this.db.productVariant.findMany({
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
      }),

      // Ordenes de fabricacion pendientes (PENDING + IN_PROGRESS)
      this.db.manufactureOrder.count({
        where: { status: { in: ["PENDING", "IN_PROGRESS"] } },
      }),

      // Movimientos en borrador
      this.db.inventoryMovement.count({ where: { status: "DRAFT" } }),

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

      // Movimientos confirmados de los ultimos 6 meses (para grafico)
      this.db.inventoryMovement.findMany({
        where: {
          status: "CONFIRMED",
          created_at: {
            gte: new Date(
              new Date().getFullYear(),
              new Date().getMonth() - 5,
              1,
            ),
          },
        },
        select: {
          movement_type: true,
          created_at: true,
        },
      }),
    ]);

    // Agrupar por area en aplicacion y calcular alertas de bajo stock
    // en un unico recorrido (evita dos .filter() / .forEach() separados)
    const areaMap = new Map<
      string,
      {
        total_variants: number;
        total_stock: number;
        low_stock_variants: number;
      }
    >();
    let lowStockAlerts = 0;

    for (const v of variantsWithAreaAndStock) {
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
        lowStockAlerts++;
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

    // Agrupar movimientos por mes
    const ENTRY_TYPES = new Set(["ENTRY"]);
    const monthMap = new Map<
      string,
      { entries: number; exits: number; total: number }
    >();

    // Generar los ultimos 6 meses para asegurar meses vacios
    for (let i = 5; i >= 0; i--) {
      const d = new Date(
        new Date().getFullYear(),
        new Date().getMonth() - i,
        1,
      );
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthMap.set(key, { entries: 0, exits: 0, total: 0 });
    }

    for (const m of movementsLast6Months) {
      const d = m.created_at;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const entry = monthMap.get(key);
      if (!entry) continue;
      entry.total++;
      if (ENTRY_TYPES.has(m.movement_type)) {
        entry.entries++;
      } else {
        entry.exits++;
      }
    }

    const movementsByMonth: MonthlyMovements[] = Array.from(
      monthMap.entries(),
    ).map(([month, data]) => ({ month, ...data }));

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
        movements_by_month: movementsByMonth,
      },
    };
  }
}
