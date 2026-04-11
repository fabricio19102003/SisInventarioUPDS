"use client";

import { useState, useTransition, useEffect, type TransitionStartFunction } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type {
  MovementData,
  ProductData,
  RecipientData,
  DepartmentData,
  ManufactureOrderData,
} from "@upds/services";
import {
  MovementType,
  MOVEMENT_TYPE_LABELS,
  MOVEMENT_STATUS_LABELS,
  RECIPIENT_TYPE_LABELS,
  enumToOptions,
  can,
  PERMISSIONS,
} from "@upds/validators";
import type { UserRole } from "@upds/validators";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Badge,
  Button,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Textarea,
  Separator,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
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
  useToast,
} from "@upds/ui";
import { Plus, Trash2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import {
  createMovementAction,
  addMovementItemAction,
  removeMovementItemAction,
  confirmMovementAction,
  cancelMovementAction,
} from "@/actions/inventory-movements";

// ---------------------------------------------------------------------------
// Schema — create movement header
// ---------------------------------------------------------------------------

const createSchema = z
  .object({
    movement_type: z.enum(
      ["ENTRY", "SALE", "DONATION", "WRITE_OFF", "ADJUSTMENT", "DEPARTMENT_DELIVERY"],
      { required_error: "El tipo de movimiento es obligatorio" },
    ),
    recipient_id: z.string().uuid().optional().or(z.literal("")),
    department_id: z.string().uuid().optional().or(z.literal("")),
    manufacture_order_id: z.string().uuid().optional().or(z.literal("")),
    notes: z.string().max(5000).optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.movement_type === "SALE" && !data.recipient_id) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Destinatario obligatorio para ventas", path: ["recipient_id"] });
    }
    if (data.movement_type === "DONATION" && !data.recipient_id) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Destinatario obligatorio para dotaciones", path: ["recipient_id"] });
    }
    if (data.movement_type === "ENTRY" && !data.manufacture_order_id) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Orden de fabricación obligatoria para entradas", path: ["manufacture_order_id"] });
    }
    if (data.movement_type === "DEPARTMENT_DELIVERY" && !data.department_id) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Departamento obligatorio para entregas", path: ["department_id"] });
    }
    if (
      (data.movement_type === "WRITE_OFF" || data.movement_type === "ADJUSTMENT") &&
      (!data.notes || data.notes.trim().length < 10)
    ) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Notas obligatorias (mínimo 10 caracteres)", path: ["notes"] });
    }
  });

type CreateValues = z.infer<typeof createSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStatusVariant(status: string): "default" | "secondary" | "destructive" {
  if (status === "CONFIRMED") return "default";
  if (status === "CANCELLED") return "destructive";
  return "secondary";
}

function formatAmount(value: unknown): string {
  const num = Number(value);
  if (isNaN(num)) return "—";
  return `Bs. ${num.toFixed(2)}`;
}

