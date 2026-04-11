// Smoke test para verificar que Vitest arranca correctamente en @upds/validators.
// Si este test falla, el problema es de configuración, no de lógica de validación.

import { describe, it, expect } from "vitest";
import { createMovementSchema } from "../inventory-movement";
import { createProductSchema } from "../product";

describe("Vitest infrastructure — @upds/validators", () => {
  it("vitest is working", () => {
    expect(true).toBe(true);
  });

  it("createMovementSchema parses a valid ENTRY movement", () => {
    const result = createMovementSchema.safeParse({
      movement_type: "ENTRY",
      manufacture_order_id: "123e4567-e89b-12d3-a456-426614174000",
    });
    expect(result.success).toBe(true);
  });

  it("createMovementSchema rejects ENTRY without manufacture_order_id", () => {
    const result = createMovementSchema.safeParse({
      movement_type: "ENTRY",
    });
    expect(result.success).toBe(false);
  });

  it("createMovementSchema rejects WRITE_OFF without notes", () => {
    const result = createMovementSchema.safeParse({
      movement_type: "WRITE_OFF",
    });
    expect(result.success).toBe(false);
  });

  it("createMovementSchema accepts WRITE_OFF with valid notes", () => {
    const result = createMovementSchema.safeParse({
      movement_type: "WRITE_OFF",
      notes: "Producto deteriorado por humedad excesiva en el almacen",
    });
    expect(result.success).toBe(true);
  });

  it("createProductSchema is importable", () => {
    expect(createProductSchema).toBeDefined();
  });
});
