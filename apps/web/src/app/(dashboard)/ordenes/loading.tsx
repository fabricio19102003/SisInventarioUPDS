import { Skeleton } from "@upds/ui"
import { Card, CardContent, CardHeader } from "@upds/ui"

export default function OrdenesLoading() {
  return (
    <div className="space-y-6">
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

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-[100px]" />
          <Skeleton className="h-4 w-[250px]" />
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-2">
            <Skeleton className="h-10 w-full max-w-sm" />
            <Skeleton className="h-10 w-[150px]" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
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
  )
}
