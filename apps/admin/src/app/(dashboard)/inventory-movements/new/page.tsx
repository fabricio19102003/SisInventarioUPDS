import { PageTransition } from "@upds/ui";
import { MovementForm } from "../_components/movement-form";

export default function NewMovementPage() {
  return (
    <PageTransition>
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Nuevo Movimiento de Inventario</h1>
      <MovementForm />
    </div>
    </PageTransition>
  );
}
