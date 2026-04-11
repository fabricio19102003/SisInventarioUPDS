"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { ManufactureOrderData, ManufacturerData, ProductData } from "@upds/services";
import type { ColumnDef } from "@upds/ui";
import {
  ManufactureOrderStatus,
  MANUFACTURE_ORDER_STATUS_LABELS,
  enumToOptions,
  can,
  PERMISSIONS,
} from "@upds/validators";
import type { UserRole } from "@upds/validators";
import {
  DataTable,
  DataTableColumnHeader,
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
  userRole: UserRole;
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
  userRole,
}: OrdersTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ManufactureOrderData | null>(null);

  const canCreate = can(userRole, PERMISSIONS.MANUFACTURE_ORDER_CREATE);

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
  // Columns
  // -------------------------------------------------------------------------

  const currentSearch = searchParams.get("search") ?? "";
  const currentStatus = searchParams.get("status") ?? "all";
  const currentManufacturer = searchParams.get("manufacturer_id") ?? "all";

  const columns: ColumnDef<ManufactureOrderData>[] = [
    {
      accessorKey: "order_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Número" />,
      cell: ({ row }) => (
        <span className="font-mono text-sm font-medium">
          {row.getValue("order_number")}
        </span>
      ),
    },
    {
      id: "manufacturer",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fabricante" />,
      cell: ({ row }) => (
        <span className="text-sm">{row.original.manufacturer.name}</span>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => (
        <Badge variant={getStatusVariant(row.getValue("status"))} className="text-xs">
          {MANUFACTURE_ORDER_STATUS_LABELS[row.getValue("status") as keyof typeof MANUFACTURE_ORDER_STATUS_LABELS]}
        </Badge>
      ),
    },
    {
      id: "items_count",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Ítems" />,
      cell: ({ row }) => (
        <div className="text-right text-sm">{row.original.items.length}</div>
      ),
    },
    {
      id: "total_estimated",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Total estimado" />,
      cell: ({ row }) => (
        <div className="text-right text-sm font-medium">
          {formatAmount(calcTotal(row.original))}
        </div>
      ),
    },
    {
      accessorKey: "expected_at",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Esperada" />,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {row.getValue("expected_at")
            ? new Date(row.getValue("expected_at") as string).toLocaleDateString("es-BO")
            : "—"}
        </span>
      ),
    },
    {
      accessorKey: "ordered_at",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {new Date(row.getValue("ordered_at")).toLocaleDateString("es-BO")}
        </span>
      ),
    },
    {
      id: "actions",
      size: 60,
      enableSorting: false,
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleViewClick(row.original)}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

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
        {canCreate && (
          <Button onClick={handleNewClick}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Orden
          </Button>
        )}
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={orders}
        toolbar={
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
        }
        emptyState={
          <div className="py-10 text-center text-sm text-muted-foreground">
            No se encontraron órdenes.
          </div>
        }
        rowCount={total}
        pagination={{ pageIndex: page - 1, pageSize: perPage }}
        onPaginationChange={(updater) => {
          const next =
            typeof updater === "function"
              ? updater({ pageIndex: page - 1, pageSize: perPage })
              : updater;
          pushParams({ page: String(next.pageIndex + 1) });
        }}
      />

      {/* Order Sheet */}
      <OrderSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        initialOrder={selectedOrder}
        manufacturers={manufacturers}
        products={products}
        toast={toast}
        userRole={userRole}
      />
    </div>
  );
}
