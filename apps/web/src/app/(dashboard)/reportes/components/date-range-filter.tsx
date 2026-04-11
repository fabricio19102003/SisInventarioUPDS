"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button, Input } from "@upds/ui";
import { Search, X } from "lucide-react";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DateRangeFilterProps {
  /** URL param name for start date (default: date_from) */
  fromParam?: string;
  /** URL param name for end date (default: date_to) */
  toParam?: string;
  /** Additional className for the form container */
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DateRangeFilter({
  fromParam = "date_from",
  toParam = "date_to",
  className,
}: DateRangeFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentFrom = searchParams.get(fromParam) ?? "";
  const currentTo = searchParams.get(toParam) ?? "";

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

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    pushParams({
      [fromParam]: (fd.get(fromParam) as string) || undefined,
      [toParam]: (fd.get(toParam) as string) || undefined,
      page: undefined,
    });
  }

  function handleClear() {
    pushParams({
      [fromParam]: undefined,
      [toParam]: undefined,
      page: undefined,
    });
  }

  const hasFilters = !!currentFrom || !!currentTo;

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex flex-wrap items-end gap-3 ${className ?? ""}`}
    >
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">
          Desde
        </label>
        <Input
          type="date"
          name={fromParam}
          defaultValue={currentFrom}
          className="w-[160px]"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">
          Hasta
        </label>
        <Input
          type="date"
          name={toParam}
          defaultValue={currentTo}
          className="w-[160px]"
        />
      </div>

      <Button type="submit" variant="outline" size="sm" className="gap-2">
        <Search className="h-4 w-4" />
        Filtrar
      </Button>

      {hasFilters && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
          Limpiar
        </Button>
      )}
    </form>
  );
}
