"use client"

import { useState } from "react"
import Link from "next/link"
import {
  DataTable,
  DataTableColumnHeader,
  type ColumnDef,
  Badge,
  Button,
  Input,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@upds/ui"
import { MOVEMENT_TYPE_LABELS, MOVEMENT_STATUS_LABELS } from "@upds/validators"
import { type MovementData } from "@upds/services"
import { Eye, Search } from "lucide-react"

type Movement = MovementData

const statusColors: Record<string, string> = {
  DRAFT: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
}

const columns: ColumnDef<Movement>[] = [
  {
    accessorKey: "movement_number",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nro. Movimiento" />
    ),
    cell: ({ row }) => (
      <span className="font-mono">{row.getValue("movement_number")}</span>
    ),
  },
  {
    accessorKey: "movement_type",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
    cell: ({ row }) => {
      const type = row.getValue("movement_type") as string
      return (
        <Badge variant="outline">
          {MOVEMENT_TYPE_LABELS[type as keyof typeof MOVEMENT_TYPE_LABELS]}
        </Badge>
      )
    },
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
          {MOVEMENT_STATUS_LABELS[status as keyof typeof MOVEMENT_STATUS_LABELS]}
        </span>
      )
    },
  },
  {
    id: "target",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Destinatario / Depto" />
    ),
    accessorFn: (row) =>
      row.recipient?.full_name ?? row.department?.name ?? "\u2014",
    cell: ({ row }) => <span>{row.getValue("target")}</span>,
  },
  {
    accessorKey: "total_amount",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Monto Total"
        className="justify-end"
      />
    ),
    cell: ({ row }) => {
      const amount = Number(row.getValue("total_amount"))
      return (
        <span className="text-right tabular-nums block">
          {amount > 0 ? `Bs ${amount.toFixed(2)}` : "\u2014"}
        </span>
      )
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
    cell: ({ row }) => (
      <span>
        {new Date(row.getValue("created_at")).toLocaleDateString("es-BO")}
      </span>
    ),
  },
  {
    id: "actions",
    size: 80,
    enableSorting: false,
    cell: ({ row }) => (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href={`/inventory-movements/${row.original.id}`}>
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

interface MovementsTableProps {
  movements: Movement[]
}

export function MovementsTable({ movements }: MovementsTableProps) {
  const [search, setSearch] = useState("")

  const filtered = movements.filter(
    (m) =>
      m.movement_number.toLowerCase().includes(search.toLowerCase()) ||
      (m.recipient?.full_name?.toLowerCase().includes(search.toLowerCase()) ??
        false) ||
      (m.department?.name?.toLowerCase().includes(search.toLowerCase()) ??
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
            placeholder="Buscar por nro. movimiento, destinatario o departamento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>
      }
    />
  )
}
