import { Card, CardContent, CardHeader, Skeleton } from "@upds/ui";

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Header with title + button */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-7 rounded" />
            <Skeleton className="h-8 w-[200px]" />
            <Skeleton className="h-5 w-[80px] rounded-full" />
          </div>
          <Skeleton className="h-4 w-[300px]" />
        </div>
        <Skeleton className="h-10 w-[140px]" />
      </div>

      {/* Table card */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-[100px]" />
          <Skeleton className="h-4 w-[250px]" />
        </CardHeader>
        <CardContent>
          {/* Search bar */}
          <div className="mb-4">
            <Skeleton className="h-10 w-full max-w-sm" />
          </div>
          {/* Table */}
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
            <Skeleton className="h-4 w-[150px]" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
