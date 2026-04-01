"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { ProductData } from "@upds/services";
import type { ColumnDef } from "@upds/ui";
import {
  PRODUCT_CATEGORY_LABELS,
  GARMENT_TYPE_LABELS,
  WAREHOUSE_AREA_LABELS,
  ProductCategory,
  enumToOptions,
} from "@upds/validators";
import {
  DataTable,
  DataTableColumnHeader,
  Badge,
  Button,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  useToast,
} from "@upds/ui";
import {
  Plus,
  Pencil,
  Layers,
  PowerOff,
  RotateCcw,
  Search,
  AlertTriangle,
} from "lucide-react";
import {
  deactivateProductAction,
  reactivateProductAction,
} from "@/actions/products";
import { ProductCreateForm } from "./product-create-form";
import { ProductEditForm } from "./product-edit-form";
import { ProductVariantsSheet } from "./product-variants-sheet";
import { InitialStockButton } from "./initial-stock-button";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ProductsTableProps {
  products: ProductData[];
  total: number;
  page: number;
  perPage: number;
}

const categoryOptions = enumToOptions(ProductCategory, PRODUCT_CATEGORY_LABELS);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTotalActiveStock(product: ProductData): number {
  return product.variants
    .filter((v) => v.is_active)
    .reduce((sum, v) => sum + v.current_stock, 0);
}

function hasLowStock(product: ProductData): boolean {
  return product.variants.some(
    (v) => v.is_active && v.current_stock < product.min_stock,
  );
}

