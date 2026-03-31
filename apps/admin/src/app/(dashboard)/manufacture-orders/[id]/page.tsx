import Link from "next/link";
import { notFound } from "next/navigation";
import { getManufactureOrder } from "@/actions/manufacture-orders";
import {
  Card, CardContent, CardHeader, CardTitle, Button, Badge,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  PageTransition,
} from "@upds/ui";
import { MANUFACTURE_ORDER_STATUS_LABELS } from "@upds/validators";
import { OrderActions } from "../_components/order-actions";

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export default async function ManufactureOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getManufactureOrder(id);
  if (!result.success) return notFound();
  const o = result.data;

  const totalOrdered = (o.items ?? []).reduce((s: number, i: any) => s + (i.quantity_ordered * (i.unit_cost ?? 0)), 0);
  const totalReceived = (o.items ?? []).reduce((s: number, i: any) => s + (i.quantity_received * (i.unit_cost ?? 0)), 0);

  return (
    <PageTransition>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{o.order_number}</h1>
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[o.status] ?? ""}`}>
            {MANUFACTURE_ORDER_STATUS_LABELS[o.status as keyof typeof MANUFACTURE_ORDER_STATUS_LABELS]}
          </span>
        </div>
        <OrderActions order={o} />
      </div>

      <Card>
        <CardHeader><CardTitle>Información de la Orden</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-muted-foreground">Fabricante</dt>
              <dd className="font-medium">{o.manufacturer?.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Fecha de Pedido</dt>
              <dd className="font-medium">{o.ordered_at ? new Date(o.ordered_at).toLocaleDateString("es-BO") : "—"}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Fecha Esperada</dt>
              <dd className="font-medium">{o.expected_at ? new Date(o.expected_at).toLocaleDateString("es-BO") : "—"}</dd>
            </div>
            {o.completed_at && (
              <div>
                <dt className="text-sm text-muted-foreground">Fecha Completado</dt>
                <dd className="font-medium">{new Date(o.completed_at).toLocaleDateString("es-BO")}</dd>
              </div>
            )}
            {o.notes && (
              <div className="col-span-2">
                <dt className="text-sm text-muted-foreground">Notas</dt>
                <dd className="font-medium">{o.notes}</dd>
              </div>
            )}
            {o.cancel_reason && (
              <div className="col-span-2">
                <dt className="text-sm text-muted-foreground">Motivo de Cancelación</dt>
                <dd className="font-medium text-red-700">{o.cancel_reason}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Items de la Orden</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto / Variante</TableHead>
                <TableHead className="text-right">Cant. Pedida</TableHead>
                <TableHead className="text-right">Cant. Recibida</TableHead>
                <TableHead className="text-right">Costo Unit.</TableHead>
                <TableHead className="text-right">Subtotal Pedido</TableHead>
                <TableHead>Progreso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(o.items ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No hay items en esta orden
                  </TableCell>
                </TableRow>
              ) : (
                (o.items ?? []).map((item: any) => {
                  const variant = item.product_variant;
                  const pct = item.quantity_ordered > 0 ? Math.round((item.quantity_received / item.quantity_ordered) * 100) : 0;
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {variant?.product?.sku ?? ""}-{variant?.sku_suffix ?? ""}
                        <span className="text-muted-foreground text-sm ml-2">
                          {variant?.size ?? ""} {variant?.color ?? ""}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{item.quantity_ordered}</TableCell>
                      <TableCell className="text-right tabular-nums">{item.quantity_received}</TableCell>
                      <TableCell className="text-right tabular-nums">Bs {(item.unit_cost ?? 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        Bs {(item.quantity_ordered * (item.unit_cost ?? 0)).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${pct === 100 ? "bg-green-500" : "bg-blue-500"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{pct}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          {(o.items ?? []).length > 0 && (
            <div className="p-4 border-t flex justify-end gap-8 text-sm">
              <div>
                <span className="text-muted-foreground">Total Pedido:</span>{" "}
                <span className="font-bold tabular-nums">Bs {totalOrdered.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total Recibido:</span>{" "}
                <span className="font-bold tabular-nums">Bs {totalReceived.toFixed(2)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Link href="/manufacture-orders"><Button variant="outline">Volver al listado</Button></Link>
    </div>
    </PageTransition>
  );
}
