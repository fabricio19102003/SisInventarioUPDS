"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { MovementData } from "@upds/services";
import type { ProductData, RecipientData, DepartmentData, ManufactureOrderData } from "@upds/services";
import type { ColumnDef } from "@upds/ui";
import {
  MovementType,
  MOVEMENT_TYPE_LABELS,
  MovementStatus,
  MOVEMENT_STATUS_LABELS,
  enumToOptions,
} from "@upds/validators";
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
import { MovementSheet } from "./movement-sheet";

// ---------------------------------------------------------------------------
// Types / helpers
// ---------------------------------------------------------------------------

interface MovementsTableProps {
  movements: MovementData[];
  total: number;
  page: number;
  perPage: number;
  products: ProductData[];
  recipients: RecipientData[];
  departments: DepartmentData[];
  orders: ManufactureOrderData[];
}

const movementTypeOptions = enumToOptions(MovementType, MOVEMENT_TYPE_LABELS);
const movementStatusOptions = enumToOptions(MovementStatus, MOVEMENT_STATUS_LABELS);

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "CONFIRMED": return "default";
    case "CANCELLED": return "destructive";
    default: return "secondary"; // DRAFT
  }
}

function getTypeVariant(type: string): "default" | "secondary" | "outline" {
  switch (type) {
    case "ENTRY": return "default";
    case "SALE": return "outline";
    case "DONATION": return "outline";
    case "WRITE_OFF": return "secondary";
    case "ADJUSTMENT": return "secondary";
    case "DEPARTMENT_DELIVERY": return "outline";
    default: return "secondary";
  }
}

function formatAmount(value: unknown): string {
  const num = Number(value);
  if (isNaN(num) || num === 0) return "—";
  return `Bs. ${num.toFixed(2)}`;
}

function getMovementTarget(m: MovementData): string {
  if (m.recipient) return m.recipient.full_name;
  if (m.department) return `${m.department.name} (${m.department.code})`;
  if (m.manufacture_order) return m.manufacture_order.order_number;
  return "—";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MovementsTable({
  movements,
  total,
  page,
  perPage,
  products,
  recipients,
  departments,
  orders,
}: MovementsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState<MovementData | null>(null);

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
    const search = (e.currentTarget.elements.namedItem("search") as HTMLInputElement).value;
    pushParams({ search: search || undefined, page: undefined });
  }

  function handleNewClick() {
    setSelectedMovement(null);
    setSheetOpen(true);
  }

  function handleViewClick(movement: MovementData) {
    setSelectedMovement(movement);
    setSheetOpen(true);
  }

  // -------------------------------------------------------------------------
  // Columns
  // -------------------------------------------------------------------------

  const currentSearch = searchParams.get("search") ?? "";
  const currentType = searchParams.get("movement_type") ?? "all";
  const currentStatus = searchParams.get("status") ?? "all";

  const columns: ColumnDef<MovementData>[] = [
    {
      accessorKey: "movement_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Número" />,
      cell: ({ row }) => (
        <span className="font-mono text-sm font-medium">
          {row.getValue("movement_number")}
        </span>
      ),
    },
    {
      accessorKey: "movement_type",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
      cell: ({ row }) => (
        <Badge variant={getTypeVariant(row.getValue("movement_type"))} className="text-xs">
          {MOVEMENT_TYPE_LABELS[row.getValue("movement_type") as keyof typeof MOVEMENT_TYPE_LABELS]}
        </Badge>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => (
        <Badge variant={getStatusVariant(row.getValue("status"))}>
          {MOVEMENT_STATUS_LABELS[row.getValue("status") as keyof typeof MOVEMENT_STATUS_LABELS]}
        </Badge>
      ),
    },
    {
      id: "target",
      header: "Destino / Referencia",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground max-w-[180px] truncate block">
          {getMovementTarget(row.original)}
        </span>
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
      accessorKey: "total_amount",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Total" />,
      cell: ({ row }) => (
        <div className="text-right text-sm font-medium">
          {formatAmount(row.getValue("total_amount"))}
        </div>
      ),
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {new Date(row.getValue("created_at")).toLocaleDateString("es-BO")}
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
          <h1 className="text-2xl font-bold">Movimientos</h1>
          <p className="text-sm text-muted-foreground">
            Registro de todas las operaciones de inventario
          </p>
        </div>
        <Button onClick={handleNewClick}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Movimiento
        </Button>
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={movements}
        toolbar={
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <form onSubmit={handleSearch} className="flex flex-1 gap-2 min-w-[200px]">
              <Input
                name="search"
                placeholder="Buscar por número, destinatario..."
                defaultValue={currentSearch}
                className="flex-1"
              />
              <Button type="submit" variant="outline" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </form>

            <Select
              value={currentType}
              onValueChange={(v) =>
                pushParams({ movement_type: v === "all" ? undefined : v, page: undefined })
              }
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {movementTypeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={currentStatus}
              onValueChange={(v) =>
                pushParams({ status: v === "all" ? undefined : v, page: undefined })
              }
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {movementStatusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
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
                onChange={(e) => pushParams({ date_from: e.target.value || undefined, page: undefined })}
              />
              <span className="text-muted-foreground text-sm">—</span>
              <Input
                type="date"
                className="w-[145px]"
                defaultValue={searchParams.get("date_to") ?? ""}
                onChange={(e) => pushParams({ date_to: e.target.value || undefined, page: undefined })}
              />
            </div>
          </div>
        }
        emptyState={
          <div className="py-10 text-center text-sm text-muted-foreground">
            No se encontraron movimientos.
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

      {/* Movement Sheet */}
      <MovementSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        initialMovement={selectedMovement}
        products={products}
        recipients={recipients}
        departments={departments}
        orders={orders}
      />
    </div>
  );
}
