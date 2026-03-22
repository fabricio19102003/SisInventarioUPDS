"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { ManufactureOrderData, ManufacturerData, ProductData } from "@upds/services";
import {
  ManufactureOrderStatus,
  MANUFACTURE_ORDER_STATUS_LABELS,
  enumToOptions,
} from "@upds/validators";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  Button,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  useToast,
} from "@upds/ui";
import {
  Plus,
  Eye,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { OrderSheet } from "./order-sheet";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OrdersTableProps {
  orders: ManufactureOrderData[];
  total: number;
  page: number;
  perPage: number;
  manufacturers: ManufacturerData[];
  products: ProductData[];
}

const statusOptions = enumToOptions(ManufactureOrderStatus, MANUFACTURE_ORDER_STATUS_LABELS);

function getStatusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "COMPLETED": return "default";
    case "CANCELLED": return "destructive";
    case "IN_PROGRESS": return "outline";
    default: return "secondary"; // PENDING
  }
}

function formatAmount(value: unknown): string {
  const num = Number(value);
  if (isNaN(num) || num === 0) return "—";
  return `Bs. ${num.toFixed(2)}`;
}

function calcTotal(order: ManufactureOrderData): number {
  return order.items.reduce(
    (sum, item) => sum + Number(item.unit_cost) * item.quantity_ordered,
    0,
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OrdersTable({
  orders,
  total,
  page,
  perPage,
  manufacturers,
  products,
}: OrdersTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ManufactureOrderData | null>(null);

  const totalPages = Math.ceil(total / perPage);

  // -------------------------------------------------------------------------
  // URL helpers
  // -------------------------------------------------------------------------

  function pushParams(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const search = (
      e.currentTarget.elements.namedItem("search") as HTMLInputElement
    ).value;
    pushParams({ search: search || undefined, page: undefined });
  }

  function handleNewClick() {
    setSelectedOrder(null);
    setSheetOpen(true);
  }

  function handleViewClick(order: ManufactureOrderData) {
    setSelectedOrder(order);
    setSheetOpen(true);
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const currentSearch = searchParams.get("search") ?? "";
  const currentStatus = searchParams.get("status") ?? "all";
  const currentManufacturer = searchParams.get("manufacturer_id") ?? "all";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Órdenes de Fabricación</h1>
          <p className="text-sm text-muted-foreground">
            Pedidos a talleres externos de indumentaria médica
          </p>
        </div>
        <Button onClick={handleNewClick}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Orden
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2 min-w-[200px]">
          <Input
            name="search"
            placeholder="Buscar por número o fabricante..."
            defaultValue={currentSearch}
            className="flex-1"
          />
          <Button type="submit" variant="outline" size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </form>

        <Select
          value={currentStatus}
          onValueChange={(v) =>
            pushParams({ status: v === "all" ? undefined : v, page: undefined })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={currentManufacturer}
          onValueChange={(v) =>
            pushParams({ manufacturer_id: v === "all" ? undefined : v, page: undefined })
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Fabricante" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los fabricantes</SelectItem>
            {manufacturers.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <Input
            type="date"
            className="w-[145px]"
            defaultValue={searchParams.get("date_from") ?? ""}
            onChange={(e) =>
              pushParams({ date_from: e.target.value || undefined, page: undefined })
            }
          />
          <span className="text-muted-foreground text-sm">—</span>
          <Input
            type="date"
            className="w-[145px]"
            defaultValue={searchParams.get("date_to") ?? ""}
            onChange={(e) =>
              pushParams({ date_to: e.target.value || undefined, page: undefined })
            }
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Fabricante</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Ítems</TableHead>
              <TableHead className="text-right">Total estimado</TableHead>
              <TableHead>Esperada</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="w-[60px]">Ver</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  No se encontraron órdenes.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <span className="font-mono text-sm font-medium">
                      {o.order_number}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{o.manufacturer.name}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(o.status)} className="text-xs">
                      {MANUFACTURE_ORDER_STATUS_LABELS[o.status as keyof typeof MANUFACTURE_ORDER_STATUS_LABELS]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {o.items.length}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {formatAmount(calcTotal(o))}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {o.expected_at
                      ? new Date(o.expected_at).toLocaleDateString("es-BO")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(o.ordered_at).toLocaleDateString("es-BO")}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleViewClick(o)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{total} orden{total !== 1 ? "es" : ""} en total</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={page <= 1}
              onClick={() => pushParams({ page: String(page - 1) })}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span>Página {page} de {totalPages}</span>
            <Button
              variant="outline"
              size="icon"
              disabled={page >= totalPages}
              onClick={() => pushParams({ page: String(page + 1) })}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Order Sheet */}
      <OrderSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        initialOrder={selectedOrder}
        manufacturers={manufacturers}
        products={products}
        toast={toast}
      />
    </div>
  );
}
