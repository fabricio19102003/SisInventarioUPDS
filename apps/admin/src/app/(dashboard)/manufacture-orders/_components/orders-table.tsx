"use client"

import { useState } from "react"
import Link from "next/link"
import {
  DataTable,
  DataTableColumnHeader,
  type ColumnDef,
  Button,
  Input,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@upds/ui"
import { MANUFACTURE_ORDER_STATUS_LABELS } from "@upds/validators"
import { type ManufactureOrderData } from "@upds/services"
import { Eye, Search } from "lucide-react"

type ManufactureOrder = ManufactureOrderData

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
}

const columns: ColumnDef<ManufactureOrder>[] = [
  {
    accessorKey: "order_number",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nro. Orden" />
    ),
    cell: ({ row }) => (
      <span className="font-mono">{row.getValue("order_number")}</span>
    ),
  },
  {
    id: "manufacturer_name",
    accessorFn: (row) => row.manufacturer.name,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Fabricante" />
    ),
    cell: ({ row }) => <span>{row.getValue("manufacturer_name")}</span>,
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      return (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[status] ?? ""}`}
        >
          {MANUFACTURE_ORDER_STATUS_LABELS[
            status as keyof typeof MANUFACTURE_ORDER_STATUS_LABELS
          ]}
        </span>
      )
    },
  },
  {
    accessorKey: "ordered_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Fecha Pedido" />
    ),
    cell: ({ row }) => {
      const date = row.getValue("ordered_at") as Date | null
      return (
        <span>
          {date ? new Date(date).toLocaleDateString("es-BO") : "\u2014"}
        </span>
      )
    },
  },
  {
    accessorKey: "expected_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Fecha Esperada" />
    ),
    cell: ({ row }) => {
      const date = row.getValue("expected_at") as Date | null
      return (
        <span>
          {date ? new Date(date).toLocaleDateString("es-BO") : "\u2014"}
        </span>
      )
    },
  },
  {
    id: "actions",
    size: 80,
    enableSorting: false,
    cell: ({ row }) => (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href={`/manufacture-orders/${row.original.id}`}>
              <Button variant="ghost" size="sm">
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
          </TooltipTrigger>
          <TooltipContent>Ver detalles</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ),
  },
]

interface OrdersTableProps {
  orders: ManufactureOrder[]
}

export function OrdersTable({ orders }: OrdersTableProps) {
  const [search, setSearch] = useState("")

  const filtered = orders.filter(
    (o) =>
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      (o.manufacturer?.name?.toLowerCase().includes(search.toLowerCase()) ??
        false),
  )

  return (
    <DataTable
      columns={columns}
      data={filtered}
      toolbar={
        <div className="flex items-center gap-2 px-1">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nro. orden o fabricante..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>
      }
    />
  )
}
