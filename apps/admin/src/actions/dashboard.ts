"use server";

import { auth } from "@/lib/auth";
import { serialize } from "@/lib/serialize";
import { prisma } from "@upds/db";
import { DashboardService } from "@upds/services";

export async function getDashboardStats() {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "No autorizado" };

  const service = new DashboardService(prisma);
  return serialize(await service.getStats());
}
