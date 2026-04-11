// ═══════════════════════════════════════════════════════════════════════════════
// NextAuth v5 — Configuracion principal
// Credentials provider con AuthService. JWT strategy.
// ═══════════════════════════════════════════════════════════════════════════════

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { headers } from "next/headers";
import { prisma } from "@upds/db";
import { AuthService } from "@upds/services";
import { parseForwardedIp } from "@upds/services";
import { loginSchema } from "@upds/validators";
import type { UserRole } from "@upds/validators";
import "./auth.types";

const authService = new AuthService(prisma);

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        const headersList = await headers();
        const auditCtx = {
          ip_address:
            parseForwardedIp(headersList.get("x-forwarded-for")) ??
            headersList.get("x-real-ip") ??
            null,
          user_agent: headersList.get("user-agent") ?? null,
        };

        const result = await authService.login(parsed.data, auditCtx);

        if (!result.success) {
          return null;
        }

        const user = result.data;

        return {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role as UserRole,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 horas
  },

  pages: {
    signIn: "/login",
  },

  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.email = user.email!;
        token.full_name = user.full_name;
        token.role = user.role;
      }
      return token;
    },

    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.email = token.email as string;
      session.user.full_name = token.full_name as string;
      session.user.role = token.role as UserRole;
      return session;
    },
  },
});
