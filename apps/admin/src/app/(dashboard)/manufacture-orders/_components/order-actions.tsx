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
import { addOrderItem, receiveOrderItems, cancelOrder } from "@/actions/manufacture-orders";
import { getProducts } from "@/actions/products";

interface OrderActionsProps {
  order: any;
}

export function OrderActions({ order }: OrderActionsProps) {
  const canAddItems = order.status === "PENDING";
  const canReceive = order.status === "PENDING" || order.status === "IN_PROGRESS";
  const canCancel = order.status === "PENDING" || order.status === "IN_PROGRESS";

  return (
    <div className="flex gap-2">
      {canAddItems && <AddItemDialog orderId={order.id} />}
      {canReceive && order.items?.length > 0 && <ReceiveDialog order={order} />}
      {canCancel && <CancelOrderDialog orderId={order.id} />}
    </div>
  );
}

function AddItemDialog({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [variants, setVariants] = useState<any[]>([]);
  const [variantId, setVariantId] = useState("");

  useEffect(() => {
    if (open) {
      getProducts({ is_active: true, category: "MEDICAL_GARMENT" }).then((r) => {
        if (r.success) {
          const allVariants: any[] = [];
          r.data.products.forEach((p: any) => {
            (p.variants ?? []).filter((v: any) => v.is_active).forEach((v: any) => {
              allVariants.push({
                id: v.id,
                label: `${p.sku}-${v.sku_suffix} (${p.name} ${v.size ?? ""} ${v.color ?? ""})`,
              });
            });
          });
          setVariants(allVariants);
        }
      });
    }
  }, [open]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await addOrderItem({
        manufacture_order_id: orderId,
        product_variant_id: variantId,
        quantity_ordered: Number(fd.get("quantity_ordered")),
        unit_cost: Number(fd.get("unit_cost")),
      });
      if (result.success) {
        setOpen(false);
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
        <DialogHeader><DialogTitle>Agregar Item a la Orden</DialogTitle></DialogHeader>
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
              <Label htmlFor="quantity_ordered">Cantidad *</Label>
              <Input id="quantity_ordered" name="quantity_ordered" type="number" min={1} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit_cost">Costo Unitario (Bs) *</Label>
              <Input id="unit_cost" name="unit_cost" type="number" min={0} step="0.01" required />
            </div>
          </div>
          <Button type="submit" disabled={isPending || !variantId} className="w-full">
            {isPending ? "Agregando..." : "Agregar Item"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReceiveDialog({ order }: { order: any }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const pendingItems = (order.items ?? []).filter((item: any) => item.quantity_received < item.quantity_ordered);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const items = pendingItems
      .filter((item: any) => (quantities[item.id] ?? 0) > 0)
      .map((item: any) => ({
        item_id: item.id,
        quantity_received: quantities[item.id] ?? 0,
      }));

    if (items.length === 0) {
      setError("Ingrese al menos una cantidad a recibir");
      return;
    }

    startTransition(async () => {
      const result = await receiveOrderItems({
        manufacture_order_id: order.id,
        items,
      });
      if (result.success) {
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm">Recibir Items</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Recibir Items</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
          {pendingItems.length === 0 ? (
            <p className="text-muted-foreground">Todos los items han sido recibidos</p>
          ) : (
            <div className="space-y-3">
              {pendingItems.map((item: any) => {
                const remaining = item.quantity_ordered - item.quantity_received;
                const variant = item.product_variant;
                return (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded border">
                    <div className="flex-1 text-sm">
                      <p className="font-medium">
                        {variant?.product?.sku ?? ""}-{variant?.sku_suffix ?? ""}
                      </p>
                      <p className="text-muted-foreground">
                        Pedido: {item.quantity_ordered} | Recibido: {item.quantity_received} | Pendiente: {remaining}
                      </p>
                    </div>
                    <Input
                      type="number" min={0} max={remaining}
                      className="w-24"
                      placeholder="0"
                      value={quantities[item.id] ?? ""}
                      onChange={(e) => setQuantities({ ...quantities, [item.id]: Number(e.target.value) })}
                    />
                  </div>
                );
              })}
            </div>
          )}
          <Button type="submit" disabled={isPending || pendingItems.length === 0} className="w-full">
            {isPending ? "Procesando..." : "Confirmar Recepción"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CancelOrderDialog({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [reason, setReason] = useState("");

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">Cancelar Orden</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Cancelar esta orden?</AlertDialogTitle>
          <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 py-2">
          <Label>Motivo de cancelación *</Label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ingrese el motivo..." />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Volver</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending || !reason.trim()}
            onClick={() => startTransition(async () => {
              const r = await cancelOrder({ manufacture_order_id: orderId, cancel_reason: reason });
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
