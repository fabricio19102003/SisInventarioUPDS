"use client";

import { useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ProductCategory,
  PRODUCT_CATEGORY_LABELS,
  GarmentType,
  GARMENT_TYPE_LABELS,
  Size,
  SIZE_LABELS,
  Gender,
  GENDER_LABELS,
  enumToOptions,
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
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Separator,
  Badge,
  useToast,
} from "@upds/ui";
import { Plus, Trash2 } from "lucide-react";
import { createProductAction } from "@/actions/products";
import { handleAction } from "@/lib/action-utils";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const variantSchema = z.object({
  size: z.enum(["XS", "S", "M", "L", "XL", "XXL"], {
    required_error: "Talla obligatoria",
  }),
  gender: z.enum(["MASCULINO", "FEMENINO", "UNISEX"], {
    required_error: "Género obligatorio",
  }),
  color: z.string().min(1, "Color obligatorio").max(100),
});

const createSchema = z
  .object({
    sku: z.string().min(1, "El SKU es obligatorio").max(50),
    name: z
      .string()
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(255),
    description: z.string().max(2000).optional().or(z.literal("")),
    category: z.enum(["MEDICAL_GARMENT", "OFFICE_SUPPLY"], {
      required_error: "La categoría es obligatoria",
    }),
    garment_type: z
      .enum(["PIJAMA", "BATA", "MANDIL", "POLERA", "GORRO"])
      .optional(),
    min_stock: z.coerce
      .number({ invalid_type_error: "Debe ser un número" })
      .int("Debe ser entero")
      .min(0, "No puede ser negativo")
      .default(5),
    variants: z.array(variantSchema).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.category === "MEDICAL_GARMENT") {
      if (!data.garment_type) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El tipo de prenda es obligatorio",
          path: ["garment_type"],
        });
      }
      if (!data.variants || data.variants.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Debe agregar al menos una variante",
          path: ["variants"],
        });
      }
    }
  });

type CreateValues = z.infer<typeof createSchema>;

