import Link from "next/link";
import { getManufacturers } from "@/actions/manufacturers";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  PageTransition,
} from "@upds/ui";
import { Factory, Plus } from "lucide-react";
import { ManufacturersTable } from "./_components/manufacturers-table";

export default async function ManufacturersPage() {
  const result = await getManufacturers();

  if (!result.success) {
    return <p className="p-6 text-red-600">Error: {result.error}</p>;
  }

  const { manufacturers } = result.data;

  return (
    <PageTransition>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Factory className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold">Fabricantes</h1>
            <Badge variant="secondary" className="ml-1">
              {manufacturers.length} registros
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Gestiona los fabricantes y proveedores del sistema
          </p>
        </div>
        <Link href="/manufacturers/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Fabricante
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium text-muted-foreground">
            Listado
          </CardTitle>
        </CardHeader>
        <CardContent>
          {manufacturers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <Factory className="h-16 w-16 text-muted-foreground/40 mb-4" />
              <p className="text-lg font-medium text-muted-foreground mb-2">
                No hay fabricantes registrados
              </p>
              <p className="text-sm text-muted-foreground/70 mb-6">
                Comienza agregando tu primer fabricante al sistema
              </p>
              <Link href="/manufacturers/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Fabricante
                </Button>
              </Link>
            </div>
          ) : (
            <ManufacturersTable manufacturers={manufacturers} />
          )}
        </CardContent>
      </Card>
    </div>
    </PageTransition>
  );
}
