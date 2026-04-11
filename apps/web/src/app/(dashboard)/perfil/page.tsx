// ═══════════════════════════════════════════════════════════════════════════════
// /perfil — Página de perfil de usuario y cambio de contraseña
// ═══════════════════════════════════════════════════════════════════════════════

import { requireAuth } from "@/lib/session";
import { PageTransition } from "@upds/ui";
import { USER_ROLE_LABELS } from "@upds/validators";
import { UserCircle } from "lucide-react";
import { PasswordChangeForm } from "./components/password-change-form";

export default async function PerfilPage() {
  const session = await requireAuth();

  return (
    <PageTransition>
      <div className="max-w-2xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mi Perfil</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Información de tu cuenta y opciones de seguridad.
          </p>
        </div>

        {/* Información del usuario */}
        <div className="rounded-lg border p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UserCircle className="h-6 w-6" />
            </div>
            <h2 className="text-base font-semibold">Datos de la cuenta</h2>
          </div>

          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
            <div className="space-y-0.5">
              <dt className="text-muted-foreground">Nombre completo</dt>
              <dd className="font-medium">{session.full_name}</dd>
            </div>
            <div className="space-y-0.5">
              <dt className="text-muted-foreground">Correo electrónico</dt>
              <dd className="font-medium">{session.email}</dd>
            </div>
            <div className="space-y-0.5">
              <dt className="text-muted-foreground">Rol</dt>
              <dd className="font-medium">
                {USER_ROLE_LABELS[session.role]}
              </dd>
            </div>
          </dl>
        </div>

        {/* Cambiar contraseña */}
        <div className="rounded-lg border p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold">Cambiar contraseña</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ingresá tu contraseña actual y la nueva para actualizarla.
            </p>
          </div>

          <PasswordChangeForm />
        </div>
      </div>
    </PageTransition>
  );
}
