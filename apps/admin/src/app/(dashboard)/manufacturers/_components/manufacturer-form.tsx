"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Textarea,
} from "@upds/ui";
import { createManufacturer, updateManufacturer } from "@/actions/manufacturers";

interface ManufacturerFormProps {
  manufacturer?: {
    id: string;
    name: string;
    contact_name: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
  };
}

export function ManufacturerForm({ manufacturer }: ManufacturerFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!manufacturer;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    const data = {
      ...(isEdit ? { id: manufacturer.id } : {}),
      name: formData.get("name") as string,
      contact_name: (formData.get("contact_name") as string) || undefined,
      phone: (formData.get("phone") as string) || undefined,
      email: (formData.get("email") as string) || undefined,
      address: (formData.get("address") as string) || undefined,
    };

    startTransition(async () => {
      const result = isEdit
        ? await updateManufacturer(data as any)
        : await createManufacturer(data as any);

      if (result.success) {
        router.push(isEdit ? `/manufacturers/${manufacturer.id}` : "/manufacturers");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Editar Fabricante" : "Nuevo Fabricante"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
          {error && (
            <div className="rounded bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input id="name" name="name" required defaultValue={manufacturer?.name ?? ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_name">Persona de Contacto</Label>
            <Input id="contact_name" name="contact_name" defaultValue={manufacturer?.contact_name ?? ""} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" name="phone" defaultValue={manufacturer?.phone ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={manufacturer?.email ?? ""} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Textarea id="address" name="address" defaultValue={manufacturer?.address ?? ""} />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando..." : isEdit ? "Guardar Cambios" : "Crear Fabricante"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
