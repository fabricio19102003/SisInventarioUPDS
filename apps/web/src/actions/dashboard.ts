"use server";

import { prisma } from "@upds/db";
import { DashboardService } from "@upds/services";
import { requirePermission } from "@/lib/session";

const dashboardService = new DashboardService(prisma);

export async function getDashboardStatsAction() {
  await requirePermission("stock:view");
  return dashboardService.getStats();
}
