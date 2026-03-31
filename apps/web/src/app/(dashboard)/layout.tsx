import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session";
import { Breadcrumbs, ThemeToggle } from "@upds/ui";
import { Sidebar } from "./components/sidebar";

const BREADCRUMB_LABELS: Record<string, string> = {
  productos: "Productos",
  fabricantes: "Fabricantes",
  departamentos: "Departamentos",
  destinatarios: "Destinatarios",
  movimientos: "Movimientos",
  ordenes: "Ordenes de Fabricacion",
  usuarios: "Usuarios",
  nuevo: "Nuevo",
  editar: "Editar",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userName={session.full_name} userRole={session.role} />

      <main className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8">
          <div className="flex items-center justify-between">
            <Breadcrumbs labels={BREADCRUMB_LABELS} homeLabel="Dashboard" />
            <ThemeToggle />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
