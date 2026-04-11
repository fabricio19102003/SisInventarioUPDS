"use server";

import { prisma } from "@upds/db";
import { InventoryMovementService, ProductService } from "@upds/services";
import { requirePermission } from "@/lib/session";
import { getAuditContext } from "@/lib/audit-context";

interface LoadInitialStockInput {
  product_variant_id: string;
  quantity: number;
  notes: string;
}

const productService = new ProductService(prisma);

export async function createProductAction(input: unknown) {
  const session = await requirePermission("product:create");
  const auditCtx = await getAuditContext();
  return productService.createProduct(input, session.id, auditCtx);
}

export async function updateProductAction(input: unknown) {
  const session = await requirePermission("product:edit");
  const auditCtx = await getAuditContext();
  return productService.updateProduct(input, session.id, auditCtx);
}

export async function deactivateProductAction(productId: string) {
  const session = await requirePermission("product:deactivate");
  const auditCtx = await getAuditContext();
  return productService.deactivateProduct(productId, session.id, auditCtx);
}

export async function reactivateProductAction(productId: string) {
  const session = await requirePermission("product:deactivate");
  const auditCtx = await getAuditContext();
  return productService.reactivateProduct(productId, session.id, auditCtx);
}

export async function addVariantAction(input: unknown) {
  const session = await requirePermission("product:create");
  const auditCtx = await getAuditContext();
  return productService.addVariant(input, session.id, auditCtx);
}

export async function loadInitialStockAction(input: LoadInitialStockInput) {
  const session = await requirePermission("movement:create");
  await requirePermission("movement:confirm");
  const auditCtx = await getAuditContext();

  const variant = await prisma.productVariant.findUnique({
    where: { id: input.product_variant_id },
    select: { id: true, product_id: true, is_active: true },
  });

  if (!variant) {
    return { success: false as const, error: "Variante no encontrada" };
  }

  if (!variant.is_active) {
    return { success: false as const, error: "La variante está desactivada" };
  }

  const movementService = new InventoryMovementService(prisma);

  return prisma
    .$transaction(async (tx) => {
      const created = await movementService.createMovement(
        {
          movement_type: "ADJUSTMENT",
          notes: input.notes,
        },
        session.id,
        auditCtx,
        tx,
      );

      if (!created.success) {
        throw new Error(created.error);
      }

      const withItem = await movementService.addItem(
        {
          movement_id: created.data.id,
          product_variant_id: input.product_variant_id,
          quantity: input.quantity,
          unit_price: 0,
        },
        session.id,
        auditCtx,
        tx,
      );

      if (!withItem.success) {
        throw new Error(withItem.error);
      }

      const confirmed = await movementService.confirmMovement(
        { movement_id: created.data.id },
        session.id,
        auditCtx,
        tx,
      );

      if (!confirmed.success) {
        throw new Error(confirmed.error);
      }

      return confirmed;
    })
    .catch((error: unknown) => ({
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo cargar el stock inicial",
    }));
}

export async function deactivateVariantAction(variantId: string) {
  const session = await requirePermission("product:deactivate");
  const auditCtx = await getAuditContext();
  return productService.deactivateVariant(variantId, session.id, auditCtx);
}

export async function reactivateVariantAction(variantId: string) {
  const session = await requirePermission("product:deactivate");
  const auditCtx = await getAuditContext();
  return productService.reactivateVariant(variantId, session.id, auditCtx);
}

export async function getProductByIdAction(productId: string) {
  await requirePermission("product:view");
  return productService.getProductById(productId);
}

export async function listProductsAction(input?: unknown) {
  await requirePermission("product:view");
  return productService.listProducts(input);
}

export async function getLowStockAlertsAction() {
  await requirePermission("stock:view");
  return productService.getLowStockAlerts();
}
