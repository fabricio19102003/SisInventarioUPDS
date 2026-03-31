import Link from "next/link";
import { getInventoryMovements } from "@/actions/inventory-movements";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Button, Badge,
  PageTransition,
} from "@upds/ui";
import { ArrowLeftRight, Plus } from "lucide-react";
import { MovementsTable } from "./_components/movements-table";

export default async function InventoryMovementsPage() {
  const result = await getInventoryMovements();
  if (!result.success) return <p className="p-6 text-red-600">Error: {result.error}</p>;

  const { movements } = result.data;

  return (
    <PageTransition>
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
        <CardContent>
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
            <MovementsTable movements={movements} />
          )}
        </CardContent>
      </Card>
    </div>
    </PageTransition>
  );
}
