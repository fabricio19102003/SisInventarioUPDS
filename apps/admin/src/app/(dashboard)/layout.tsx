import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { type UserRole } from "@upds/validators";
import { Breadcrumbs, Separator, ThemeToggle } from "@upds/ui";
import { SidebarNav, type NavSection } from "./_components/sidebar-nav";
import { MobileSidebar } from "./_components/mobile-sidebar";
import { UserDropdown } from "./_components/user-dropdown";

function buildNavSections(role: string): NavSection[] {
  const sections: NavSection[] = [
    {
      title: "General",
      items: [
        { label: "Dashboard", href: "/dashboard", iconName: "LayoutDashboard" },
      ],
    },
    {
      title: "Inventario",
      items: [
        { label: "Productos", href: "/products", iconName: "Package" },
        { label: "Movimientos", href: "/inventory-movements", iconName: "ArrowLeftRight" },
      ],
    },
    {
      title: "Fabricacion",
      items: [
        { label: "Fabricantes", href: "/manufacturers", iconName: "Factory" },
        { label: "Ordenes de Fabricacion", href: "/manufacture-orders", iconName: "ClipboardList" },
      ],
    },
    {
      title: "Catalogos",
      items: [
        { label: "Destinatarios", href: "/recipients", iconName: "UserCheck" },
        { label: "Departamentos", href: "/departments", iconName: "Building2" },
      ],
    },
  ];

  if (role === "ADMIN") {
    sections.push({
      title: "Sistema",
      items: [
        { label: "Usuarios", href: "/users", iconName: "Users" },
      ],
    });
  }

  return sections;
}

const BREADCRUMB_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  departments: "Departamentos",
  manufacturers: "Fabricantes",
  recipients: "Destinatarios",
  products: "Productos",
  users: "Usuarios",
  "inventory-movements": "Movimientos",
  "manufacture-orders": "Ordenes de Fabricacion",
  new: "Nuevo",
  edit: "Editar",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { user } = session;
  const navSections = buildNavSections(user.role);

  return (
    <div className="min-h-screen">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-upds-navy-700 bg-upds-navy text-white lg:flex">
        <div className="flex h-16 items-center border-b border-upds-navy-400/20 px-6">
          <span className="text-lg font-bold tracking-tight">
            UPDS Inventario
          </span>
        </div>
        <SidebarNav sections={navSections} />
        <div className="border-t border-upds-navy-400/20 px-4 py-3">
          <p className="truncate text-xs text-upds-light-300">{user.email}</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background px-4 shadow-sm lg:px-6">
          <div className="flex items-center gap-4">
            <MobileSidebar sections={navSections} />
            <Separator orientation="vertical" className="hidden h-6 lg:block" />
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserDropdown
              fullName={user.full_name}
              email={user.email}
              role={user.role}
            />
          </div>
        </header>

        {/* Page Content */}
        <main className="min-h-[calc(100vh-4rem)] bg-muted/30 p-4 lg:p-6">
          <Breadcrumbs labels={BREADCRUMB_LABELS} homeLabel="Dashboard" />
          {children}
        </main>
      </div>
    </div>
  );
}
