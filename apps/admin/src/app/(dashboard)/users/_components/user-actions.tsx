"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button, Input, Label,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@upds/ui";
import { deactivateUser, reactivateUser, adminResetPassword } from "@/actions/users";

interface UserActionsProps {
  userId: string;
  isActive: boolean;
}

export function UserActions({ userId, isActive }: UserActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex gap-2">
      {isActive ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={isPending}>Desactivar</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Desactivar usuario?</AlertDialogTitle>
              <AlertDialogDescription>El usuario no podrá iniciar sesión.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => startTransition(async () => {
                const r = await deactivateUser(userId);
                if (r.success) router.refresh();
              })}>Desactivar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <Button variant="outline" size="sm" disabled={isPending} onClick={() => startTransition(async () => {
          const r = await reactivateUser(userId);
          if (r.success) router.refresh();
        })}>
          {isPending ? "..." : "Reactivar"}
        </Button>
      )}

      <ResetPasswordDialog userId={userId} />
    </div>
  );
}

function ResetPasswordDialog({ userId }: { userId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [open, setOpen] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const fd = new FormData(e.currentTarget);
    const newPassword = fd.get("new_password") as string;
    const confirm = fd.get("new_password_confirm") as string;

    if (newPassword !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }

    startTransition(async () => {
      const result = await adminResetPassword({
        user_id: userId,
        new_password: newPassword,
        new_password_confirm: confirm,
      });
      if (result.success) {
        setSuccess(true);
        setTimeout(() => setOpen(false), 1500);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Resetear Contraseña</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Resetear Contraseña</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
          {success && <div className="rounded bg-green-50 border border-green-200 p-3 text-sm text-green-700">Contraseña actualizada</div>}
          <div className="space-y-2">
            <Label htmlFor="new_password">Nueva Contraseña</Label>
            <Input id="new_password" name="new_password" type="password" required minLength={8} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new_password_confirm">Confirmar</Label>
            <Input id="new_password_confirm" name="new_password_confirm" type="password" required />
          </div>
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Actualizando..." : "Resetear Contraseña"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
