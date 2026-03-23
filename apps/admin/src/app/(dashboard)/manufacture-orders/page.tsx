import Link from "next/link";
import { getManufactureOrders } from "@/actions/manufacture-orders";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Button, Badge,
  PageTransition,
} from "@upds/ui";
import { ClipboardList, Plus } from "lucide-react";
import { OrdersTable } from "./_components/orders-table";

export default async function ManufactureOrdersPage() {
  const result = await getManufactureOrders();
  if (!result.success) return <p className="p-6 text-red-600">Error: {result.error}</p>;

  const { orders } = result.data;

  return (
    <PageTransition>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <ClipboardList className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold">Ordenes de Fabricacion</h1>
            <Badge variant="secondary" className="ml-1">
              {orders.length} registros
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Seguimiento de ordenes de fabricacion y recepcion de materiales
          </p>
        </div>
        <Link href="/manufacture-orders/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Orden
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
          <CardDescription>Todas las ordenes de fabricacion registradas</CardDescription>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <ClipboardList className="h-16 w-16 text-muted-foreground/40 mb-4" />
              <p className="text-lg font-medium text-muted-foreground mb-1">
                No hay ordenes registradas
              </p>
              <p className="text-sm text-muted-foreground/70 mb-6">
                Comienza creando tu primera orden de fabricacion
              </p>
              <Link href="/manufacture-orders/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva Orden
                </Button>
              </Link>
            </div>
          ) : (
            <OrdersTable orders={orders} />
          )}
        </CardContent>
      </Card>
    </div>
    </PageTransition>
  );
}
