"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// action-utils.ts — Utilidades para manejo uniforme de Server Actions
//
// Uso:
//   import { handleAction } from "@/lib/action-utils";
//
//   const result = await handleAction(
//     createProductAction(payload),
//     {
//       toast,
//       successMessage: "Producto creado correctamente.",
//       onSuccess: () => { router.refresh(); onOpenChange(false); },
//     }
//   );
// ═══════════════════════════════════════════════════════════════════════════════

import { toast as toastFn } from "@upds/ui";
import { isRedirectError } from "next/dist/client/components/redirect-error";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface HandleActionOptions<T> {
  /**
   * Función `toast` proveniente de `useToast()`.
   * Si no se provee, usa el singleton global `toast` de @upds/ui.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toast?: (opts: any) => void;
  /** Mensaje a mostrar en caso de éxito. Default: "Operación exitosa." */
  successMessage?: string;
  /** Mensaje a mostrar en caso de error. Si no se provee, usa el error de la acción. */
  errorMessage?: string;
  /** Callback ejecutado solo si la acción fue exitosa. Recibe el `data` del resultado. */
  onSuccess?: (data: T | undefined) => void;
  /** Callback ejecutado solo si la acción falló. Recibe el mensaje de error. */
  onError?: (error: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// handleAction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Envuelve una llamada a un Server Action y muestra toasts automáticamente
 * en caso de éxito o error.
 *
 * @param action  Promesa que retorna `{ success, data?, error? }`
 * @param options Configuración del toast y callbacks
 * @returns       El resultado original del Server Action
 *
 * @example
 * const result = await handleAction(
 *   createProductAction(payload),
 *   {
 *     toast,
 *     successMessage: "Producto creado correctamente.",
 *     onSuccess: () => { router.refresh(); onOpenChange(false); },
 *   }
 * );
 */
export async function handleAction<T>(
  action: Promise<ActionResult<T>>,
  options: HandleActionOptions<T> = {},
): Promise<ActionResult<T>> {
  const {
    toast: toastInstance,
    successMessage = "Operación exitosa.",
    errorMessage,
    onSuccess,
    onError,
  } = options;

  // Usar el toast inyectado por el caller, o el singleton global como fallback
  const showToast = toastInstance ?? toastFn;

  let result: ActionResult<T>;

  try {
    result = await action;
  } catch (err) {
    // Re-lanzar errores de redirect de Next.js (ej: redirect("/forbidden"))
    // para que la navegacion funcione correctamente.
    if (isRedirectError(err)) {
      throw err;
    }
    const message =
      err instanceof Error ? err.message : "Error inesperado del servidor.";
    showToast({
      title: "Error",
      description: errorMessage ?? message,
      variant: "destructive",
    });
    onError?.(message);
    return { success: false, error: message };
  }

  if (!result.success) {
    const message = errorMessage ?? result.error ?? "Error inesperado.";
    showToast({
      title: "Error",
      description: message,
      variant: "destructive",
    });
    onError?.(message);
    return result;
  }

  showToast({ title: successMessage });
  onSuccess?.(result.data);

  return result;
}
