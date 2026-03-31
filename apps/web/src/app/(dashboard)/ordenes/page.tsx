import { listOrdersAction } from "@/actions/manufacture-orders";
import { listManufacturersAction } from "@/actions/manufacturers";
import { listProductsAction } from "@/actions/products";
import { PageTransition } from "@upds/ui";
import { OrdersTable } from "./components/orders-table";

export default async function OrdenesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;

  const [ordersResult, manufacturersResult, productsResult] = await Promise.all([
    listOrdersAction({
      search: params.search || undefined,
      status: params.status || undefined,
      manufacturer_id: params.manufacturer_id || undefined,
      date_from: params.date_from || undefined,
      date_to: params.date_to || undefined,
      page: params.page ? Number(params.page) : 1,
      per_page: 20,
    }),
    listManufacturersAction({ is_active: true, per_page: 200 }),
    listProductsAction({ is_active: true, per_page: 200 }),
  ]);

  if (!ordersResult.success) {
    return (
      <div className="rounded-lg border border-destructive/50 p-6 text-center text-sm text-destructive">
        Error al cargar las órdenes: {ordersResult.error}
      </div>
    );
  }

  return (
    <PageTransition>
      <OrdersTable
        orders={ordersResult.data.orders}
        total={ordersResult.data.total}
        page={ordersResult.data.page}
        perPage={ordersResult.data.per_page}
        manufacturers={manufacturersResult.success ? manufacturersResult.data.manufacturers : []}
        products={productsResult.success ? productsResult.data.products : []}
      />
    </PageTransition>
  );
}
