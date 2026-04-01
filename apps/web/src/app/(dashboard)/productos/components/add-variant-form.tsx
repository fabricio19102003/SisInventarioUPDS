"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
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
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  useToast,
} from "@upds/ui";
import { addVariantAction } from "@/actions/products";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const schema = z.object({
  size: z.enum(["XS", "S", "M", "L", "XL", "XXL"], {
    required_error: "La talla es obligatoria",
  }),
  gender: z.enum(["MASCULINO", "FEMENINO", "UNISEX"], {
    required_error: "El género es obligatorio",
  }),
  color: z.string().min(1, "El color es obligatorio").max(100),
});

type FormValues = z.infer<typeof schema>;

const sizeOptions = enumToOptions(Size, SIZE_LABELS);
const genderOptions = enumToOptions(Gender, GENDER_LABELS);

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AddVariantFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AddVariantForm({
  open,
  onOpenChange,
  productId,
  productName,
}: AddVariantFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { color: "" },
  });

  const sizeValue = watch("size");
  const genderValue = watch("gender");

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const result = await addVariantAction({ ...values, product_id: productId, initial_stock: 0 });

      if (!result.success) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
        return;
      }

      toast({ title: "Variante agregada correctamente." });
      reset();
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar Variante</DialogTitle>
          <p className="text-sm text-muted-foreground">{productName}</p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Talla */}
          <div className="space-y-1.5">
            <Label>
              Talla <span className="text-destructive">*</span>
            </Label>
            <Select
              value={sizeValue}
              onValueChange={(v) => setValue("size", v as FormValues["size"])}
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar talla..." />
              </SelectTrigger>
              <SelectContent>
                {sizeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.size && (
              <p className="text-xs text-destructive">{errors.size.message}</p>
            )}
          </div>

          {/* Género */}
          <div className="space-y-1.5">
            <Label>
              Género <span className="text-destructive">*</span>
            </Label>
            <Select
              value={genderValue}
              onValueChange={(v) => setValue("gender", v as FormValues["gender"])}
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar género..." />
              </SelectTrigger>
              <SelectContent>
                {genderOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.gender && (
              <p className="text-xs text-destructive">{errors.gender.message}</p>
            )}
          </div>

          {/* Color */}
          <div className="space-y-1.5">
            <Label htmlFor="color">
              Color <span className="text-destructive">*</span>
            </Label>
            <Input
              id="color"
              placeholder="Azul, Verde, Blanco..."
              disabled={isPending}
              {...register("color")}
            />
            {errors.color && (
              <p className="text-xs text-destructive">{errors.color.message}</p>
            )}
          </div>

          <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
            La variante se crea con stock 0. La carga inicial se hace mediante un movimiento.
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => { reset(); onOpenChange(false); }}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Agregando..." : "Agregar Variante"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
