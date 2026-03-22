"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Button, AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@upds/ui";
import { deactivateDepartment } from "@/actions/departments";

export function DepartmentActions({ id, isActive }: { id: string; isActive: boolean }) {
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
          <AlertDialogTitle>¿Desactivar departamento?</AlertDialogTitle>
          <AlertDialogDescription>
            No podrá recibir nuevas entregas de material.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => startTransition(async () => {
            const r = await deactivateDepartment(id);
            if (r.success) router.refresh();
          })}>Desactivar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
