"use client";

import { useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ProductData } from "@upds/services";
import {
  PRODUCT_CATEGORY_LABELS,
  GARMENT_TYPE_LABELS,
  WAREHOUSE_AREA_LABELS,
} from "@upds/validators";
import {
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Textarea,
  Separator,
  useToast,
} from "@upds/ui";
import { updateProductAction } from "@/actions/products";

// ---------------------------------------------------------------------------
// Schema — solo los campos editables
// ---------------------------------------------------------------------------

const editSchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(255),
  description: z.string().max(2000).optional().or(z.literal("")),
  min_stock: z.coerce
    .number({ invalid_type_error: "Debe ser un número" })
    .int("Debe ser un número entero")
    .min(0, "No puede ser negativo"),
});

type EditValues = z.infer<typeof editSchema>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ProductEditFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductData;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProductEditForm({
  open,
  onOpenChange,
  product,
}: ProductEditFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
  });

  useEffect(() => {
    if (open) {
      reset({
        name: product.name,
        description: product.description ?? "",
        min_stock: product.min_stock,
      });
    }
  }, [open, product, reset]);

  const onSubmit = (values: EditValues) => {
    startTransition(async () => {
      const result = await updateProductAction({
        id: product.id,
        name: values.name,
        description: values.description || undefined,
        min_stock: values.min_stock,
      });

      if (!result.success) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
        return;
      }

      toast({ title: "Producto actualizado correctamente." });
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Producto</DialogTitle>
        </DialogHeader>

        {/* Datos inmutables — solo lectura */}
        <div className="rounded-lg bg-muted/50 px-4 py-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">SKU</span>
            <span className="font-mono font-medium">{product.sku}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Categoría</span>
            <span>{PRODUCT_CATEGORY_LABELS[product.category as keyof typeof PRODUCT_CATEGORY_LABELS]}</span>
          </div>
          {product.garment_type && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tipo de prenda</span>
              <span>{GARMENT_TYPE_LABELS[product.garment_type as keyof typeof GARMENT_TYPE_LABELS]}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Área</span>
            <span>{WAREHOUSE_AREA_LABELS[product.warehouse_area as keyof typeof WAREHOUSE_AREA_LABELS]}</span>
          </div>
        </div>

        <Separator />

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">
              Nombre <span className="text-destructive">*</span>
            </Label>
            <Input id="name" disabled={isPending} {...register("name")} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              rows={3}
              disabled={isPending}
              {...register("description")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="min_stock">
              Stock Mínimo <span className="text-destructive">*</span>
            </Label>
            <Input
              id="min_stock"
              type="number"
              min={0}
              disabled={isPending}
              {...register("min_stock")}
            />
            <p className="text-xs text-muted-foreground">
              Umbral para alertas de stock bajo.
            </p>
            {errors.min_stock && (
              <p className="text-xs text-destructive">
                {errors.min_stock.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
