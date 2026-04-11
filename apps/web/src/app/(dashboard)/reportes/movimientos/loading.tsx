import { Skeleton } from "@upds/ui";

export default function MovimientosLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-8 w-[280px]" />
        <Skeleton className="h-4 w-[420px]" />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-9 w-[150px]" />
        <Skeleton className="h-9 w-[150px]" />
        <Skeleton className="h-9 w-[90px]" />
        <Skeleton className="h-9 w-[220px]" />
        <Skeleton className="h-9 w-[160px]" />
      </div>

      {/* Summary card */}
      <Skeleton className="h-[72px] rounded-lg" />

      {/* Table */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-[180px]" />
        <div className="rounded-lg border overflow-hidden">
          <Skeleton className="h-12 w-full" />
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full border-t" />
          ))}
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-5 w-[200px]" />
          <Skeleton className="h-8 w-[180px]" />
        </div>
      </div>
    </div>
  );
}
