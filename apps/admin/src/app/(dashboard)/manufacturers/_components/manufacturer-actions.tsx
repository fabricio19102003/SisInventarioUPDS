"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@upds/ui";
import { deactivateManufacturer } from "@/actions/manufacturers";

export function ManufacturerActions({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDeactivate() {
    startTransition(async () => {
      const result = await deactivateManufacturer(id);
      if (result.success) {
        router.refresh();
      }
    });
  }

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
          <AlertDialogTitle>¿Desactivar fabricante?</AlertDialogTitle>
          <AlertDialogDescription>
            El fabricante dejará de estar disponible para nuevas órdenes de fabricación.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDeactivate}>Desactivar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
