import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct } from "@/actions/products";
import {
  Card, CardContent, CardHeader, CardTitle, Button, Badge,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  PageTransition,
} from "@upds/ui";
import {
  PRODUCT_CATEGORY_LABELS, GARMENT_TYPE_LABELS, WAREHOUSE_AREA_LABELS,
  GENDER_LABELS,
} from "@upds/validators";
import { ProductActions } from "../_components/product-actions";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getProduct(id);
  if (!result.success) return notFound();
  const p = result.data;
  const isMedical = p.category === "MEDICAL_GARMENT";

  return (
    <PageTransition>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{p.name}</h1>
          <Badge variant="outline">{p.sku}</Badge>
          <Badge variant={p.is_active ? "default" : "secondary"}>
            {p.is_active ? "Activo" : "Inactivo"}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Link href={`/products/${id}/edit`}><Button variant="outline">Editar</Button></Link>
          <ProductActions id={id} isActive={p.is_active} isMedical={isMedical} />
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Información del Producto</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-muted-foreground">Categoría</dt>
              <dd className="font-medium">{PRODUCT_CATEGORY_LABELS[p.category as keyof typeof PRODUCT_CATEGORY_LABELS]}</dd>
            </div>
            {p.garment_type && (
              <div>
                <dt className="text-sm text-muted-foreground">Tipo Prenda</dt>
                <dd className="font-medium">{GARMENT_TYPE_LABELS[p.garment_type as keyof typeof GARMENT_TYPE_LABELS]}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm text-muted-foreground">Área Almacén</dt>
              <dd className="font-medium">{WAREHOUSE_AREA_LABELS[p.warehouse_area as keyof typeof WAREHOUSE_AREA_LABELS]}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Stock Mínimo</dt>
              <dd className="font-medium">{p.min_stock}</dd>
            </div>
            {p.description && (
              <div className="col-span-2">
                <dt className="text-sm text-muted-foreground">Descripción</dt>
                <dd className="font-medium">{p.description}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Variantes</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU Suffix</TableHead>
                {isMedical && <TableHead>Talla</TableHead>}
                {isMedical && <TableHead>Género</TableHead>}
                {isMedical && <TableHead>Color</TableHead>}
                <TableHead className="text-right">Stock Actual</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(p.variants ?? []).map((v: any) => {
                const lowStock = v.current_stock < p.min_stock;
                return (
                  <TableRow key={v.id} className={lowStock ? "bg-orange-50" : ""}>
                    <TableCell className="font-mono">{v.sku_suffix}</TableCell>
                    {isMedical && <TableCell>{v.size || "—"}</TableCell>}
                    {isMedical && (
                      <TableCell>
                        {v.gender ? GENDER_LABELS[v.gender as keyof typeof GENDER_LABELS] : "—"}
                      </TableCell>
                    )}
                    {isMedical && <TableCell>{v.color || "—"}</TableCell>}
                    <TableCell className="text-right tabular-nums">
                      <span className={lowStock ? "text-orange-700 font-bold" : ""}>
                        {v.current_stock}
                      </span>
                      {lowStock && <span className="text-xs text-orange-600 ml-1">(bajo)</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={v.is_active ? "default" : "secondary"}>
                        {v.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Link href="/products"><Button variant="outline">Volver al listado</Button></Link>
    </div>
    </PageTransition>
  );
}
