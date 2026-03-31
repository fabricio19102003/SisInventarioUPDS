"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ManufactureOrderData, ManufacturerData, ProductData } from "@upds/services";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MANUFACTURE_ORDER_STATUS_LABELS, GENDER_LABELS } from "@upds/validators";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Button,
  Input,
  Label,
  Textarea,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Badge,
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Separator,
} from "@upds/ui";
import { Trash2, PlayCircle, XCircle, PackageCheck } from "lucide-react";
import {
  createOrderAction,
  addOrderItemAction,
  removeOrderItemAction,
  startProductionAction,
  receiveOrderItemsAction,
  cancelOrderAction,
} from "@/actions/manufacture-orders";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const createSchema = z.object({
  manufacturer_id: z.string().uuid("Seleccioná un fabricante"),
  notes: z.string().max(2000).optional().or(z.literal("")),
  expected_at: z.string().optional(),
});
type CreateValues = z.infer<typeof createSchema>;

// ---------------------------------------------------------------------------
// Types / helpers
// ---------------------------------------------------------------------------

type SheetPhase = "create" | "pending" | "in_progress" | "view";

function getPhase(order: ManufactureOrderData | null): SheetPhase {
  if (!order) return "create";
  switch (order.status) {
    case "PENDING":
      return "pending";
    case "IN_PROGRESS":
      return "in_progress";
    default:
      return "view";
  }
}

function formatCost(value: unknown): string {
  const num = Number(value);
  if (isNaN(num)) return "—";
  return `Bs. ${num.toFixed(2)}`;
}

function variantLabel(v: { size: string; gender: string; color: string }): string {
  const gLabel = GENDER_LABELS[v.gender as keyof typeof GENDER_LABELS] ?? v.gender;
  return `${v.size} / ${gLabel} / ${v.color}`;
}

