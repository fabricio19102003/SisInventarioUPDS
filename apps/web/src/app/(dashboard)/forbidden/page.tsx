import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@upds/ui";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
        <Lock className="h-10 w-10 text-destructive" />
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Acceso Denegado</h1>
        <p className="max-w-md text-muted-foreground">
          No tenés permisos para acceder a esta página. Si creés que esto es un
          error, contactá al administrador del sistema.
        </p>
      </div>

      <Button asChild>
        <Link href="/">Volver al Dashboard</Link>
      </Button>
    </div>
  );
}
