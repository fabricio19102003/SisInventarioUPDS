import Link from "next/link";
import { getManufacturers } from "@/actions/manufacturers";
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
import { Factory, Plus, Eye } from "lucide-react";

export default async function ManufacturersPage() {
  const result = await getManufacturers();

  if (!result.success) {
    return <p className="p-6 text-red-600">Error: {result.error}</p>;
  }

  const { manufacturers } = result.data;

  return (
    <TooltipProvider>
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
          <CardContent className="p-0">
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Telefono</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-24">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {manufacturers.map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell>{m.contact_name || "\u2014"}</TableCell>
                      <TableCell>{m.phone || "\u2014"}</TableCell>
                      <TableCell>{m.email || "\u2014"}</TableCell>
                      <TableCell>
                        <Badge variant={m.is_active ? "default" : "secondary"}>
                          {m.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link href={`/manufacturers/${m.id}`}>
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
