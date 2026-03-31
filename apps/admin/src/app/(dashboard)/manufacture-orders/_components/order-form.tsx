"use client";

import { useTransition, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card, CardContent, CardHeader, CardTitle, Button, Input, Label, Textarea,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@upds/ui";
import { createManufactureOrder } from "@/actions/manufacture-orders";
import { getManufacturers } from "@/actions/manufacturers";

export function OrderForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [manufacturers, setManufacturers] = useState<any[]>([]);
  const [manufacturerId, setManufacturerId] = useState("");

  useEffect(() => {
    getManufacturers({ is_active: true }).then((r) => {
      if (r.success) setManufacturers(r.data.manufacturers);
    });
  }, []);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createManufactureOrder({
        manufacturer_id: manufacturerId,
        expected_at: (fd.get("expected_at") as string) || undefined,
        notes: (fd.get("notes") as string) || undefined,
      });
      if (result.success) {
        router.push(`/manufacture-orders/${result.data.id}`);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader><CardTitle>Nueva Orden de Fabricación</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
          {error && <div className="rounded bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

          <div className="space-y-2">
            <Label>Fabricante *</Label>
            <Select value={manufacturerId} onValueChange={setManufacturerId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar fabricante..." /></SelectTrigger>
              <SelectContent>
                {manufacturers.map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expected_at">Fecha Esperada de Entrega</Label>
            <Input id="expected_at" name="expected_at" type="date" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" name="notes" />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isPending || !manufacturerId}>
              {isPending ? "Creando..." : "Crear Orden"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
