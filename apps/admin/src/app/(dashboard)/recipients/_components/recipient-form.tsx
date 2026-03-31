"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card, CardContent, CardHeader, CardTitle, Button, Input, Label,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@upds/ui";
import { createRecipient, updateRecipient } from "@/actions/recipients";
import { enumToOptions, RecipientType, RECIPIENT_TYPE_LABELS } from "@upds/validators";

const typeOptions = enumToOptions(RecipientType, RECIPIENT_TYPE_LABELS);

interface RecipientFormProps {
  recipient?: {
    id: string;
    document_number: string;
    full_name: string;
    type: string;
    phone: string | null;
    email: string | null;
    career: string | null;
  };
}

export function RecipientForm({ recipient }: RecipientFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState(recipient?.type ?? "STUDENT");
  const isEdit = !!recipient;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    const data: any = {
      ...(isEdit ? { id: recipient.id } : { document_number: fd.get("document_number") as string }),
      full_name: fd.get("full_name") as string,
      type,
      phone: (fd.get("phone") as string) || undefined,
      email: (fd.get("email") as string) || undefined,
      career: (fd.get("career") as string) || undefined,
    };

    startTransition(async () => {
      const result = isEdit ? await updateRecipient(data) : await createRecipient(data);
      if (result.success) {
        router.push(isEdit ? `/recipients/${recipient.id}` : "/recipients");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Editar Destinatario" : "Nuevo Destinatario"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
          {error && (
            <div className="rounded bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="space-y-2">
            <Label htmlFor="document_number">Nro. Documento *</Label>
            <Input
              id="document_number"
              name="document_number"
              required
              defaultValue={recipient?.document_number ?? ""}
              disabled={isEdit}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Nombre Completo *</Label>
            <Input id="full_name" name="full_name" required defaultValue={recipient?.full_name ?? ""} />
          </div>

          <div className="space-y-2">
            <Label>Tipo *</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {typeOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" name="phone" defaultValue={recipient?.phone ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={recipient?.email ?? ""} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="career">Carrera</Label>
            <Input id="career" name="career" defaultValue={recipient?.career ?? ""} />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando..." : isEdit ? "Guardar Cambios" : "Crear Destinatario"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
