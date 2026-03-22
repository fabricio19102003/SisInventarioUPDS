import Link from "next/link";
import { notFound } from "next/navigation";
import { getInventoryMovement } from "@/actions/inventory-movements";
import {
  Card, CardContent, CardHeader, CardTitle, Button, Badge,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@upds/ui";
import { MOVEMENT_TYPE_LABELS, MOVEMENT_STATUS_LABELS } from "@upds/validators";
import { MovementActions, RemoveItemButton } from "../_components/movement-actions";

const statusColors: Record<string, string> = {
  DRAFT: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export default async function MovementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getInventoryMovement(id);
  if (!result.success) return notFound();
  const m = result.data;
  const isDraft = m.status === "DRAFT";
  const isSale = m.movement_type === "SALE";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{m.movement_number}</h1>
          <Badge variant="outline">
            {MOVEMENT_TYPE_LABELS[m.movement_type as keyof typeof MOVEMENT_TYPE_LABELS]}
          </Badge>
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[m.status] ?? ""}`}>
            {MOVEMENT_STATUS_LABELS[m.status as keyof typeof MOVEMENT_STATUS_LABELS]}
          </span>
        </div>
        <MovementActions movement={m} />
      </div>

      <Card>
        <CardHeader><CardTitle>Información del Movimiento</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4">
            {m.recipient && (
              <div>
                <dt className="text-sm text-muted-foreground">Destinatario</dt>
                <dd className="font-medium">{m.recipient.full_name}</dd>
              </div>
            )}
            {m.department && (
              <div>
                <dt className="text-sm text-muted-foreground">Departamento</dt>
                <dd className="font-medium">{m.department.name}</dd>
              </div>
            )}
            {m.manufacture_order && (
              <div>
                <dt className="text-sm text-muted-foreground">Orden de Fabricación</dt>
                <dd className="font-medium">
                  <Link href={`/manufacture-orders/${m.manufacture_order.id}`} className="text-blue-600 hover:underline">
                    {m.manufacture_order.order_number}
                  </Link>
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm text-muted-foreground">Procesado por</dt>
              <dd className="font-medium">{m.processed_by_user?.full_name ?? "—"}</dd>
            </div>
            {m.processed_at && (
              <div>
                <dt className="text-sm text-muted-foreground">Fecha de Procesamiento</dt>
                <dd className="font-medium">{new Date(m.processed_at).toLocaleString("es-BO")}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm text-muted-foreground">Fecha de Creación</dt>
              <dd className="font-medium">{new Date(m.created_at).toLocaleString("es-BO")}</dd>
            </div>
            {m.is_donated && (
              <div>
                <dt className="text-sm text-muted-foreground">Donación</dt>
                <dd className="font-medium text-purple-700">Sí</dd>
              </div>
            )}
            {m.notes && (
              <div className="col-span-2">
                <dt className="text-sm text-muted-foreground">Notas</dt>
                <dd className="font-medium">{m.notes}</dd>
              </div>
            )}
            {m.cancel_reason && (
              <div className="col-span-2">
                <dt className="text-sm text-muted-foreground">Motivo de Cancelación</dt>
                <dd className="font-medium text-red-700">{m.cancel_reason}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Items del Movimiento</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto / Variante</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                {isSale && <TableHead className="text-right">Precio Unit.</TableHead>}
                {isSale && <TableHead className="text-right">Subtotal</TableHead>}
                {isDraft && <TableHead className="w-20"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(m.items ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isDraft ? 5 : 4} className="text-center text-muted-foreground py-8">
                    No hay items en este movimiento
                  </TableCell>
                </TableRow>
              ) : (
                (m.items ?? []).map((item: any) => {
                  const v = item.product_variant;
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {v?.product?.sku ?? ""}-{v?.sku_suffix ?? ""}
                        <span className="text-muted-foreground text-sm ml-2">
                          {v?.size ?? ""} {v?.color ?? ""}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                      {isSale && (
                        <TableCell className="text-right tabular-nums">
                          Bs {(item.unit_price ?? 0).toFixed(2)}
                        </TableCell>
                      )}
                      {isSale && (
                        <TableCell className="text-right tabular-nums">
                          Bs {(item.subtotal ?? 0).toFixed(2)}
                        </TableCell>
                      )}
                      {isDraft && (
                        <TableCell>
                          <RemoveItemButton movementId={m.id} itemId={item.id} />
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          {m.total_amount > 0 && (
            <div className="p-4 border-t flex justify-end">
              <span className="text-muted-foreground">Total:</span>{" "}
              <span className="font-bold tabular-nums ml-2">Bs {m.total_amount.toFixed(2)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Link href="/inventory-movements"><Button variant="outline">Volver al listado</Button></Link>
    </div>
  );
}
