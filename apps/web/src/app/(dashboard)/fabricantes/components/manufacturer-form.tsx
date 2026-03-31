"use client";

import { useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ManufacturerData } from "@upds/services";
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
  useToast,
} from "@upds/ui";
import {
  createManufacturerAction,
  updateManufacturerAction,
} from "@/actions/manufacturers";

// ---------------------------------------------------------------------------
// Schema client-side (espejo del validator del servidor)
// ---------------------------------------------------------------------------

const formSchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(255),
  contact_name: z.string().max(255).optional().or(z.literal("")),
  phone: z.string().max(50).optional().or(z.literal("")),
  email: z
    .string()
    .email("Formato de correo inválido")
    .max(255)
    .optional()
    .or(z.literal("")),
  address: z.string().max(2000).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ManufacturerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  manufacturer?: ManufacturerData;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ManufacturerForm({
  open,
  onOpenChange,
  manufacturer,
}: ManufacturerFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const isEditing = !!manufacturer;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      contact_name: "",
      phone: "",
      email: "",
      address: "",
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (open) {
      reset({
        name: manufacturer?.name ?? "",
        contact_name: manufacturer?.contact_name ?? "",
        phone: manufacturer?.phone ?? "",
        email: manufacturer?.email ?? "",
        address: manufacturer?.address ?? "",
      });
    }
  }, [open, manufacturer, reset]);

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const payload = {
        ...values,
        contact_name: values.contact_name || undefined,
        phone: values.phone || undefined,
        email: values.email || undefined,
        address: values.address || undefined,
        ...(isEditing ? { id: manufacturer.id } : {}),
      };

      const result = isEditing
        ? await updateManufacturerAction(payload)
        : await createManufacturerAction(payload);

      if (!result.success) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: isEditing ? "Fabricante actualizado" : "Fabricante creado",
        description: isEditing
          ? "Los datos fueron actualizados correctamente."
          : "El fabricante fue registrado correctamente.",
      });

      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Fabricante" : "Nuevo Fabricante"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Nombre */}
          <div className="space-y-1.5">
            <Label htmlFor="name">
              Nombre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Taller El Progreso"
              disabled={isPending}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Contacto */}
          <div className="space-y-1.5">
            <Label htmlFor="contact_name">Nombre de Contacto</Label>
            <Input
              id="contact_name"
              placeholder="Juan Pérez"
              disabled={isPending}
              {...register("contact_name")}
            />
          </div>

          {/* Teléfono / Email */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                placeholder="591-7xxxxxxx"
                disabled={isPending}
                {...register("phone")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="contacto@taller.com"
                disabled={isPending}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>
          </div>

          {/* Dirección */}
          <div className="space-y-1.5">
            <Label htmlFor="address">Dirección</Label>
            <Textarea
              id="address"
              placeholder="Av. Principal #123, Sucre"
              rows={3}
              disabled={isPending}
              {...register("address")}
            />
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
              {isPending
                ? isEditing
                  ? "Guardando..."
                  : "Creando..."
                : isEditing
                  ? "Guardar Cambios"
                  : "Crear Fabricante"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
