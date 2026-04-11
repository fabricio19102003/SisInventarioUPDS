import Link from "next/link";
import {
  DollarSign,
  Boxes,
  ScrollText,
  Gift,
  Briefcase,
  Trash2,
} from "lucide-react";
import { PageTransition } from "@upds/ui";
import { requireAuth } from "@/lib/session";
import { can, PERMISSIONS } from "@upds/validators";
import type { Permission } from "@upds/validators";

// ---------------------------------------------------------------------------
// Report card data
// ---------------------------------------------------------------------------

interface ReportCard {
  label: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission: Permission;
  adminOnly?: boolean;
}

const generalReports: ReportCard[] = [
  {
    label: "Inventario Actual",
    description:
      "Snapshot en tiempo real del stock por producto y variante. Incluye alertas de stock bajo.",
    href: "/reportes/inventario",
    icon: Boxes,
    permission: PERMISSIONS.REPORT_INVENTORY,
  },
  {
    label: "Movimientos",
    description:
      "Listado paginado de todos los movimientos de inventario con filtros por tipo, estado y fecha.",
    href: "/reportes/movimientos",
    icon: ScrollText,
    permission: PERMISSIONS.REPORT_MOVEMENTS,
  },
  {
    label: "Dotaciones a Becarios",
    description:
      "Historial de dotaciones gratuitas a becarios con detalle de prendas y tallas entregadas.",
    href: "/reportes/dotaciones",
    icon: Gift,
    permission: PERMISSIONS.REPORT_DONATIONS,
  },
];

const adminReports: ReportCard[] = [
  {
    label: "Financiero",
    description:
      "Resumen de ventas confirmadas: monto total, cantidad de movimientos e ítems vendidos.",
    href: "/reportes/financiero",
    icon: DollarSign,
    permission: PERMISSIONS.REPORT_FINANCIAL,
    adminOnly: true,
  },
  {
    label: "Consumo por Departamentos",
    description:
      "Entregas de material de oficina a departamentos internos de la universidad, agrupadas por área.",
    href: "/reportes/consumo-departamentos",
    icon: Briefcase,
    permission: PERMISSIONS.REPORT_CONSUMPTION,
    adminOnly: true,
  },
  {
    label: "Bajas por Deterioro",
    description:
      "Registros de productos dados de baja con justificación obligatoria y detalle de ítems afectados.",
    href: "/reportes/bajas",
    icon: Trash2,
    permission: PERMISSIONS.REPORT_WRITE_OFFS,
    adminOnly: true,
  },
];

// ---------------------------------------------------------------------------
// ReportCard component
// ---------------------------------------------------------------------------

function ReportCardLink({ card }: { card: ReportCard }) {
  const Icon = card.icon;
  return (
    <Link
      href={card.href}
      className="group flex flex-col gap-3 rounded-lg border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-sm"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold leading-tight">{card.label}</p>
          {card.adminOnly && (
            <span className="text-xs text-muted-foreground">(Admin / Gestor)</span>
          )}
        </div>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {card.description}
      </p>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ReportesPage() {
  const session = await requireAuth();

  const visibleGeneralReports = generalReports.filter((card) =>
    can(session.role, card.permission),
  );
  const visibleAdminReports = adminReports.filter((card) =>
    can(session.role, card.permission),
  );

  return (
    <PageTransition>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Reportes</h1>
          <p className="text-sm text-muted-foreground">
            Seleccioná el tipo de reporte que querés consultar
          </p>
        </div>

        {/* Reportes Generales */}
        {visibleGeneralReports.length > 0 && (
          <section className="space-y-3">
            <div>
              <h2 className="text-base font-semibold">Reportes Generales</h2>
              <p className="text-xs text-muted-foreground">
                Disponibles para todos los roles del sistema
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleGeneralReports.map((card) => (
                <ReportCardLink key={card.href} card={card} />
              ))}
            </div>
          </section>
        )}

        {/* Reportes Administrativos */}
        {visibleAdminReports.length > 0 && (
          <section className="space-y-3">
            <div>
              <h2 className="text-base font-semibold">Reportes Administrativos</h2>
              <p className="text-xs text-muted-foreground">
                Requieren rol Administrador o Gestor de Inventario
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleAdminReports.map((card) => (
                <ReportCardLink key={card.href} card={card} />
              ))}
            </div>
          </section>
        )}
      </div>
    </PageTransition>
  );
}
