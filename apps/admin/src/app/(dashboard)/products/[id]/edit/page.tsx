import { notFound } from "next/navigation";
import { getProduct } from "@/actions/products";
import { PageTransition } from "@upds/ui";
import { ProductEditForm } from "../../_components/product-edit-form";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getProduct(id);
  if (!result.success) return notFound();

  return (
    <PageTransition>
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Editar Producto</h1>
      <ProductEditForm product={result.data} />
    </div>
    </PageTransition>
  );
}
