import { RecipientForm } from "../_components/recipient-form";

export default function NewRecipientPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Nuevo Destinatario</h1>
      <RecipientForm />
    </div>
  );
}
