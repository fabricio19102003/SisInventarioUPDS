import { ProductForm } from "../_components/product-form";

export default function NewProductPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Nuevo Producto</h1>
      <ProductForm />
    </div>
  );
}
