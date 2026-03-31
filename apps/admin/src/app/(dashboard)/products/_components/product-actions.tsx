"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button, AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  Input, Label,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@upds/ui";
import { deactivateProduct, reactivateProduct, addVariant } from "@/actions/products";
import { enumToOptions, Size, SIZE_LABELS, Gender, GENDER_LABELS } from "@upds/validators";

const sizeOptions = enumToOptions(Size, SIZE_LABELS);
const genderOptions = enumToOptions(Gender, GENDER_LABELS);

export function ProductActions({ id, isActive, isMedical }: { id: string; isActive: boolean; isMedical: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex gap-2">
      {isActive ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={isPending}>Desactivar</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Desactivar producto?</AlertDialogTitle>
              <AlertDialogDescription>
                El producto y sus variantes dejarán de estar disponibles.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => startTransition(async () => {
                const r = await deactivateProduct(id);
                if (r.success) router.refresh();
              })}>Desactivar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <Button variant="outline" size="sm" disabled={isPending} onClick={() => startTransition(async () => {
          const r = await reactivateProduct(id);
          if (r.success) router.refresh();
        })}>
          {isPending ? "..." : "Reactivar"}
        </Button>
      )}

      {isActive && isMedical && <AddVariantDialog productId={id} />}
    </div>
  );
}

function AddVariantDialog({ productId }: { productId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState("M");
  const [gender, setGender] = useState("UNISEX");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await addVariant({
        product_id: productId,
        size: size as any,
        gender: gender as any,
        color: fd.get("color") as string,
        initial_stock: Number(fd.get("initial_stock")) || 0,
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
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">+ Variante</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Agregar Variante</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Talla</Label>
              <Select value={size} onValueChange={setSize}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {sizeOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.value}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Género</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {genderOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <Input id="color" name="color" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="initial_stock">Stock Inicial</Label>
            <Input id="initial_stock" name="initial_stock" type="number" min={0} defaultValue={0} />
          </div>
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Agregando..." : "Agregar Variante"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
