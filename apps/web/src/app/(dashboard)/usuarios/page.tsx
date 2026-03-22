import { listUsersAction } from "@/actions/auth";
import { UsersTable } from "./components/users-table";

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;

  const result = await listUsersAction({
    search: params.search || undefined,
    role: params.role || undefined,
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
        Error al cargar los usuarios: {result.error}
      </div>
    );
  }

  return (
    <UsersTable
      users={result.data.users}
      total={result.data.total}
      page={result.data.page}
      perPage={result.data.per_page}
    />
  );
}
