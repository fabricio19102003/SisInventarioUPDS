import Link from "next/link";
import { getProducts } from "@/actions/products";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Button, Badge,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@upds/ui";
import {
  PRODUCT_CATEGORY_LABELS, GARMENT_TYPE_LABELS, WAREHOUSE_AREA_LABELS,
} from "@upds/validators";
import { Package, Plus, Eye } from "lucide-react";

export default async function ProductsPage() {
  const result = await getProducts();
  if (!result.success) return <p className="p-6 text-red-600">Error: {result.error}</p>;

  const { products } = result.data;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Package className="h-7 w-7 text-primary" />
              <h1 className="text-2xl font-bold">Productos</h1>
              <Badge variant="secondary" className="ml-1">
                {products.length} registros
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Gestiona el catalogo de productos y variantes
            </p>
          </div>
          <Link href="/products/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Producto
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Listado</CardTitle>
            <CardDescription>Todos los productos del inventario</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <Package className="h-16 w-16 text-muted-foreground/40 mb-4" />
                <p className="text-lg font-medium text-muted-foreground mb-1">
                  No hay productos registrados
                </p>
                <p className="text-sm text-muted-foreground/70 mb-6">
                  Comienza agregando tu primer producto al inventario
                </p>
                <Link href="/products/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Producto
                  </Button>
                </Link>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead className="text-right">Stock Min</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-24">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono">{p.sku}</TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {PRODUCT_CATEGORY_LABELS[p.category as keyof typeof PRODUCT_CATEGORY_LABELS]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {p.garment_type
                          ? GARMENT_TYPE_LABELS[p.garment_type as keyof typeof GARMENT_TYPE_LABELS]
                          : "\u2014"}
                      </TableCell>
                      <TableCell>
                        {WAREHOUSE_AREA_LABELS[p.warehouse_area as keyof typeof WAREHOUSE_AREA_LABELS]}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{p.min_stock}</TableCell>
                      <TableCell>
                        <Badge variant={p.is_active ? "default" : "secondary"}>
                          {p.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link href={`/products/${p.id}`}>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent>Ver detalles</TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
