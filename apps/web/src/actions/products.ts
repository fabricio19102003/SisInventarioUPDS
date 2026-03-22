"use server";

import { prisma } from "@upds/db";
import { ProductService } from "@upds/services";
import { requirePermission } from "@/lib/session";

const productService = new ProductService(prisma);

export async function createProductAction(input: unknown) {
  const session = await requirePermission("product:create");
  return productService.createProduct(input, session.id);
}

export async function updateProductAction(input: unknown) {
  const session = await requirePermission("product:edit");
  return productService.updateProduct(input, session.id);
}

export async function deactivateProductAction(productId: string) {
  const session = await requirePermission("product:deactivate");
  return productService.deactivateProduct(productId, session.id);
}

export async function reactivateProductAction(productId: string) {
  const session = await requirePermission("product:deactivate");
  return productService.reactivateProduct(productId, session.id);
}

export async function addVariantAction(input: unknown) {
  const session = await requirePermission("product:create");
  return productService.addVariant(input, session.id);
}

export async function deactivateVariantAction(variantId: string) {
  const session = await requirePermission("product:deactivate");
  return productService.deactivateVariant(variantId, session.id);
}

export async function reactivateVariantAction(variantId: string) {
  const session = await requirePermission("product:deactivate");
  return productService.reactivateVariant(variantId, session.id);
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
