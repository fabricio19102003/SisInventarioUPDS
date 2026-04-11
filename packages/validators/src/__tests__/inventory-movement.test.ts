// Tests unitarios para el schema createMovementSchema (discriminatedUnion).
// Cubre los 6 tipos de movimiento con casos válidos e inválidos.

import { describe, it, expect } from "vitest";
import { createMovementSchema } from "../inventory-movement";

// UUIDs de prueba
const VALID_UUID = "123e4567-e89b-12d3-a456-426614174000";

// ─────────────────────────────────────────────────────────────────────────────
// ENTRY
// ─────────────────────────────────────────────────────────────────────────────

describe("createMovementSchema — ENTRY", () => {
  it("T1: valid ENTRY with manufacture_order_id → passes", () => {
    const result = createMovementSchema.safeParse({
      movement_type: "ENTRY",
      manufacture_order_id: VALID_UUID,
    });
    expect(result.success).toBe(true);
  });

  it("T2: ENTRY missing manufacture_order_id → fails", () => {
    const result = createMovementSchema.safeParse({
      movement_type: "ENTRY",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.errors.map((e) => e.message).join(" ");
      expect(messages.toLowerCase()).toMatch(
        /invalido|requerido|required|uuid/i,
      );
    }
  });

  it("T2b: ENTRY with invalid UUID manufacture_order_id → fails", () => {
    const result = createMovementSchema.safeParse({
      movement_type: "ENTRY",
      manufacture_order_id: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("T1b: ENTRY with optional notes → passes", () => {
    const result = createMovementSchema.safeParse({
      movement_type: "ENTRY",
      manufacture_order_id: VALID_UUID,
      notes: "Recepcion parcial de lote de pijamas",
    });
    expect(result.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SALE
// ─────────────────────────────────────────────────────────────────────────────

describe("createMovementSchema — SALE", () => {
  it("T3: valid SALE with recipient_id → passes", () => {
    const result = createMovementSchema.safeParse({
      movement_type: "SALE",
      recipient_id: VALID_UUID,
    });
    expect(result.success).toBe(true);
  });

  it("T4: SALE missing recipient_id → fails", () => {
    const result = createMovementSchema.safeParse({
      movement_type: "SALE",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.errors.map((e) => e.message).join(" ");
      expect(messages.toLowerCase()).toMatch(/invalido|required|uuid/i);
    }
  });

  it("T4b: SALE with invalid UUID recipient_id → fails", () => {
    const result = createMovementSchema.safeParse({
      movement_type: "SALE",
      recipient_id: "no-es-un-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("T3b: SALE with recipient_id and optional notes → passes", () => {
    const result = createMovementSchema.safeParse({
      movement_type: "SALE",
      recipient_id: VALID_UUID,
      notes: "Venta de uniforme medico",
    });
    expect(result.success).toBe(true);
  });
});

// Note: unit_price validation for SALE happens in addMovementItemSchema (addItem),
// not in createMovementSchema (which only validates the movement header/type).
// The discriminatedUnion only validates movement-level fields (recipient_id, etc.).

// ─────────────────────────────────────────────────────────────────────────────
// DONATION
// ─────────────────────────────────────────────────────────────────────────────

describe("createMovementSchema — DONATION", () => {
  it("T5: valid DONATION with recipient_id → passes", () => {
    const result = createMovementSchema.safeParse({
      movement_type: "DONATION",
      recipient_id: VALID_UUID,
    });
    expect(result.success).toBe(true);
  });

  it("T6: DONATION missing recipient_id → fails", () => {
    const result = createMovementSchema.safeParse({
      movement_type: "DONATION",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.errors.map((e) => e.message).join(" ");
      expect(messages.toLowerCase()).toMatch(/invalido|required|uuid/i);
    }
  });

  it("T5b: DONATION with recipient_id and optional notes → passes", () => {
    const result = createMovementSchema.safeParse({
      movement_type: "DONATION",
      recipient_id: VALID_UUID,
      notes: "Dotacion semestral a becarios",
    });
    expect(result.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// WRITE_OFF
// ─────────────────────────────────────────────────────────────────────────────

describe("createMovementSchema — WRITE_OFF", () => {
  it("T7: valid WRITE_OFF with notes (min 10 chars) → passes", () => {
    const result = createMovementSchema.safeParse({
      movement_type: "WRITE_OFF",
      notes: "Producto deteriorado por humedad en el deposito",
    });
    expect(result.success).toBe(true);
  });

  it("T8: WRITE_OFF with notes too short (< 10 chars) → fails", () => {
    const result = createMovementSchema.safeParse({
      movement_type: "WRITE_OFF",
      notes: "Corto",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.errors.map((e) => e.message).join(" ");
      expect(messages.toLowerCase()).toMatch(/minimo|10|obligatorio/i);
    }
  });

  it("T9: WRITE_OFF with no notes → fails", () => {
    const result = createMovementSchema.safeParse({
      movement_type: "WRITE_OFF",
    });
    expect(result.success).toBe(false);
  });

  it("T7b: WRITE_OFF with exactly 10 chars in notes → passes", () => {
    const result = createMovementSchema.safeParse({
      movement_type: "WRITE_OFF",
      notes: "1234567890",
    });
    expect(result.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADJUSTMENT
// ─────────────────────────────────────────────────────────────────────────────

describe("createMovementSchema — ADJUSTMENT", () => {
  it("T10: valid ADJUSTMENT with notes → passes", () => {
    const result = createMovementSchema.safeParse({
      movement_type: "ADJUSTMENT",
      notes: "Ajuste por diferencia en conteo fisico de inventario",
    });
    expect(result.success).toBe(true);
  });

  it("T11: ADJUSTMENT with no notes → fails", () => {
    const result = createMovementSchema.safeParse({
      movement_type: "ADJUSTMENT",
    });
    expect(result.success).toBe(false);
  });

  it("T11b: ADJUSTMENT with notes too short → fails", () => {
    const result = createMovementSchema.safeParse({
      movement_type: "ADJUSTMENT",
      notes: "Corto",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.errors.map((e) => e.message).join(" ");
      expect(messages.toLowerCase()).toMatch(/minimo|10|obligatorio/i);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DEPARTMENT_DELIVERY
// ─────────────────────────────────────────────────────────────────────────────

describe("createMovementSchema — DEPARTMENT_DELIVERY", () => {
  it("T12: valid DEPARTMENT_DELIVERY with department_id → passes", () => {
    const result = createMovementSchema.safeParse({
      movement_type: "DEPARTMENT_DELIVERY",
      department_id: VALID_UUID,
    });
    expect(result.success).toBe(true);
  });

  it("T13: DEPARTMENT_DELIVERY missing department_id → fails", () => {
    const result = createMovementSchema.safeParse({
      movement_type: "DEPARTMENT_DELIVERY",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.errors.map((e) => e.message).join(" ");
      expect(messages.toLowerCase()).toMatch(/invalido|required|uuid/i);
    }
  });

  it("T13b: DEPARTMENT_DELIVERY with invalid department_id UUID → fails", () => {
    const result = createMovementSchema.safeParse({
      movement_type: "DEPARTMENT_DELIVERY",
      department_id: "not-a-valid-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("T12b: DEPARTMENT_DELIVERY with department_id and optional notes → passes", () => {
    const result = createMovementSchema.safeParse({
      movement_type: "DEPARTMENT_DELIVERY",
      department_id: VALID_UUID,
      notes: "Entrega de materiales de oficina al departamento de sistemas",
    });
    expect(result.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Casos generales del discriminatedUnion
// ─────────────────────────────────────────────────────────────────────────────

describe("createMovementSchema — general discriminatedUnion behavior", () => {
  it("rejects unknown movement_type", () => {
    const result = createMovementSchema.safeParse({
      movement_type: "INVALID_TYPE",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing movement_type", () => {
    const result = createMovementSchema.safeParse({
      manufacture_order_id: VALID_UUID,
    });
    expect(result.success).toBe(false);
  });
});
