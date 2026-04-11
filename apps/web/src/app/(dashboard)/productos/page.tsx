import { listProductsAction } from "@/actions/products";
import { requireAuth } from "@/lib/session";
import { PageTransition } from "@upds/ui";
import { ProductsTable } from "./components/products-table";

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const [session, params] = await Promise.all([
    requireAuth(),
    searchParams,
  ]);

  const result = await listProductsAction({
    search: params.search || undefined,
    category: params.category || undefined,
    warehouse_area: params.warehouse_area || undefined,
    is_active:
      params.is_active === "true"
        ? true
        : params.is_active === "false"
          ? false
          : undefined,
    low_stock: params.low_stock === "true" ? true : undefined,
    page: params.page ? Number(params.page) : 1,
    per_page: 20,
  });

  if (!result.success) {
    return (
      <div className="rounded-lg border border-destructive/50 p-6 text-center text-sm text-destructive">
        Error al cargar los productos: {result.error}
      </div>
    );
  }

  return (
    <PageTransition>
      <ProductsTable
        products={result.data.products}
        total={result.data.total}
        page={result.data.page}
        perPage={result.data.per_page}
        userRole={session.role}
      />
    </PageTransition>
  );
}
