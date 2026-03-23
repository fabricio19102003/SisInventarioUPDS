import { PageTransition } from "@upds/ui";
import { OrderForm } from "../_components/order-form";

export default function NewManufactureOrderPage() {
  return (
    <PageTransition>
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Nueva Orden de Fabricación</h1>
      <OrderForm />
    </div>
    </PageTransition>
  );
}
