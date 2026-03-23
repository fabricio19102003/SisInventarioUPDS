import Link from "next/link";
import { notFound } from "next/navigation";
import { getDepartment } from "@/actions/departments";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, PageTransition } from "@upds/ui";
import { DepartmentActions } from "../_components/department-actions";

export default async function DepartmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getDepartment(id);
  if (!result.success) return notFound();
  const d = result.data;

  return (
    <PageTransition>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{d.name}</h1>
          <Badge variant="outline">{d.code}</Badge>
          <Badge variant={d.is_active ? "default" : "secondary"}>
            {d.is_active ? "Activo" : "Inactivo"}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Link href={`/departments/${id}/edit`}><Button variant="outline">Editar</Button></Link>
          <DepartmentActions id={id} isActive={d.is_active} />
        </div>
      </div>
      <Link href="/departments"><Button variant="outline">Volver al listado</Button></Link>
    </div>
    </PageTransition>
  );
}
