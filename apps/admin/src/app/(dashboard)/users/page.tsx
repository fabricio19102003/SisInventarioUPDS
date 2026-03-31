import Link from "next/link";
import { getUsers } from "@/actions/users";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  PageTransition,
} from "@upds/ui";
import { Users, Plus } from "lucide-react";
import { UsersTable } from "./_components/users-table";

export default async function UsersPage() {
  const result = await getUsers();
  if (!result.success) return <p className="p-6 text-red-600">Error: {result.error}</p>;

  const { users } = result.data;

  return (
    <PageTransition>
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
        <CardContent>
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
            <UsersTable users={users} />
          )}
        </CardContent>
      </Card>
    </div>
    </PageTransition>
  );
}
