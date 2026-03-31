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
import { USER_ROLE_LABELS } from "@upds/validators"
import { type SafeUser } from "@upds/services"
import { Eye, Search } from "lucide-react"

type User = SafeUser

const roleColors: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-800",
  INVENTORY_MANAGER: "bg-blue-100 text-blue-800",
  VIEWER: "bg-muted text-muted-foreground",
}

const columns: ColumnDef<User>[] = [
  {
    accessorKey: "email",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
    cell: ({ row }) => (
      <span className="font-mono">{row.getValue("email")}</span>
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
    accessorKey: "role",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Rol" />,
    cell: ({ row }) => {
      const role = row.getValue("role") as string
      return (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${roleColors[role] ?? ""}`}
        >
          {USER_ROLE_LABELS[role as keyof typeof USER_ROLE_LABELS]}
        </span>
      )
    },
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
    accessorKey: "last_login_at",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Ultimo Login" />,
    cell: ({ row }) => {
      const lastLogin = row.getValue("last_login_at") as Date | null
      return (
        <span>
          {lastLogin ? new Date(lastLogin).toLocaleString("es-BO") : "Nunca"}
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
            <Link href={`/users/${row.original.id}`}>
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

interface UsersTableProps {
  users: User[]
}

export function UsersTable({ users }: UsersTableProps) {
  const [search, setSearch] = useState("")

  const filtered = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.full_name.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <DataTable
      columns={columns}
      data={filtered}
      toolbar={
        <div className="flex items-center gap-2 px-1">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por email o nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>
      }
    />
  )
}
