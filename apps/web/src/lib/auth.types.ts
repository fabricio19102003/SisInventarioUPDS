// ═══════════════════════════════════════════════════════════════════════════════
// NextAuth v5 — Augmentacion de tipos
// Extiende los tipos de NextAuth para incluir campos custom del sistema.
// ═══════════════════════════════════════════════════════════════════════════════

import type { UserRole } from "@upds/validators";

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      full_name: string;
      role: UserRole;
    };
  }

  interface JWT {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
  }
}
