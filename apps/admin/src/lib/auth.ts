import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@upds/db";
import { AuthService } from "@upds/services";
import { loginSchema } from "@upds/validators";

const authService = new AuthService(prisma);

export const { handlers, auth, signIn, signOut } = NextAuth({
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

        const result = await authService.login({
          email: parsed.data.email,
          password: parsed.data.password,
        });

        if (!result.success) {
          return null;
        }

        const user = result.data;

        return {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
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
        token.id = user.id as string;
        token.email = user.email as string;
        token.full_name = user.full_name;
        token.role = user.role;
      }

      return token;
    },

    async session({ session, token }) {
      session.user.id = token.id;
      session.user.email = token.email;
      session.user.full_name = token.full_name;
      session.user.role = token.role;

      return session;
    },
  },
});
