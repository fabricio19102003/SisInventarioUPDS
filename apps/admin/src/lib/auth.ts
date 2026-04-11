import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { headers } from "next/headers";
import { prisma } from "@upds/db";
import { AuthService } from "@upds/services";
import { parseForwardedIp } from "@upds/services";
import { loginSchema } from "@upds/validators";
import type { UserRole } from "@upds/validators";
import "./auth.types";

const authService = new AuthService(prisma);

const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: "credentials",
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

        const result = await authService.login(
          {
            email: parsed.data.email,
            password: parsed.data.password,
          },
          auditCtx,
        );

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
  },

  pages: {
    signIn: "/login",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.email = user.email!;
        token.full_name = user.full_name;
        token.role = user.role;
      }

      return token;
    },

    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.email = token.email as string;
      session.user.full_name = token.full_name as string;
      session.user.role = token.role as UserRole;

      return session;
    },
  },
};

const nextAuthResult = NextAuth(authConfig);

export const handlers: typeof nextAuthResult.handlers = nextAuthResult.handlers;
export const auth: typeof nextAuthResult.auth = nextAuthResult.auth;
export const signIn: typeof nextAuthResult.signIn = nextAuthResult.signIn;
export const signOut: typeof nextAuthResult.signOut = nextAuthResult.signOut;
