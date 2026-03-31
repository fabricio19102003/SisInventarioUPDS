"use client";

import { useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { SafeUser } from "@upds/services";
import {
  UserRole,
  USER_ROLE_LABELS,
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
  createUserAction,
  updateUserAction,
} from "@/actions/auth";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const createSchema = z
  .object({
    email: z.string().min(1, "El correo es obligatorio").email("Correo inválido"),
    full_name: z.string().min(2, "Al menos 2 caracteres").max(255),
    password: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .regex(/[A-Z]/, "Debe contener una mayúscula")
      .regex(/[a-z]/, "Debe contener una minúscula")
      .regex(/[0-9]/, "Debe contener un número"),
    password_confirm: z.string().min(1, "Confirmá la contraseña"),
    role: z.enum(["ADMIN", "INVENTORY_MANAGER", "VIEWER"] as const, {
      required_error: "El rol es obligatorio",
    }),
  })
  .refine((d) => d.password === d.password_confirm, {
    message: "Las contraseñas no coinciden",
    path: ["password_confirm"],
  });

const editSchema = z.object({
  email: z.string().min(1, "El correo es obligatorio").email("Correo inválido"),
  full_name: z.string().min(2, "Al menos 2 caracteres").max(255),
  role: z.enum(["ADMIN", "INVENTORY_MANAGER", "VIEWER"] as const, {
    required_error: "El rol es obligatorio",
  }),
});

type CreateValues = z.infer<typeof createSchema>;
type EditValues = z.infer<typeof editSchema>;

const roleOptions = enumToOptions(UserRole, USER_ROLE_LABELS);

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface UserFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: SafeUser;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UserForm({ open, onOpenChange, user }: UserFormProps) {
  const isEdit = !!user;
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Create form
  const createForm = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      email: "",
      full_name: "",
      password: "",
      password_confirm: "",
      role: "VIEWER",
    },
  });

  // Edit form
  const editForm = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      email: user?.email ?? "",
      full_name: user?.full_name ?? "",
      role: (user?.role as EditValues["role"]) ?? "VIEWER",
    },
  });

  // Sync edit form when user changes
  useEffect(() => {
    if (user) {
      editForm.reset({
        email: user.email,
        full_name: user.full_name,
        role: user.role as EditValues["role"],
      });
    }
  }, [user, editForm]);

  // Reset create form when dialog closes
  useEffect(() => {
    if (!open && !isEdit) {
      createForm.reset();
    }
  }, [open, isEdit, createForm]);

  const onCreateSubmit = (values: CreateValues) => {
    startTransition(async () => {
      const result = await createUserAction(values);
      if (!result.success) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
        return;
      }
      toast({ title: "Usuario creado correctamente." });
      onOpenChange(false);
      router.refresh();
    });
  };

  const onEditSubmit = (values: EditValues) => {
    if (!user) return;
    startTransition(async () => {
      const result = await updateUserAction({
        id: user.id,
        ...values,
        is_active: user.is_active,
      });
      if (!result.success) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
        return;
      }
      toast({ title: "Usuario actualizado correctamente." });
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Usuario" : "Nuevo Usuario"}</DialogTitle>
        </DialogHeader>

        {/* ------------------------------------------------------------------ */}
        {/* CREATE MODE                                                          */}
        {/* ------------------------------------------------------------------ */}
        {!isEdit && (
          <form
            onSubmit={createForm.handleSubmit(onCreateSubmit)}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="c-full_name">
                Nombre completo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="c-full_name"
                placeholder="Juan Pérez"
                disabled={isPending}
                {...createForm.register("full_name")}
              />
              {createForm.formState.errors.full_name && (
                <p className="text-xs text-destructive">
                  {createForm.formState.errors.full_name.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="c-email">
                Correo electrónico <span className="text-destructive">*</span>
              </Label>
              <Input
                id="c-email"
                type="email"
                placeholder="correo@upds.edu.bo"
                disabled={isPending}
                {...createForm.register("email")}
              />
              {createForm.formState.errors.email && (
                <p className="text-xs text-destructive">
                  {createForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>
                Rol <span className="text-destructive">*</span>
              </Label>
              <Select
                value={createForm.watch("role")}
                onValueChange={(v) =>
                  createForm.setValue("role", v as CreateValues["role"])
                }
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rol..." />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {createForm.formState.errors.role && (
                <p className="text-xs text-destructive">
                  {createForm.formState.errors.role.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="c-password">
                Contraseña <span className="text-destructive">*</span>
              </Label>
              <Input
                id="c-password"
                type="password"
                disabled={isPending}
                {...createForm.register("password")}
              />
              <p className="text-xs text-muted-foreground">
                Mínimo 8 caracteres, con mayúscula, minúscula y número.
              </p>
              {createForm.formState.errors.password && (
                <p className="text-xs text-destructive">
                  {createForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="c-password_confirm">
                Confirmar contraseña <span className="text-destructive">*</span>
              </Label>
              <Input
                id="c-password_confirm"
                type="password"
                disabled={isPending}
                {...createForm.register("password_confirm")}
              />
              {createForm.formState.errors.password_confirm && (
                <p className="text-xs text-destructive">
                  {createForm.formState.errors.password_confirm.message}
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
                {isPending ? "Creando..." : "Crear Usuario"}
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* EDIT MODE                                                            */}
        {/* ------------------------------------------------------------------ */}
        {isEdit && user && (
          <form
            onSubmit={editForm.handleSubmit(onEditSubmit)}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="e-full_name">
                Nombre completo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="e-full_name"
                placeholder="Juan Pérez"
                disabled={isPending}
                {...editForm.register("full_name")}
              />
              {editForm.formState.errors.full_name && (
                <p className="text-xs text-destructive">
                  {editForm.formState.errors.full_name.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="e-email">
                Correo electrónico <span className="text-destructive">*</span>
              </Label>
              <Input
                id="e-email"
                type="email"
                disabled={isPending}
                {...editForm.register("email")}
              />
              {editForm.formState.errors.email && (
                <p className="text-xs text-destructive">
                  {editForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>
                Rol <span className="text-destructive">*</span>
              </Label>
              <Select
                value={editForm.watch("role")}
                onValueChange={(v) =>
                  editForm.setValue("role", v as EditValues["role"])
                }
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rol..." />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editForm.formState.errors.role && (
                <p className="text-xs text-destructive">
                  {editForm.formState.errors.role.message}
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
        )}
      </DialogContent>
    </Dialog>
  );
}
