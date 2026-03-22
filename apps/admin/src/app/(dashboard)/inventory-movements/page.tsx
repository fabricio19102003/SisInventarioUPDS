import Link from "next/link";
import { getInventoryMovements } from "@/actions/inventory-movements";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Button, Badge,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@upds/ui";
import { MOVEMENT_TYPE_LABELS, MOVEMENT_STATUS_LABELS } from "@upds/validators";
import { ArrowLeftRight, Plus, Eye } from "lucide-react";

const statusColors: Record<string, string> = {
  DRAFT: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export default async function InventoryMovementsPage() {
  const result = await getInventoryMovements();
  if (!result.success) return <p className="p-6 text-red-600">Error: {result.error}</p>;

  const { movements } = result.data;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <ArrowLeftRight className="h-7 w-7 text-primary" />
              <h1 className="text-2xl font-bold">Movimientos de Inventario</h1>
              <Badge variant="secondary" className="ml-1">
                {movements.length} registros
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Registro de entradas, salidas y ajustes de inventario
            </p>
          </div>
          <Link href="/inventory-movements/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Movimiento
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Listado</CardTitle>
            <CardDescription>Todos los movimientos de inventario registrados</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {movements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <ArrowLeftRight className="h-16 w-16 text-muted-foreground/40 mb-4" />
                <p className="text-lg font-medium text-muted-foreground mb-1">
                  No hay movimientos registrados
                </p>
                <p className="text-sm text-muted-foreground/70 mb-6">
                  Comienza registrando tu primer movimiento de inventario
                </p>
                <Link href="/inventory-movements/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Movimiento
                  </Button>
                </Link>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nro. Movimiento</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Destinatario / Depto</TableHead>
                    <TableHead className="text-right">Monto Total</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="w-24">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono">{m.movement_number}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {MOVEMENT_TYPE_LABELS[m.movement_type as keyof typeof MOVEMENT_TYPE_LABELS]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[m.status] ?? ""}`}>
                          {MOVEMENT_STATUS_LABELS[m.status as keyof typeof MOVEMENT_STATUS_LABELS]}
                        </span>
                      </TableCell>
                      <TableCell>
                        {m.recipient?.full_name ?? m.department?.name ?? "\u2014"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {m.total_amount > 0 ? `Bs ${m.total_amount.toFixed(2)}` : "\u2014"}
                      </TableCell>
                      <TableCell>{new Date(m.created_at).toLocaleDateString("es-BO")}</TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link href={`/inventory-movements/${m.id}`}>
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
