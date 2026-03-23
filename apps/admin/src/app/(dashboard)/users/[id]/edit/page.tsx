import { notFound } from "next/navigation";
import { getUser } from "@/actions/users";
import { PageTransition } from "@upds/ui";
import { UserForm } from "../../_components/user-form";

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getUser(id);
  if (!result.success) return notFound();

  return (
    <PageTransition>
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Editar Usuario</h1>
      <UserForm user={result.data} />
    </div>
    </PageTransition>
  );
}
