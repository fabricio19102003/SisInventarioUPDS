"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { RecipientData } from "@upds/services";
import type { ColumnDef } from "@upds/ui";
import {
  RecipientType,
  RECIPIENT_TYPE_LABELS,
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
import {
  Plus,
  Pencil,
  PowerOff,
  Search,
} from "lucide-react";
import { deactivateRecipientAction } from "@/actions/recipients";
import { RecipientForm } from "./recipient-form";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RecipientsTableProps {
  recipients: RecipientData[];
  total: number;
  page: number;
  perPage: number;
}

const typeOptions = enumToOptions(RecipientType, RECIPIENT_TYPE_LABELS);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RecipientsTable({
  recipients,
  total,
  page,
  perPage,
}: RecipientsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [formOpen, setFormOpen] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<
    RecipientData | undefined
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

  function handleTypeFilter(value: string) {
    pushParams({
      type: value === "all" ? undefined : value,
      page: undefined,
    });
  }

  function handleStatusFilter(value: string) {
    pushParams({
      is_active: value === "all" ? undefined : value,
      page: undefined,
    });
  }

  function handleNewClick() {
    setSelectedRecipient(undefined);
    setFormOpen(true);
  }

  function handleEditClick(recipient: RecipientData) {
    setSelectedRecipient(recipient);
    setFormOpen(true);
  }

  function handleDeactivate(recipientId: string) {
    startTransition(async () => {
      const result = await deactivateRecipientAction(recipientId);
      if (!result.success) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Destinatario desactivado correctamente." });
      router.refresh();
    });
  }

  // -------------------------------------------------------------------------
  // Columns
  // -------------------------------------------------------------------------

  const columns: ColumnDef<RecipientData>[] = [
    {
      accessorKey: "document_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Documento" />,
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {row.getValue("document_number")}
        </span>
      ),
    },
    {
      accessorKey: "full_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("full_name")}</span>,
    },
    {
      accessorKey: "type",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
      cell: ({ row }) => (
        <Badge variant="outline">
          {RECIPIENT_TYPE_LABELS[row.getValue("type") as keyof typeof RECIPIENT_TYPE_LABELS]}
        </Badge>
      ),
    },
    {
      accessorKey: "career",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Carrera" />,
      cell: ({ row }) => <>{row.getValue("career") ?? "—"}</>,
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
        const r = row.original;
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              disabled={!r.is_active}
              onClick={() => handleEditClick(r)}
            >
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Editar</span>
            </Button>

            {r.is_active && (
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
                      ¿Desactivar destinatario?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Se desactivará a{" "}
                      <strong>{r.full_name}</strong> (CI:{" "}
                      {r.document_number}). Ya no podrá recibir
                      productos del sistema.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => handleDeactivate(r.id)}
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
  const currentType = searchParams.get("type") ?? "all";
  const currentStatus = searchParams.get("is_active") ?? "all";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Destinatarios</h1>
          <p className="text-sm text-muted-foreground">
            Estudiantes, personal y becarios que reciben productos
          </p>
        </div>
        <Button onClick={handleNewClick}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Destinatario
        </Button>
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={recipients}
        toolbar={
          <div className="flex flex-col gap-3 sm:flex-row">
            <form onSubmit={handleSearch} className="flex flex-1 gap-2">
              <Input
                name="search"
                placeholder="Buscar por nombre o documento..."
                defaultValue={currentSearch}
                className="flex-1"
              />
              <Button type="submit" variant="outline" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </form>

            <Select value={currentType} onValueChange={handleTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {typeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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
            No se encontraron destinatarios.
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
      <RecipientForm
        open={formOpen}
        onOpenChange={setFormOpen}
        recipient={selectedRecipient}
      />
    </div>
  );
}
