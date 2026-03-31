"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Button, AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@upds/ui";
import { deactivateRecipient } from "@/actions/recipients";

export function RecipientActions({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (!isActive) return null;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={isPending}>
          {isPending ? "Procesando..." : "Desactivar"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Desactivar destinatario?</AlertDialogTitle>
          <AlertDialogDescription>
            No podrá recibir nuevos movimientos de inventario.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => startTransition(async () => {
            const r = await deactivateRecipient(id);
            if (r.success) router.refresh();
          })}>Desactivar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
