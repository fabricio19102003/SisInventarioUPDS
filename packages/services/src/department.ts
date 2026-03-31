// ═══════════════════════════════════════════════════════════════════════════════
// @upds/services — Servicio de Departamentos
// CRUD departamentos internos de la universidad.
// Destinatarios de entregas de material de oficina (DEPARTMENT_DELIVERY).
// ═══════════════════════════════════════════════════════════════════════════════

import { type PrismaClient, type TransactionClient } from "@upds/db";
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  departmentFiltersSchema,
} from "@upds/validators";
import { createAuditLog, diffValues } from "./audit";
import type { ServiceResult, AuditContext } from "./auth";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

const DEPARTMENT_SELECT = {
  id: true,
  name: true,
  code: true,
  is_active: true,
  created_at: true,
  updated_at: true,
} as const;

export interface DepartmentData {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Servicio
// ─────────────────────────────────────────────────────────────────────────────

export class DepartmentService {
  constructor(private readonly db: PrismaClient) {}

  async create(
    input: unknown,
    userId: string,
    ctx?: AuditContext,
  ): Promise<ServiceResult<DepartmentData>> {
    const parsed = createDepartmentSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? "Datos invalidos",
      };
    }

    const data = parsed.data;

    // Verificar nombre unico
    const existingName = await this.db.department.findUnique({
      where: { name: data.name },
      select: { id: true },
    });

    if (existingName) {
      return {
        success: false,
        error: "Ya existe un departamento con ese nombre",
      };
    }

    // Verificar codigo unico
    const existingCode = await this.db.department.findUnique({
      where: { code: data.code },
      select: { id: true },
    });

    if (existingCode) {
      return {
        success: false,
        error: "Ya existe un departamento con ese codigo",
      };
    }

    const department = await this.db.$transaction(
      async (tx: TransactionClient) => {
        const created = await tx.department.create({
          data: { name: data.name, code: data.code },
          select: DEPARTMENT_SELECT,
        });

        await createAuditLog(tx, {
          user_id: userId,
          action: "CREATE",
          entity_type: "DEPARTMENT",
          entity_id: created.id,
          new_values: { name: created.name, code: created.code },
          ip_address: ctx?.ip_address,
          user_agent: ctx?.user_agent,
        });

        return created;
      },
    );

    return { success: true, data: department as DepartmentData };
  }

  async update(
    input: unknown,
    userId: string,
    ctx?: AuditContext,
  ): Promise<ServiceResult<DepartmentData>> {
    const parsed = updateDepartmentSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? "Datos invalidos",
      };
    }

    const { id, name, code } = parsed.data;

    const current = await this.db.department.findUnique({
      where: { id },
      select: { id: true, name: true, code: true, is_active: true },
    });

    if (!current) {
      return { success: false, error: "Departamento no encontrado" };
    }

    if (!current.is_active) {
      return {
        success: false,
        error: "No se puede editar un departamento desactivado",
      };
    }

    // Verificar unicidad de nombre si cambio
    if (name !== current.name) {
      const nameTaken = await this.db.department.findUnique({
        where: { name },
        select: { id: true },
      });
      if (nameTaken) {
        return {
          success: false,
          error: "Ya existe un departamento con ese nombre",
        };
      }
    }

    // Verificar unicidad de codigo si cambio
    if (code !== current.code) {
      const codeTaken = await this.db.department.findUnique({
        where: { code },
        select: { id: true },
      });
      if (codeTaken) {
        return {
          success: false,
          error: "Ya existe un departamento con ese codigo",
        };
      }
    }

    const changes = diffValues(
      { name: current.name, code: current.code },
      { name, code },
    );

    const updated = await this.db.$transaction(
      async (tx: TransactionClient) => {
        const result = await tx.department.update({
          where: { id },
          data: { name, code },
          select: DEPARTMENT_SELECT,
        });

        await createAuditLog(tx, {
          user_id: userId,
          action: "UPDATE",
          entity_type: "DEPARTMENT",
          entity_id: id,
          old_values: changes?.old ?? null,
          new_values: changes?.new ?? null,
          ip_address: ctx?.ip_address,
          user_agent: ctx?.user_agent,
        });

        return result;
      },
    );

    return { success: true, data: updated as DepartmentData };
  }

  async deactivate(
    departmentId: string,
    userId: string,
    ctx?: AuditContext,
  ): Promise<ServiceResult<DepartmentData>> {
    const current = await this.db.department.findUnique({
      where: { id: departmentId },
      select: { id: true, is_active: true },
    });

    if (!current) {
      return { success: false, error: "Departamento no encontrado" };
    }

    if (!current.is_active) {
      return { success: false, error: "El departamento ya esta desactivado" };
    }

    // Verificar que no tiene movimientos DRAFT pendientes
    const pendingMovements = await this.db.inventoryMovement.count({
      where: {
        department_id: departmentId,
        status: "DRAFT",
      },
    });

    if (pendingMovements > 0) {
      return {
        success: false,
        error: `No se puede desactivar el departamento: tiene ${pendingMovements} entrega(s) pendiente(s) de confirmar o cancelar`,
      };
    }

    const updated = await this.db.$transaction(
      async (tx: TransactionClient) => {
        const result = await tx.department.update({
          where: { id: departmentId },
          data: { is_active: false },
          select: DEPARTMENT_SELECT,
        });

        await createAuditLog(tx, {
          user_id: userId,
          action: "DELETE",
          entity_type: "DEPARTMENT",
          entity_id: departmentId,
          old_values: { is_active: true },
          new_values: { is_active: false },
          ip_address: ctx?.ip_address,
          user_agent: ctx?.user_agent,
        });

        return result;
      },
    );

    return { success: true, data: updated as DepartmentData };
  }

  async getById(id: string): Promise<ServiceResult<DepartmentData>> {
    const department = await this.db.department.findUnique({
      where: { id },
      select: DEPARTMENT_SELECT,
    });

    if (!department) {
      return { success: false, error: "Departamento no encontrado" };
    }

    return { success: true, data: department as DepartmentData };
  }

  async list(input?: unknown): Promise<
    ServiceResult<{
      departments: DepartmentData[];
      total: number;
      page: number;
      per_page: number;
    }>
  > {
    const parsed = departmentFiltersSchema.safeParse(input ?? {});
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
        { code: { contains: search, mode: "insensitive" } },
      ];
    }

    const [departments, total] = await this.db.$transaction([
      this.db.department.findMany({
        where,
        select: DEPARTMENT_SELECT,
        orderBy: { name: "asc" },
        skip: (page - 1) * per_page,
        take: per_page,
      }),
      this.db.department.count({ where }),
    ]);

    return {
      success: true,
      data: {
        departments: departments as DepartmentData[],
        total,
        page,
        per_page,
      },
    };
  }
}
