"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label } from "@upds/ui";
import { createDepartment, updateDepartment } from "@/actions/departments";

interface DepartmentFormProps {
  department?: { id: string; name: string; code: string };
}

export function DepartmentForm({ department }: DepartmentFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!department;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    const data: any = {
      ...(isEdit ? { id: department.id } : {}),
      name: fd.get("name") as string,
      code: fd.get("code") as string,
    };

    startTransition(async () => {
      const result = isEdit ? await updateDepartment(data) : await createDepartment(data);
      if (result.success) {
        router.push(isEdit ? `/departments/${department.id}` : "/departments");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Editar Departamento" : "Nuevo Departamento"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
          {error && (
            <div className="rounded bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input id="name" name="name" required defaultValue={department?.name ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="code">Código *</Label>
            <Input id="code" name="code" required defaultValue={department?.code ?? ""} placeholder="Ej: ADM, REC, MED" />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando..." : isEdit ? "Guardar Cambios" : "Crear Departamento"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
