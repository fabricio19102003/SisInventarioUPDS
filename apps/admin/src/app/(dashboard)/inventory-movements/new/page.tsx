import { MovementForm } from "../_components/movement-form";

export default function NewMovementPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Nuevo Movimiento de Inventario</h1>
      <MovementForm />
    </div>
  );
}
