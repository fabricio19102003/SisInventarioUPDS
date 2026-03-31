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
import { RECIPIENT_TYPE_LABELS } from "@upds/validators"
import { Eye, Search } from "lucide-react"

interface Recipient {
  id: string
  document_number: string
  full_name: string
  type: string
  phone: string | null
  career: string | null
  is_active: boolean
}

const columns: ColumnDef<Recipient>[] = [
  {
    accessorKey: "document_number",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Doc. Nro" />,
    cell: ({ row }) => (
      <span className="font-mono">{row.getValue("document_number")}</span>
    ),
  },
  {
    accessorKey: "full_name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("full_name")}</span>
    ),
  },
  {
    accessorKey: "type",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
    cell: ({ row }) => {
      const type = row.getValue("type") as string
      return (
        <Badge variant="outline">
          {RECIPIENT_TYPE_LABELS[type as keyof typeof RECIPIENT_TYPE_LABELS] ?? type}
        </Badge>
      )
    },
  },
  {
    accessorKey: "phone",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Telefono" />,
    cell: ({ row }) => <span>{row.getValue("phone") || "\u2014"}</span>,
  },
  {
    accessorKey: "career",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Carrera" />,
    cell: ({ row }) => <span>{row.getValue("career") || "\u2014"}</span>,
  },
  {
    accessorKey: "is_active",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => {
      const isActive = row.getValue("is_active") as boolean
      return (
        <Badge variant={isActive ? "default" : "secondary"}>
          {isActive ? "Activo" : "Inactivo"}
        </Badge>
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
            <Link href={`/recipients/${row.original.id}`}>
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

interface RecipientsTableProps {
  recipients: Recipient[]
}

export function RecipientsTable({ recipients }: RecipientsTableProps) {
  const [search, setSearch] = useState("")

  const filtered = recipients.filter(
    (r) =>
      r.document_number.toLowerCase().includes(search.toLowerCase()) ||
      r.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (r.career?.toLowerCase().includes(search.toLowerCase()) ?? false),
  )

  return (
    <DataTable
      columns={columns}
      data={filtered}
      toolbar={
        <div className="flex items-center gap-2 px-1">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por documento, nombre o carrera..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>
      }
    />
  )
}
