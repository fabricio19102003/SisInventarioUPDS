"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn, Button, Sheet, SheetContent, SheetTrigger } from "@upds/ui";
import {
  LayoutDashboard,
  Package,
  Building2,
  Factory,
  Users,
  ArrowLeftRight,
  ClipboardList,
  UserCog,
  Menu,
  LogOut,
} from "lucide-react";
import { useState, useTransition } from "react";
import { logoutAction } from "@/actions/auth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SidebarProps {
  userName: string;
  userRole: string;
}

// ---------------------------------------------------------------------------
// Nav items
// ---------------------------------------------------------------------------

const mainNav = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Productos", href: "/productos", icon: Package },
  { label: "Departamentos", href: "/departamentos", icon: Building2 },
  { label: "Fabricantes", href: "/fabricantes", icon: Factory },
  { label: "Destinatarios", href: "/destinatarios", icon: Users },
  { label: "Movimientos", href: "/movimientos", icon: ArrowLeftRight },
  { label: "Ordenes de Fabricacion", href: "/ordenes", icon: ClipboardList },
] as const;

const bottomNav = [
  { label: "Usuarios", href: "/usuarios", icon: UserCog },
] as const;

// ---------------------------------------------------------------------------
// NavLink
// ---------------------------------------------------------------------------

function NavLink({
  href,
  icon: Icon,
  label,
  active,
  onClick,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-white/20 text-white"
          : "text-white/70 hover:bg-white/10 hover:text-white",
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {label}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// SidebarContent (shared between desktop and mobile)
// ---------------------------------------------------------------------------

function SidebarContent({
  pathname,
  userName,
  userRole,
  onLinkClick,
}: {
  pathname: string;
  userName: string;
  userRole: string;
  onLinkClick?: () => void;
  onLogout?: () => void;
  isLoggingOut?: boolean;
}) {
  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <div className="flex h-full flex-col bg-primary text-white">
      {/* Logo */}
      <div className="px-6 py-8">
        <h1 className="text-2xl font-bold tracking-wider">UPDS</h1>
        <p className="mt-1 text-sm text-primary-foreground/70">
          Sistema de Inventario
        </p>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 space-y-1 px-3">
        {mainNav.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={isActive(item.href)}
            onClick={onLinkClick}
          />
        ))}
      </nav>

      {/* Bottom navigation */}
      <div className="border-t border-white/10 px-3 py-3">
        {bottomNav.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={isActive(item.href)}
            onClick={onLinkClick}
          />
        ))}
      </div>

      {/* User info + Logout */}
      <div className="border-t border-white/10 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm font-semibold shrink-0">
            {userName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{userName}</p>
            <p className="truncate text-xs text-white/60">{userRole}</p>
          </div>
          <button
            onClick={onLogout}
            disabled={isLoggingOut}
            className="shrink-0 rounded-lg p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar (exported)
// ---------------------------------------------------------------------------

export function Sidebar({ userName, userRole }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isLoggingOut, startLogout] = useTransition();

  function handleLogout() {
    startLogout(async () => {
      await logoutAction();
      window.location.href = "/login";
    });
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden h-screen w-64 shrink-0 lg:block">
        <SidebarContent
          pathname={pathname}
          userName={userName}
          userRole={userRole}
          onLogout={handleLogout}
          isLoggingOut={isLoggingOut}
        />
      </aside>

      {/* Mobile header + sheet */}
      <div className="sticky top-0 z-40 flex items-center gap-4 border-b bg-background px-4 py-3 lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Abrir menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SidebarContent
              pathname={pathname}
              userName={userName}
              userRole={userRole}
              onLinkClick={() => setOpen(false)}
              onLogout={handleLogout}
              isLoggingOut={isLoggingOut}
            />
          </SheetContent>
        </Sheet>
        <span className="text-lg font-bold tracking-wider text-primary">
          UPDS
        </span>
      </div>
    </>
  );
}
