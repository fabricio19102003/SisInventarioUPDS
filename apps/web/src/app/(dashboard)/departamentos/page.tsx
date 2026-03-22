import { listDepartmentsAction } from "@/actions/departments";
import { DepartmentsTable } from "./components/departments-table";

export default async function DepartamentosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;

  const result = await listDepartmentsAction({
    search: params.search || undefined,
    is_active:
      params.is_active === "true"
        ? true
        : params.is_active === "false"
          ? false
          : undefined,
    page: params.page ? Number(params.page) : 1,
    per_page: 20,
  });

  if (!result.success) {
    return (
      <div className="rounded-lg border border-destructive/50 p-6 text-center text-sm text-destructive">
        Error al cargar los departamentos: {result.error}
      </div>
    );
  }

  return (
    <DepartmentsTable
      departments={result.data.departments}
      total={result.data.total}
      page={result.data.page}
      perPage={result.data.per_page}
    />
  );
}
