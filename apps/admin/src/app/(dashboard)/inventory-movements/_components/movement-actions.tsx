"use client";

import { useTransition, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Button, Input, Label, Textarea,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@upds/ui";
import { addMovementItem, removeMovementItem, confirmMovement, cancelMovement } from "@/actions/inventory-movements";
import { getProducts } from "@/actions/products";
import type { MovementData, ProductData, ProductVariantData } from "@upds/services";

interface MovementActionsProps {
  movement: MovementData;
}

interface VariantOption {
  id: string;
  label: string;
}

export function MovementActions({ movement }: MovementActionsProps) {
  const isDraft = movement.status === "DRAFT";
  if (!isDraft) return null;

  const hasItems = (movement.items ?? []).length > 0;

  return (
    <div className="flex gap-2">
      <AddItemDialog movement={movement} />
      {hasItems && <ConfirmDialog movementId={movement.id} />}
      <CancelMovementDialog movementId={movement.id} />
    </div>
  );
}

export function RemoveItemButton({ movementId, itemId }: { movementId: string; itemId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost" size="sm"
      className="text-red-600 h-8 px-2"
      disabled={isPending}
      onClick={() => startTransition(async () => {
        await removeMovementItem(movementId, itemId);
        router.refresh();
      })}
    >
      {isPending ? "..." : "Quitar"}
    </Button>
  );
}

function AddItemDialog({ movement }: { movement: MovementData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [variants, setVariants] = useState<VariantOption[]>([]);
  const [variantId, setVariantId] = useState("");

  const isSale = movement.movement_type === "SALE";
  const showPrice = isSale;
  const isAdjustment = movement.movement_type === "ADJUSTMENT";

  useEffect(() => {
    if (open) {
      getProducts({ is_active: true }).then((r) => {
        if (r.success) {
          const all: VariantOption[] = [];
          r.data.products.forEach((p: ProductData) => {
            (p.variants ?? [])
              .filter((v: ProductVariantData) => v.is_active)
              .forEach((v: ProductVariantData) => {
              all.push({
                id: v.id,
                label: `${p.sku}-${v.sku_suffix} (${p.name}${v.size ? ` ${v.size}` : ""}${v.color ? ` ${v.color}` : ""}) — Stock: ${v.current_stock}`,
              });
            });
          });
          setVariants(all);
        }
      });
    }
  }, [open]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await addMovementItem({
        movement_id: movement.id,
        product_variant_id: variantId,
        quantity: Number(fd.get("quantity")),
        unit_price: showPrice ? Number(fd.get("unit_price")) : 0,
      });
      if (result.success) {
        setOpen(false);
        setVariantId("");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" size="sm">+ Agregar Item</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Agregar Item al Movimiento</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
          <div className="space-y-2">
            <Label>Variante de Producto *</Label>
            <Select value={variantId} onValueChange={setVariantId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar variante..." /></SelectTrigger>
              <SelectContent>
                {variants.map((v) => <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Cantidad *</Label>
              <Input id="quantity" name="quantity" type="number" min={isAdjustment ? undefined : 1} required />
              {isAdjustment && <p className="text-xs text-muted-foreground">Puede ser negativo para ajustes</p>}
            </div>
            {showPrice && (
              <div className="space-y-2">
                <Label htmlFor="unit_price">Precio Unitario (Bs) *</Label>
                <Input id="unit_price" name="unit_price" type="number" min={0} step="0.01" required />
              </div>
            )}
          </div>
          <Button type="submit" disabled={isPending || !variantId} className="w-full">
            {isPending ? "Agregando..." : "Agregar Item"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmDialog({ movementId }: { movementId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" className="bg-green-600 hover:bg-green-700">Confirmar</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Confirmar este movimiento?</AlertDialogTitle>
          <AlertDialogDescription className="text-red-600 font-medium">
            Esta acción es IRREVERSIBLE y afectará el stock de los productos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Volver</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            className="bg-green-600 hover:bg-green-700"
            onClick={() => startTransition(async () => {
              const r = await confirmMovement(movementId);
              if (r.success) router.refresh();
            })}
          >
            {isPending ? "Confirmando..." : "Sí, Confirmar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function CancelMovementDialog({ movementId }: { movementId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [reason, setReason] = useState("");

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">Cancelar</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Cancelar este movimiento?</AlertDialogTitle>
          <AlertDialogDescription>El movimiento quedará cancelado sin afectar el stock.</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 py-2">
          <Label>Motivo *</Label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ingrese el motivo..." />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Volver</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending || !reason.trim()}
            onClick={() => startTransition(async () => {
              const r = await cancelMovement({ movement_id: movementId, cancel_reason: reason });
              if (r.success) router.refresh();
            })}
          >
            {isPending ? "Cancelando..." : "Confirmar Cancelación"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
