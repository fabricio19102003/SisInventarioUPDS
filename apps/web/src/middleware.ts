// ═══════════════════════════════════════════════════════════════════════════════
// NextAuth v5 — Middleware de autenticacion
// Protege todas las rutas excepto las publicas (login, API auth).
// ═══════════════════════════════════════════════════════════════════════════════

export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: [
    /*
     * Protege todas las rutas EXCEPTO:
     * - /login (pagina de login)
     * - /api/auth/* (endpoints de NextAuth)
     * - /_next/* (assets de Next.js)
     * - /favicon.ico, /robots.txt, etc. (archivos estaticos)
     */
    "/((?!login|api/auth|_next/static|_next/image|favicon\\.ico|robots\\.txt).*)",
  ],
};
