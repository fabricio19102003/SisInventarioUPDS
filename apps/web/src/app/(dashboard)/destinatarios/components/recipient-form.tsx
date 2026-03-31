"use client";

import { useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { RecipientData } from "@upds/services";
import {
  RecipientType,
  RECIPIENT_TYPE_LABELS,
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
import {
  createRecipientAction,
  updateRecipientAction,
} from "@/actions/recipients";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const formSchema = z.object({
  document_number: z
    .string()
    .min(1, "El número de documento es obligatorio")
    .max(50),
  full_name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(255),
  type: z.enum(["STUDENT", "STAFF", "SCHOLAR"], {
    required_error: "El tipo es obligatorio",
  }),
  phone: z.string().max(50).optional().or(z.literal("")),
  email: z
    .string()
    .email("Formato de correo inválido")
    .max(255)
    .optional()
    .or(z.literal("")),
  career: z.string().max(255).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

const typeOptions = enumToOptions(RecipientType, RECIPIENT_TYPE_LABELS);

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RecipientFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipient?: RecipientData;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RecipientForm({
  open,
  onOpenChange,
  recipient,
}: RecipientFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const isEditing = !!recipient;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      document_number: "",
      full_name: "",
      type: "STUDENT",
      phone: "",
      email: "",
      career: "",
    },
  });

  const typeValue = watch("type");

  useEffect(() => {
    if (open) {
      reset({
        document_number: recipient?.document_number ?? "",
        full_name: recipient?.full_name ?? "",
        type: (recipient?.type as FormValues["type"]) ?? "STUDENT",
        phone: recipient?.phone ?? "",
        email: recipient?.email ?? "",
        career: recipient?.career ?? "",
      });
    }
  }, [open, recipient, reset]);

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const payload = {
        ...values,
        phone: values.phone || undefined,
        email: values.email || undefined,
        career: values.career || undefined,
        ...(isEditing ? { id: recipient.id } : {}),
      };

      // document_number es inmutable al editar — lo removemos del payload
      if (isEditing) {
        const { document_number: _, ...updatePayload } = payload;
        const result = await updateRecipientAction(updatePayload);
        if (!result.success) {
          toast({ title: "Error", description: result.error, variant: "destructive" });
          return;
        }
      } else {
        const result = await createRecipientAction(payload);
        if (!result.success) {
          toast({ title: "Error", description: result.error, variant: "destructive" });
          return;
        }
      }

      toast({
        title: isEditing ? "Destinatario actualizado" : "Destinatario creado",
        description: isEditing
          ? "Los datos fueron actualizados correctamente."
          : "El destinatario fue registrado correctamente.",
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
            {isEditing ? "Editar Destinatario" : "Nuevo Destinatario"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* CI / Documento */}
          <div className="space-y-1.5">
            <Label htmlFor="document_number">
              Nro. de Documento <span className="text-destructive">*</span>
            </Label>
            <Input
              id="document_number"
              placeholder="12345678"
              disabled={isPending || isEditing}
              {...register("document_number")}
            />
            {isEditing && (
              <p className="text-xs text-muted-foreground">
                El número de documento no se puede modificar.
              </p>
            )}
            {errors.document_number && (
              <p className="text-xs text-destructive">
                {errors.document_number.message}
              </p>
            )}
          </div>

          {/* Nombre completo */}
          <div className="space-y-1.5">
            <Label htmlFor="full_name">
              Nombre Completo <span className="text-destructive">*</span>
            </Label>
            <Input
              id="full_name"
              placeholder="Juan Carlos Pérez"
              disabled={isPending}
              {...register("full_name")}
            />
            {errors.full_name && (
              <p className="text-xs text-destructive">
                {errors.full_name.message}
              </p>
            )}
          </div>

          {/* Tipo */}
          <div className="space-y-1.5">
            <Label>
              Tipo <span className="text-destructive">*</span>
            </Label>
            <Select
              value={typeValue}
              onValueChange={(v) => setValue("type", v as FormValues["type"])}
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo..." />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-xs text-destructive">{errors.type.message}</p>
            )}
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
                placeholder="correo@upds.edu.bo"
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

          {/* Carrera (solo visible si es estudiante o becario) */}
          {(typeValue === "STUDENT" || typeValue === "SCHOLAR") && (
            <div className="space-y-1.5">
              <Label htmlFor="career">Carrera</Label>
              <Input
                id="career"
                placeholder="Medicina"
                disabled={isPending}
                {...register("career")}
              />
            </div>
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
              {isPending
                ? isEditing
                  ? "Guardando..."
                  : "Creando..."
                : isEditing
                  ? "Guardar Cambios"
                  : "Crear Destinatario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