interface OrderSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialOrder: ManufactureOrderData | null;
  manufacturers: ManufacturerData[];
  products: ProductData[];
  toast: (opts: { title: string; description?: string; variant?: "default" | "destructive" }) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OrderSheet({
  open,
  onOpenChange,
  initialOrder,
  manufacturers,
  products,
  toast,
}: OrderSheetProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [currentOrder, setCurrentOrder] = useState<ManufactureOrderData | null>(null);

  // Add item form state
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [addQty, setAddQty] = useState<string>("1");
  const [addCost, setAddCost] = useState<string>("");

  // Receive items state: item_id -> quantity_received string
  const [receiveQtys, setReceiveQtys] = useState<Record<string, string>>({});

  // Cancel dialog
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const phase = getPhase(currentOrder);

  // Create form
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { manufacturer_id: "", notes: "", expected_at: "" },
  });
  const manufacturerValue = watch("manufacturer_id");

  // -------------------------------------------------------------------------
  // Sync state when sheet opens/closes
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!open) {
      setCurrentOrder(null);
      reset();
      setSelectedProductId("");
      setSelectedVariantId("");
      setAddQty("1");
      setAddCost("");
      setReceiveQtys({});
      setCancelReason("");
      setCancelDialogOpen(false);
    } else {
      setCurrentOrder(initialOrder);
    }
  }, [open, initialOrder, reset]);

  // Reset variant when product changes
  useEffect(() => {
    setSelectedVariantId("");
  }, [selectedProductId]);

  // -------------------------------------------------------------------------
  // Derived data
  // -------------------------------------------------------------------------

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const availableVariants = selectedProduct
    ? selectedProduct.variants.filter((v) => v.is_active)
    : [];

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const onCreateSubmit = (values: CreateValues) => {
    startTransition(async () => {
      const result = await createOrderAction({
        manufacturer_id: values.manufacturer_id,
        notes: values.notes || null,
        expected_at: values.expected_at ? new Date(values.expected_at) : null,
      });
      if (!result.success) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
        return;
      }
      setCurrentOrder(result.data);
      router.refresh();
    });
  };

  const handleAddItem = () => {
    if (!currentOrder || !selectedVariantId) {
      toast({ title: "Error", description: "Seleccioná una variante.", variant: "destructive" });
      return;
    }
    const qty = Number(addQty);
    const cost = Number(addCost);
    if (!qty || qty <= 0) {
      toast({ title: "Error", description: "La cantidad debe ser mayor a 0.", variant: "destructive" });
      return;
    }
    if (isNaN(cost) || cost < 0) {
      toast({ title: "Error", description: "El costo no puede ser negativo.", variant: "destructive" });
      return;
    }
    startTransition(async () => {
      const result = await addOrderItemAction({
        manufacture_order_id: currentOrder.id,
        product_variant_id: selectedVariantId,
        quantity_ordered: qty,
        unit_cost: cost,
      });
      if (!result.success) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
        return;
      }
      setCurrentOrder(result.data);
      setSelectedProductId("");
      setSelectedVariantId("");
      setAddQty("1");
      setAddCost("");
    });
  };

  const handleRemoveItem = (itemId: string) => {
    startTransition(async () => {
      const result = await removeOrderItemAction(itemId);
      if (!result.success) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
        return;
      }
      setCurrentOrder(result.data);
    });
  };

  const handleStartProduction = () => {
    if (!currentOrder) return;
    startTransition(async () => {
      const result = await startProductionAction(currentOrder.id);
      if (!result.success) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
        return;
      }
      setCurrentOrder(result.data);
      router.refresh();
    });
  };

  const handleReceiveItems = () => {
    if (!currentOrder) return;
    const items = currentOrder.items
      .filter((item) => receiveQtys[item.id] && Number(receiveQtys[item.id]) > 0)
      .map((item) => ({
        manufacture_order_item_id: item.id,
        quantity_received: Number(receiveQtys[item.id]),
      }));
    if (items.length === 0) {
      toast({
        title: "Error",
        description: "Ingresá al menos una cantidad recibida.",
        variant: "destructive",
      });
      return;
    }
    startTransition(async () => {
      const result = await receiveOrderItemsAction({
        manufacture_order_id: currentOrder.id,
        items,
      });
      if (!result.success) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
        return;
      }
      setCurrentOrder(result.data);
      setReceiveQtys({});
      router.refresh();
    });
  };

  const handleCancelOrder = () => {
    if (!currentOrder) return;
    if (cancelReason.trim().length < 10) {
      toast({
        title: "Error",
        description: "El motivo debe tener al menos 10 caracteres.",
        variant: "destructive",
      });
      return;
    }
    startTransition(async () => {
      const result = await cancelOrderAction({
        manufacture_order_id: currentOrder.id,
        cancel_reason: cancelReason,
      });
      if (!result.success) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
        return;
      }
      setCancelDialogOpen(false);
      onOpenChange(false);
      router.refresh();
    });
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        {/* ------------------------------------------------------------------ */}
        {/* PHASE: CREATE                                                        */}
        {/* ------------------------------------------------------------------ */}
        {phase === "create" && (
          <>
            <SheetHeader>
              <SheetTitle>Nueva Orden de Fabricación</SheetTitle>
              <SheetDescription>
                Completá los datos para crear la orden y luego agregá los ítems.
              </SheetDescription>
            </SheetHeader>

            <form
              onSubmit={handleSubmit(onCreateSubmit)}
              className="mt-6 space-y-4"
            >
              {/* Fabricante */}
              <div className="space-y-1.5">
                <Label>
                  Fabricante <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={manufacturerValue}
                  onValueChange={(v) => setValue("manufacturer_id", v)}
                  disabled={isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar fabricante..." />
                  </SelectTrigger>
                  <SelectContent>
                    {manufacturers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                        {m.contact_name && (
                          <span className="text-muted-foreground ml-1 text-xs">
                            — {m.contact_name}
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.manufacturer_id && (
                  <p className="text-xs text-destructive">
                    {errors.manufacturer_id.message}
                  </p>
                )}
              </div>

              {/* Fecha esperada */}
              <div className="space-y-1.5">
                <Label htmlFor="expected_at">Fecha esperada de entrega</Label>
                <Input
                  id="expected_at"
                  type="date"
                  disabled={isPending}
                  {...register("expected_at")}
                />
              </div>

              {/* Notas */}
              <div className="space-y-1.5">
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  rows={3}
                  placeholder="Especificaciones adicionales..."
                  disabled={isPending}
                  {...register("notes")}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isPending}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Creando..." : "Crear Orden"}
                </Button>
              </div>
            </form>
          </>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* PHASE: PENDING                                                       */}
        {/* ------------------------------------------------------------------ */}
        {phase === "pending" && currentOrder && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2">
                <SheetTitle>{currentOrder.order_number}</SheetTitle>
                <Badge variant="secondary">
                  {MANUFACTURE_ORDER_STATUS_LABELS["PENDING"]}
                </Badge>
              </div>
              <SheetDescription>
                Agregá los ítems y luego iniciá la producción.
              </SheetDescription>
            </SheetHeader>

            {/* Order info */}
            <div className="mt-4 rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
              <div>
                <span className="text-muted-foreground">Fabricante: </span>
                <span className="font-medium">{currentOrder.manufacturer.name}</span>
              </div>
              {currentOrder.expected_at && (
                <div>
                  <span className="text-muted-foreground">Entrega esperada: </span>
                  <span>{new Date(currentOrder.expected_at).toLocaleDateString("es-BO")}</span>
                </div>
              )}
              {currentOrder.notes && (
                <div>
                  <span className="text-muted-foreground">Notas: </span>
                  <span>{currentOrder.notes}</span>
                </div>
              )}
            </div>

            {/* Items table */}
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Ítems ({currentOrder.items.length})</p>
              {currentOrder.items.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Sin ítems. Agregá al menos uno para iniciar producción.
                </div>
              ) : (
                <div className="rounded-lg border divide-y text-sm">
                  {currentOrder.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-3 py-2 gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {item.product_variant.product.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {variantLabel(item.product_variant)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p>x{item.quantity_ordered}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCost(item.unit_cost)} c/u
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                        disabled={isPending}
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add item form */}
            <Separator className="my-4" />
            <div className="space-y-3">
              <p className="text-sm font-medium">Agregar ítem</p>

              {/* Product select */}
              <div className="space-y-1.5">
                <Label className="text-xs">Producto</Label>
                <Select
                  value={selectedProductId}
                  onValueChange={setSelectedProductId}
                  disabled={isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar producto..." />
                  </SelectTrigger>
                  <SelectContent>
                    {products
                      .filter((p) => p.category === "MEDICAL_GARMENT")
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.sku})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Variant select */}
              {selectedProductId && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Variante</Label>
                  <Select
                    value={selectedVariantId}
                    onValueChange={setSelectedVariantId}
                    disabled={isPending || availableVariants.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar variante..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableVariants.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {variantLabel(v)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Qty + Cost */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Cantidad</Label>
                  <Input
                    type="number"
                    min={1}
                    value={addQty}
                    onChange={(e) => setAddQty(e.target.value)}
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Costo unitario (Bs.)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="0.00"
                    value={addCost}
                    onChange={(e) => setAddCost(e.target.value)}
                    disabled={isPending}
                  />
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                disabled={isPending || !selectedVariantId}
                className="w-full"
              >
                Agregar ítem
              </Button>
            </div>

            {/* Actions */}
            <Separator className="my-4" />
            <div className="flex gap-2">
              {/* Iniciar producción */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    className="flex-1"
                    disabled={isPending || currentOrder.items.length === 0}
                  >
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Iniciar Producción
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Iniciar producción?</AlertDialogTitle>
                    <AlertDialogDescription>
                      La orden pasará a <strong>En Progreso</strong>. Ya no
                      podrás agregar ni quitar ítems.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleStartProduction}>
                      Confirmar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Cancelar orden */}
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                disabled={isPending}
                onClick={() => setCancelDialogOpen(true)}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
            </div>
          </>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* PHASE: IN_PROGRESS                                                   */}
        {/* ------------------------------------------------------------------ */}
        {phase === "in_progress" && currentOrder && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2">
                <SheetTitle>{currentOrder.order_number}</SheetTitle>
                <Badge variant="outline">
                  {MANUFACTURE_ORDER_STATUS_LABELS["IN_PROGRESS"]}
                </Badge>
              </div>
              <SheetDescription>
                Registrá las cantidades recibidas para cada ítem.
              </SheetDescription>
            </SheetHeader>

            {/* Order info */}
            <div className="mt-4 rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
              <div>
                <span className="text-muted-foreground">Fabricante: </span>
                <span className="font-medium">{currentOrder.manufacturer.name}</span>
              </div>
              {currentOrder.expected_at && (
                <div>
                  <span className="text-muted-foreground">Entrega esperada: </span>
                  <span>{new Date(currentOrder.expected_at).toLocaleDateString("es-BO")}</span>
                </div>
              )}
            </div>

            {/* Items with receive inputs */}
            <div className="mt-4 space-y-2">
              <div className="grid grid-cols-[1fr_auto_auto_auto_100px] gap-2 px-1">
                <span className="text-xs font-medium text-muted-foreground">Ítem</span>
                <span className="text-xs font-medium text-muted-foreground text-right">Pedido</span>
                <span className="text-xs font-medium text-muted-foreground text-right">Recibido</span>
                <span className="text-xs font-medium text-muted-foreground text-right">Pendiente</span>
                <span className="text-xs font-medium text-muted-foreground">Ingresar</span>
              </div>

              <div className="rounded-lg border divide-y text-sm">
                {currentOrder.items.map((item) => {
                  const pending = item.quantity_ordered - item.quantity_received;
                  return (
                    <div
                      key={item.id}
                      className="grid grid-cols-[1fr_auto_auto_auto_100px] gap-2 items-center px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {item.product_variant.product.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {variantLabel(item.product_variant)}
                        </p>
                      </div>
                      <span className="text-right">{item.quantity_ordered}</span>
                      <span className="text-right text-green-600">
                        {item.quantity_received}
                      </span>
                      <span
                        className={`text-right ${
                          pending === 0 ? "text-muted-foreground" : "text-orange-600"
                        }`}
                      >
                        {pending}
                      </span>
                      <Input
                        type="number"
                        min={1}
                        max={pending}
                        className="h-8 text-sm"
                        placeholder="0"
                        value={receiveQtys[item.id] ?? ""}
                        onChange={(e) =>
                          setReceiveQtys((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                        disabled={isPending || pending === 0}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 flex gap-2">
              <Button
                className="flex-1"
                disabled={isPending}
                onClick={handleReceiveItems}
              >
                <PackageCheck className="mr-2 h-4 w-4" />
                {isPending ? "Registrando..." : "Registrar Recepción"}
              </Button>
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                disabled={isPending}
                onClick={() => setCancelDialogOpen(true)}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
            </div>
          </>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* PHASE: VIEW (COMPLETED / CANCELLED)                                  */}
        {/* ------------------------------------------------------------------ */}
        {phase === "view" && currentOrder && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2">
                <SheetTitle>{currentOrder.order_number}</SheetTitle>
                <Badge
                  variant={currentOrder.status === "COMPLETED" ? "default" : "destructive"}
                >
                  {MANUFACTURE_ORDER_STATUS_LABELS[
                    currentOrder.status as keyof typeof MANUFACTURE_ORDER_STATUS_LABELS
                  ]}
                </Badge>
              </div>
              <SheetDescription>
                Detalle de la orden — solo lectura.
              </SheetDescription>
            </SheetHeader>

            {/* Cancel reason */}
            {currentOrder.status === "CANCELLED" && currentOrder.cancel_reason && (
              <div className="mt-4 rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-sm">
                <p className="font-medium text-destructive">Motivo de cancelación</p>
                <p className="mt-1 text-muted-foreground">{currentOrder.cancel_reason}</p>
              </div>
            )}

            {/* Info */}
            <div className="mt-4 rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
              <div>
                <span className="text-muted-foreground">Fabricante: </span>
                <span className="font-medium">{currentOrder.manufacturer.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Fecha de orden: </span>
                <span>{new Date(currentOrder.ordered_at).toLocaleDateString("es-BO")}</span>
              </div>
              {currentOrder.expected_at && (
                <div>
                  <span className="text-muted-foreground">Entrega esperada: </span>
                  <span>{new Date(currentOrder.expected_at).toLocaleDateString("es-BO")}</span>
                </div>
              )}
              {currentOrder.completed_at && (
                <div>
                  <span className="text-muted-foreground">Completada: </span>
                  <span>{new Date(currentOrder.completed_at).toLocaleDateString("es-BO")}</span>
                </div>
              )}
              {currentOrder.cancelled_at && (
                <div>
                  <span className="text-muted-foreground">Cancelada: </span>
                  <span>{new Date(currentOrder.cancelled_at).toLocaleDateString("es-BO")}</span>
                </div>
              )}
              {currentOrder.notes && (
                <div>
                  <span className="text-muted-foreground">Notas: </span>
                  <span>{currentOrder.notes}</span>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">
                Ítems ({currentOrder.items.length})
              </p>
              <div className="rounded-lg border divide-y text-sm">
                {currentOrder.items.map((item) => (
                  <div
                    key={item.id}
                    className="px-3 py-2 flex items-center justify-between gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {item.product_variant.product.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {variantLabel(item.product_variant)}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground shrink-0 space-y-0.5">
                      <p>
                        Pedido:{" "}
                        <span className="text-foreground font-medium">
                          {item.quantity_ordered}
                        </span>
                      </p>
                      <p>
                        Recibido:{" "}
                        <span className="text-green-600 font-medium">
                          {item.quantity_received}
                        </span>
                      </p>
                      <p>{formatCost(item.unit_cost)} c/u</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
            </div>
          </>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* CANCEL DIALOG (shared across pending / in_progress phases)           */}
        {/* ------------------------------------------------------------------ */}
        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>¿Cancelar orden?</DialogTitle>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label>
                Motivo de cancelación{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Textarea
                rows={3}
                placeholder="Mínimo 10 caracteres..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                disabled={isPending}
              />
              {cancelReason.length > 0 && cancelReason.trim().length < 10 && (
                <p className="text-xs text-destructive">
                  Al menos 10 caracteres.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCancelDialogOpen(false)}
                disabled={isPending}
              >
                Volver
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelOrder}
                disabled={isPending || cancelReason.trim().length < 10}
              >
                {isPending ? "Cancelando..." : "Cancelar Orden"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}
