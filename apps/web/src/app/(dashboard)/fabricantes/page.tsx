import { listManufacturersAction } from "@/actions/manufacturers";
import { ManufacturersTable } from "./components/manufacturers-table";

export default async function FabricantesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;

  const result = await listManufacturersAction({
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
        Error al cargar los fabricantes: {result.error}
      </div>
    );
  }

  return (
    <ManufacturersTable
      manufacturers={result.data.manufacturers}
      total={result.data.total}
      page={result.data.page}
      perPage={result.data.per_page}
    />
  );
}
