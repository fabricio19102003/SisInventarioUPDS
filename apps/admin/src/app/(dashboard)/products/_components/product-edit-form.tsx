"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label, Textarea } from "@upds/ui";
import { updateProduct } from "@/actions/products";

interface Props {
  product: { id: string; name: string; description: string | null; min_stock: number; sku: string; category: string };
}

export function ProductEditForm({ product }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateProduct({
        id: product.id,
        name: fd.get("name") as string,
        description: (fd.get("description") as string) || undefined,
        min_stock: Number(fd.get("min_stock")) || 5,
      });
      if (result.success) {
        router.push(`/products/${product.id}`);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader><CardTitle>Editar Producto</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
          {error && <div className="rounded bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

          <div className="space-y-2">
            <Label>SKU (no editable)</Label>
            <Input value={product.sku} disabled />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input id="name" name="name" required defaultValue={product.name} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea id="description" name="description" defaultValue={product.description ?? ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="min_stock">Stock Mínimo</Label>
            <Input id="min_stock" name="min_stock" type="number" min={0} defaultValue={product.min_stock} className="w-32" />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
