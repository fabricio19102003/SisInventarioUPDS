// @upds/db — Cliente Prisma y utilidades de base de datos

import { PrismaClient } from "@prisma/client";

// Patron singleton para evitar multiples instancias en desarrollo (hot reload).
// En produccion solo existira una instancia.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Re-exportar tipos generados por Prisma para uso en otros packages
export * from "@prisma/client";

/**
 * Tipo para el cliente de transaccion de Prisma.
 * Omite los metodos de transaccion/conexion para representar
 * el cliente que se recibe dentro de prisma.$transaction(async (tx) => ...).
 */
export type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;