function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleString("es-BO");
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MovementSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMovement: MovementData | null;
  products: ProductData[];
  recipients: RecipientData[];
  departments: DepartmentData[];
  orders: ManufactureOrderData[];
  userRole: UserRole;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function MovementSheet({
  open,
  onOpenChange,
  initialMovement,
  products,
  recipients,
  departments,
  orders,
  userRole,
}: MovementSheetProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [currentMovement, setCurrentMovement] = useState<MovementData | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // Sync state when sheet opens/closes or initialMovement changes
  useEffect(() => {
    if (open) {
      setCurrentMovement(initialMovement);
    } else {
      setCurrentMovement(null);
      setCancelDialogOpen(false);
      setCancelReason("");
    }
  }, [open, initialMovement]);

  const phase = !currentMovement
    ? "create"
    : currentMovement.status === "DRAFT"
      ? "draft"
      : "view";

  const canConfirm = can(userRole, PERMISSIONS.MOVEMENT_CONFIRM);
  const canCancel = can(userRole, PERMISSIONS.MOVEMENT_CANCEL);

  // -------------------------------------------------------------------------
  // Confirm / Cancel handlers
  // -------------------------------------------------------------------------

  function handleConfirm() {
    if (!currentMovement) return;
    startTransition(async () => {
      const result = await confirmMovementAction(currentMovement.id);
      if (!result.success) {
        toast({ title: "Error al confirmar", description: result.error, variant: "destructive" });
        return;
      }
      toast({ title: "Movimiento confirmado", description: "El stock fue actualizado." });
      onOpenChange(false);
      router.refresh();
    });
  }

  function handleCancel() {
    if (!currentMovement || cancelReason.trim().length < 10) return;
    startTransition(async () => {
      const result = await cancelMovementAction({
        movement_id: currentMovement.id,
        cancel_reason: cancelReason,
      });
      if (!result.success) {
        toast({ title: "Error al cancelar", description: result.error, variant: "destructive" });
        return;
      }
      toast({ title: "Movimiento cancelado." });
      setCancelDialogOpen(false);
      onOpenChange(false);
      router.refresh();
    });
  }

  // -------------------------------------------------------------------------
  // Title
  // -------------------------------------------------------------------------

  const sheetTitle = phase === "create"
    ? "Nuevo Movimiento"
    : currentMovement
      ? `${currentMovement.movement_number} — ${MOVEMENT_TYPE_LABELS[currentMovement.movement_type as keyof typeof MOVEMENT_TYPE_LABELS]}`
      : "Movimiento";

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{sheetTitle}</SheetTitle>
            {currentMovement && (
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={getStatusVariant(currentMovement.status)}>
                  {MOVEMENT_STATUS_LABELS[currentMovement.status as keyof typeof MOVEMENT_STATUS_LABELS]}
                </Badge>
                {currentMovement.processed_by_user && (
                  <span className="text-xs text-muted-foreground">
                    por {currentMovement.processed_by_user.full_name}
                  </span>
                )}
              </div>
            )}
          </SheetHeader>

          <Separator className="my-4" />

          {phase === "create" && (
            <CreatePhase
              isPending={isPending}
              startTransition={startTransition}
              setCurrentMovement={setCurrentMovement}
              recipients={recipients}
              departments={departments}
              orders={orders}
              toast={toast}
            />
          )}

          {phase === "draft" && currentMovement && (
            <DraftPhase
              movement={currentMovement}
              setCurrentMovement={setCurrentMovement}
              isPending={isPending}
              startTransition={startTransition}
              products={products}
              toast={toast}
              onConfirm={handleConfirm}
              onCancelClick={() => setCancelDialogOpen(true)}
              canConfirm={canConfirm}
              canCancel={canCancel}
            />
          )}

          {phase === "view" && currentMovement && (
            <ViewPhase movement={currentMovement} />
          )}
        </SheetContent>
      </Sheet>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar Movimiento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Esta acción es irreversible. El movimiento pasará a estado CANCELADO y no se podrá confirmar.
            </p>
            <div className="space-y-1.5">
              <Label>
                Motivo de cancelación <span className="text-destructive">*</span>
              </Label>
              <Textarea
                rows={3}
                placeholder="Describe el motivo (mínimo 10 caracteres)..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                disabled={isPending}
              />
              {cancelReason.length > 0 && cancelReason.trim().length < 10 && (
                <p className="text-xs text-destructive">
                  Mínimo 10 caracteres ({cancelReason.trim().length}/10)
                </p>
              )}
            </div>
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
              onClick={handleCancel}
              disabled={isPending || cancelReason.trim().length < 10}
            >
              {isPending ? "Cancelando..." : "Cancelar Movimiento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ===========================================================================
// CREATE PHASE
// ===========================================================================

interface CreatePhaseProps {
  isPending: boolean;
  startTransition: TransitionStartFunction;
  setCurrentMovement: (m: MovementData) => void;
  recipients: RecipientData[];
  departments: DepartmentData[];
  orders: ManufactureOrderData[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toast: (opts: any) => void;
}

function CreatePhase({
  isPending,
  startTransition,
  setCurrentMovement,
  recipients,
  departments,
  orders,
  toast,
}: CreatePhaseProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { notes: "" },
  });

  const movementType = watch("movement_type");
  const needsRecipient = movementType === "SALE" || movementType === "DONATION";
  const needsDepartment = movementType === "DEPARTMENT_DELIVERY";
  const needsOrder = movementType === "ENTRY";
  const needsNotes = movementType === "WRITE_OFF" || movementType === "ADJUSTMENT";

  // Filter recipients based on movement type
  const filteredRecipients = movementType === "DONATION"
    ? recipients.filter((r) => r.type === "SCHOLAR")
    : movementType === "SALE"
      ? recipients.filter((r) => r.type === "STUDENT" || r.type === "STAFF")
      : recipients;

  // Filter orders to active ones
  const activeOrders = orders.filter(
    (o) => o.status === "PENDING" || o.status === "IN_PROGRESS",
  );

  const onSubmit = (values: CreateValues) => {
    startTransition(async () => {
      const payload = {
        movement_type: values.movement_type,
        recipient_id: values.recipient_id || undefined,
        department_id: values.department_id || undefined,
        manufacture_order_id: values.manufacture_order_id || undefined,
        notes: values.notes || undefined,
      };

      const result = await createMovementAction(payload);
      if (!result.success) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
        return;
      }

      toast({ title: "Movimiento creado en borrador.", description: "Ahora agregá los ítems." });
      setCurrentMovement(result.data);
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Tipo de movimiento */}
      <div className="space-y-1.5">
        <Label>
          Tipo de Movimiento <span className="text-destructive">*</span>
        </Label>
        <Select
          value={movementType}
          onValueChange={(v) => {
            setValue("movement_type", v as CreateValues["movement_type"]);
            setValue("recipient_id", "");
            setValue("department_id", "");
            setValue("manufacture_order_id", "");
          }}
          disabled={isPending}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar tipo..." />
          </SelectTrigger>
          <SelectContent>
            {enumToOptions(MovementType, MOVEMENT_TYPE_LABELS).map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.movement_type && (
          <p className="text-xs text-destructive">{errors.movement_type.message}</p>
        )}
      </div>

      {/* Destinatario (SALE / DONATION) */}
      {needsRecipient && (
        <div className="space-y-1.5">
          <Label>
            Destinatario <span className="text-destructive">*</span>
          </Label>
          {filteredRecipients.length === 0 ? (
            <p className="text-sm text-muted-foreground rounded border p-3">
              No hay destinatarios disponibles para este tipo de movimiento.
            </p>
          ) : (
            <Select
              value={watch("recipient_id") ?? ""}
              onValueChange={(v) => setValue("recipient_id", v)}
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar destinatario..." />
              </SelectTrigger>
              <SelectContent>
                {filteredRecipients.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.full_name} ({r.document_number}) —{" "}
                    {RECIPIENT_TYPE_LABELS[r.type as keyof typeof RECIPIENT_TYPE_LABELS]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {errors.recipient_id && (
            <p className="text-xs text-destructive">{errors.recipient_id.message}</p>
          )}
        </div>
      )}

      {/* Departamento (DEPARTMENT_DELIVERY) */}
      {needsDepartment && (
        <div className="space-y-1.5">
          <Label>
            Departamento <span className="text-destructive">*</span>
          </Label>
          <Select
            value={watch("department_id") ?? ""}
            onValueChange={(v) => setValue("department_id", v)}
            disabled={isPending}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar departamento..." />
            </SelectTrigger>
            <SelectContent>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.department_id && (
            <p className="text-xs text-destructive">{errors.department_id.message}</p>
          )}
        </div>
      )}

      {/* Orden de fabricación (ENTRY) */}
      {needsOrder && (
        <div className="space-y-1.5">
          <Label>
            Orden de Fabricación <span className="text-destructive">*</span>
          </Label>
          {activeOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground rounded border p-3">
              No hay órdenes activas (PENDIENTE o EN PROGRESO).
            </p>
          ) : (
            <Select
              value={watch("manufacture_order_id") ?? ""}
              onValueChange={(v) => setValue("manufacture_order_id", v)}
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar orden..." />
              </SelectTrigger>
              <SelectContent>
                {activeOrders.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.order_number} — {o.manufacturer?.name ?? "Sin fabricante"} ({o.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {errors.manufacture_order_id && (
            <p className="text-xs text-destructive">{errors.manufacture_order_id.message}</p>
          )}
        </div>
      )}

      {/* Notas */}
      <div className="space-y-1.5">
        <Label htmlFor="notes">
          Notas{needsNotes && <span className="text-destructive"> *</span>}
        </Label>
        <Textarea
          id="notes"
          rows={3}
          placeholder={
            needsNotes
              ? "Obligatorio para este tipo de movimiento (mín. 10 caracteres)..."
              : "Observaciones opcionales..."
          }
          disabled={isPending}
          {...register("notes")}
        />
        {errors.notes && (
          <p className="text-xs text-destructive">{errors.notes.message}</p>
        )}
      </div>

      {movementType === "ADJUSTMENT" && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
          <strong>Ajuste de inventario:</strong> En los ítems podés usar cantidades{" "}
          <strong>negativas</strong> para disminuir el stock o positivas para aumentarlo.
        </div>
      )}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Creando borrador..." : "Crear Borrador →"}
      </Button>
    </form>
  );
}

// ===========================================================================
// DRAFT PHASE
// ===========================================================================

interface DraftPhaseProps {
  movement: MovementData;
  setCurrentMovement: (m: MovementData) => void;
  isPending: boolean;
  startTransition: TransitionStartFunction;
  products: ProductData[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toast: (opts: any) => void;
  onConfirm: () => void;
  onCancelClick: () => void;
  canConfirm: boolean;
  canCancel: boolean;
}

// ---------------------------------------------------------------------------
// Stock validation helpers
// ---------------------------------------------------------------------------

type StockStatus = "ok" | "warning" | "error" | null;

function getStockStatus(movementType: string, qty: number, stock: number): StockStatus {
  // ENTRY and ADJUSTMENT don't consume stock in the same direction
  if (movementType === "ENTRY" || movementType === "ADJUSTMENT") return null;
  if (qty <= 0) return null;
  if (qty > stock) return "error";
  if (qty > stock * 0.8) return "warning";
  return "ok";
}

function DraftPhase({
  movement,
  setCurrentMovement,
  isPending,
  startTransition,
  products,
  toast,
  onConfirm,
  onCancelClick,
  canConfirm,
  canCancel,
}: DraftPhaseProps) {
  const isSale = movement.movement_type === "SALE";
  const isAdjustment = movement.movement_type === "ADJUSTMENT";
  const isDeptDelivery = movement.movement_type === "DEPARTMENT_DELIVERY";

  // Filter products by movement type
  const availableProducts = isDeptDelivery
    ? products.filter((p) => p.is_active && p.warehouse_area === "OFFICE")
    : products.filter((p) => p.is_active);

  // Add item state
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("0");
  const [addError, setAddError] = useState("");

  const selectedProduct = availableProducts.find((p) => p.id === selectedProductId);
  const availableVariants = selectedProduct?.variants.filter((v) => v.is_active) ?? [];
  const selectedVariant = availableVariants.find((v) => v.id === selectedVariantId);

  // Stock validation (only for outgoing movements)
  const parsedQty = Number(quantity);
  const variantStock = selectedVariant?.current_stock ?? 0;
  const stockStatus = selectedVariantId
    ? getStockStatus(movement.movement_type, parsedQty, variantStock)
    : null;
  const remainingAfter = variantStock - parsedQty;
  const isStockBlocked = stockStatus === "error";

  function resetAddForm() {
    setSelectedProductId("");
    setSelectedVariantId("");
    setQuantity("1");
    setUnitPrice("0");
    setAddError("");
  }

  function handleAddItem() {
    setAddError("");
    const qty = Number(quantity);
    const price = Number(unitPrice);

    if (!selectedVariantId) { setAddError("Seleccioná una variante."); return; }
    if (isNaN(qty) || qty === 0) { setAddError("La cantidad no puede ser 0."); return; }
    if (!isAdjustment && qty < 1) { setAddError("La cantidad debe ser mayor a 0."); return; }
    if (isSale && price <= 0) { setAddError("El precio debe ser mayor a 0 para ventas."); return; }
    if (isStockBlocked) {
      setAddError(`La cantidad excede el stock disponible (${variantStock} unidades).`);
      return;
    }

    startTransition(async () => {
      const result = await addMovementItemAction({
        movement_id: movement.id,
        product_variant_id: selectedVariantId,
        quantity: qty,
        unit_price: isSale ? price : 0,
      });

      if (!result.success) {
        setAddError(result.error ?? "Error al agregar ítem.");
        return;
      }

      setCurrentMovement(result.data);
      resetAddForm();
      toast({ title: "Ítem agregado." });
    });
  }

  function handleRemoveItem(itemId: string) {
    startTransition(async () => {
      const result = await removeMovementItemAction(itemId);
      if (!result.success) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
        return;
      }
      setCurrentMovement(result.data);
      toast({ title: "Ítem eliminado." });
    });
  }

  return (
    <div className="space-y-5">
      {/* Movement info */}
      <div className="rounded-lg bg-muted/50 px-4 py-3 text-sm space-y-1">
        {movement.recipient && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Destinatario</span>
            <span>{movement.recipient.full_name} ({movement.recipient.document_number})</span>
          </div>
        )}
        {movement.department && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Departamento</span>
            <span>{movement.department.name} ({movement.department.code})</span>
          </div>
        )}
        {movement.manufacture_order && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Orden</span>
            <span>{movement.manufacture_order.order_number}</span>
          </div>
        )}
        {movement.notes && (
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground shrink-0">Notas</span>
            <span className="text-right">{movement.notes}</span>
          </div>
        )}
      </div>

      {/* Items table */}
      <div>
        <h3 className="text-sm font-semibold mb-2">
          Ítems ({movement.items.length})
        </h3>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Variante</TableHead>
                <TableHead className="text-right">Cant.</TableHead>
                {isSale && <TableHead className="text-right">P. Unit.</TableHead>}
                {isSale && <TableHead className="text-right">Subtotal</TableHead>}
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {movement.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isSale ? 6 : 4} className="py-6 text-center text-sm text-muted-foreground">
                    Sin ítems. Agregá al menos uno antes de confirmar.
                  </TableCell>
                </TableRow>
              ) : (
                movement.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-sm">
                      <span className="font-mono text-xs">{item.product_variant.product.sku}</span>
                      <br />
                      <span>{item.product_variant.product.name}</span>
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="font-mono text-xs">{item.product_variant.sku_suffix}</span>
                      {item.product_variant.size && (
                        <span className="ml-1 text-muted-foreground">
                          {item.product_variant.size} / {item.product_variant.gender}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {item.quantity}
                    </TableCell>
                    {isSale && (
                      <TableCell className="text-right text-sm">
                        {formatAmount(item.unit_price)}
                      </TableCell>
                    )}
                    {isSale && (
                      <TableCell className="text-right text-sm font-medium">
                        {formatAmount(item.subtotal)}
                      </TableCell>
                    )}
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={isPending}
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {isSale && movement.items.length > 0 && (
          <div className="flex justify-end mt-2 text-sm font-semibold">
            Total: {formatAmount(movement.total_amount)}
          </div>
        )}
      </div>

      {/* Add item form */}
      <div className="rounded-lg border p-4 space-y-3">
        <h3 className="text-sm font-semibold">Agregar ítem</h3>

        <div className="grid grid-cols-2 gap-3">
          {/* Producto */}
          <div className="space-y-1">
            <Label className="text-xs">Producto</Label>
            <Select
              value={selectedProductId}
              onValueChange={(v) => {
                setSelectedProductId(v);
                setSelectedVariantId("");
              }}
              disabled={isPending}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                {availableProducts.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="font-mono text-xs mr-1">{p.sku}</span> {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Variante */}
          <div className="space-y-1">
            <Label className="text-xs">Variante</Label>
            <Select
              value={selectedVariantId}
              onValueChange={setSelectedVariantId}
              disabled={isPending || !selectedProductId}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder={selectedProductId ? "Seleccionar..." : "Primero elegí un producto"} />
              </SelectTrigger>
              <SelectContent>
                {availableVariants.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.sku_suffix}
                    {v.size && ` — ${v.size} / ${v.gender} / ${v.color}`}
                    <span className="ml-2 text-muted-foreground text-xs">
                      (stock: {v.current_stock})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className={`grid gap-3 ${isSale ? "grid-cols-3" : "grid-cols-1"}`}>
          <div className="space-y-1">
            <Label className="text-xs">
              Cantidad {isAdjustment && "(negativa = baja)"}
            </Label>
            <Input
              type="number"
              className="h-9"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={isPending}
            />
          </div>

          {isSale && (
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Precio unitario (Bs.)</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                className="h-9"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                disabled={isPending}
              />
            </div>
          )}
        </div>

        {/* Stock feedback — only for outgoing movement types */}
        {selectedVariantId && stockStatus !== null && (
          <div className={`flex items-start gap-2 rounded-md px-3 py-2 text-xs ${
            stockStatus === "error"
              ? "bg-destructive/10 text-destructive"
              : stockStatus === "warning"
                ? "bg-amber-50 text-amber-800 border border-amber-200"
                : "text-muted-foreground"
          }`}>
            {stockStatus === "error" && (
              <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            )}
            {stockStatus === "warning" && (
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-600" />
            )}
            <span>
              {stockStatus === "error" && (
                <>La cantidad excede el stock disponible ({variantStock} unidades).</>
              )}
              {stockStatus === "warning" && (
                <>Atención: quedarán solo {remainingAfter} unidades en stock.</>
              )}
              {stockStatus === "ok" && (
                <>Stock disponible: {variantStock} unidades.</>
              )}
            </span>
          </div>
        )}
        {selectedVariantId && stockStatus === null && selectedVariant !== undefined && !isAdjustment && (
          <p className="text-xs text-muted-foreground">
            Stock disponible: {variantStock} unidades.
          </p>
        )}

        {addError && (
          <p className="text-xs text-destructive">{addError}</p>
        )}

        <Button
          type="button"
          size="sm"
          onClick={handleAddItem}
          disabled={isPending || !selectedVariantId || isStockBlocked}
        >
          <Plus className="mr-1 h-4 w-4" />
          Agregar
        </Button>
      </div>

      {/* Actions */}
      {(canConfirm || canCancel) && (
        <div className="flex gap-3 pt-2">
          {canConfirm && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  className="flex-1"
                  disabled={isPending || movement.items.length === 0}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Confirmar Movimiento
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Confirmar movimiento?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción es <strong>irreversible</strong>. El stock de{" "}
                    {movement.items.length} variante{movement.items.length !== 1 ? "s" : ""} será
                    actualizado inmediatamente.
                    {isSale && (
                      <span className="block mt-1">
                        Total a cobrar: <strong>{formatAmount(movement.total_amount)}</strong>
                      </span>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Revisar</AlertDialogCancel>
                  <AlertDialogAction onClick={onConfirm}>
                    Confirmar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {canCancel && (
            <Button
              variant="outline"
              className="text-destructive border-destructive/50 hover:bg-destructive/10"
              disabled={isPending}
              onClick={onCancelClick}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// VIEW PHASE (read-only)
// ===========================================================================

function ViewPhase({ movement }: { movement: MovementData }) {
  const isSale = movement.movement_type === "SALE";
  const isCancelled = movement.status === "CANCELLED";

  return (
    <div className="space-y-5">
      {/* Header info */}
      <div className="rounded-lg bg-muted/50 px-4 py-3 text-sm space-y-2">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {movement.recipient && (
            <>
              <span className="text-muted-foreground">Destinatario</span>
              <span>{movement.recipient.full_name}</span>
            </>
          )}
          {movement.department && (
            <>
              <span className="text-muted-foreground">Departamento</span>
              <span>{movement.department.name} ({movement.department.code})</span>
            </>
          )}
          {movement.manufacture_order && (
            <>
              <span className="text-muted-foreground">Orden</span>
              <span>{movement.manufacture_order.order_number}</span>
            </>
          )}
          {movement.processed_at && (
            <>
              <span className="text-muted-foreground">Confirmado</span>
              <span>{formatDate(movement.processed_at)}</span>
            </>
          )}
          {isCancelled && movement.cancelled_at && (
            <>
              <span className="text-muted-foreground">Cancelado</span>
              <span>{formatDate(movement.cancelled_at)}</span>
            </>
          )}
        </div>
        {movement.notes && (
          <div>
            <span className="text-muted-foreground block">Notas</span>
            <span>{movement.notes}</span>
          </div>
        )}
        {isCancelled && movement.cancel_reason && (
          <div className="rounded bg-destructive/10 p-2">
            <span className="text-destructive text-xs font-medium block">Motivo de cancelación</span>
            <span className="text-sm">{movement.cancel_reason}</span>
          </div>
        )}
      </div>

      {/* Items */}
      <div>
        <h3 className="text-sm font-semibold mb-2">
          Ítems ({movement.items.length})
        </h3>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Variante</TableHead>
                <TableHead className="text-right">Cant.</TableHead>
                {isSale && <TableHead className="text-right">P. Unit.</TableHead>}
                {isSale && <TableHead className="text-right">Subtotal</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {movement.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-sm">
                    <span className="font-mono text-xs">{item.product_variant.product.sku}</span>
                    <br />
                    <span>{item.product_variant.product.name}</span>
                  </TableCell>
                  <TableCell className="text-sm font-mono text-xs">
                    {item.product_variant.sku_suffix}
                    {item.product_variant.size && (
                      <span className="font-sans ml-1 text-muted-foreground">
                        {item.product_variant.size} / {item.product_variant.gender}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {item.quantity}
                  </TableCell>
                  {isSale && (
                    <TableCell className="text-right text-sm">
                      {formatAmount(item.unit_price)}
                    </TableCell>
                  )}
                  {isSale && (
                    <TableCell className="text-right text-sm font-medium">
                      {formatAmount(item.subtotal)}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {isSale && (
          <div className="flex justify-end mt-2 text-sm font-semibold">
            Total: {formatAmount(movement.total_amount)}
          </div>
        )}
      </div>
    </div>
  );
}
