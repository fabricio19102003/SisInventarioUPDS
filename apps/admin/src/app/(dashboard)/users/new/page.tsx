import { UserForm } from "../_components/user-form";

export default function NewUserPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Nuevo Usuario</h1>
      <UserForm />
    </div>
  );
}
