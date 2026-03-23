import { listMovementsAction } from "@/actions/inventory-movements";
import { listProductsAction } from "@/actions/products";
import { listRecipientsAction } from "@/actions/recipients";
import { listDepartmentsAction } from "@/actions/departments";
import { listOrdersAction } from "@/actions/manufacture-orders";
import { PageTransition } from "@upds/ui";
import { MovementsTable } from "./components/movements-table";

export default async function MovimientosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;

  const [
    movementsResult,
    productsResult,
    recipientsResult,
    departmentsResult,
    ordersResult,
  ] = await Promise.all([
    listMovementsAction({
      search: params.search || undefined,
      movement_type: params.movement_type || undefined,
      status: params.status || undefined,
      date_from: params.date_from || undefined,
      date_to: params.date_to || undefined,
      page: params.page ? Number(params.page) : 1,
      per_page: 20,
    }),
    listProductsAction({ is_active: true, per_page: 100 }),
    listRecipientsAction({ is_active: true, per_page: 200 }),
    listDepartmentsAction({ is_active: true, per_page: 100 }),
    listOrdersAction({ per_page: 100 }),
  ]);

  if (!movementsResult.success) {
    return (
      <div className="rounded-lg border border-destructive/50 p-6 text-center text-sm text-destructive">
        Error al cargar los movimientos: {movementsResult.error}
      </div>
    );
  }

  return (
    <PageTransition>
      <MovementsTable
        movements={movementsResult.data.movements}
        total={movementsResult.data.total}
        page={movementsResult.data.page}
        perPage={movementsResult.data.per_page}
        products={productsResult.success ? productsResult.data.products : []}
        recipients={recipientsResult.success ? recipientsResult.data.recipients : []}
        departments={departmentsResult.success ? departmentsResult.data.departments : []}
        orders={ordersResult.success ? ordersResult.data.orders : []}
      />
    </PageTransition>
  );
}
