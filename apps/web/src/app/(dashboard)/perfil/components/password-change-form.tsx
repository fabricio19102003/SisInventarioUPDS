"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// PasswordChangeForm — Formulario de cambio de contraseña
// Usa react-hook-form + changePasswordSchema de @upds/validators.
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { changePasswordSchema } from "@upds/validators";
import type { ChangePasswordInput } from "@upds/validators";
import {
  Button,
  Input,
  Label,
  useToast,
} from "@upds/ui";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { changePasswordAction } from "@/actions/auth";

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export function PasswordChangeForm() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      user_id: "",
      current_password: "",
      new_password: "",
      new_password_confirm: "",
    },
  });

  const onSubmit = (values: ChangePasswordInput) => {
    startTransition(async () => {
      // user_id is overwritten by the server action with the session user id
      const result = await changePasswordAction(values);

      if (!result.success) {
        toast({
          title: "Error al cambiar contraseña",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Contraseña actualizada correctamente." });
      reset();
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Contraseña actual */}
      <div className="space-y-1.5">
        <Label htmlFor="current_password">
          Contraseña actual <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <Input
            id="current_password"
            type={showCurrent ? "text" : "password"}
            autoComplete="current-password"
            disabled={isPending}
            {...register("current_password")}
          />
          <button
            type="button"
            tabIndex={-1}
            className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
            onClick={() => setShowCurrent((v) => !v)}
          >
            {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.current_password && (
          <p className="text-xs text-destructive">{errors.current_password.message}</p>
        )}
      </div>

      {/* Nueva contraseña */}
      <div className="space-y-1.5">
        <Label htmlFor="new_password">
          Nueva contraseña <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <Input
            id="new_password"
            type={showNew ? "text" : "password"}
            autoComplete="new-password"
            disabled={isPending}
            {...register("new_password")}
          />
          <button
            type="button"
            tabIndex={-1}
            className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
            onClick={() => setShowNew((v) => !v)}
          >
            {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.new_password && (
          <p className="text-xs text-destructive">{errors.new_password.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Mínimo 8 caracteres, con mayúscula, minúscula y número.
        </p>
      </div>

      {/* Confirmar nueva contraseña */}
      <div className="space-y-1.5">
        <Label htmlFor="new_password_confirm">
          Confirmar nueva contraseña <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <Input
            id="new_password_confirm"
            type={showConfirm ? "text" : "password"}
            autoComplete="new-password"
            disabled={isPending}
            {...register("new_password_confirm")}
          />
          <button
            type="button"
            tabIndex={-1}
            className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
            onClick={() => setShowConfirm((v) => !v)}
          >
            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.new_password_confirm && (
          <p className="text-xs text-destructive">{errors.new_password_confirm.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
        <KeyRound className="mr-2 h-4 w-4" />
        {isPending ? "Actualizando..." : "Cambiar Contraseña"}
      </Button>
    </form>
  );
}
