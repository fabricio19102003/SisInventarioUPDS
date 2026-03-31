"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { SafeUser } from "@upds/services";
import {
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  useToast,
} from "@upds/ui";
import { adminResetPasswordAction } from "@/actions/auth";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const resetSchema = z
  .object({
    new_password: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .regex(/[A-Z]/, "Debe contener una mayúscula")
      .regex(/[a-z]/, "Debe contener una minúscula")
      .regex(/[0-9]/, "Debe contener un número"),
    new_password_confirm: z.string().min(1, "Confirmá la contraseña"),
  })
  .refine((d) => d.new_password === d.new_password_confirm, {
    message: "Las contraseñas no coinciden",
    path: ["new_password_confirm"],
  });

type ResetValues = z.infer<typeof resetSchema>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ResetPasswordFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: SafeUser;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ResetPasswordForm({
  open,
  onOpenChange,
  user,
}: ResetPasswordFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { new_password: "", new_password_confirm: "" },
  });

  function handleOpenChange(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  const onSubmit = (values: ResetValues) => {
    startTransition(async () => {
      const result = await adminResetPasswordAction({
        user_id: user.id,
        new_password: values.new_password,
        new_password_confirm: values.new_password_confirm,
      });
      if (!result.success) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
        return;
      }
      toast({ title: "Contraseña actualizada correctamente." });
      handleOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Resetear Contraseña</DialogTitle>
          <DialogDescription>
            Nueva contraseña para <strong>{user.full_name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new_password">
              Nueva contraseña <span className="text-destructive">*</span>
            </Label>
            <Input
              id="new_password"
              type="password"
              disabled={isPending}
              {...register("new_password")}
            />
            <p className="text-xs text-muted-foreground">
              Mínimo 8 caracteres, con mayúscula, minúscula y número.
            </p>
            {errors.new_password && (
              <p className="text-xs text-destructive">
                {errors.new_password.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new_password_confirm">
              Confirmar contraseña <span className="text-destructive">*</span>
            </Label>
            <Input
              id="new_password_confirm"
              type="password"
              disabled={isPending}
              {...register("new_password_confirm")}
            />
            {errors.new_password_confirm && (
              <p className="text-xs text-destructive">
                {errors.new_password_confirm.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Actualizando..." : "Actualizar Contraseña"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
