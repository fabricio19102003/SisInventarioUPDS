// ═══════════════════════════════════════════════════════════════════════════════
// @upds/services — Servicio de Fabricantes
// CRUD talleres externos de indumentaria medica.
// ═══════════════════════════════════════════════════════════════════════════════

import { type PrismaClient, type TransactionClient } from "@upds/db";
import {
  createManufacturerSchema,
  updateManufacturerSchema,
  manufacturerFiltersSchema,
} from "@upds/validators";
import { createAuditLog, diffValues } from "./audit";
import type { ServiceResult, AuditContext } from "./auth";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

const MANUFACTURER_SELECT = {
  id: true,
  name: true,
  contact_name: true,
  phone: true,
  email: true,
  address: true,
  is_active: true,
  created_at: true,
  updated_at: true,
} as const;

export interface ManufacturerData {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Servicio
// ─────────────────────────────────────────────────────────────────────────────

export class ManufacturerService {
  constructor(private readonly db: PrismaClient) {}

  async create(
    input: unknown,
    userId: string,
    ctx?: AuditContext,
  ): Promise<ServiceResult<ManufacturerData>> {
    const parsed = createManufacturerSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? "Datos invalidos",
      };
    }

    const data = parsed.data;

    const manufacturer = await this.db.$transaction(
      async (tx: TransactionClient) => {
        const created = await tx.manufacturer.create({
          data: {
            name: data.name,
            contact_name: data.contact_name ?? null,
            phone: data.phone ?? null,
            email: data.email ?? null,
            address: data.address ?? null,
          },
          select: MANUFACTURER_SELECT,
        });

        await createAuditLog(tx, {
          user_id: userId,
          action: "CREATE",
          entity_type: "MANUFACTURER",
          entity_id: created.id,
          new_values: { name: created.name },
          ip_address: ctx?.ip_address,
          user_agent: ctx?.user_agent,
        });

        return created;
      },
    );

    return { success: true, data: manufacturer as ManufacturerData };
  }

  async update(
    input: unknown,
    userId: string,
    ctx?: AuditContext,
  ): Promise<ServiceResult<ManufacturerData>> {
    const parsed = updateManufacturerSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? "Datos invalidos",
      };
    }

    const { id, ...data } = parsed.data;

    const current = await this.db.manufacturer.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        contact_name: true,
        phone: true,
        email: true,
        address: true,
        is_active: true,
      },
    });

    if (!current) {
      return { success: false, error: "Fabricante no encontrado" };
    }

    if (!current.is_active) {
      return {
        success: false,
        error: "No se puede editar un fabricante desactivado",
      };
    }

    const changes = diffValues(
      {
        name: current.name,
        contact_name: current.contact_name,
        phone: current.phone,
        email: current.email,
        address: current.address,
      },
      {
        name: data.name,
        contact_name: data.contact_name ?? null,
        phone: data.phone ?? null,
        email: data.email ?? null,
        address: data.address ?? null,
      },
    );

    const updated = await this.db.$transaction(
      async (tx: TransactionClient) => {
        const result = await tx.manufacturer.update({
          where: { id },
          data: {
            name: data.name,
            contact_name: data.contact_name ?? null,
            phone: data.phone ?? null,
            email: data.email ?? null,
            address: data.address ?? null,
          },
          select: MANUFACTURER_SELECT,
        });

        await createAuditLog(tx, {
          user_id: userId,
          action: "UPDATE",
          entity_type: "MANUFACTURER",
          entity_id: id,
          old_values: changes?.old ?? null,
          new_values: changes?.new ?? null,
          ip_address: ctx?.ip_address,
          user_agent: ctx?.user_agent,
        });

        return result;
      },
    );

    return { success: true, data: updated as ManufacturerData };
  }

  async deactivate(
    manufacturerId: string,
    userId: string,
    ctx?: AuditContext,
  ): Promise<ServiceResult<ManufacturerData>> {
    const current = await this.db.manufacturer.findUnique({
      where: { id: manufacturerId },
      select: { id: true, is_active: true },
    });

    if (!current) {
      return { success: false, error: "Fabricante no encontrado" };
    }

    if (!current.is_active) {
      return { success: false, error: "El fabricante ya esta desactivado" };
    }

    // Verificar que no tiene ordenes pendientes o en progreso
    const activeOrders = await this.db.manufactureOrder.count({
      where: {
        manufacturer_id: manufacturerId,
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
    });

    if (activeOrders > 0) {
      return {
        success: false,
        error:
          "No se puede desactivar un fabricante con ordenes pendientes o en progreso",
      };
    }

    const updated = await this.db.$transaction(
      async (tx: TransactionClient) => {
        const result = await tx.manufacturer.update({
          where: { id: manufacturerId },
          data: { is_active: false },
          select: MANUFACTURER_SELECT,
        });

        await createAuditLog(tx, {
          user_id: userId,
          action: "DELETE",
          entity_type: "MANUFACTURER",
          entity_id: manufacturerId,
          old_values: { is_active: true },
          new_values: { is_active: false },
          ip_address: ctx?.ip_address,
          user_agent: ctx?.user_agent,
        });

        return result;
      },
    );

    return { success: true, data: updated as ManufacturerData };
  }

  async getById(id: string): Promise<ServiceResult<ManufacturerData>> {
    const manufacturer = await this.db.manufacturer.findUnique({
      where: { id },
      select: MANUFACTURER_SELECT,
    });

    if (!manufacturer) {
      return { success: false, error: "Fabricante no encontrado" };
    }

    return { success: true, data: manufacturer as ManufacturerData };
  }

  async list(input?: unknown): Promise<
    ServiceResult<{
      manufacturers: ManufacturerData[];
      total: number;
      page: number;
      per_page: number;
    }>
  > {
    const parsed = manufacturerFiltersSchema.safeParse(input ?? {});
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? "Filtros invalidos",
      };
    }

    const { search, is_active, page, per_page } = parsed.data;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    if (is_active !== undefined) where.is_active = is_active;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { contact_name: { contains: search, mode: "insensitive" } },
      ];
    }

    const [manufacturers, total] = await this.db.$transaction([
      this.db.manufacturer.findMany({
        where,
        select: MANUFACTURER_SELECT,
        orderBy: { name: "asc" },
        skip: (page - 1) * per_page,
        take: per_page,
      }),
      this.db.manufacturer.count({ where }),
    ]);

    return {
      success: true,
      data: {
        manufacturers: manufacturers as ManufacturerData[],
        total,
        page,
        per_page,
      },
    };
  }
}
