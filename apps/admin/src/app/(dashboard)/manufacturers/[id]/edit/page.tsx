import { notFound } from "next/navigation";
import { getManufacturer } from "@/actions/manufacturers";
import { ManufacturerForm } from "../../_components/manufacturer-form";

export default async function EditManufacturerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getManufacturer(id);

  if (!result.success) return notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Editar Fabricante</h1>
      <ManufacturerForm manufacturer={result.data} />
    </div>
  );
}
