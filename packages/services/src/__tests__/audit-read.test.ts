// Tests unitarios para las funciones de lectura de audit logs.
// Cubre: paginacion, filtros, rechazo por rango excesivo, defaults de fechas.

import { describe, it, expect, beforeEach, vi } from "vitest";
import { getAuditLogs, getAuditFilterOptions } from "../audit";
import {
  createMockPrisma,
  resetMockPrisma,
  type MockPrismaClient,
} from "./helpers/prisma-mock";

// ─────────────────────────────────────────────────────────────────────────────
// Fechas de prueba
// ─────────────────────────────────────────────────────────────────────────────

const DATE_FROM = new Date("2026-04-01T00:00:00.000Z");
const DATE_TO = new Date("2026-04-30T23:59:59.999Z");

// ─────────────────────────────────────────────────────────────────────────────
// IDs de prueba
// ─────────────────────────────────────────────────────────────────────────────

const USER_ID_1 = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const USER_ID_2 = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const ENTITY_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const AUDIT_LOG_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd";

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

function makeAuditLogRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: AUDIT_LOG_ID,
    user_id: USER_ID_1,
    user: {
      id: USER_ID_1,
      full_name: "Admin Principal",
      email: "admin@upds.edu.bo",
    },
    action: "CREATE",
    entity_type: "USER",
    entity_id: ENTITY_ID,
    old_values: null,
    new_values: { email: "new@upds.edu.bo", role: "VIEWER" },
    ip_address: "192.168.1.10",
    user_agent: "Mozilla/5.0",
    created_at: new Date("2026-04-15T10:00:00.000Z"),
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

let mockPrisma: MockPrismaClient;

beforeEach(() => {
  mockPrisma = createMockPrisma();
  resetMockPrisma(mockPrisma);
});

// ═════════════════════════════════════════════════════════════════════════════
// getAuditLogs
// ═════════════════════════════════════════════════════════════════════════════

