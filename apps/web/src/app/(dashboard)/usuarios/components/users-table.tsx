"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { SafeUser } from "@upds/services";
import {
  UserRole,
  USER_ROLE_LABELS,
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
  RotateCcw,
  Search,
  ChevronLeft,
  ChevronRight,
  KeyRound,
} from "lucide-react";
import {
  deactivateUserAction,
  reactivateUserAction,
} from "@/actions/auth";
import { UserForm } from "./user-form";
import { ResetPasswordForm } from "./reset-password-form";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UsersTableProps {
  users: SafeUser[];
  total: number;
  page: number;
  perPage: number;
}

const roleOptions = enumToOptions(UserRole, USER_ROLE_LABELS);

function getRoleVariant(role: string): "default" | "secondary" | "outline" {
  switch (role) {
    case "ADMIN":
      return "default";
    case "INVENTORY_MANAGER":
      return "outline";
    default:
      return "secondary";
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UsersTable({ users, total, page, perPage }: UsersTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<SafeUser | null>(null);
  const [resetUser, setResetUser] = useState<SafeUser | null>(null);

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

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  function handleDeactivate(userId: string) {
    startTransition(async () => {
      const result = await deactivateUserAction(userId);
      if (!result.success) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
        return;
      }
      toast({ title: "Usuario desactivado correctamente." });
      router.refresh();
    });
  }

  function handleReactivate(userId: string) {
    startTransition(async () => {
      const result = await reactivateUserAction(userId);
      if (!result.success) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
        return;
      }
      toast({ title: "Usuario reactivado correctamente." });
      router.refresh();
    });
  }

  // -------------------------------------------------------------------------
  // Derived state from URL
  // -------------------------------------------------------------------------

  const currentSearch = searchParams.get("search") ?? "";
  const currentRole = searchParams.get("role") ?? "all";
  const currentStatus = searchParams.get("is_active") ?? "all";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-sm text-muted-foreground">
            Gestión de accesos al sistema
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2 min-w-[200px]">
          <Input
            name="search"
            placeholder="Buscar por nombre o correo..."
            defaultValue={currentSearch}
            className="flex-1"
          />
          <Button type="submit" variant="outline" size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </form>

        <Select
          value={currentRole}
          onValueChange={(v) =>
            pushParams({ role: v === "all" ? undefined : v, page: undefined })
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los roles</SelectItem>
            {roleOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={currentStatus}
          onValueChange={(v) =>
            pushParams({ is_active: v === "all" ? undefined : v, page: undefined })
          }
        >
          <SelectTrigger className="w-[140px]">
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
              <TableHead>Nombre</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Último acceso</TableHead>
              <TableHead className="w-[120px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  No se encontraron usuarios.
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {u.email}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleVariant(u.role)} className="text-xs">
                      {USER_ROLE_LABELS[u.role as keyof typeof USER_ROLE_LABELS]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.is_active ? "default" : "secondary"}>
                      {u.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {u.last_login_at
                      ? new Date(u.last_login_at).toLocaleDateString("es-BO")
                      : "Nunca"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {/* Editar */}
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={!u.is_active}
                        onClick={() => setEditUser(u)}
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Editar</span>
                      </Button>

                      {/* Reset password */}
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={!u.is_active}
                        onClick={() => setResetUser(u)}
                      >
                        <KeyRound className="h-4 w-4" />
                        <span className="sr-only">Resetear contraseña</span>
                      </Button>

                      {/* Desactivar / Reactivar */}
                      {u.is_active ? (
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
                                ¿Desactivar usuario?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Se desactivará el acceso de{" "}
                                <strong>{u.full_name}</strong>. Podrás
                                reactivarlo después.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => handleDeactivate(u.id)}
                              >
                                Desactivar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isPending}
                          onClick={() => handleReactivate(u.id)}
                        >
                          <RotateCcw className="h-4 w-4 text-green-600" />
                          <span className="sr-only">Reactivar</span>
                        </Button>
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
            {total} usuario{total !== 1 ? "s" : ""} en total
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

      {/* Dialogs */}
      <UserForm open={createOpen} onOpenChange={setCreateOpen} />

      {editUser && (
        <UserForm
          open={!!editUser}
          onOpenChange={(v) => { if (!v) setEditUser(null); }}
          user={editUser}
        />
      )}

      {resetUser && (
        <ResetPasswordForm
          open={!!resetUser}
          onOpenChange={(v) => { if (!v) setResetUser(null); }}
          user={resetUser}
        />
      )}
    </div>
  );
}
