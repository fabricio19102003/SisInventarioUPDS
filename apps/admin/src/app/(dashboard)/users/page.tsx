import Link from "next/link";
import { getUsers } from "@/actions/users";
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
import { USER_ROLE_LABELS } from "@upds/validators";
import { Users, Plus, Eye } from "lucide-react";

const roleColors: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-800",
  INVENTORY_MANAGER: "bg-blue-100 text-blue-800",
  VIEWER: "bg-muted text-muted-foreground",
};

export default async function UsersPage() {
  const result = await getUsers();
  if (!result.success) return <p className="p-6 text-red-600">Error: {result.error}</p>;

  const { users } = result.data;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Users className="h-7 w-7 text-primary" />
              <h1 className="text-2xl font-bold">Usuarios</h1>
              <Badge variant="secondary" className="ml-1">
                {users.length} registros
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Gestiona los usuarios y permisos del sistema
            </p>
          </div>
          <Link href="/users/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Usuario
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
            {users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <Users className="h-16 w-16 text-muted-foreground/40 mb-4" />
                <p className="text-lg font-medium text-muted-foreground mb-2">
                  No hay usuarios registrados
                </p>
                <p className="text-sm text-muted-foreground/70 mb-6">
                  Comienza agregando tu primer usuario al sistema
                </p>
                <Link href="/users/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Usuario
                  </Button>
                </Link>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Ultimo Login</TableHead>
                    <TableHead className="w-24">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u: any) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-mono">{u.email}</TableCell>
                      <TableCell className="font-medium">{u.full_name}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${roleColors[u.role] ?? ""}`}>
                          {USER_ROLE_LABELS[u.role as keyof typeof USER_ROLE_LABELS]}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.is_active ? "default" : "secondary"}>
                          {u.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {u.last_login_at ? new Date(u.last_login_at).toLocaleString("es-BO") : "Nunca"}
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link href={`/users/${u.id}`}>
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
