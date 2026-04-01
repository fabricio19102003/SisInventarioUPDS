// ═══════════════════════════════════════════════════════════════════════════════
// @upds/services — Servicio de Productos y Variantes
// CRUD productos, agregar variantes, alertas de stock bajo.
// El stock vive en ProductVariant, nunca en Product.
// Campos inmutables post-creacion: sku, category, garment_type, warehouse_area.
// ═══════════════════════════════════════════════════════════════════════════════

import { type PrismaClient, type TransactionClient } from "@upds/db";
import {
  createProductSchema,
  updateProductSchema,
  addVariantSchema,
  productFiltersSchema,
} from "@upds/validators";
import { createAuditLog, diffValues } from "./audit";
import type { ServiceResult, AuditContext } from "./auth";

// ─────────────────────────────────────────────────────────────────────────────
// Selects reutilizables
// ─────────────────────────────────────────────────────────────────────────────

const VARIANT_SELECT = {
  id: true,
  product_id: true,
  sku_suffix: true,
  size: true,
  gender: true,
  color: true,
  current_stock: true,
  is_active: true,
  created_at: true,
  updated_at: true,
} as const;

const PRODUCT_SELECT = {
  id: true,
  sku: true,
  name: true,
  description: true,
  category: true,
  garment_type: true,
  warehouse_area: true,
  min_stock: true,
  is_active: true,
  created_at: true,
  updated_at: true,
  variants: {
    select: VARIANT_SELECT,
    orderBy: { created_at: "asc" as const },
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Tipos de respuesta
// ─────────────────────────────────────────────────────────────────────────────

export interface ProductVariantData {
  id: string;
  product_id: string;
  sku_suffix: string;
  size: string | null;
  gender: string | null;
  color: string | null;
  current_stock: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ProductData {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string;
  garment_type: string | null;
  warehouse_area: string;
  min_stock: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  variants: ProductVariantData[];
}

export interface LowStockAlert {
  product_id: string;
  product_name: string;
  product_sku: string;
  min_stock: number;
  variant_id: string;
  variant_sku_suffix: string;
  size: string | null;
  gender: string | null;
  color: string | null;
  current_stock: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilidades
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Genera el sku_suffix para una variante medica.
 * Formato: TALLA-GENERO-COLOR (ej: "M-MASCULINO-AZUL")
 */
function generateMedicalSkuSuffix(
  size: string,
  gender: string,
  color: string,
): string {
  return `${size}-${gender}-${color.toUpperCase().replace(/\s+/g, "_")}`;
}

/**
 * Genera el sku_suffix para la variante unica de oficina.
 */
function generateOfficeSkuSuffix(): string {
  return "DEFAULT";
}

function hasNonZeroInitialStock(data: {
  category: string;
  variants?: Array<{ initial_stock: number }>;
  initial_stock?: number;
}): boolean {
  if (data.category === "MEDICAL_GARMENT") {
    return (data.variants ?? []).some((variant) => variant.initial_stock > 0);
  }

  return (data.initial_stock ?? 0) > 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Servicio
// ─────────────────────────────────────────────────────────────────────────────

export class ProductService {
  constructor(private readonly db: PrismaClient) {}

  // ─────────────────────────────────────────────────────────────────────────
  // CREAR PRODUCTO
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Crea un producto con sus variantes en una transaccion atomica.
   *
   * MEDICAL_GARMENT: Crea N variantes (talla + genero + color).
   * OFFICE_SUPPLY: Crea 1 variante con size/gender/color en null.
   */
  async createProduct(
    input: unknown,
    userId: string,
    ctx?: AuditContext,
  ): Promise<ServiceResult<ProductData>> {
    const parsed = createProductSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? "Datos invalidos",
      };
    }

    const data = parsed.data;

    // Verificar SKU unico
    const existingSku = await this.db.product.findUnique({
      where: { sku: data.sku },
      select: { id: true },
    });

    if (existingSku) {
      return { success: false, error: "Ya existe un producto con ese SKU" };
    }

    // Verificar duplicados de variantes medicas (misma combinacion talla+genero+color)
    if (data.category === "MEDICAL_GARMENT" && data.variants) {
      const seen = new Set<string>();
      for (const v of data.variants) {
        const key = `${v.size}-${v.gender}-${v.color.toUpperCase().trim()}`;
        if (seen.has(key)) {
          return {
            success: false,
            error: `Variante duplicada: ${v.size} / ${v.gender} / ${v.color}`,
          };
        }
        seen.add(key);
      }
    }

    if (hasNonZeroInitialStock(data)) {
      return {
        success: false,
        error:
          "El producto debe crearse con stock 0. Para cargar existencias iniciales use un movimiento de ajuste o entrada.",
      };
    }

    const product = await this.db.$transaction(
      async (tx: TransactionClient) => {
        // Crear producto
        const newProduct = await tx.product.create({
          data: {
            sku: data.sku,
            name: data.name,
            description: data.description ?? null,
            category: data.category,
            garment_type: data.garment_type ?? null,
            warehouse_area: data.warehouse_area,
            min_stock: data.min_stock,
          },
        });

        // Crear variantes segun categoria
        if (data.category === "MEDICAL_GARMENT" && data.variants) {
          for (const v of data.variants) {
            const skuSuffix = generateMedicalSkuSuffix(
              v.size,
              v.gender,
              v.color,
            );
            await tx.productVariant.create({
              data: {
                product_id: newProduct.id,
                sku_suffix: skuSuffix,
                size: v.size,
                gender: v.gender,
                color: v.color,
                current_stock: 0,
              },
            });
          }
        } else {
          // OFFICE_SUPPLY: una sola variante sin talla/genero/color
          await tx.productVariant.create({
            data: {
              product_id: newProduct.id,
              sku_suffix: generateOfficeSkuSuffix(),
              size: null,
              gender: null,
              color: null,
              current_stock: 0,
            },
          });
        }

        // Leer producto completo con variantes
        const fullProduct = await tx.product.findUniqueOrThrow({
          where: { id: newProduct.id },
          select: PRODUCT_SELECT,
        });

        // Audit log
        await createAuditLog(tx, {
          user_id: userId,
          action: "CREATE",
          entity_type: "PRODUCT",
          entity_id: newProduct.id,
          new_values: {
            sku: fullProduct.sku,
            name: fullProduct.name,
            category: fullProduct.category,
            garment_type: fullProduct.garment_type,
            warehouse_area: fullProduct.warehouse_area,
            variants_count: fullProduct.variants.length,
          },
          ip_address: ctx?.ip_address,
          user_agent: ctx?.user_agent,
        });

        return fullProduct;
      },
    );

    return { success: true, data: product as ProductData };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ACTUALIZAR PRODUCTO
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Actualiza campos editables: name, description, min_stock.
   * Los campos inmutables (sku, category, garment_type, warehouse_area) NO se tocan.
   */
  async updateProduct(
    input: unknown,
    userId: string,
    ctx?: AuditContext,
  ): Promise<ServiceResult<ProductData>> {
    const parsed = updateProductSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? "Datos invalidos",
      };
    }

    const { id, name, description, min_stock } = parsed.data;

    const currentProduct = await this.db.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        min_stock: true,
        is_active: true,
      },
    });

    if (!currentProduct) {
      return { success: false, error: "Producto no encontrado" };
    }

    if (!currentProduct.is_active) {
      return {
        success: false,
        error: "No se puede editar un producto desactivado",
      };
    }

    const changes = diffValues(
      {
        name: currentProduct.name,
        description: currentProduct.description,
        min_stock: currentProduct.min_stock,
      },
      { name, description: description ?? null, min_stock },
    );

    const updatedProduct = await this.db.$transaction(
      async (tx: TransactionClient) => {
        const product = await tx.product.update({
          where: { id },
          data: { name, description: description ?? null, min_stock },
          select: PRODUCT_SELECT,
        });

        await createAuditLog(tx, {
          user_id: userId,
          action: "UPDATE",
          entity_type: "PRODUCT",
          entity_id: id,
          old_values: changes?.old ?? null,
          new_values: changes?.new ?? null,
          ip_address: ctx?.ip_address,
          user_agent: ctx?.user_agent,
        });

        return product;
      },
    );

    return { success: true, data: updatedProduct as ProductData };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DESACTIVAR PRODUCTO (Soft Delete)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Desactiva un producto y todas sus variantes.
   * No se permite si tiene variantes con stock > 0 (debe hacerse baja primero).
   */
  async deactivateProduct(
    productId: string,
    userId: string,
    ctx?: AuditContext,
  ): Promise<ServiceResult<ProductData>> {
    const product = await this.db.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        is_active: true,
        variants: {
          select: { id: true, current_stock: true, is_active: true },
        },
      },
    });

    if (!product) {
      return { success: false, error: "Producto no encontrado" };
    }

    if (!product.is_active) {
      return { success: false, error: "El producto ya esta desactivado" };
    }

    // Verificar que no tiene stock activo
    const hasStock = product.variants.some(
      (v: { is_active: boolean; current_stock: number }) =>
        v.is_active && v.current_stock > 0,
    );
    if (hasStock) {
      return {
        success: false,
        error:
          "No se puede desactivar un producto con stock. Realice una baja de inventario primero.",
      };
    }

    const updatedProduct = await this.db.$transaction(
      async (tx: TransactionClient) => {
        // Desactivar todas las variantes
        await tx.productVariant.updateMany({
          where: { product_id: productId },
          data: { is_active: false },
        });

        // Desactivar el producto
        const result = await tx.product.update({
          where: { id: productId },
          data: { is_active: false },
          select: PRODUCT_SELECT,
        });

        await createAuditLog(tx, {
          user_id: userId,
          action: "DELETE",
          entity_type: "PRODUCT",
          entity_id: productId,
          old_values: { is_active: true },
          new_values: { is_active: false },
          ip_address: ctx?.ip_address,
          user_agent: ctx?.user_agent,
        });

        return result;
      },
    );

    return { success: true, data: updatedProduct as ProductData };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // REACTIVAR PRODUCTO
  // ─────────────────────────────────────────────────────────────────────────

  async reactivateProduct(
    productId: string,
    userId: string,
    ctx?: AuditContext,
  ): Promise<ServiceResult<ProductData>> {
    const product = await this.db.product.findUnique({
      where: { id: productId },
      select: { id: true, is_active: true },
    });

    if (!product) {
      return { success: false, error: "Producto no encontrado" };
    }

    if (product.is_active) {
      return { success: false, error: "El producto ya esta activo" };
    }

    const updatedProduct = await this.db.$transaction(
      async (tx: TransactionClient) => {
        const result = await tx.product.update({
          where: { id: productId },
          data: { is_active: true },
          select: PRODUCT_SELECT,
        });

        await createAuditLog(tx, {
          user_id: userId,
          action: "UPDATE",
          entity_type: "PRODUCT",
          entity_id: productId,
          old_values: { is_active: false },
          new_values: { is_active: true },
          ip_address: ctx?.ip_address,
          user_agent: ctx?.user_agent,
        });

        return result;
      },
    );

    return { success: true, data: updatedProduct as ProductData };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // AGREGAR VARIANTE A PRODUCTO EXISTENTE
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Agrega una nueva variante a un producto MEDICAL_GARMENT.
   * No se puede agregar variantes a OFFICE_SUPPLY (ya tiene su unica variante).
   */
  async addVariant(
    input: unknown,
    userId: string,
    ctx?: AuditContext,
  ): Promise<ServiceResult<ProductVariantData>> {
    const parsed = addVariantSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? "Datos invalidos",
      };
    }

    const { product_id, size, gender, color, initial_stock } = parsed.data;

    if (initial_stock > 0) {
      return {
        success: false,
        error:
          "La variante debe crearse con stock 0. Para cargar existencias iniciales use un movimiento de ajuste o entrada.",
      };
    }

    const product = await this.db.product.findUnique({
      where: { id: product_id },
      select: { id: true, category: true, is_active: true },
    });

    if (!product) {
      return { success: false, error: "Producto no encontrado" };
    }

    if (!product.is_active) {
      return {
        success: false,
        error: "No se puede agregar variantes a un producto desactivado",
      };
    }

    if (product.category !== "MEDICAL_GARMENT") {
      return {
        success: false,
        error:
          "Solo se pueden agregar variantes a productos de indumentaria medica",
      };
    }

    const skuSuffix = generateMedicalSkuSuffix(size, gender, color);

    // Verificar que no exista la combinacion
    const existingVariant = await this.db.productVariant.findUnique({
      where: {
        product_id_sku_suffix: { product_id, sku_suffix: skuSuffix },
      },
      select: { id: true },
    });

    if (existingVariant) {
      return {
        success: false,
        error: `Ya existe una variante con esa combinacion: ${size} / ${gender} / ${color}`,
      };
    }

    const newVariant = await this.db.$transaction(
      async (tx: TransactionClient) => {
        const variant = await tx.productVariant.create({
          data: {
            product_id,
            sku_suffix: skuSuffix,
            size,
            gender,
            color,
            current_stock: 0,
          },
          select: VARIANT_SELECT,
        });

        await createAuditLog(tx, {
          user_id: userId,
          action: "CREATE",
          entity_type: "PRODUCT_VARIANT",
          entity_id: variant.id,
          new_values: {
            product_id,
            sku_suffix: skuSuffix,
            size,
            gender,
            color,
            initial_stock: 0,
          },
          ip_address: ctx?.ip_address,
          user_agent: ctx?.user_agent,
        });

        return variant;
      },
    );

    return { success: true, data: newVariant as ProductVariantData };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DESACTIVAR VARIANTE
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Desactiva una variante especifica. No se permite si tiene stock > 0.
   */
  async deactivateVariant(
    variantId: string,
    userId: string,
    ctx?: AuditContext,
  ): Promise<ServiceResult<ProductVariantData>> {
    const variant = await this.db.productVariant.findUnique({
      where: { id: variantId },
      select: { id: true, is_active: true, current_stock: true },
    });

    if (!variant) {
      return { success: false, error: "Variante no encontrada" };
    }

    if (!variant.is_active) {
      return { success: false, error: "La variante ya esta desactivada" };
    }

    if (variant.current_stock > 0) {
      return {
        success: false,
        error:
          "No se puede desactivar una variante con stock. Realice una baja de inventario primero.",
      };
    }

    const updatedVariant = await this.db.$transaction(
      async (tx: TransactionClient) => {
        const result = await tx.productVariant.update({
          where: { id: variantId },
          data: { is_active: false },
          select: VARIANT_SELECT,
        });

        await createAuditLog(tx, {
          user_id: userId,
          action: "DELETE",
          entity_type: "PRODUCT_VARIANT",
          entity_id: variantId,
          old_values: { is_active: true },
          new_values: { is_active: false },
          ip_address: ctx?.ip_address,
          user_agent: ctx?.user_agent,
        });

        return result;
      },
    );

    return { success: true, data: updatedVariant as ProductVariantData };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // REACTIVAR VARIANTE
  // ─────────────────────────────────────────────────────────────────────────

  async reactivateVariant(
    variantId: string,
    userId: string,
    ctx?: AuditContext,
  ): Promise<ServiceResult<ProductVariantData>> {
    const variant = await this.db.productVariant.findUnique({
      where: { id: variantId },
      select: {
        id: true,
        is_active: true,
        product: { select: { is_active: true } },
      },
    });

    if (!variant) {
      return { success: false, error: "Variante no encontrada" };
    }

    if (variant.is_active) {
      return { success: false, error: "La variante ya esta activa" };
    }

    if (!variant.product.is_active) {
      return {
        success: false,
        error: "No se puede reactivar una variante de un producto desactivado",
      };
    }

    const updatedVariant = await this.db.$transaction(
      async (tx: TransactionClient) => {
        const result = await tx.productVariant.update({
          where: { id: variantId },
          data: { is_active: true },
          select: VARIANT_SELECT,
        });

        await createAuditLog(tx, {
          user_id: userId,
          action: "UPDATE",
          entity_type: "PRODUCT_VARIANT",
          entity_id: variantId,
          old_values: { is_active: false },
          new_values: { is_active: true },
          ip_address: ctx?.ip_address,
          user_agent: ctx?.user_agent,
        });

        return result;
      },
    );

    return { success: true, data: updatedVariant as ProductVariantData };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // OBTENER PRODUCTO POR ID
  // ─────────────────────────────────────────────────────────────────────────

  async getProductById(productId: string): Promise<ServiceResult<ProductData>> {
    const product = await this.db.product.findUnique({
      where: { id: productId },
      select: PRODUCT_SELECT,
    });

    if (!product) {
      return { success: false, error: "Producto no encontrado" };
    }

    return { success: true, data: product as ProductData };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LISTAR PRODUCTOS CON FILTROS Y PAGINACION
  // ─────────────────────────────────────────────────────────────────────────

  async listProducts(input?: unknown): Promise<
    ServiceResult<{
      products: ProductData[];
      total: number;
      page: number;
      per_page: number;
    }>
  > {
    const parsed = productFiltersSchema.safeParse(input ?? {});
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? "Filtros invalidos",
      };
    }

    const {
      search,
      category,
      garment_type,
      warehouse_area,
      is_active,
      low_stock,
      page,
      per_page,
    } = parsed.data;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma where types; values validated by Zod
    const where: Record<string, any> = {};

    if (category) where.category = category;
    if (garment_type) where.garment_type = garment_type;
    if (warehouse_area) where.warehouse_area = warehouse_area;
    if (is_active !== undefined) where.is_active = is_active;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ];
    }

    // Para low_stock, obtenemos todos los productos que coincidan con los
    // demas filtros y luego filtramos en aplicacion (comparacion cross-field
    // current_stock < min_stock no es posible directamente en Prisma)
    if (low_stock) {
      const allProducts = await this.db.product.findMany({
        where,
        select: PRODUCT_SELECT,
        orderBy: { created_at: "desc" },
      });

      const filtered = allProducts.filter(
        (p: {
          min_stock: number;
          variants: Array<{ is_active: boolean; current_stock: number }>;
        }) =>
          p.variants.some(
            (v: { is_active: boolean; current_stock: number }) =>
              v.is_active && v.current_stock < p.min_stock,
          ),
      );

      const total = filtered.length;
      const paginated = filtered.slice((page - 1) * per_page, page * per_page);

      return {
        success: true,
        data: {
          products: paginated as ProductData[],
          total,
          page,
          per_page,
        },
      };
    }

    const [products, total] = await this.db.$transaction([
      this.db.product.findMany({
        where,
        select: PRODUCT_SELECT,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * per_page,
        take: per_page,
      }),
      this.db.product.count({ where }),
    ]);

    return {
      success: true,
      data: { products: products as ProductData[], total, page, per_page },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ALERTAS DE STOCK BAJO
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Retorna todas las variantes activas cuyo current_stock < min_stock
   * del producto padre. Query en tiempo real, no tabla separada.
   */
  async getLowStockAlerts(): Promise<ServiceResult<LowStockAlert[]>> {
    const variants = await this.db.productVariant.findMany({
      where: {
        is_active: true,
        product: { is_active: true },
      },
      select: {
        id: true,
        sku_suffix: true,
        size: true,
        gender: true,
        color: true,
        current_stock: true,
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            min_stock: true,
          },
        },
      },
    });

    // Tipo inferido del query
    type VariantWithProduct = {
      id: string;
      sku_suffix: string;
      size: string | null;
      gender: string | null;
      color: string | null;
      current_stock: number;
      product: {
        id: string;
        name: string;
        sku: string;
        min_stock: number;
      };
    };

    // Filtrar en aplicacion: current_stock < product.min_stock
    const alerts: LowStockAlert[] = (variants as VariantWithProduct[])
      .filter((v) => v.current_stock < v.product.min_stock)
      .map((v) => ({
        product_id: v.product.id,
        product_name: v.product.name,
        product_sku: v.product.sku,
        min_stock: v.product.min_stock,
        variant_id: v.id,
        variant_sku_suffix: v.sku_suffix,
        size: v.size,
        gender: v.gender,
        color: v.color,
        current_stock: v.current_stock,
      }));

    return { success: true, data: alerts };
  }
}
