import Link from "next/link";
import { notFound } from "next/navigation";
import { getManufacturer } from "@/actions/manufacturers";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from "@upds/ui";
import { ManufacturerActions } from "../_components/manufacturer-actions";

export default async function ManufacturerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getManufacturer(id);

  if (!result.success) return notFound();
  const m = result.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{m.name}</h1>
          <Badge variant={m.is_active ? "default" : "secondary"}>
            {m.is_active ? "Activo" : "Inactivo"}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Link href={`/manufacturers/${id}/edit`}>
            <Button variant="outline">Editar</Button>
          </Link>
          <ManufacturerActions id={id} isActive={m.is_active} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del Fabricante</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-muted-foreground">Persona de Contacto</dt>
              <dd className="font-medium">{m.contact_name || "—"}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Teléfono</dt>
              <dd className="font-medium">{m.phone || "—"}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Email</dt>
              <dd className="font-medium">{m.email || "—"}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Dirección</dt>
              <dd className="font-medium">{m.address || "—"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Link href="/manufacturers">
        <Button variant="outline">Volver al listado</Button>
      </Link>
    </div>
  );
}
