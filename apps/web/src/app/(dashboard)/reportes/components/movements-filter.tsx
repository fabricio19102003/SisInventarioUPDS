"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Button,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@upds/ui";
import { Search, X } from "lucide-react";
import { MOVEMENT_TYPE_LABELS, MOVEMENT_STATUS_LABELS } from "@upds/validators";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MovementsFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentFrom = searchParams.get("date_from") ?? "";
  const currentTo = searchParams.get("date_to") ?? "";
  const currentType = searchParams.get("movement_type") ?? "all";
  const currentStatus = searchParams.get("status") ?? "all";

  function pushParams(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    // Reset to page 1 when filters change
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleDateSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    pushParams({
      date_from: (fd.get("date_from") as string) || undefined,
      date_to: (fd.get("date_to") as string) || undefined,
    });
  }

  function handleClearAll() {
    router.push(pathname);
  }

  const hasFilters =
    !!currentFrom ||
    !!currentTo ||
    currentType !== "all" ||
    currentStatus !== "all";

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      {/* Date range */}
      <form onSubmit={handleDateSubmit} className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Desde</label>
          <Input
            type="date"
            name="date_from"
            defaultValue={currentFrom}
            className="w-[150px]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Hasta</label>
          <Input
            type="date"
            name="date_to"
            defaultValue={currentTo}
            className="w-[150px]"
          />
        </div>
        <Button type="submit" variant="outline" size="sm" className="gap-2">
          <Search className="h-4 w-4" />
          Filtrar
        </Button>
      </form>

      {/* Movement type filter */}
      <Select
        value={currentType}
        onValueChange={(v) =>
          pushParams({ movement_type: v === "all" ? undefined : v })
        }
      >
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="Tipo de movimiento" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los tipos</SelectItem>
          {Object.entries(MOVEMENT_TYPE_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status filter */}
      <Select
        value={currentStatus}
        onValueChange={(v) =>
          pushParams({ status: v === "all" ? undefined : v })
        }
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los estados</SelectItem>
          {Object.entries(MOVEMENT_STATUS_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear all */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearAll}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
