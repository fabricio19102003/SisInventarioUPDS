import { getInventoryReportAction } from "@/actions/reports";
import { getServerSession } from "@/lib/session";
import type { InventoryProductRow, InventoryVariantRow } from "@upds/services";
import { Badge, PageTransition } from "@upds/ui";
import {
  PRODUCT_CATEGORY_LABELS,
  GARMENT_TYPE_LABELS,
  WAREHOUSE_AREA_LABELS,
  SIZE_LABELS,
  GENDER_LABELS,
} from "@upds/validators";
import { Boxes, AlertTriangle, CheckCircle2 } from "lucide-react";
import { InventoryFilter } from "../components/inventory-filter";
import { ExportButton } from "../components/export-button";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getVariantLabel(variant: InventoryVariantRow): string {
  const parts: string[] = [];
  if (variant.size) parts.push(SIZE_LABELS[variant.size as keyof typeof SIZE_LABELS] ?? variant.size);
  if (variant.gender) parts.push(GENDER_LABELS[variant.gender as keyof typeof GENDER_LABELS] ?? variant.gender);
  if (variant.color) parts.push(variant.color);
  return parts.length > 0 ? parts.join(" / ") : variant.sku_suffix;
}

// ---------------------------------------------------------------------------
// Summary Card
// ---------------------------------------------------------------------------

function SummaryCard({
  label,
  value,
  icon: Icon,
  alert,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-5 ${
        alert ? "border-destructive/50 bg-destructive/5" : "bg-card"
      }`}
    >
      <div className="flex items-center gap-3 mb-2">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-md ${
            alert ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${alert ? "text-destructive" : ""}`}>
        {value}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inventory Table
// ---------------------------------------------------------------------------

function InventoryTable({ products }: { products: InventoryProductRow[] }) {
  if (products.length === 0) {
    return (
      <div className="rounded-lg border p-10 text-center text-sm text-muted-foreground">
        No se encontraron resultados para los filtros seleccionados.
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Producto / SKU
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Categoría
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Variante
              </th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                Stock Actual
              </th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                Stock Mínimo
              </th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                Estado
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {products.map((product) =>
              product.variants.map((variant, vIdx) => (
                <tr
                  key={variant.variant_id}
                  className={`transition-colors ${
                    variant.is_low_stock
                      ? "bg-destructive/5 hover:bg-destructive/10"
                      : "hover:bg-muted/30"
                  }`}
                >
                  {/* Product info — only shown in first variant row */}
                  {vIdx === 0 ? (
                    <td
                      className="px-4 py-3 align-top"
                      rowSpan={product.variants.length}
                    >
                      <div className="flex items-start gap-2">
                        {product.has_low_stock && (
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                        )}
                        <div>
                          <p className="font-medium leading-tight">{product.product_name}</p>
                          <p className="font-mono text-xs text-muted-foreground">
                            {product.product_sku}
                          </p>
                          {product.garment_type && (
                            <p className="text-xs text-muted-foreground">
                              {GARMENT_TYPE_LABELS[product.garment_type as keyof typeof GARMENT_TYPE_LABELS]}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                  ) : null}

                  {/* Category — only shown in first row */}
                  {vIdx === 0 ? (
                    <td
                      className="px-4 py-3 align-top"
                      rowSpan={product.variants.length}
                    >
                      <div className="space-y-1">
                        <Badge variant="outline" className="text-xs">
                          {PRODUCT_CATEGORY_LABELS[product.category as keyof typeof PRODUCT_CATEGORY_LABELS]}
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          {WAREHOUSE_AREA_LABELS[product.warehouse_area as keyof typeof WAREHOUSE_AREA_LABELS]}
                        </p>
                      </div>
                    </td>
                  ) : null}

                  {/* Variant */}
                  <td className="px-4 py-3">
                    <span className="text-sm">
                      {getVariantLabel(variant)}
                    </span>
                  </td>

                  {/* Stock Actual */}
                  <td className="px-4 py-3 text-center">
                    <span
                      className={
                        variant.is_low_stock
                          ? "font-bold text-destructive"
                          : "font-medium"
                      }
                    >
                      {variant.current_stock}
                    </span>
                  </td>

                  {/* Stock Mínimo */}
                  <td className="px-4 py-3 text-center text-muted-foreground">
                    {product.min_stock}
                  </td>

                  {/* Estado */}
                  <td className="px-4 py-3 text-center">
                    {variant.is_low_stock ? (
                      <Badge
                        variant="destructive"
                        className="gap-1 text-xs"
                      >
                        <AlertTriangle className="h-3 w-3" />
                        Bajo
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="gap-1 text-xs border-green-500 text-green-600"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        OK
                      </Badge>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function InventarioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const [params, session] = await Promise.all([
    searchParams,
    getServerSession(),
  ]);

  const result = await getInventoryReportAction({
    warehouse_area: params.warehouse_area || undefined,
    category: params.category || undefined,
    low_stock_only: params.low_stock_only === "true" ? true : undefined,
    search: params.search || undefined,
  });

  if (!result.success) {
    return (
      <div className="rounded-lg border border-destructive/50 p-6 text-center text-sm text-destructive">
        Error al cargar el reporte: {result.error}
      </div>
    );
  }

  const { products, total_products, total_variants, low_stock_variants } =
    result.data;

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Reporte de Inventario</h1>
            <p className="text-sm text-muted-foreground">
              Snapshot en tiempo real del stock por variante
            </p>
          </div>
          {session && (
            <ExportButton
              reportType="inventario"
              userRole={session.role}
              currentFilters={{
                warehouse_area: params.warehouse_area,
                category: params.category,
                low_stock_only: params.low_stock_only,
                search: params.search,
              }}
            />
          )}
        </div>

        {/* Filtros */}
        <InventoryFilter />

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryCard
            label="Total Productos"
            value={total_products.toLocaleString("es-BO")}
            icon={Boxes}
          />
          <SummaryCard
            label="Total Variantes"
            value={total_variants.toLocaleString("es-BO")}
            icon={Boxes}
          />
          <SummaryCard
            label="Variantes con Stock Bajo"
            value={low_stock_variants.toLocaleString("es-BO")}
            icon={AlertTriangle}
            alert={low_stock_variants > 0}
          />
        </div>

        {/* Table */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Detalle por Variante
          </h2>
          <InventoryTable products={products} />
        </div>
      </div>
    </PageTransition>
  );
}
