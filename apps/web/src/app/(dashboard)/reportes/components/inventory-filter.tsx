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
import { Search, AlertTriangle, X } from "lucide-react";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InventoryFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentArea = searchParams.get("warehouse_area") ?? "all";
  const currentCategory = searchParams.get("category") ?? "all";
  const currentSearch = searchParams.get("search") ?? "";
  const isLowStockOnly = searchParams.get("low_stock_only") === "true";

  function pushParams(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    pushParams({
      search: (fd.get("search") as string) || undefined,
    });
  }

  function handleClearAll() {
    router.push(pathname);
  }

  const hasFilters =
    currentArea !== "all" ||
    currentCategory !== "all" ||
    !!currentSearch ||
    isLowStockOnly;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 min-w-[200px] flex-1">
        <Input
          name="search"
          placeholder="Buscar por nombre o SKU..."
          defaultValue={currentSearch}
          className="flex-1"
        />
        <Button type="submit" variant="outline" size="icon">
          <Search className="h-4 w-4" />
          <span className="sr-only">Buscar</span>
        </Button>
      </form>

      {/* Area filter */}
      <Select
        value={currentArea}
        onValueChange={(v) =>
          pushParams({ warehouse_area: v === "all" ? undefined : v })
        }
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Área" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas las áreas</SelectItem>
          <SelectItem value="MEDICAL">Sector Médico</SelectItem>
          <SelectItem value="OFFICE">Sector Oficina</SelectItem>
        </SelectContent>
      </Select>

      {/* Category filter */}
      <Select
        value={currentCategory}
        onValueChange={(v) =>
          pushParams({ category: v === "all" ? undefined : v })
        }
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Categoría" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas las categorías</SelectItem>
          <SelectItem value="MEDICAL_GARMENT">Indumentaria Médica</SelectItem>
          <SelectItem value="OFFICE_SUPPLY">Material de Oficina</SelectItem>
        </SelectContent>
      </Select>

      {/* Low stock toggle */}
      <Button
        variant={isLowStockOnly ? "destructive" : "outline"}
        size="sm"
        onClick={() =>
          pushParams({
            low_stock_only: isLowStockOnly ? undefined : "true",
          })
        }
        className="gap-2"
      >
        <AlertTriangle className="h-4 w-4" />
        Solo stock bajo
      </Button>

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
