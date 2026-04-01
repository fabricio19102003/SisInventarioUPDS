"use client";

import { useTransition, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card, CardContent, CardHeader, CardTitle, Button, Label, Textarea,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@upds/ui";
import { createMovement } from "@/actions/inventory-movements";
import { getRecipients } from "@/actions/recipients";
import { getDepartments } from "@/actions/departments";
import { enumToOptions, MovementType, MOVEMENT_TYPE_LABELS } from "@upds/validators";
import type { RecipientData, DepartmentData } from "@upds/services";
import type { CreateMovementInput } from "@upds/validators";

type MovementTypeValue = CreateMovementInput["movement_type"];

// Exclude ENTRY since it's auto-created from manufacture orders
const typeOptions = enumToOptions(MovementType, MOVEMENT_TYPE_LABELS).filter(
  (o) => o.value !== "ENTRY"
);

export function MovementForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [movementType, setMovementType] = useState<MovementTypeValue | "">("");
  const [recipientId, setRecipientId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [notes, setNotes] = useState("");
  const [recipients, setRecipients] = useState<RecipientData[]>([]);
  const [departments, setDepartments] = useState<DepartmentData[]>([]);

  const needsRecipient = movementType === "SALE" || movementType === "DONATION";
  const needsDepartment = movementType === "DEPARTMENT_DELIVERY";
  const needsNotes = movementType === "WRITE_OFF" || movementType === "ADJUSTMENT";

  useEffect(() => {
    if (needsRecipient) {
      getRecipients({ is_active: true }).then((r) => {
        if (r.success) {
          let filtered = r.data.recipients;
          if (movementType === "SALE") filtered = filtered.filter((rc) => rc.type !== "SCHOLAR");
          if (movementType === "DONATION") filtered = filtered.filter((rc) => rc.type === "SCHOLAR");
          setRecipients(filtered);
        }
      });
    }
    if (needsDepartment) {
      getDepartments({ is_active: true }).then((r) => {
        if (r.success) setDepartments(r.data.departments);
      });
    }
  }, [movementType, needsRecipient, needsDepartment]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!movementType) {
      setError("Seleccioná un tipo de movimiento");
      return;
    }

    let data: CreateMovementInput;

    switch (movementType) {
      case "SALE":
      case "DONATION":
        data = {
          movement_type: movementType,
          recipient_id: recipientId,
          notes: notes || undefined,
        };
        break;
      case "DEPARTMENT_DELIVERY":
        data = {
          movement_type: movementType,
          department_id: departmentId,
          notes: notes || undefined,
        };
        break;
      case "WRITE_OFF":
      case "ADJUSTMENT":
        data = {
          movement_type: movementType,
          notes,
        };
        break;
      default:
        setError("Tipo de movimiento no soportado desde este formulario");
        return;
    }

    startTransition(async () => {
      const result = await createMovement(data);
      if (result.success) {
        router.push(`/inventory-movements/${result.data.id}`);
      } else {
        setError(result.error);
      }
    });
  }

  const isValid = movementType && (
    (!needsRecipient && !needsDepartment) ||
    (needsRecipient && recipientId) ||
    (needsDepartment && departmentId)
  );

  return (
    <Card>
      <CardHeader><CardTitle>Nuevo Movimiento de Inventario</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
          {error && <div className="rounded bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

          <div className="space-y-2">
            <Label>Tipo de Movimiento *</Label>
            <Select value={movementType} onValueChange={(v) => {
                setMovementType(v as MovementTypeValue);
              setRecipientId("");
              setDepartmentId("");
            }}>
              <SelectTrigger><SelectValue placeholder="Seleccionar tipo..." /></SelectTrigger>
              <SelectContent>
                {typeOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {needsRecipient && (
            <div className="space-y-2">
              <Label>Destinatario *</Label>
              <Select value={recipientId} onValueChange={setRecipientId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar destinatario..." /></SelectTrigger>
                <SelectContent>
                  {recipients.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.full_name} ({r.document_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {needsDepartment && (
            <div className="space-y-2">
              <Label>Departamento *</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar departamento..." /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name} ({d.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Notas {needsNotes ? "*" : ""}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              required={needsNotes}
              placeholder={needsNotes ? "Requerido para este tipo de movimiento" : "Opcional"}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isPending || !isValid}>
              {isPending ? "Creando..." : "Crear Movimiento"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
