import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-upds-navy via-upds-navy-600 to-upds-sky-700 px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            UPDS Inventario
          </h1>
          <p className="mt-2 text-sm text-upds-light-200">
            Panel de Administracion
          </p>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
