import Link from "next/link";
import { getDepartments } from "@/actions/departments";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  PageTransition,
} from "@upds/ui";
import { Building2, Plus } from "lucide-react";
import { DepartmentsTable } from "./_components/departments-table";

export default async function DepartmentsPage() {
  const result = await getDepartments();
  if (!result.success) return <p className="p-6 text-red-600">Error: {result.error}</p>;

  const { departments } = result.data;

  return (
    <PageTransition>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Building2 className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold">Departamentos</h1>
            <Badge variant="secondary" className="ml-1">
              {departments.length} registros
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Gestiona los departamentos de la organizacion
          </p>
        </div>
        <Link href="/departments/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Departamento
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
          {departments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <Building2 className="h-16 w-16 text-muted-foreground/40 mb-4" />
              <p className="text-lg font-medium text-muted-foreground mb-2">
                No hay departamentos registrados
              </p>
              <p className="text-sm text-muted-foreground/70 mb-6">
                Comienza agregando tu primer departamento al sistema
              </p>
              <Link href="/departments/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Departamento
                </Button>
              </Link>
            </div>
          ) : (
            <DepartmentsTable departments={departments} />
          )}
        </CardContent>
      </Card>
    </div>
    </PageTransition>
  );
}
