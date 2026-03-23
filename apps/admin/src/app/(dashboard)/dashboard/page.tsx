import Link from "next/link";
import { getDashboardStats } from "@/actions/dashboard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  PageTransition,
  StaggerContainer,
  StaggerItem,
  FadeInUp,
} from "@upds/ui";
import {
  MOVEMENT_TYPE_LABELS,
  MOVEMENT_STATUS_LABELS,
} from "@upds/validators";
import type { MovementType, MovementStatus } from "@upds/validators";
import { DashboardCharts } from "./_components/dashboard-charts";

function movementStatusColor(status: string): string {
  switch (status) {
    case "DRAFT":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "CONFIRMED":
      return "bg-green-100 text-green-800 border-green-200";
    case "CANCELLED":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
  }).format(amount);
}

export default async function DashboardPage() {
  const result = await getDashboardStats();

  if (!result.success) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>
              No se pudieron cargar las estadisticas del dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{result.error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = result.data;

  return (
    <PageTransition>
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Resumen general del Sistema de Inventario UPDS.
        </p>
      </div>

      {/* KPI Cards */}
      <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Productos Activos */}
        <StaggerItem>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Productos Activos</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {stats.total_active_products}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {stats.total_active_variants} variantes en total
            </p>
          </CardContent>
        </Card>
        </StaggerItem>

        {/* Variantes con Stock Bajo */}
        <StaggerItem>
        <Card
          className={
            stats.low_stock_alerts > 0
              ? "border-orange-300 bg-orange-50/50"
              : ""
          }
        >
          <CardHeader className="pb-2">
            <CardDescription
              className={
                stats.low_stock_alerts > 0 ? "text-orange-700" : ""
              }
            >
              Variantes con Stock Bajo
            </CardDescription>
            <CardTitle
              className={`text-3xl tabular-nums ${
                stats.low_stock_alerts > 0
                  ? "text-orange-600"
                  : ""
              }`}
            >
              {stats.low_stock_alerts}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.low_stock_alerts > 0 ? (
              <Link
                href="/products?low_stock=true"
                className="text-xs font-medium text-orange-700 underline underline-offset-2 hover:text-orange-900"
              >
                Ver alertas de stock bajo
              </Link>
            ) : (
              <p className="text-xs text-muted-foreground">
                Todo el stock dentro de niveles normales
              </p>
            )}
          </CardContent>
        </Card>
        </StaggerItem>

        {/* Ordenes Pendientes */}
        <StaggerItem>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ordenes Pendientes</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {stats.pending_manufacture_orders}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href="/manufacture-orders"
              className="text-xs font-medium text-primary underline underline-offset-2 hover:text-primary/80"
            >
              Ver ordenes de fabricacion
            </Link>
          </CardContent>
        </Card>
        </StaggerItem>

        {/* Movimientos en Borrador */}
        <StaggerItem>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Movimientos en Borrador</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {stats.draft_movements}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href="/movements"
              className="text-xs font-medium text-primary underline underline-offset-2 hover:text-primary/80"
            >
              Ver movimientos
            </Link>
          </CardContent>
        </Card>
        </StaggerItem>
      </StaggerContainer>

      {/* Charts: Stock por Area, Ordenes por Estado, Movimientos por Mes */}
      <FadeInUp delay={0.2}>
      <DashboardCharts
        stockByArea={stats.stock_by_area}
        ordersByStatus={stats.manufacture_orders_by_status}
        movementsByMonth={stats.movements_by_month}
      />
      </FadeInUp>

      {/* Movimientos Recientes */}
      <FadeInUp delay={0.4}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Movimientos Recientes</CardTitle>
              <CardDescription>
                Ultimos movimientos registrados en el sistema
              </CardDescription>
            </div>
            <Link
              href="/movements"
              className="text-sm font-medium text-primary underline underline-offset-2 hover:text-primary/80"
            >
              Ver todos
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {stats.recent_movements.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No hay movimientos registrados todavia.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N. Movimiento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Destinatario / Departamento</TableHead>
                  <TableHead className="text-right">Monto Total</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recent_movements.map((mov) => (
                  <TableRow key={mov.id}>
                    <TableCell>
                      <Link
                        href={`/movements/${mov.id}`}
                        className="font-medium text-primary underline underline-offset-2 hover:text-primary/80"
                      >
                        {mov.movement_number}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">
                      {MOVEMENT_TYPE_LABELS[
                        mov.movement_type as MovementType
                      ] ?? mov.movement_type}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`${movementStatusColor(mov.status)} hover:${movementStatusColor(mov.status)}`}
                      >
                        {MOVEMENT_STATUS_LABELS[
                          mov.status as MovementStatus
                        ] ?? mov.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {mov.recipient_name || mov.department_name || "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatCurrency(Number(mov.total_amount))}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(mov.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      </FadeInUp>
    </div>
    </PageTransition>
  );
}
