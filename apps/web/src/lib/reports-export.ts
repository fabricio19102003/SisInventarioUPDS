// ═══════════════════════════════════════════════════════════════════════════════
// @upds/web — Utilidad de Exportación Excel
// Convierte datos de reportes en workbooks Excel usando exceljs.
// Cada función acepta los datos ya obtenidos del servicio y retorna un Buffer.
//
// Nota: Las funciones son pure en el sentido de que no hacen IO de DB.
//       Solo transforman datos a formato Excel.
// ═══════════════════════════════════════════════════════════════════════════════

import ExcelJS from "exceljs";
import type {
  FinancialReport,
  InventoryReport,
  PaginatedMovementsReport,
  DonationsReport,
  DepartmentConsumptionReport,
  WriteOffsReport,
} from "@upds/services";

// ─────────────────────────────────────────────────────────────────────────────
// Constantes de estilo
// ─────────────────────────────────────────────────────────────────────────────

const HEADER_BG_COLOR = "1F6FEB"; // Azul UPDS
const HEADER_FONT_COLOR = "FFFFFF";
const ALT_ROW_COLOR = "F0F4FF";
const TITLE_COLOR = "1A1A2E";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers internos
// ─────────────────────────────────────────────────────────────────────────────

function formatDateRange(dateFrom?: Date | null, dateTo?: Date | null): string {
  const from = dateFrom
    ? new Date(dateFrom).toLocaleDateString("es-BO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";
  const to = dateTo
    ? new Date(dateTo).toLocaleDateString("es-BO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";
  return `${from} — ${to}`;
}

/**
 * Agrega las primeras 3 filas del encabezado institucional al worksheet:
 *  Fila 1: Sistema + título del reporte
 *  Fila 2: Período / rango de fechas
 *  Fila 3: Fila vacía de separación
 */
function addReportHeader(
  worksheet: ExcelJS.Worksheet,
  reportTitle: string,
  totalColumns: number,
  dateRange?: string,
): void {
  // Fila 1 — Título
  const titleRow = worksheet.addRow([
    `UPDS — Sistema de Inventario | ${reportTitle}`,
  ]);
  titleRow.font = { bold: true, size: 13, color: { argb: `FF${TITLE_COLOR}` } };
  worksheet.mergeCells(titleRow.number, 1, titleRow.number, totalColumns);

  // Fila 2 — Período
  if (dateRange) {
    const periodRow = worksheet.addRow([`Período: ${dateRange}`]);
    periodRow.font = { italic: true, size: 10, color: { argb: "FF666666" } };
    worksheet.mergeCells(periodRow.number, 1, periodRow.number, totalColumns);
  }

  // Fila 3 — Generación
  const genRow = worksheet.addRow([
    `Generado el: ${new Date().toLocaleString("es-BO")}`,
  ]);
  genRow.font = { italic: true, size: 9, color: { argb: "FF999999" } };
  worksheet.mergeCells(genRow.number, 1, genRow.number, totalColumns);

  // Separador
  worksheet.addRow([]);
}

/**
 * Aplica el estilo de cabecera de columna a una fila.
 */
function styleColumnHeader(row: ExcelJS.Row): void {
  row.font = {
    bold: true,
    color: { argb: `FF${HEADER_FONT_COLOR}` },
    size: 10,
  };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: `FF${HEADER_BG_COLOR}` },
  };
  row.alignment = { vertical: "middle", wrapText: false };
  row.height = 20;
}

/**
 * Aplica color de fila alternada a partir de la fila indicada.
 */
function styleDataRows(worksheet: ExcelJS.Worksheet, startRow: number): void {
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber < startRow) return;
    const isAlt = (rowNumber - startRow) % 2 === 1;
    if (isAlt) {
      row.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: `FF${ALT_ROW_COLOR}` },
      };
    }
    row.alignment = { vertical: "middle" };
  });
}

/**
 * Configura anchos razonables para columnas de un worksheet.
 * Acepta un array de anchos por columna (1-indexed).
 */
