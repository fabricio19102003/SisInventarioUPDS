import Link from "next/link";
import { getDepartments } from "@/actions/departments";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@upds/ui";
import { Building2, Plus, Eye } from "lucide-react";

export default async function DepartmentsPage() {
  const result = await getDepartments();
  if (!result.success) return <p className="p-6 text-red-600">Error: {result.error}</p>;

  const { departments } = result.data;

  return (
    <TooltipProvider>
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
          <CardContent className="p-0">
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Codigo</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-24">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono font-medium">{d.code}</TableCell>
                      <TableCell>{d.name}</TableCell>
                      <TableCell>
                        <Badge variant={d.is_active ? "default" : "secondary"}>
                          {d.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link href={`/departments/${d.id}`}>
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
