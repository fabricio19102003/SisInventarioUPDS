import Link from "next/link";
import { getProducts } from "@/actions/products";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Button, Badge,
  PageTransition,
} from "@upds/ui";
import { Package, Plus } from "lucide-react";
import { ProductsTable } from "./_components/products-table";

export default async function ProductsPage() {
  const result = await getProducts();
  if (!result.success) return <p className="p-6 text-red-600">Error: {result.error}</p>;

  const { products } = result.data;

  return (
    <PageTransition>
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
        <CardContent>
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
            <ProductsTable products={products} />
          )}
        </CardContent>
      </Card>
    </div>
    </PageTransition>
  );
}
