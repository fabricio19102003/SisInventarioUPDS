"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { ManufacturerData } from "@upds/services";
import type { ColumnDef } from "@upds/ui";
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
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  useToast,
} from "@upds/ui";
import { Plus, Pencil, PowerOff, Search } from "lucide-react";
import { deactivateManufacturerAction } from "@/actions/manufacturers";
import { ManufacturerForm } from "./manufacturer-form";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ManufacturersTableProps {
  manufacturers: ManufacturerData[];
  total: number;
  page: number;
  perPage: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ManufacturersTable({
  manufacturers,
  total,
  page,
  perPage,
}: ManufacturersTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [formOpen, setFormOpen] = useState(false);
  const [selectedManufacturer, setSelectedManufacturer] = useState<
    ManufacturerData | undefined
  >(undefined);

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

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const search = (form.elements.namedItem("search") as HTMLInputElement)
      .value;
    pushParams({ search: search || undefined, page: undefined });
  }

  function handleStatusFilter(value: string) {
    pushParams({
      is_active: value === "all" ? undefined : value,
      page: undefined,
    });
  }

  function handleNewClick() {
    setSelectedManufacturer(undefined);
    setFormOpen(true);
  }

  function handleEditClick(manufacturer: ManufacturerData) {
    setSelectedManufacturer(manufacturer);
    setFormOpen(true);
  }

  function handleDeactivate(manufacturerId: string) {
    startTransition(async () => {
      const result = await deactivateManufacturerAction(manufacturerId);
      if (!result.success) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Fabricante desactivado correctamente." });
      router.refresh();
    });
  }

  // -------------------------------------------------------------------------
  // Columns
  // -------------------------------------------------------------------------

  const columns: ColumnDef<ManufacturerData>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
    },
    {
      accessorKey: "contact_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Contacto" />,
      cell: ({ row }) => <>{row.getValue("contact_name") ?? "—"}</>,
    },
    {
      accessorKey: "phone",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Teléfono" />,
      cell: ({ row }) => <>{row.getValue("phone") ?? "—"}</>,
    },
    {
      accessorKey: "email",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
      cell: ({ row }) => <>{row.getValue("email") ?? "—"}</>,
    },
    {
      accessorKey: "is_active",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => {
        const isActive = row.getValue("is_active") as boolean;
        return (
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Activo" : "Inactivo"}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      size: 100,
      enableSorting: false,
      cell: ({ row }) => {
        const m = row.original;
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              disabled={!m.is_active}
              onClick={() => handleEditClick(m)}
            >
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Editar</span>
            </Button>

            {m.is_active && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={isPending}
                  >
                    <PowerOff className="h-4 w-4 text-destructive" />
                    <span className="sr-only">Desactivar</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      ¿Desactivar fabricante?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Se desactivará <strong>{m.name}</strong>. No
                      podrá ser usado en nuevas órdenes de
                      fabricación. Esta acción no es irreversible —
                      contactá al administrador para reactivarlo.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => handleDeactivate(m.id)}
                    >
                      Desactivar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        );
      },
    },
  ];

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const currentSearch = searchParams.get("search") ?? "";
  const currentStatus = searchParams.get("is_active") ?? "all";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fabricantes</h1>
          <p className="text-sm text-muted-foreground">
            Talleres externos de indumentaria médica
          </p>
        </div>
        <Button onClick={handleNewClick}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Fabricante
        </Button>
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={manufacturers}
        toolbar={
          <div className="flex flex-col gap-3 sm:flex-row">
            <form onSubmit={handleSearch} className="flex flex-1 gap-2">
              <Input
                name="search"
                placeholder="Buscar por nombre o contacto..."
                defaultValue={currentSearch}
                className="flex-1"
              />
              <Button type="submit" variant="outline" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </form>

            <Select value={currentStatus} onValueChange={handleStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="true">Activos</SelectItem>
                <SelectItem value="false">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
        emptyState={
          <div className="py-10 text-center text-sm text-muted-foreground">
            No se encontraron fabricantes.
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

      {/* Form Dialog */}
      <ManufacturerForm
        open={formOpen}
        onOpenChange={setFormOpen}
        manufacturer={selectedManufacturer}
      />
    </div>
  );
}
