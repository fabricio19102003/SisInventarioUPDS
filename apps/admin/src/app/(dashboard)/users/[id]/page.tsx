import Link from "next/link";
import { notFound } from "next/navigation";
import { getUser } from "@/actions/users";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from "@upds/ui";
import { USER_ROLE_LABELS } from "@upds/validators";
import { UserActions } from "../_components/user-actions";

const roleColors: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-800",
  INVENTORY_MANAGER: "bg-blue-100 text-blue-800",
  VIEWER: "bg-muted text-muted-foreground",
};

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getUser(id);
  if (!result.success) return notFound();
  const u = result.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{u.full_name}</h1>
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${roleColors[u.role] ?? ""}`}>
            {USER_ROLE_LABELS[u.role as keyof typeof USER_ROLE_LABELS]}
          </span>
          <Badge variant={u.is_active ? "default" : "secondary"}>
            {u.is_active ? "Activo" : "Inactivo"}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Link href={`/users/${id}/edit`}><Button variant="outline">Editar</Button></Link>
          <UserActions userId={id} isActive={u.is_active} />
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Información del Usuario</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-muted-foreground">Email</dt>
              <dd className="font-mono font-medium">{u.email}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Último Login</dt>
              <dd className="font-medium">
                {u.last_login_at ? new Date(u.last_login_at).toLocaleString("es-BO") : "Nunca"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Creado</dt>
              <dd className="font-medium">{new Date(u.created_at).toLocaleString("es-BO")}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Link href="/users"><Button variant="outline">Volver al listado</Button></Link>
    </div>
  );
}
