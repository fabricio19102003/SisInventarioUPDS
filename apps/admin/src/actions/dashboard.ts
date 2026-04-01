"use server";

import { requirePermission } from "@/lib/session";
import { serialize } from "@/lib/serialize";
import { prisma } from "@upds/db";
import { DashboardService } from "@upds/services";

export async function getDashboardStats() {
  await requirePermission("stock:view");

  const service = new DashboardService(prisma);
  return serialize(await service.getStats());
}
