import { listDepartmentsAction } from "@/actions/departments";
import { requireAuth } from "@/lib/session";
import { PageTransition } from "@upds/ui";
import { DepartmentsTable } from "./components/departments-table";

export default async function DepartamentosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const [session, params] = await Promise.all([requireAuth(), searchParams]);

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
    <PageTransition>
      <DepartmentsTable
        departments={result.data.departments}
        total={result.data.total}
        page={result.data.page}
        perPage={result.data.per_page}
        userRole={session.role}
      />
    </PageTransition>
  );
}