const categoryOptions = enumToOptions(ProductCategory, PRODUCT_CATEGORY_LABELS);
const garmentTypeOptions = enumToOptions(GarmentType, GARMENT_TYPE_LABELS);
const sizeOptions = enumToOptions(Size, SIZE_LABELS);
const genderOptions = enumToOptions(Gender, GENDER_LABELS);

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ProductCreateFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProductCreateForm({
  open,
  onOpenChange,
}: ProductCreateFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      sku: "",
      name: "",
      description: "",
      min_stock: 5,
      variants: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "variants",
  });

  const categoryValue = watch("category");
  const isMedical = categoryValue === "MEDICAL_GARMENT";

  // Auto-reset when dialog closes
  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  // Auto-set warehouse_area based on category (consumed by the server)
  // Note: warehouse_area is derived from category in the payload

  const onSubmit = (values: CreateValues) => {
    startTransition(async () => {
      const payload = {
        ...values,
        warehouse_area: isMedical ? "MEDICAL" : "OFFICE",
        description: values.description || undefined,
        garment_type: isMedical ? values.garment_type : undefined,
        initial_stock: 0,
        variants: isMedical ? values.variants : undefined,
      };

      await handleAction(createProductAction(payload), {
        toast,
        successMessage: "Producto creado correctamente.",
        onSuccess: () => {
          onOpenChange(false);
          router.refresh();
        },
      });
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Producto</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* SKU + Nombre */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="sku">
                SKU <span className="text-destructive">*</span>
              </Label>
              <Input
                id="sku"
                placeholder="PNJ-M-AZL"
                disabled={isPending}
                {...register("sku")}
              />
              <p className="text-xs text-muted-foreground">Se guardará en mayúsculas.</p>
              {errors.sku && (
                <p className="text-xs text-destructive">{errors.sku.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name">
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Pijama Quirúrgico"
                disabled={isPending}
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              rows={2}
              disabled={isPending}
              {...register("description")}
            />
          </div>

          {/* Categoría + Min Stock */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>
                Categoría <span className="text-destructive">*</span>
              </Label>
              <Select
                value={categoryValue}
                onValueChange={(v) => {
                  setValue("category", v as CreateValues["category"]);
                  // Reset category-specific fields
                  setValue("garment_type", undefined);
                  setValue("variants", []);
                }}
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-xs text-destructive">
                  {errors.category.message}
                </p>
              )}
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
              {errors.min_stock && (
                <p className="text-xs text-destructive">
                  {errors.min_stock.message}
                </p>
              )}
            </div>
          </div>

          {/* MEDICAL: Tipo de prenda */}
          {isMedical && (
            <div className="space-y-1.5">
              <Label>
                Tipo de Prenda <span className="text-destructive">*</span>
              </Label>
              <Select
                value={watch("garment_type")}
                onValueChange={(v) =>
                  setValue("garment_type", v as CreateValues["garment_type"])
                }
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo..." />
                </SelectTrigger>
                <SelectContent>
                  {garmentTypeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.garment_type && (
                <p className="text-xs text-destructive">
                  {errors.garment_type.message}
                </p>
              )}
            </div>
          )}

          {/* OFFICE: stock por movimiento */}
          {categoryValue === "OFFICE_SUPPLY" && (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              El producto se crea con stock 0. Para cargar existencias iniciales usá un movimiento de ajuste o una entrada.
            </div>
          )}

          {/* MEDICAL: Variantes */}
          {isMedical && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>
                      Variantes <span className="text-destructive">*</span>
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Cada combinación talla + género + color es una variante.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      append({ size: "M", gender: "UNISEX", color: "" })
                    }
                    disabled={isPending}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Agregar fila
                  </Button>
                </div>

                {errors.variants && !Array.isArray(errors.variants) && (
                  <p className="text-xs text-destructive">
                    {(errors.variants as { message?: string }).message}
                  </p>
                )}

                {fields.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Sin variantes. Hacé clic en &quot;Agregar fila&quot; para empezar.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Header */}
                    <div className="grid grid-cols-[1fr_1fr_1fr_40px] gap-2 px-1">
                      <span className="text-xs font-medium text-muted-foreground">Talla</span>
                      <span className="text-xs font-medium text-muted-foreground">Género</span>
                      <span className="text-xs font-medium text-muted-foreground">Color</span>
                      <span />
                    </div>

                    {fields.map((field, index) => (
                      <div
                        key={field.id}
                        className="grid grid-cols-[1fr_1fr_1fr_40px] gap-2 items-start"
                      >
                        {/* Talla */}
                        <Select
                          value={watch(`variants.${index}.size`)}
                          onValueChange={(v) =>
                            setValue(
                              `variants.${index}.size`,
                              v as "XS" | "S" | "M" | "L" | "XL" | "XXL",
                            )
                          }
                          disabled={isPending}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {sizeOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.value}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Género */}
                        <Select
                          value={watch(`variants.${index}.gender`)}
                          onValueChange={(v) =>
                            setValue(
                              `variants.${index}.gender`,
                              v as "MASCULINO" | "FEMENINO" | "UNISEX",
                            )
                          }
                          disabled={isPending}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {genderOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Color */}
                        <Input
                          className="h-9"
                          placeholder="Azul"
                          disabled={isPending}
                          {...register(`variants.${index}.color`)}
                        />

                        {/* Eliminar fila */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-destructive hover:text-destructive"
                          onClick={() => remove(index)}
                          disabled={isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    {/* Preview badges */}
                    {fields.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {fields.map((_, i) => {
                          const s = watch(`variants.${i}.size`);
                          const g = watch(`variants.${i}.gender`);
                          const c = watch(`variants.${i}.color`);
                          if (!s || !g || !c) return null;
                          return (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {s} / {g} / {c}
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

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
              {isPending ? "Creando..." : "Crear Producto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