describe("getAuditLogs", () => {
  // ─── T1: Happy path ───────────────────────────────────────────────────────

  it("T1 — happy path: retorna pagina con datos y metadatos de paginacion", async () => {
    const mockRow = makeAuditLogRow();

    mockPrisma.auditLog.count.mockResolvedValue(1);
    mockPrisma.auditLog.findMany.mockResolvedValue([mockRow] as never);

    const result = await getAuditLogs(mockPrisma as never, {
      date_from: DATE_FROM,
      date_to: DATE_TO,
      page: 1,
      per_page: 20,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    const { data, total, page, per_page, total_pages } = result.data;

    expect(total).toBe(1);
    expect(page).toBe(1);
    expect(per_page).toBe(20);
    expect(total_pages).toBe(1);
    expect(data).toHaveLength(1);

    const entry = data[0]!;
    expect(entry.id).toBe(AUDIT_LOG_ID);
    expect(entry.action).toBe("CREATE");
    expect(entry.entity_type).toBe("USER");
    expect(entry.entity_id).toBe(ENTITY_ID);
    expect(entry.user?.full_name).toBe("Admin Principal");
    expect(entry.user?.email).toBe("admin@upds.edu.bo");
    expect(entry.old_values).toBeNull();
    expect(entry.new_values).toEqual({
      email: "new@upds.edu.bo",
      role: "VIEWER",
    });
  });

  // ─── T2: Filtro por action ────────────────────────────────────────────────

  it("T2 — filtro action: query usa WHERE action = filtro especificado", async () => {
    const mockRow = makeAuditLogRow({ action: "CONFIRM" });

    mockPrisma.auditLog.count.mockResolvedValue(1);
    mockPrisma.auditLog.findMany.mockResolvedValue([mockRow] as never);

    const result = await getAuditLogs(mockPrisma as never, {
      date_from: DATE_FROM,
      date_to: DATE_TO,
      action: "CONFIRM",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.data[0]?.action).toBe("CONFIRM");

    // Verificar que la query incluye el filtro de action
    const findManyArgs = mockPrisma.auditLog.findMany.mock.calls[0]?.[0];
    expect(findManyArgs?.where).toMatchObject({ action: "CONFIRM" });
  });

  // ─── T3: Rango de fechas > 90 dias → error ───────────────────────────────

  it("T3 — rango > 90 dias: retorna error sin llegar a la base de datos", async () => {
    const dateFrom = new Date("2026-01-01T00:00:00.000Z");
    const dateTo = new Date("2026-05-01T00:00:00.000Z"); // 120 dias aprox

    const result = await getAuditLogs(mockPrisma as never, {
      date_from: dateFrom,
      date_to: dateTo,
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error).toMatch(/90/);
    // Debe rechazar ANTES de consultar la base
    expect(mockPrisma.auditLog.count).not.toHaveBeenCalled();
    expect(mockPrisma.auditLog.findMany).not.toHaveBeenCalled();
  });

  // ─── T4: Sin fechas → usa los ultimos 30 dias ────────────────────────────

  it("T4 — sin fechas: usa rango por defecto de 30 dias hacia atras", async () => {
    const now = new Date("2026-04-09T12:00:00.000Z");
    vi.setSystemTime(now);

    mockPrisma.auditLog.count.mockResolvedValue(0);
    mockPrisma.auditLog.findMany.mockResolvedValue([] as never);

    await getAuditLogs(mockPrisma as never, {});

    // Verificar que el WHERE contiene fecha >= hace 30 dias aprox
    const countArgs = mockPrisma.auditLog.count.mock.calls[0]?.[0];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const createdAtFilter = countArgs?.where?.created_at as any;
    const dateFrom = createdAtFilter?.gte;
    const dateTo = createdAtFilter?.lte;

    expect(dateFrom).toBeDefined();
    expect(dateTo).toBeDefined();

    const diffDays =
      (new Date(dateTo).getTime() - new Date(dateFrom).getTime()) /
      (1000 * 60 * 60 * 24);

    // El rango debe ser ~30 dias (tolerancia de 1 dia para floating point)
    expect(diffDays).toBeGreaterThan(29);
    expect(diffDays).toBeLessThan(31);

    vi.useRealTimers();
  });

  // ─── T5: Sin resultados → array vacio con paginacion correcta ─────────────

  it("T5 — sin resultados: retorna data vacia con paginacion correcta", async () => {
    mockPrisma.auditLog.count.mockResolvedValue(0);
    mockPrisma.auditLog.findMany.mockResolvedValue([] as never);

    const result = await getAuditLogs(mockPrisma as never, {
      date_from: DATE_FROM,
      date_to: DATE_TO,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.data).toHaveLength(0);
    expect(result.data.total).toBe(0);
    expect(result.data.total_pages).toBe(0);
    expect(result.data.page).toBe(1);
  });

  // ─── T6: Multiples paginas ────────────────────────────────────────────────

  it("T6 — paginacion: total_pages se calcula correctamente", async () => {
    mockPrisma.auditLog.count.mockResolvedValue(45);
    mockPrisma.auditLog.findMany.mockResolvedValue([
      makeAuditLogRow(),
    ] as never);

    const result = await getAuditLogs(mockPrisma as never, {
      date_from: DATE_FROM,
      date_to: DATE_TO,
      page: 2,
      per_page: 20,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.total).toBe(45);
    expect(result.data.page).toBe(2);
    expect(result.data.per_page).toBe(20);
    expect(result.data.total_pages).toBe(3); // ceil(45/20)

    // Verificar offset correcto (page 2 → skip 20)
    const findManyArgs = mockPrisma.auditLog.findMany.mock.calls[0]?.[0];
    expect(findManyArgs?.skip).toBe(20);
    expect(findManyArgs?.take).toBe(20);
  });

  // ─── T7: Usuario sin relacion ─────────────────────────────────────────────

  it("T7 — usuario nulo: entry con user=null cuando no existe la relacion", async () => {
    const mockRow = makeAuditLogRow({ user: null });

    mockPrisma.auditLog.count.mockResolvedValue(1);
    mockPrisma.auditLog.findMany.mockResolvedValue([mockRow] as never);

    const result = await getAuditLogs(mockPrisma as never, {
      date_from: DATE_FROM,
      date_to: DATE_TO,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.data[0]?.user).toBeNull();
  });

  // ─── T8: Filtro por entity_type y user_id ────────────────────────────────

  it("T8 — filtros combinados: WHERE incluye user_id y entity_type", async () => {
    mockPrisma.auditLog.count.mockResolvedValue(0);
    mockPrisma.auditLog.findMany.mockResolvedValue([] as never);

    await getAuditLogs(mockPrisma as never, {
      date_from: DATE_FROM,
      date_to: DATE_TO,
      user_id: USER_ID_2,
      entity_type: "PRODUCT",
    });

    const countArgs = mockPrisma.auditLog.count.mock.calls[0]?.[0];
    expect(countArgs?.where).toMatchObject({
      user_id: USER_ID_2,
      entity_type: "PRODUCT",
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// getAuditFilterOptions
// ═════════════════════════════════════════════════════════════════════════════

describe("getAuditFilterOptions", () => {
  it("T9 — retorna valores distintos de actions y entity_types", async () => {
    mockPrisma.auditLog.findMany
      .mockResolvedValueOnce([
        { action: "CANCEL" },
        { action: "CONFIRM" },
        { action: "CREATE" },
      ] as never)
      .mockResolvedValueOnce([
        { entity_type: "INVENTORY_MOVEMENT" },
        { entity_type: "USER" },
      ] as never);

    const options = await getAuditFilterOptions(mockPrisma as never);

    expect(options.actions).toEqual(["CANCEL", "CONFIRM", "CREATE"]);
    expect(options.entity_types).toEqual(["INVENTORY_MOVEMENT", "USER"]);
  });

  it("T10 — sin datos: retorna arrays vacios", async () => {
    mockPrisma.auditLog.findMany
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never);

    const options = await getAuditFilterOptions(mockPrisma as never);

    expect(options.actions).toEqual([]);
    expect(options.entity_types).toEqual([]);
  });
});
