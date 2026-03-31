"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@upds/db";
import { ProductService } from "@upds/services";
import { revalidatePath } from "next/cache";
import type {
  ProductFiltersInput,
  CreateProductInput,
  UpdateProductInput,
  AddVariantInput,
} from "@upds/validators";

export async function getProducts(filters?: ProductFiltersInput) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "No autorizado" };

  const service = new ProductService(prisma);
  return service.listProducts(filters);
}

export async function getProduct(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "No autorizado" };

  const service = new ProductService(prisma);
  return service.getProductById(id);
}

export async function createProduct(data: CreateProductInput) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "No autorizado" };

  const service = new ProductService(prisma);
  const result = await service.createProduct(data, session.user.id);

  if (result.success) {
    revalidatePath("/products");
  }

  return result;
}

export async function updateProduct(data: UpdateProductInput) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "No autorizado" };

  const service = new ProductService(prisma);
  const result = await service.updateProduct(data, session.user.id);

  if (result.success) {
    revalidatePath("/products");
    revalidatePath(`/products/${data.id}`);
  }

  return result;
}

export async function deactivateProduct(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "No autorizado" };

  const service = new ProductService(prisma);
  const result = await service.deactivateProduct(id, session.user.id);

  if (result.success) {
    revalidatePath("/products");
    revalidatePath(`/products/${id}`);
  }

  return result;
}

export async function reactivateProduct(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "No autorizado" };

  const service = new ProductService(prisma);
  const result = await service.reactivateProduct(id, session.user.id);

  if (result.success) {
    revalidatePath("/products");
    revalidatePath(`/products/${id}`);
  }

  return result;
}

export async function addVariant(data: AddVariantInput) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "No autorizado" };

  const service = new ProductService(prisma);
  const result = await service.addVariant(data, session.user.id);

  if (result.success) {
    revalidatePath("/products");
    revalidatePath(`/products/${data.product_id}`);
  }

  return result;
}

export async function deactivateVariant(variantId: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "No autorizado" };

  const service = new ProductService(prisma);
  const result = await service.deactivateVariant(variantId, session.user.id);

  if (result.success) {
    revalidatePath("/products");
  }

  return result;
}

export async function reactivateVariant(variantId: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "No autorizado" };

  const service = new ProductService(prisma);
  const result = await service.reactivateVariant(variantId, session.user.id);

  if (result.success) {
    revalidatePath("/products");
  }

  return result;
}

export async function getLowStockAlerts() {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "No autorizado" };

  const service = new ProductService(prisma);
  return service.getLowStockAlerts();
}
