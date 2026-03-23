import { PageTransition } from "@upds/ui";
import { DepartmentForm } from "../_components/department-form";

export default function NewDepartmentPage() {
  return (
    <PageTransition>
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Nuevo Departamento</h1>
      <DepartmentForm />
    </div>
    </PageTransition>
  );
}
