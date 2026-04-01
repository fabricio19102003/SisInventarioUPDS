"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
  Textarea,
} from "@upds/ui";
import { loadInitialStock } from "@/actions/products";

interface InitialStockButtonProps {
  productVariantId: string;
  productLabel: string;
  disabled?: boolean;
}

export function InitialStockButton({
  productVariantId,
  productLabel,
  disabled = false,
}: InitialStockButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(0);
  const [notes, setNotes] = useState("Carga inicial de stock");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);

    startTransition(async () => {
      const result = await loadInitialStock({
        product_variant_id: productVariantId,
        quantity,
        notes,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setOpen(false);
      setQuantity(0);
      setNotes("Carga inicial de stock");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} disabled={disabled}>
        Cargar stock
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Carga inicial de stock</DialogTitle>
          <p className="text-sm text-muted-foreground">{productLabel}</p>
        </DialogHeader>

        <div className="space-y-4">
          {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <div className="space-y-2">
            <Label htmlFor="initial-stock-quantity">Cantidad a ingresar</Label>
            <Input
              id="initial-stock-quantity"
              type="number"
              min={1}
              value={quantity || ""}
              onChange={(event) => setQuantity(Number(event.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="initial-stock-notes">Justificación</Label>
            <Textarea
              id="initial-stock-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || quantity <= 0 || notes.trim().length < 10}
          >
            {isPending ? "Cargando..." : "Confirmar carga"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
