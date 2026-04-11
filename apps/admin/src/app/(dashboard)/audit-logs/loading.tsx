// Skeleton de carga para el visor de audit logs

export default function AuditLogsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded-md bg-muted" />
          <div className="h-4 w-72 rounded-md bg-muted" />
        </div>
        <div className="h-14 w-40 rounded-lg bg-muted" />
      </div>

      {/* Filtros */}
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-3 h-3 w-16 rounded bg-muted" />
        <div className="flex gap-3">
          <div className="h-9 w-32 rounded-md bg-muted" />
          <div className="h-9 w-40 rounded-md bg-muted" />
          <div className="h-9 w-36 rounded-md bg-muted" />
          <div className="h-9 w-36 rounded-md bg-muted" />
        </div>
      </div>

      {/* Tabla skeleton */}
      <div className="rounded-lg border overflow-hidden">
        <div className="border-b bg-muted/50 px-4 py-3">
          <div className="flex gap-6">
            {["w-28", "w-36", "w-20", "w-24", "w-20", "w-32"].map(
              (w, i) => (
                <div key={i} className={`h-3 ${w} rounded bg-muted`} />
              ),
            )}
          </div>
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border-b px-4 py-4">
            <div className="flex items-center gap-6">
              <div className="h-3 w-32 rounded bg-muted" />
              <div>
                <div className="h-3 w-28 rounded bg-muted mb-1" />
                <div className="h-2 w-36 rounded bg-muted" />
              </div>
              <div className="h-5 w-16 rounded-full bg-muted" />
              <div className="h-5 w-24 rounded bg-muted" />
              <div className="h-3 w-16 rounded bg-muted" />
              <div className="h-3 w-20 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
