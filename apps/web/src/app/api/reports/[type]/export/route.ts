// ═══════════════════════════════════════════════════════════════════════════════
// Route Handler: GET /api/reports/[type]/export
//
// Genera y descarga un reporte en formato Excel (.xlsx).
// Los Server Actions no pueden retornar archivos binarios, por eso usamos
// un Route Handler estándar de Next.js.
//
// Tipos soportados:
//   financiero | inventario | movimientos | dotaciones |
//   consumo-departamentos | bajas
//
// Seguridad:
//   - Valida sesión activa (auth())
//   - Verifica permiso report:export
//   - Parsea filtros desde URL searchParams
//   - Usa ReportsService para obtener datos
//   - Retorna Buffer con Content-Type correcto
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { can } from "@upds/validators";
import { prisma } from "@upds/db";
import { ReportsService } from "@upds/services";
import {
  financialReportFiltersSchema,
  inventoryReportFiltersSchema,
  movementsReportFiltersSchema,
  donationsReportFiltersSchema,
  departmentConsumptionFiltersSchema,
  writeOffsReportFiltersSchema,
} from "@upds/validators";
import type { UserRole } from "@upds/validators";
import {
  financialReportToExcel,
  inventoryReportToExcel,
  movementsReportToExcel,
  donationsReportToExcel,
  departmentConsumptionToExcel,
  writeOffsReportToExcel,
} from "@/lib/reports-export";

// Tipos de reporte soportados y sus etiquetas para el filename
const SUPPORTED_TYPES = [
  "financiero",
  "inventario",
  "movimientos",
  "dotaciones",
  "consumo-departamentos",
  "bajas",
] as const;

type ReportType = (typeof SUPPORTED_TYPES)[number];

function isSupportedType(type: string): type is ReportType {
  return (SUPPORTED_TYPES as readonly string[]).includes(type);
}

// Permiso de acceso mínimo por tipo de reporte
const TYPE_PERMISSIONS: Record<ReportType, Parameters<typeof can>[1]> = {
  financiero: "report:financial",
  inventario: "report:inventory",
  movimientos: "report:movements",
  dotaciones: "report:donations",
  "consumo-departamentos": "report:consumption",
  bajas: "report:write_offs",
};

// ─────────────────────────────────────────────────────────────────────────────
// GET handler
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ type: string }> },
): Promise<NextResponse> {
  // 1. Verificar sesión
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const userRole = session.user.role as UserRole;

  // 2. Verificar permiso general de exportación
  if (!can(userRole, "report:export")) {
    return NextResponse.json(
      { error: "No tiene permisos para exportar reportes" },
      { status: 403 },
    );
  }

  // 3. Validar tipo de reporte
  const { type } = await context.params;

  if (!isSupportedType(type)) {
    return NextResponse.json(
      {
        error: `Tipo de reporte inválido: '${type}'. Tipos soportados: ${SUPPORTED_TYPES.join(", ")}`,
      },
      { status: 404 },
    );
  }

  // 4. Verificar permiso específico del tipo de reporte
  if (!can(userRole, TYPE_PERMISSIONS[type])) {
    return NextResponse.json(
      { error: `No tiene permisos para ver el reporte: ${type}` },
      { status: 403 },
    );
  }

  // 5. Parsear parámetros del URL
  const searchParams = request.nextUrl.searchParams;

  const rawFilters: Record<string, string | undefined> = {
    date_from: searchParams.get("date_from") ?? undefined,
    date_to: searchParams.get("date_to") ?? undefined,
    warehouse_area: searchParams.get("warehouse_area") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    low_stock_only: searchParams.get("low_stock_only") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    movement_type: searchParams.get("movement_type") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    recipient_id: searchParams.get("recipient_id") ?? undefined,
    department_id: searchParams.get("department_id") ?? undefined,
    product_id: searchParams.get("product_id") ?? undefined,
  };

  // 6. Obtener datos y generar Excel
  const reportsService = new ReportsService(prisma);
  const dateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const filename = `reporte-${type}-${dateStr}.xlsx`;

  try {
    let buffer: Buffer;

    switch (type) {
      case "financiero": {
        const parsed = financialReportFiltersSchema.safeParse(rawFilters);
        if (!parsed.success) {
          return NextResponse.json(
            { error: "Filtros inválidos", details: parsed.error.issues },
            { status: 400 },
          );
        }
        const result = await reportsService.getFinancialReport(parsed.data);
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 500 });
        }
        buffer = await financialReportToExcel(
          result.data,
          parsed.data.date_from,
          parsed.data.date_to,
        );
        break;
      }

      case "inventario": {
        const parsed = inventoryReportFiltersSchema.safeParse(rawFilters);
        if (!parsed.success) {
          return NextResponse.json(
            { error: "Filtros inválidos", details: parsed.error.issues },
            { status: 400 },
          );
        }
        const result = await reportsService.getInventoryReport(parsed.data);
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 500 });
        }
        buffer = await inventoryReportToExcel(result.data);
        break;
      }

      case "movimientos": {
        const parsed = movementsReportFiltersSchema.safeParse(rawFilters);
        if (!parsed.success) {
          return NextResponse.json(
            { error: "Filtros inválidos", details: parsed.error.issues },
            { status: 400 },
          );
        }
        // Para exportar, per_page: 0 indica "sin paginacion" al servicio
        const exportFilters = { ...parsed.data, page: 1, per_page: 0 };
        const result = await reportsService.getMovementsReport(exportFilters);
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 500 });
        }
        buffer = await movementsReportToExcel(
          result.data,
          parsed.data.date_from,
          parsed.data.date_to,
        );
        break;
      }

      case "dotaciones": {
        const parsed = donationsReportFiltersSchema.safeParse(rawFilters);
        if (!parsed.success) {
          return NextResponse.json(
            { error: "Filtros inválidos", details: parsed.error.issues },
            { status: 400 },
          );
        }
        const result = await reportsService.getDonationsReport(parsed.data);
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 500 });
        }
        buffer = await donationsReportToExcel(
          result.data,
          parsed.data.date_from,
          parsed.data.date_to,
        );
        break;
      }

      case "consumo-departamentos": {
        const parsed = departmentConsumptionFiltersSchema.safeParse(rawFilters);
        if (!parsed.success) {
          return NextResponse.json(
            { error: "Filtros inválidos", details: parsed.error.issues },
            { status: 400 },
          );
        }
        const result = await reportsService.getDepartmentConsumptionReport(
          parsed.data,
        );
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 500 });
        }
        buffer = await departmentConsumptionToExcel(
          result.data,
          parsed.data.date_from,
          parsed.data.date_to,
        );
        break;
      }

      case "bajas": {
        const parsed = writeOffsReportFiltersSchema.safeParse(rawFilters);
        if (!parsed.success) {
          return NextResponse.json(
            { error: "Filtros inválidos", details: parsed.error.issues },
            { status: 400 },
          );
        }
        const result = await reportsService.getWriteOffsReport(parsed.data);
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 500 });
        }
        buffer = await writeOffsReportToExcel(
          result.data,
          parsed.data.date_from,
          parsed.data.date_to,
        );
        break;
      }
    }

    // 7. Retornar respuesta binaria con headers correctos
    // Convertimos a Uint8Array para que sea un BodyInit válido en Next.js 15
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (err) {
    console.error("[/api/reports/export] Error generando reporte:", err);
    return NextResponse.json(
      { error: "Error interno al generar el reporte Excel" },
      { status: 500 },
    );
  }
}
