import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@upds/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 text-center p-6">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
        <SearchX className="h-10 w-10 text-muted-foreground" />
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Página no encontrada
        </h1>
        <p className="max-w-md text-muted-foreground">
          La página que buscás no existe o fue movida. Verificá la URL o volvé
          al inicio.
        </p>
      </div>

      <Button asChild>
        <Link href="/">Volver al Dashboard</Link>
      </Button>
    </div>
  );
}
