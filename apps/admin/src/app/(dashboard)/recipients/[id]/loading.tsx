import { Card, CardContent, CardHeader, Skeleton } from "@upds/ui";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-[300px]" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-[200px]" />
          <Skeleton className="h-4 w-[300px]" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-[120px]" />
              <Skeleton className="h-4 w-[250px]" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
