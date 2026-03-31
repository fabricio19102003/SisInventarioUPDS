"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"
import { cn } from "../lib/utils"

interface BreadcrumbsProps {
  /** Map of path segments to display labels */
  labels?: Record<string, string>
  /** Base path to start breadcrumbs from (e.g., "/dashboard" or "/") */
  basePath?: string
  /** Label for the home/root breadcrumb */
  homeLabel?: string
  className?: string
}

export function Breadcrumbs({
  labels = {},
  basePath = "",
  homeLabel = "Dashboard",
  className,
}: BreadcrumbsProps) {
  const pathname = usePathname()

  // Remove basePath prefix and split into segments
  const relativePath = basePath ? pathname.replace(basePath, "") : pathname
  const segments = relativePath.split("/").filter(Boolean)

  // Don't show breadcrumbs on the root/dashboard page
  if (segments.length === 0) return null

  // Build breadcrumb items
  const items = segments.map((segment, index) => {
    const path = basePath + "/" + segments.slice(0, index + 1).join("/")
    const isLast = index === segments.length - 1

    // Check for a label: exact segment match, or treat UUIDs as "Detalle"
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)
    const label = labels[segment] ?? (isUuid ? "Detalle" : decodeURIComponent(segment).replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()))

    return { path, label, isLast }
  })

  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center text-sm text-muted-foreground", className)}>
      <Link
        href={basePath || "/"}
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
        <span>{homeLabel}</span>
      </Link>
      {items.map((item) => (
        <span key={item.path} className="flex items-center">
          <ChevronRight className="mx-2 h-3.5 w-3.5" />
          {item.isLast ? (
            <span className="font-medium text-foreground">{item.label}</span>
          ) : (
            <Link
              href={item.path}
              className="hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  )
}
