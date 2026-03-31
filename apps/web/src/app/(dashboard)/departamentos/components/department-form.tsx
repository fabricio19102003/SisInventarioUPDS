"use client";

import { useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { DepartmentData } from "@upds/services";
import {
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  useToast,
} from "@upds/ui";
import {
  createDepartmentAction,
  updateDepartmentAction,
} from "@/actions/departments";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const formSchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(255),
  code: z
    .string()
    .min(1, "El código es obligatorio")
    .max(20, "El código no puede exceder 20 caracteres"),
});

type FormValues = z.infer<typeof formSchema>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DepartmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department?: DepartmentData;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DepartmentForm({
  open,
  onOpenChange,
  department,
}: DepartmentFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const isEditing = !!department;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", code: "" },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: department?.name ?? "",
        code: department?.code ?? "",
      });
    }
  }, [open, department, reset]);

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const payload = isEditing ? { ...values, id: department.id } : values;

      const result = isEditing
        ? await updateDepartmentAction(payload)
        : await createDepartmentAction(payload);

      if (!result.success) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: isEditing ? "Departamento actualizado" : "Departamento creado",
        description: isEditing
          ? "Los datos fueron actualizados correctamente."
          : "El departamento fue registrado correctamente.",
      });

      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Departamento" : "Nuevo Departamento"}
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
              placeholder="Facultad de Medicina"
              disabled={isPending}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Código */}
          <div className="space-y-1.5">
            <Label htmlFor="code">
              Código <span className="text-destructive">*</span>
            </Label>
            <Input
              id="code"
              placeholder="FAC-MED"
              disabled={isPending}
              {...register("code")}
            />
            <p className="text-xs text-muted-foreground">
              Se guardará en mayúsculas automáticamente.
            </p>
            {errors.code && (
              <p className="text-xs text-destructive">{errors.code.message}</p>
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
              {isPending
                ? isEditing
                  ? "Guardando..."
                  : "Creando..."
                : isEditing
                  ? "Guardar Cambios"
                  : "Crear Departamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
