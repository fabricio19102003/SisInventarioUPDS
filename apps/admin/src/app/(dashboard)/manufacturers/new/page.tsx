import { PageTransition } from "@upds/ui";
import { ManufacturerForm } from "../_components/manufacturer-form";

export default function NewManufacturerPage() {
  return (
    <PageTransition>
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Nuevo Fabricante</h1>
      <ManufacturerForm />
    </div>
    </PageTransition>
  );
}