function setColumnWidths(worksheet: ExcelJS.Worksheet, widths: number[]): void {
  widths.forEach((width, i) => {
    worksheet.getColumn(i + 1).width = width;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Reporte Financiero
// ─────────────────────────────────────────────────────────────────────────────

export async function financialReportToExcel(
  data: FinancialReport,
  dateFrom?: Date | null,
  dateTo?: Date | null,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "UPDS Sistema de Inventario";
  workbook.created = new Date();

  const ws = workbook.addWorksheet("Reporte Financiero");

  const columns = 6;
  setColumnWidths(ws, [18, 16, 30, 20, 10, 15]);

  addReportHeader(
    ws,
    "Reporte Financiero",
    columns,
    formatDateRange(dateFrom, dateTo),
  );

  // Resumen
  const summaryRow = ws.addRow([
    `Resumen: ${data.summary.total_movements} movimientos | ${data.summary.total_items} ítems | Total: Bs. ${Number(data.summary.total_amount).toFixed(2)}`,
  ]);
  summaryRow.font = { bold: true, size: 10 };
  ws.mergeCells(summaryRow.number, 1, summaryRow.number, columns);
  ws.addRow([]);

  // Headers de columna
  const headerRow = ws.addRow([
    "N° Movimiento",
    "Fecha",
    "Destinatario",
    "Documento",
    "Ítems",
    "Total (Bs.)",
  ]);
  styleColumnHeader(headerRow);
  const dataStartRow = headerRow.number + 1;

  // Datos
  if (data.rows.length === 0) {
    const emptyRow = ws.addRow(["Sin datos para el período seleccionado"]);
    emptyRow.font = { italic: true, color: { argb: "FF999999" } };
    ws.mergeCells(emptyRow.number, 1, emptyRow.number, columns);
  } else {
    for (const row of data.rows) {
      const r = ws.addRow([
        row.movement_number,
        new Date(row.processed_at),
        row.recipient_full_name ?? "—",
        row.recipient_document ?? "—",
        row.items_count,
        Number(row.total_amount),
      ]);

      // Formatear celda de fecha
      r.getCell(2).numFmt = "dd/mm/yyyy";
      // Formatear celda de monto
      r.getCell(6).numFmt = '"Bs. "#,##0.00';
    }
  }

  styleDataRows(ws, dataStartRow);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Reporte de Inventario
// ─────────────────────────────────────────────────────────────────────────────

export async function inventoryReportToExcel(
  data: InventoryReport,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "UPDS Sistema de Inventario";
  workbook.created = new Date();

  const ws = workbook.addWorksheet("Inventario Actual");

  const columns = 8;
  setColumnWidths(ws, [25, 15, 18, 12, 14, 12, 12, 12, 10]);

  addReportHeader(ws, "Inventario Actual (Snapshot)", columns);

  // Resumen
  const summaryRow = ws.addRow([
    `Resumen: ${data.total_products} productos | ${data.total_variants} variantes | ${data.low_stock_variants} variantes con stock bajo`,
  ]);
  summaryRow.font = { bold: true, size: 10 };
  ws.mergeCells(summaryRow.number, 1, summaryRow.number, columns);
  ws.addRow([]);

  // Headers
  const headerRow = ws.addRow([
    "Producto",
    "SKU",
    "Categoría",
    "Área",
    "Variante",
    "Stock Actual",
    "Stock Mínimo",
    "Estado",
  ]);
  styleColumnHeader(headerRow);
  const dataStartRow = headerRow.number + 1;

  // Datos
  if (data.products.length === 0) {
    const emptyRow = ws.addRow([
      "Sin productos para los filtros seleccionados",
    ]);
    emptyRow.font = { italic: true, color: { argb: "FF999999" } };
    ws.mergeCells(emptyRow.number, 1, emptyRow.number, columns);
  } else {
    for (const product of data.products) {
      for (const variant of product.variants) {
        const variantParts: string[] = [];
        if (variant.size) variantParts.push(variant.size);
        if (variant.gender) variantParts.push(variant.gender);
        if (variant.color) variantParts.push(variant.color);
        const variantLabel =
          variantParts.length > 0
            ? variantParts.join(" / ")
            : variant.sku_suffix;

        const r = ws.addRow([
          product.product_name,
          product.product_sku,
          product.category,
          product.warehouse_area,
          variantLabel,
          variant.current_stock,
          product.min_stock,
          variant.is_low_stock ? "BAJO" : "OK",
        ]);

        // Resaltar filas con stock bajo
        if (variant.is_low_stock) {
          r.getCell(6).font = { bold: true, color: { argb: "FFCC0000" } };
          r.getCell(8).font = { bold: true, color: { argb: "FFCC0000" } };
        } else {
          r.getCell(8).font = { color: { argb: "FF22AA22" } };
        }
      }
    }
  }

  styleDataRows(ws, dataStartRow);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Reporte de Movimientos
// ─────────────────────────────────────────────────────────────────────────────

export async function movementsReportToExcel(
  data: PaginatedMovementsReport,
  dateFrom?: Date | null,
  dateTo?: Date | null,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "UPDS Sistema de Inventario";
  workbook.created = new Date();

  const ws = workbook.addWorksheet("Movimientos");

  const columns = 8;
  setColumnWidths(ws, [18, 22, 12, 12, 16, 22, 10, 15]);

  addReportHeader(
    ws,
    "Reporte de Movimientos",
    columns,
    formatDateRange(dateFrom, dateTo),
  );

  // Resumen
  const summaryRow = ws.addRow([`Total de movimientos: ${data.total}`]);
  summaryRow.font = { bold: true, size: 10 };
  ws.mergeCells(summaryRow.number, 1, summaryRow.number, columns);
  ws.addRow([]);

  // Headers
  const headerRow = ws.addRow([
    "N° Movimiento",
    "Tipo",
    "Estado",
    "Fecha",
    "Procesado por",
    "Destinatario / Depto.",
    "Ítems",
    "Total (Bs.)",
  ]);
  styleColumnHeader(headerRow);
  const dataStartRow = headerRow.number + 1;

  // Datos
  if (data.rows.length === 0) {
    const emptyRow = ws.addRow([
      "Sin movimientos para los filtros seleccionados",
    ]);
    emptyRow.font = { italic: true, color: { argb: "FF999999" } };
    ws.mergeCells(emptyRow.number, 1, emptyRow.number, columns);
  } else {
    for (const row of data.rows) {
      const r = ws.addRow([
        row.movement_number,
        row.movement_type,
        row.status,
        row.processed_at ? new Date(row.processed_at) : "—",
        row.processed_by_name,
        row.recipient_name ?? row.department_name ?? "—",
        row.items_count,
        Number(row.total_amount),
      ]);

      if (row.processed_at) {
        r.getCell(4).numFmt = "dd/mm/yyyy";
      }
      r.getCell(8).numFmt = '"Bs. "#,##0.00';
    }
  }

  styleDataRows(ws, dataStartRow);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Reporte de Dotaciones a Becarios
// ─────────────────────────────────────────────────────────────────────────────

export async function donationsReportToExcel(
  data: DonationsReport,
  dateFrom?: Date | null,
  dateTo?: Date | null,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "UPDS Sistema de Inventario";
  workbook.created = new Date();

  const ws = workbook.addWorksheet("Dotaciones");

  const columns = 7;
  setColumnWidths(ws, [18, 16, 30, 20, 25, 22, 10]);

  addReportHeader(
    ws,
    "Reporte de Dotaciones a Becarios",
    columns,
    formatDateRange(dateFrom, dateTo),
  );

  // Resumen
  const summaryRow = ws.addRow([
    `Resumen: ${data.summary.total_donations} dotaciones | ${data.summary.total_items} ítems entregados`,
  ]);
  summaryRow.font = { bold: true, size: 10 };
  ws.mergeCells(summaryRow.number, 1, summaryRow.number, columns);
  ws.addRow([]);

  // Headers
  const headerRow = ws.addRow([
    "N° Movimiento",
    "Fecha",
    "Becario",
    "Documento",
    "Producto",
    "Variante",
    "Cantidad",
  ]);
  styleColumnHeader(headerRow);
  const dataStartRow = headerRow.number + 1;

  // Datos — una fila por item
  if (data.rows.length === 0) {
    const emptyRow = ws.addRow(["Sin dotaciones para el período seleccionado"]);
    emptyRow.font = { italic: true, color: { argb: "FF999999" } };
    ws.mergeCells(emptyRow.number, 1, emptyRow.number, columns);
  } else {
    for (const row of data.rows) {
      for (const item of row.items) {
        const variantParts: string[] = [];
        if (item.size) variantParts.push(item.size);
        if (item.gender) variantParts.push(item.gender);
        if (item.color) variantParts.push(item.color);
        const variantLabel =
          variantParts.length > 0 ? variantParts.join(" / ") : "—";

        const r = ws.addRow([
          row.movement_number,
          new Date(row.processed_at),
          row.recipient_full_name,
          row.recipient_document,
          `${item.product_name} (${item.product_sku})`,
          variantLabel,
          item.quantity,
        ]);

        r.getCell(2).numFmt = "dd/mm/yyyy";
      }
    }
  }

  styleDataRows(ws, dataStartRow);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Reporte de Consumo por Departamento
// ─────────────────────────────────────────────────────────────────────────────

export async function departmentConsumptionToExcel(
  data: DepartmentConsumptionReport,
  dateFrom?: Date | null,
  dateTo?: Date | null,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "UPDS Sistema de Inventario";
  workbook.created = new Date();

  const ws = workbook.addWorksheet("Consumo por Departamento");

  const columns = 5;
  setColumnWidths(ws, [35, 18, 18, 18, 20]);

  addReportHeader(
    ws,
    "Consumo por Departamento",
    columns,
    formatDateRange(dateFrom, dateTo),
  );

  // Resumen
  const summaryRow = ws.addRow([
    `Resumen: ${data.total_departments} departamentos | ${data.total_deliveries} entregas | ${data.total_items} ítems totales`,
  ]);
  summaryRow.font = { bold: true, size: 10 };
  ws.mergeCells(summaryRow.number, 1, summaryRow.number, columns);
  ws.addRow([]);

  // Headers
  const headerRow = ws.addRow([
    "Departamento",
    "Código",
    "Total Entregas",
    "Total Ítems",
    "Última Entrega",
  ]);
  styleColumnHeader(headerRow);
  const dataStartRow = headerRow.number + 1;

  // Datos
  if (data.rows.length === 0) {
    const emptyRow = ws.addRow(["Sin entregas para el período seleccionado"]);
    emptyRow.font = { italic: true, color: { argb: "FF999999" } };
    ws.mergeCells(emptyRow.number, 1, emptyRow.number, columns);
  } else {
    for (const row of data.rows) {
      const r = ws.addRow([
        row.department_name,
        row.department_code,
        row.total_deliveries,
        row.total_items,
        row.last_delivery_at ? new Date(row.last_delivery_at) : "—",
      ]);

      if (row.last_delivery_at) {
        r.getCell(5).numFmt = "dd/mm/yyyy";
      }
    }

    // Fila de totales
    ws.addRow([]); // separador
    const totalRow = ws.addRow([
      "TOTAL",
      "",
      data.total_deliveries,
      data.total_items,
      "",
    ]);
    totalRow.font = { bold: true };
    totalRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE8F0FE" },
    };
  }

  styleDataRows(ws, dataStartRow);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Reporte de Bajas por Deterioro
// ─────────────────────────────────────────────────────────────────────────────

export async function writeOffsReportToExcel(
  data: WriteOffsReport,
  dateFrom?: Date | null,
  dateTo?: Date | null,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "UPDS Sistema de Inventario";
  workbook.created = new Date();

  const ws = workbook.addWorksheet("Bajas por Deterioro");

  const columns = 7;
  setColumnWidths(ws, [18, 16, 22, 25, 22, 10, 45]);

  addReportHeader(
    ws,
    "Reporte de Bajas por Deterioro",
    columns,
    formatDateRange(dateFrom, dateTo),
  );

  // Resumen
  const summaryRow = ws.addRow([
    `Resumen: ${data.summary.total_write_offs} bajas | ${data.summary.total_items_lost} ítems dados de baja`,
  ]);
  summaryRow.font = { bold: true, size: 10 };
  ws.mergeCells(summaryRow.number, 1, summaryRow.number, columns);
  ws.addRow([]);

  // Headers
  const headerRow = ws.addRow([
    "N° Movimiento",
    "Fecha",
    "Procesado por",
    "Producto",
    "Variante",
    "Cantidad",
    "Justificación",
  ]);
  styleColumnHeader(headerRow);
  const dataStartRow = headerRow.number + 1;

  // Datos — una fila por item
  if (data.rows.length === 0) {
    const emptyRow = ws.addRow(["Sin bajas para el período seleccionado"]);
    emptyRow.font = { italic: true, color: { argb: "FF999999" } };
    ws.mergeCells(emptyRow.number, 1, emptyRow.number, columns);
  } else {
    for (const row of data.rows) {
      for (const item of row.items) {
        const variantParts: string[] = [];
        if (item.size) variantParts.push(item.size);
        if (item.gender) variantParts.push(item.gender);
        if (item.color) variantParts.push(item.color);
        const variantLabel =
          variantParts.length > 0 ? variantParts.join(" / ") : "—";

        const r = ws.addRow([
          row.movement_number,
          new Date(row.processed_at),
          row.processed_by_name,
          `${item.product_name} (${item.product_sku})`,
          variantLabel,
          item.quantity,
          row.notes ?? "Sin justificación registrada",
        ]);

        r.getCell(2).numFmt = "dd/mm/yyyy";
        // Forzar wrap en la columna de justificación
        r.getCell(7).alignment = { wrapText: true, vertical: "top" };
        r.getCell(6).font = { bold: true, color: { argb: "FFCC0000" } };
      }
    }
  }

  styleDataRows(ws, dataStartRow);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
