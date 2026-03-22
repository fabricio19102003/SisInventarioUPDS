import { notFound } from "next/navigation";
import { getRecipient } from "@/actions/recipients";
import { RecipientForm } from "../../_components/recipient-form";

export default async function EditRecipientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getRecipient(id);
  if (!result.success) return notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Editar Destinatario</h1>
      <RecipientForm recipient={result.data} />
    </div>
  );
}
