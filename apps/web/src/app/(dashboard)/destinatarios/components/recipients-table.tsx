"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { RecipientData } from "@upds/services";
import {
  RecipientType,
  RECIPIENT_TYPE_LABELS,
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
  ChevronLeft,
  ChevronRight,
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

      {/* Filters */}
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

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Documento</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Carrera</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recipients.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  No se encontraron destinatarios.
                </TableCell>
              </TableRow>
            ) : (
              recipients.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <span className="font-mono text-sm">
                      {r.document_number}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{r.full_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {RECIPIENT_TYPE_LABELS[r.type as keyof typeof RECIPIENT_TYPE_LABELS]}
                    </Badge>
                  </TableCell>
                  <TableCell>{r.career ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={r.is_active ? "default" : "secondary"}>
                      {r.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
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
          <span>
            {total} destinatario{total !== 1 ? "s" : ""} en total
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={page <= 1}
              onClick={() => pushParams({ page: String(page - 1) })}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span>
              Página {page} de {totalPages}
            </span>
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

      {/* Form Dialog */}
      <RecipientForm
        open={formOpen}
        onOpenChange={setFormOpen}
        recipient={selectedRecipient}
      />
    </div>
  );
}
