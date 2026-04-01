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
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
  }
}
