"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card, CardContent, CardHeader, CardTitle, Button, Input, Label,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@upds/ui";
import { createUser, updateUser } from "@/actions/users";
import { enumToOptions, UserRole, USER_ROLE_LABELS } from "@upds/validators";

const roleOptions = enumToOptions(UserRole, USER_ROLE_LABELS);

interface UserFormProps {
  user?: { id: string; email: string; full_name: string; role: string };
}

export function UserForm({ user }: UserFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState(user?.role ?? "VIEWER");
  const isEdit = !!user;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    if (isEdit) {
      startTransition(async () => {
        const result = await updateUser({
          id: user.id,
          email: fd.get("email") as string,
          full_name: fd.get("full_name") as string,
          role: role as any,
        });
        if (result.success) router.push(`/users/${user.id}`);
        else setError(result.error);
      });
    } else {
      const password = fd.get("password") as string;
      const password_confirm = fd.get("password_confirm") as string;
      if (password !== password_confirm) {
        setError("Las contraseñas no coinciden");
        return;
      }

      startTransition(async () => {
        const result = await createUser({
          email: fd.get("email") as string,
          full_name: fd.get("full_name") as string,
          password,
          password_confirm,
          role: role as any,
        });
        if (result.success) router.push("/users");
        else setError(result.error);
      });
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>{isEdit ? "Editar Usuario" : "Nuevo Usuario"}</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
          {error && <div className="rounded bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" name="email" type="email" required defaultValue={user?.email ?? ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Nombre Completo *</Label>
            <Input id="full_name" name="full_name" required defaultValue={user?.full_name ?? ""} />
          </div>

          <div className="space-y-2">
            <Label>Rol *</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {roleOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {!isEdit && (
            <>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña *</Label>
                <Input id="password" name="password" type="password" required minLength={8} />
                <p className="text-xs text-muted-foreground">Mín. 8 caracteres, 1 mayúscula, 1 minúscula, 1 número</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password_confirm">Confirmar Contraseña *</Label>
                <Input id="password_confirm" name="password_confirm" type="password" required />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando..." : isEdit ? "Guardar Cambios" : "Crear Usuario"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
