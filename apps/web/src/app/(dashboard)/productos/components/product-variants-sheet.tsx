"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ProductData, ProductVariantData } from "@upds/services";
import {
  SIZE_LABELS,
  PRODUCT_CATEGORY_LABELS,
} from "@upds/validators";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Badge,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  Separator,
  useToast,
} from "@upds/ui";
import { Plus, PowerOff, RotateCcw } from "lucide-react";
import {
  deactivateVariantAction,
  reactivateVariantAction,
} from "@/actions/products";
import { AddVariantForm } from "./add-variant-form";
import { InitialStockButton } from "./initial-stock-button";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ProductVariantsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductData | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProductVariantsSheet({
  open,
  onOpenChange,
  product,
}: ProductVariantsSheetProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [addVariantOpen, setAddVariantOpen] = useState(false);

  if (!product) return null;

  const isMedical = product.category === "MEDICAL_GARMENT";
  const isOffice = product.category === "OFFICE_SUPPLY";

  function handleDeactivateVariant(variant: ProductVariantData) {
    startTransition(async () => {
      const result = await deactivateVariantAction(variant.id);
      if (!result.success) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
        return;
      }
      toast({ title: "Variante desactivada correctamente." });
      router.refresh();
    });
  }

  function handleReactivateVariant(variantId: string) {
    startTransition(async () => {
      const result = await reactivateVariantAction(variantId);
      if (!result.success) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
        return;
      }
      toast({ title: "Variante reactivada correctamente." });
      router.refresh();
    });
  }

  const activeVariants = product.variants.filter((v) => v.is_active).length;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="space-y-1">
            <SheetTitle>{product.name}</SheetTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm text-muted-foreground">
                {product.sku}
              </span>
              <Badge variant="outline">
                {PRODUCT_CATEGORY_LABELS[product.category as keyof typeof PRODUCT_CATEGORY_LABELS]}
              </Badge>
              <Badge variant={product.is_active ? "default" : "secondary"}>
                {product.is_active ? "Activo" : "Inactivo"}
              </Badge>
            </div>
          </SheetHeader>

          <Separator className="my-4" />

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold">{product.variants.length}</p>
              <p className="text-xs text-muted-foreground">Total variantes</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold">{activeVariants}</p>
              <p className="text-xs text-muted-foreground">Activas</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold">
                {product.variants
                  .filter((v) => v.is_active)
                  .reduce((sum, v) => sum + v.current_stock, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Stock total</p>
            </div>
          </div>

          {/* Agregar variante — solo MEDICAL activo */}
          {isMedical && product.is_active && (
            <div className="mb-4">
              <Button
                size="sm"
                onClick={() => setAddVariantOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Agregar Variante
              </Button>
            </div>
          )}

          {/* Tabla de variantes */}
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU Sufijo</TableHead>
                  {isMedical && (
                    <>
                      <TableHead>Talla</TableHead>
                      <TableHead>Género</TableHead>
                      <TableHead>Color</TableHead>
                    </>
                  )}
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[190px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {product.variants.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={isMedical ? 7 : 4}
                      className="py-6 text-center text-sm text-muted-foreground"
                    >
                      Sin variantes registradas.
                    </TableCell>
                  </TableRow>
                ) : (
                  product.variants.map((v) => {
                    const isLowStock =
                      v.is_active && v.current_stock < product.min_stock;
                    return (
                      <TableRow key={v.id}>
                        <TableCell>
                          <span className="font-mono text-xs">{v.sku_suffix}</span>
                        </TableCell>
                        {isMedical && (
                          <>
                            <TableCell>
                              {v.size
                                ? SIZE_LABELS[v.size as keyof typeof SIZE_LABELS]?.split(" ")[0]
                                : "—"}
                            </TableCell>
                            <TableCell>{v.gender ?? "—"}</TableCell>
                            <TableCell>{v.color ?? "—"}</TableCell>
                          </>
                        )}
                        <TableCell className="text-right">
                          <span
                            className={
                              isLowStock
                                ? "font-bold text-destructive"
                                : "font-medium"
                            }
                          >
                            {v.current_stock}
                          </span>
                          {isLowStock && (
                            <span className="ml-1 text-xs text-destructive">
                              (mín: {product.min_stock})
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={v.is_active ? "default" : "secondary"}
                          >
                            {v.is_active ? "Activa" : "Inactiva"}
                          </Badge>
                        </TableCell>
                          <TableCell>
                           <div className="flex items-center justify-end gap-2">
                           <InitialStockButton
                             productVariantId={v.id}
                             productLabel={`${product.sku}-${v.sku_suffix}`}
                             disabled={!product.is_active || !v.is_active}
                           />
                           {v.is_active ? (
                             <AlertDialog>
                               <AlertDialogTrigger asChild>
                                 <Button
                                   variant="ghost"
                                  size="icon"
                                  disabled={isPending}
                                >
                                  <PowerOff className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    ¿Desactivar variante?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Se desactivará la variante{" "}
                                    <strong>{v.sku_suffix}</strong>.
                                    {v.current_stock > 0 && (
                                      <span className="block mt-1 text-destructive font-medium">
                                        Tiene {v.current_stock} unidades en
                                        stock. Realizá una baja primero.
                                      </span>
                                    )}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => handleDeactivateVariant(v)}
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
                              disabled={isPending || !product.is_active}
                              onClick={() => handleReactivateVariant(v.id)}
                            >
                               <RotateCcw className="h-4 w-4 text-green-600" />
                             </Button>
                           )}
                           </div>
                          </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {isOffice && (
            <p className="mt-3 text-xs text-muted-foreground">
              Los productos de material de oficina tienen una sola variante DEFAULT.
            </p>
          )}
        </SheetContent>
      </Sheet>

      <AddVariantForm
        open={addVariantOpen}
        onOpenChange={setAddVariantOpen}
        productId={product.id}
        productName={product.name}
      />
    </>
  );
}
