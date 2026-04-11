import { Skeleton } from "@upds/ui";

export default function ConsumoDepartamentosLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-8 w-[300px]" />
        <Skeleton className="h-4 w-[460px]" />
      </div>

      {/* Filter bar */}
      <div className="flex gap-3">
        <Skeleton className="h-9 w-[160px]" />
        <Skeleton className="h-9 w-[160px]" />
        <Skeleton className="h-9 w-[90px]" />
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] rounded-lg" />
        ))}
      </div>

      {/* Table */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-[240px]" />
        <div className="rounded-lg border overflow-hidden">
          <Skeleton className="h-12 w-full" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full border-t" />
          ))}
        </div>
      </div>
    </div>
  );
}
