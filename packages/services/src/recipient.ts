// ═══════════════════════════════════════════════════════════════════════════════
// @upds/services — Servicio de Destinatarios/Beneficiarios
// CRUD personas que reciben productos: estudiantes, personal, becarios.
// Campo inmutable: document_number.
// ═══════════════════════════════════════════════════════════════════════════════

import { type PrismaClient, type TransactionClient } from "@upds/db";
import {
  createRecipientSchema,
  updateRecipientSchema,
  recipientFiltersSchema,
  type CreateRecipientInput,
  type UpdateRecipientInput,
  type RecipientFiltersInput,
} from "@upds/validators";
import { createAuditLog, diffValues } from "./audit";
import type { ServiceResult, AuditContext } from "./auth";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

const RECIPIENT_SELECT = {
  id: true,
  document_number: true,
  full_name: true,
  type: true,
  phone: true,
  email: true,
  career: true,
  is_active: true,
  created_at: true,
  updated_at: true,
} as const;

export interface RecipientData {
  id: string;
  document_number: string;
  full_name: string;
  type: string;
  phone: string | null;
  email: string | null;
  career: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Servicio
// ─────────────────────────────────────────────────────────────────────────────

export class RecipientService {
  constructor(private readonly db: PrismaClient) {}

  async create(
    input: CreateRecipientInput,
    userId: string,
    ctx?: AuditContext,
  ): Promise<ServiceResult<RecipientData>> {
    const parsed = createRecipientSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? "Datos invalidos",
      };
    }

    const data = parsed.data;

    // Verificar document_number unico
    const existing = await this.db.recipient.findUnique({
      where: { document_number: data.document_number },
      select: { id: true },
    });

    if (existing) {
      return {
        success: false,
        error: "Ya existe un destinatario con ese numero de documento",
      };
    }

    const recipient = await this.db.$transaction(
      async (tx: TransactionClient) => {
        const created = await tx.recipient.create({
          data: {
            document_number: data.document_number,
            full_name: data.full_name,
            type: data.type,
            phone: data.phone ?? null,
            email: data.email ?? null,
            career: data.career ?? null,
          },
          select: RECIPIENT_SELECT,
        });

        await createAuditLog(tx, {
          user_id: userId,
          action: "CREATE",
          entity_type: "RECIPIENT",
          entity_id: created.id,
          new_values: {
            document_number: created.document_number,
            full_name: created.full_name,
            type: created.type,
          },
          ip_address: ctx?.ip_address,
          user_agent: ctx?.user_agent,
        });

        return created;
      },
    );

    return { success: true, data: recipient as RecipientData };
  }

  async update(
    input: UpdateRecipientInput,
    userId: string,
    ctx?: AuditContext,
  ): Promise<ServiceResult<RecipientData>> {
    const parsed = updateRecipientSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? "Datos invalidos",
      };
    }

    const { id, ...data } = parsed.data;

    const current = await this.db.recipient.findUnique({
      where: { id },
      select: {
        id: true,
        full_name: true,
        type: true,
        phone: true,
        email: true,
        career: true,
        is_active: true,
      },
    });

    if (!current) {
      return { success: false, error: "Destinatario no encontrado" };
    }

    if (!current.is_active) {
      return {
        success: false,
        error: "No se puede editar un destinatario desactivado",
      };
    }

    const changes = diffValues(
      {
        full_name: current.full_name,
        type: current.type,
        phone: current.phone,
        email: current.email,
        career: current.career,
      },
      {
        full_name: data.full_name,
        type: data.type,
        phone: data.phone ?? null,
        email: data.email ?? null,
        career: data.career ?? null,
      },
    );

    const updated = await this.db.$transaction(
      async (tx: TransactionClient) => {
        const result = await tx.recipient.update({
          where: { id },
          data: {
            full_name: data.full_name,
            type: data.type,
            phone: data.phone ?? null,
            email: data.email ?? null,
            career: data.career ?? null,
          },
          select: RECIPIENT_SELECT,
        });

        await createAuditLog(tx, {
          user_id: userId,
          action: "UPDATE",
          entity_type: "RECIPIENT",
          entity_id: id,
          old_values: changes?.old ?? null,
          new_values: changes?.new ?? null,
          ip_address: ctx?.ip_address,
          user_agent: ctx?.user_agent,
        });

        return result;
      },
    );

    return { success: true, data: updated as RecipientData };
  }

  async deactivate(
    recipientId: string,
    userId: string,
    ctx?: AuditContext,
  ): Promise<ServiceResult<RecipientData>> {
    const current = await this.db.recipient.findUnique({
      where: { id: recipientId },
      select: { id: true, is_active: true },
    });

    if (!current) {
      return { success: false, error: "Destinatario no encontrado" };
    }

    if (!current.is_active) {
      return { success: false, error: "El destinatario ya esta desactivado" };
    }

    const updated = await this.db.$transaction(
      async (tx: TransactionClient) => {
        const result = await tx.recipient.update({
          where: { id: recipientId },
          data: { is_active: false },
          select: RECIPIENT_SELECT,
        });

        await createAuditLog(tx, {
          user_id: userId,
          action: "DELETE",
          entity_type: "RECIPIENT",
          entity_id: recipientId,
          old_values: { is_active: true },
          new_values: { is_active: false },
          ip_address: ctx?.ip_address,
          user_agent: ctx?.user_agent,
        });

        return result;
      },
    );

    return { success: true, data: updated as RecipientData };
  }

  async getById(id: string): Promise<ServiceResult<RecipientData>> {
    const recipient = await this.db.recipient.findUnique({
      where: { id },
      select: RECIPIENT_SELECT,
    });

    if (!recipient) {
      return { success: false, error: "Destinatario no encontrado" };
    }

    return { success: true, data: recipient as RecipientData };
  }

  async list(input?: RecipientFiltersInput): Promise<
    ServiceResult<{
      recipients: RecipientData[];
      total: number;
      page: number;
      per_page: number;
    }>
  > {
    const parsed = recipientFiltersSchema.safeParse(input ?? {});
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? "Filtros invalidos",
      };
    }

    const { search, type, is_active, page, per_page } = parsed.data;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    if (type) where.type = type;
    if (is_active !== undefined) where.is_active = is_active;

    if (search) {
      where.OR = [
        { full_name: { contains: search, mode: "insensitive" } },
        { document_number: { contains: search, mode: "insensitive" } },
      ];
    }

    const [recipients, total] = await this.db.$transaction([
      this.db.recipient.findMany({
        where,
        select: RECIPIENT_SELECT,
        orderBy: { full_name: "asc" },
        skip: (page - 1) * per_page,
        take: per_page,
      }),
      this.db.recipient.count({ where }),
    ]);

    return {
      success: true,
      data: {
        recipients: recipients as RecipientData[],
        total,
        page,
        per_page,
      },
    };
  }
}
