"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card, CardContent, CardHeader, CardTitle, Button, Input, Label, Textarea,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@upds/ui";
import { createProduct } from "@/actions/products";
import {
  enumToOptions, ProductCategory, PRODUCT_CATEGORY_LABELS,
  GarmentType, GARMENT_TYPE_LABELS, WarehouseArea, WAREHOUSE_AREA_LABELS,
  Size, SIZE_LABELS, Gender, GENDER_LABELS,
} from "@upds/validators";

const categoryOptions = enumToOptions(ProductCategory, PRODUCT_CATEGORY_LABELS);
const garmentOptions = enumToOptions(GarmentType, GARMENT_TYPE_LABELS);
const warehouseOptions = enumToOptions(WarehouseArea, WAREHOUSE_AREA_LABELS);
const sizeOptions = enumToOptions(Size, SIZE_LABELS);
const genderOptions = enumToOptions(Gender, GENDER_LABELS);

export function ProductForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("MEDICAL_GARMENT");
  const [garmentType, setGarmentType] = useState<string>("PIJAMA");
  const [warehouseArea, setWarehouseArea] = useState<string>("MEDICAL");

  // Variants for medical garments
  const [variants, setVariants] = useState<Array<{ size: string; gender: string; color: string; initial_stock: number }>>([
    { size: "M", gender: "UNISEX", color: "", initial_stock: 0 },
  ]);

  // Single stock for office supply
  const [officeStock, setOfficeStock] = useState(0);

  function addVariant() {
    setVariants([...variants, { size: "M", gender: "UNISEX", color: "", initial_stock: 0 }]);
  }

  function removeVariant(idx: number) {
    setVariants(variants.filter((_, i) => i !== idx));
  }

  function updateVariant(idx: number, field: string, value: any) {
    const updated = [...variants];
    (updated[idx] as any)[field] = value;
    setVariants(updated);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    const isMedical = category === "MEDICAL_GARMENT";

    const data: any = {
      sku: fd.get("sku") as string,
      name: fd.get("name") as string,
      description: (fd.get("description") as string) || undefined,
      category,
      garment_type: isMedical ? garmentType : undefined,
      warehouse_area: warehouseArea,
      min_stock: Number(fd.get("min_stock")) || 5,
      variants: isMedical
        ? variants.map((v) => ({ size: v.size, gender: v.gender, color: v.color, initial_stock: v.initial_stock }))
        : [{ initial_stock: officeStock }],
    };

    startTransition(async () => {
      const result = await createProduct(data);
      if (result.success) {
        router.push("/products");
      } else {
        setError(result.error);
      }
    });
  }

  const isMedical = category === "MEDICAL_GARMENT";

  return (
    <Card>
      <CardHeader><CardTitle>Nuevo Producto</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
          {error && (
            <div className="rounded bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU *</Label>
              <Input id="sku" name="sku" required placeholder="Ej: PIJ-QUI" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input id="name" name="name" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea id="description" name="description" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Categoría *</Label>
              <Select value={category} onValueChange={(v) => {
                setCategory(v);
                setWarehouseArea(v === "MEDICAL_GARMENT" ? "MEDICAL" : "OFFICE");
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isMedical && (
              <div className="space-y-2">
                <Label>Tipo Prenda *</Label>
                <Select value={garmentType} onValueChange={setGarmentType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {garmentOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Área Almacén *</Label>
              <Select value={warehouseArea} onValueChange={setWarehouseArea}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {warehouseOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="min_stock">Stock Mínimo</Label>
            <Input id="min_stock" name="min_stock" type="number" min={0} defaultValue={5} className="w-32" />
          </div>

          {isMedical ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Variantes</Label>
                <Button type="button" variant="outline" size="sm" onClick={addVariant}>+ Agregar Variante</Button>
              </div>
              {variants.map((v, idx) => (
                <div key={idx} className="grid grid-cols-5 gap-3 items-end p-3 bg-gray-50 rounded border">
                  <div className="space-y-1">
                    <Label className="text-xs">Talla</Label>
                    <Select value={v.size} onValueChange={(val) => updateVariant(idx, "size", val)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {sizeOptions.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.value}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Género</Label>
                    <Select value={v.gender} onValueChange={(val) => updateVariant(idx, "gender", val)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {genderOptions.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Color</Label>
                    <Input
                      value={v.color}
                      onChange={(e) => updateVariant(idx, "color", e.target.value)}
                      placeholder="Ej: Azul"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Stock Inicial</Label>
                    <Input
                      type="number" min={0}
                      value={v.initial_stock}
                      onChange={(e) => updateVariant(idx, "initial_stock", Number(e.target.value))}
                    />
                  </div>
                  <Button
                    type="button" variant="ghost" size="sm"
                    onClick={() => removeVariant(idx)}
                    disabled={variants.length === 1}
                    className="text-red-600"
                  >
                    Quitar
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Stock Inicial</Label>
              <Input
                type="number" min={0} className="w-32"
                value={officeStock}
                onChange={(e) => setOfficeStock(Number(e.target.value))}
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creando..." : "Crear Producto"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
