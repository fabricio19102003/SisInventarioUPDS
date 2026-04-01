"use server";

import { requireAllPermissions, requirePermission } from "@/lib/session";
import { prisma } from "@upds/db";
import { InventoryMovementService, ProductService } from "@upds/services";
import { revalidatePath } from "next/cache";
import type {
  ProductFiltersInput,
  CreateProductInput,
  UpdateProductInput,
  AddVariantInput,
} from "@upds/validators";

interface LoadInitialStockInput {
  product_variant_id: string;
  quantity: number;
  notes: string;
}

export async function getProducts(filters?: Partial<ProductFiltersInput>) {
  await requirePermission("product:view");

  const service = new ProductService(prisma);
  return service.listProducts(filters);
}

export async function getProduct(id: string) {
  await requirePermission("product:view");

  const service = new ProductService(prisma);
  return service.getProductById(id);
}

export async function createProduct(data: CreateProductInput) {
  const session = await requirePermission("product:create");

  const service = new ProductService(prisma);
  const result = await service.createProduct(data, session.id);

  if (result.success) {
    revalidatePath("/products");
  }

  return result;
}

export async function updateProduct(data: UpdateProductInput) {
  const session = await requirePermission("product:edit");

  const service = new ProductService(prisma);
  const result = await service.updateProduct(data, session.id);

  if (result.success) {
    revalidatePath("/products");
    revalidatePath(`/products/${data.id}`);
  }

  return result;
}

export async function deactivateProduct(id: string) {
  const session = await requirePermission("product:deactivate");

  const service = new ProductService(prisma);
  const result = await service.deactivateProduct(id, session.id);

  if (result.success) {
    revalidatePath("/products");
    revalidatePath(`/products/${id}`);
  }

  return result;
}

export async function reactivateProduct(id: string) {
  const session = await requirePermission("product:deactivate");

  const service = new ProductService(prisma);
  const result = await service.reactivateProduct(id, session.id);

  if (result.success) {
    revalidatePath("/products");
    revalidatePath(`/products/${id}`);
  }

  return result;
}

export async function addVariant(data: AddVariantInput) {
  const session = await requirePermission("product:create");

  const service = new ProductService(prisma);
  const result = await service.addVariant(data, session.id);

  if (result.success) {
    revalidatePath("/products");
    revalidatePath(`/products/${data.product_id}`);
  }

  return result;
}

export async function loadInitialStock(data: LoadInitialStockInput) {
  const session = await requireAllPermissions([
    "movement:create",
    "movement:confirm",
  ]);

  const variant = await prisma.productVariant.findUnique({
    where: { id: data.product_variant_id },
    select: { id: true, product_id: true, is_active: true },
  });

  if (!variant) {
    return { success: false as const, error: "Variante no encontrada" };
  }

  if (!variant.is_active) {
    return { success: false as const, error: "La variante está desactivada" };
  }

  const movementService = new InventoryMovementService(prisma);

  const result = await prisma
    .$transaction(async (tx) => {
      const created = await movementService.createMovement(
        {
          movement_type: "ADJUSTMENT",
          notes: data.notes,
        },
        session.id,
        undefined,
        tx,
      );

      if (!created.success) {
        throw new Error(created.error);
      }

      const withItem = await movementService.addItem(
        {
          movement_id: created.data.id,
          product_variant_id: data.product_variant_id,
          quantity: data.quantity,
          unit_price: 0,
        },
        session.id,
        undefined,
        tx,
      );

      if (!withItem.success) {
        throw new Error(withItem.error);
      }

      const confirmed = await movementService.confirmMovement(
        { movement_id: created.data.id },
        session.id,
        undefined,
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

  if (result.success) {
    revalidatePath("/products");
    revalidatePath(`/products/${variant.product_id}`);
    revalidatePath("/inventory-movements");
  }

  return result;
}

export async function deactivateVariant(variantId: string) {
  const session = await requirePermission("product:deactivate");

  const service = new ProductService(prisma);
  const result = await service.deactivateVariant(variantId, session.id);

  if (result.success) {
    revalidatePath("/products");
  }

  return result;
}

export async function reactivateVariant(variantId: string) {
  const session = await requirePermission("product:deactivate");

  const service = new ProductService(prisma);
  const result = await service.reactivateVariant(variantId, session.id);

  if (result.success) {
    revalidatePath("/products");
  }

  return result;
}

export async function getLowStockAlerts() {
  await requirePermission("stock:view");

  const service = new ProductService(prisma);
  return service.getLowStockAlerts();
}
