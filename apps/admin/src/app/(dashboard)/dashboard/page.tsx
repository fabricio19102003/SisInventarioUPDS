import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "@upds/ui";

export default function DashboardPage() {
  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Panel de Administracion Tecnica
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestion de usuarios y configuracion del sistema UPDS Inventario.
          </p>
        </div>

        {/* Quick access cards */}
        <StaggerContainer className="grid gap-4 sm:grid-cols-2">
          {/* User Management */}
          <StaggerItem>
            <Link href="/users">
              <Card className="cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-lg">Gestion de Usuarios</CardTitle>
                  <CardDescription>
                    Administra los usuarios del sistema, roles y permisos de acceso.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-primary font-medium">
                    Ir a Usuarios →
                  </p>
                </CardContent>
              </Card>
            </Link>
          </StaggerItem>

          {/* Audit Logs */}
          <StaggerItem>
            <Link href="/audit-logs">
              <Card className="cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-lg">Logs de Auditoria</CardTitle>
                  <CardDescription>
                    Registro inmutable de todas las acciones realizadas en el sistema.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-primary font-medium">
                    Ir a Auditoria →
                  </p>
                </CardContent>
              </Card>
            </Link>
          </StaggerItem>
        </StaggerContainer>

        {/* Info banner */}
        <Card className="border-upds-navy-200 bg-upds-navy/5">
          <CardHeader>
            <CardTitle className="text-base">Sobre este panel</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Este panel es exclusivo para administradores tecnicos. La gestion de inventario,
              productos, movimientos y ordenes de fabricacion se realiza desde la{" "}
              <a
                href={process.env.NEXT_PUBLIC_WEB_URL ?? "/"}
                className="font-medium text-primary underline underline-offset-2 hover:text-primary/80"
                target="_blank"
                rel="noopener noreferrer"
              >
                aplicacion principal de inventario
              </a>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
