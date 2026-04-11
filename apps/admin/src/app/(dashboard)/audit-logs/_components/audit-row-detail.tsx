"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// AuditRowDetail — componente expandible que muestra old_values / new_values
// como JSON formateado. Estado local por fila.
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface AuditRowDetailProps {
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
}

export function AuditRowDetail({ old_values, new_values }: AuditRowDetailProps) {
  const [expanded, setExpanded] = useState(false);

  const hasData = old_values !== null || new_values !== null;
  if (!hasData) return <span className="text-xs text-muted-foreground">—</span>;

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 focus:outline-none"
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        {expanded ? "Ocultar detalle" : "Ver detalle"}
      </button>

      {expanded && (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {old_values !== null && (
            <div>
              <p className="mb-1 text-xs font-semibold text-muted-foreground">
                Valores anteriores
              </p>
              <pre className="overflow-auto rounded-md bg-muted p-2 text-xs leading-relaxed text-foreground">
                {JSON.stringify(old_values, null, 2)}
              </pre>
            </div>
          )}
          {new_values !== null && (
            <div>
              <p className="mb-1 text-xs font-semibold text-muted-foreground">
                Valores nuevos
              </p>
              <pre className="overflow-auto rounded-md bg-muted p-2 text-xs leading-relaxed text-foreground">
                {JSON.stringify(new_values, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
