import { Skeleton } from "@upds/ui";

export default function ReportesLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <Skeleton className="h-8 w-[160px]" />
        <Skeleton className="h-4 w-[300px]" />
      </div>

      {/* Section 1 */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-[180px]" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px] w-full rounded-lg" />
          ))}
        </div>
      </div>

      {/* Section 2 */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-[220px]" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px] w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
