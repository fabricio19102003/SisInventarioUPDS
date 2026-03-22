import Link from "next/link";
import { getManufactureOrders } from "@/actions/manufacture-orders";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Button, Badge,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@upds/ui";
import { MANUFACTURE_ORDER_STATUS_LABELS } from "@upds/validators";
import { ClipboardList, Plus, Eye } from "lucide-react";

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export default async function ManufactureOrdersPage() {
  const result = await getManufactureOrders();
  if (!result.success) return <p className="p-6 text-red-600">Error: {result.error}</p>;

  const { orders } = result.data;

  return (
    <TooltipProvider>
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
          <CardContent className="p-0">
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nro. Orden</TableHead>
                    <TableHead>Fabricante</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha Pedido</TableHead>
                    <TableHead>Fecha Esperada</TableHead>
                    <TableHead className="w-24">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o: any) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono">{o.order_number}</TableCell>
                      <TableCell>{o.manufacturer?.name ?? "\u2014"}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[o.status] ?? ""}`}>
                          {MANUFACTURE_ORDER_STATUS_LABELS[o.status as keyof typeof MANUFACTURE_ORDER_STATUS_LABELS]}
                        </span>
                      </TableCell>
                      <TableCell>{o.ordered_at ? new Date(o.ordered_at).toLocaleDateString("es-BO") : "\u2014"}</TableCell>
                      <TableCell>{o.expected_at ? new Date(o.expected_at).toLocaleDateString("es-BO") : "\u2014"}</TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link href={`/manufacture-orders/${o.id}`}>
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
