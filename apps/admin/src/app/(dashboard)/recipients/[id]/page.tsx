import Link from "next/link";
import { notFound } from "next/navigation";
import { getRecipient } from "@/actions/recipients";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from "@upds/ui";
import { RECIPIENT_TYPE_LABELS } from "@upds/validators";
import { RecipientActions } from "../_components/recipient-actions";

export default async function RecipientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getRecipient(id);
  if (!result.success) return notFound();
  const r = result.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{r.full_name}</h1>
          <Badge variant="outline">
            {RECIPIENT_TYPE_LABELS[r.type as keyof typeof RECIPIENT_TYPE_LABELS]}
          </Badge>
          <Badge variant={r.is_active ? "default" : "secondary"}>
            {r.is_active ? "Activo" : "Inactivo"}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Link href={`/recipients/${id}/edit`}><Button variant="outline">Editar</Button></Link>
          <RecipientActions id={id} isActive={r.is_active} />
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>Información del Destinatario</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-muted-foreground">Nro. Documento</dt>
              <dd className="font-mono font-medium">{r.document_number}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Teléfono</dt>
              <dd className="font-medium">{r.phone || "—"}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Email</dt>
              <dd className="font-medium">{r.email || "—"}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Carrera</dt>
              <dd className="font-medium">{r.career || "—"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
      <Link href="/recipients"><Button variant="outline">Volver al listado</Button></Link>
    </div>
  );
}
