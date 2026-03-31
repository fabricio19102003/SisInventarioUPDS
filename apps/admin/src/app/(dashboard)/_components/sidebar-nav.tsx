"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@upds/ui";
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  Factory,
  ClipboardList,
  Users,
  Building2,
  UserCheck,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  Factory,
  ClipboardList,
  Users,
  Building2,
  UserCheck,
};

export interface NavItem {
  label: string;
  href: string;
  iconName?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

interface SidebarNavProps {
  sections: NavSection[];
}

export function SidebarNav({ sections }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {sections.map((section) => (
        <div key={section.title}>
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-upds-light-300">
            {section.title}
          </p>
          <ul className="space-y-1">
            {section.items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" &&
                  pathname.startsWith(item.href));
              const Icon = item.iconName ? iconMap[item.iconName] : undefined;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-upds-sky/20 text-white border-l-2 border-upds-sky"
                        : "text-upds-light-200 hover:bg-upds-navy-400/15 hover:text-white"
                    )}
                  >
                    {Icon && <Icon className="h-4 w-4 shrink-0" />}
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
