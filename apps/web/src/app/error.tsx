"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@upds/ui";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // En producción, se puede reportar el error a un servicio de logging aquí
    console.error("Error inesperado:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center p-6">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-10 w-10 text-destructive" />
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Algo salió mal</h1>
        <p className="max-w-md text-muted-foreground">
          Ocurrió un error inesperado. Podés intentar recargar la página o
          volver al inicio.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground font-mono">
            Código de error: {error.digest}
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={reset}>
          Reintentar
        </Button>
        <Button asChild>
          <Link href="/">Volver al Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