function getSingleActiveVariant(product: ProductData) {
  const activeVariants = product.variants.filter((variant) => variant.is_active);
  return activeVariants.length === 1 ? activeVariants[0] : null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProductsTable({
  products,
  total,
  page,
  perPage,
}: ProductsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [createOpen, setCreateOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<ProductData | null>(null);
  const [sheetProduct, setSheetProduct] = useState<ProductData | null>(null);

  // -------------------------------------------------------------------------
  // URL helpers
  // -------------------------------------------------------------------------

  function pushParams(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const search = (
      e.currentTarget.elements.namedItem("search") as HTMLInputElement
    ).value;
    pushParams({ search: search || undefined, page: undefined });
  }

  function handleDeactivate(productId: string) {
    startTransition(async () => {
      const result = await deactivateProductAction(productId);
      if (!result.success) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
        return;
      }
      toast({ title: "Producto desactivado correctamente." });
      router.refresh();
    });
  }

  function handleReactivate(productId: string) {
    startTransition(async () => {
      const result = await reactivateProductAction(productId);
      if (!result.success) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
        return;
      }
      toast({ title: "Producto reactivado correctamente." });
      router.refresh();
    });
  }

  // -------------------------------------------------------------------------
  // Derived state from URL
  // -------------------------------------------------------------------------

  const currentSearch = searchParams.get("search") ?? "";
  const currentCategory = searchParams.get("category") ?? "all";
  const currentStatus = searchParams.get("is_active") ?? "all";
  const isLowStockFilter = searchParams.get("low_stock") === "true";

  // -------------------------------------------------------------------------
  // Columns
  // -------------------------------------------------------------------------

  const columns: ColumnDef<ProductData>[] = [
    {
      accessorKey: "sku",
      header: ({ column }) => <DataTableColumnHeader column={column} title="SKU" />,
      cell: ({ row }) => (
        <span className="font-mono text-sm font-medium">
          {row.getValue("sku")}
        </span>
      ),
    },
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
      cell: ({ row }) => {
        const p = row.original;
        const lowStock = hasLowStock(p);
        return (
          <div>
            <div className="flex items-center gap-2">
              {lowStock && p.is_active && (
                <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
              )}
              <span className="font-medium">{p.name}</span>
            </div>
            {p.garment_type && (
              <span className="text-xs text-muted-foreground">
                {GARMENT_TYPE_LABELS[p.garment_type as keyof typeof GARMENT_TYPE_LABELS]}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "category",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Categoría" />,
      cell: ({ row }) => (
        <Badge variant="outline" className="text-xs">
          {PRODUCT_CATEGORY_LABELS[row.getValue("category") as keyof typeof PRODUCT_CATEGORY_LABELS]}
        </Badge>
      ),
    },
    {
      accessorKey: "warehouse_area",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Área" />,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {WAREHOUSE_AREA_LABELS[row.getValue("warehouse_area") as keyof typeof WAREHOUSE_AREA_LABELS]}
        </span>
      ),
    },
    {
      id: "total_stock",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Stock total" />,
      cell: ({ row }) => {
        const p = row.original;
        const totalStock = getTotalActiveStock(p);
        const lowStock = hasLowStock(p);
        return (
          <div className="text-right">
            <span
              className={
                lowStock && p.is_active
                  ? "font-bold text-destructive"
                  : "font-medium"
              }
            >
              {totalStock}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "min_stock",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Mín." />,
      cell: ({ row }) => (
        <div className="text-right text-muted-foreground text-sm">
          {row.getValue("min_stock")}
        </div>
      ),
    },
    {
      id: "variants_count",
      header: "Variantes",
      cell: ({ row }) => {
        const p = row.original;
        const activeVariants = p.variants.filter((v) => v.is_active).length;
        return (
          <span className="text-sm">
            {activeVariants}/{p.variants.length}
          </span>
        );
      },
    },
    {
      accessorKey: "is_active",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => {
        const isActive = row.getValue("is_active") as boolean;
        return (
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Activo" : "Inactivo"}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      size: 220,
      enableSorting: false,
      cell: ({ row }) => {
        const p = row.original;
        const singleVariant = getSingleActiveVariant(p);
        return (
          <div className="flex items-center gap-1">
            {p.is_active && singleVariant ? (
              <InitialStockButton
                productVariantId={singleVariant.id}
                productLabel={`${p.sku}-${singleVariant.sku_suffix}`}
              />
            ) : p.is_active ? (
              <Button variant="outline" size="sm" onClick={() => setSheetProduct(p)}>
                Stock
              </Button>
            ) : null}

            {/* Ver variantes */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSheetProduct(p)}
            >
              <Layers className="h-4 w-4" />
              <span className="sr-only">Ver variantes</span>
            </Button>

            {/* Editar */}
            <Button
              variant="ghost"
              size="icon"
              disabled={!p.is_active}
              onClick={() => setEditProduct(p)}
            >
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Editar</span>
            </Button>

            {/* Desactivar / Reactivar */}
            {p.is_active ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={isPending}
                  >
                    <PowerOff className="h-4 w-4 text-destructive" />
                    <span className="sr-only">Desactivar</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      ¿Desactivar producto?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Se desactivará{" "}
                      <strong>
                        {p.name} ({p.sku})
                      </strong>{" "}
                      junto con todas sus variantes. Solo es posible
                      si todas las variantes tienen stock en cero.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => handleDeactivate(p.id)}
                    >
                      Desactivar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                disabled={isPending}
                onClick={() => handleReactivate(p.id)}
              >
                <RotateCcw className="h-4 w-4 text-green-600" />
                <span className="sr-only">Reactivar</span>
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Productos</h1>
          <p className="text-sm text-muted-foreground">
            Indumentaria médica y material de oficina
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Producto
        </Button>
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={products}
        toolbar={
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <form onSubmit={handleSearch} className="flex flex-1 gap-2 min-w-[200px]">
              <Input
                name="search"
                placeholder="Buscar por SKU o nombre..."
                defaultValue={currentSearch}
                className="flex-1"
              />
              <Button type="submit" variant="outline" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </form>

            <Select
              value={currentCategory}
              onValueChange={(v) =>
                pushParams({ category: v === "all" ? undefined : v, page: undefined })
              }
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categoryOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={currentStatus}
              onValueChange={(v) =>
                pushParams({ is_active: v === "all" ? undefined : v, page: undefined })
              }
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="true">Activos</SelectItem>
                <SelectItem value="false">Inactivos</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant={isLowStockFilter ? "destructive" : "outline"}
              size="sm"
              onClick={() =>
                pushParams({
                  low_stock: isLowStockFilter ? undefined : "true",
                  page: undefined,
                })
              }
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Stock bajo
            </Button>
          </div>
        }
        emptyState={
          <div className="py-10 text-center text-sm text-muted-foreground">
            No se encontraron productos.
          </div>
        }
        rowCount={total}
        pagination={{ pageIndex: page - 1, pageSize: perPage }}
        onPaginationChange={(updater) => {
          const next =
            typeof updater === "function"
              ? updater({ pageIndex: page - 1, pageSize: perPage })
              : updater;
          pushParams({ page: String(next.pageIndex + 1) });
        }}
      />

      {/* Dialogs / Sheet */}
      <ProductCreateForm open={createOpen} onOpenChange={setCreateOpen} />

      {editProduct && (
        <ProductEditForm
          open={!!editProduct}
          onOpenChange={(v) => { if (!v) setEditProduct(null); }}
          product={editProduct}
        />
      )}

      <ProductVariantsSheet
        open={!!sheetProduct}
        onOpenChange={(v) => { if (!v) setSheetProduct(null); }}
        product={sheetProduct}
      />
    </div>
  );
}
