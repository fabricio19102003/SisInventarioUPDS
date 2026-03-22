import { notFound } from "next/navigation";
import { getDepartment } from "@/actions/departments";
import { DepartmentForm } from "../../_components/department-form";

export default async function EditDepartmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getDepartment(id);
  if (!result.success) return notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Editar Departamento</h1>
      <DepartmentForm department={result.data} />
    </div>
  );
}
