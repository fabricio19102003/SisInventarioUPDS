// Tests unitarios para el schema createProductSchema.
// Cubre la validación condicional: MEDICAL_GARMENT vs OFFICE_SUPPLY
// con sus restricciones de garment_type y warehouse_area.

import { describe, it, expect } from "vitest";
import { createProductSchema } from "../product";

// ─────────────────────────────────────────────────────────────────────────────
// Datos base reutilizables
// ─────────────────────────────────────────────────────────────────────────────

const BASE_MEDICAL_PRODUCT = {
  sku: "PQ-001",
  name: "Pijama Quirurgico",
  category: "MEDICAL_GARMENT" as const,
  garment_type: "PIJAMA" as const,
  warehouse_area: "MEDICAL" as const,
  min_stock: 5,
  variants: [
    {
      size: "M" as const,
      gender: "MASCULINO" as const,
      color: "Azul",
      initial_stock: 10,
    },
  ],
};

const BASE_OFFICE_PRODUCT = {
  sku: "RSMA-001",
  name: "Resma A4",
  category: "OFFICE_SUPPLY" as const,
  garment_type: null,
  warehouse_area: "OFFICE" as const,
  min_stock: 5,
  initial_stock: 50,
};

// ─────────────────────────────────────────────────────────────────────────────
// MEDICAL_GARMENT
// ─────────────────────────────────────────────────────────────────────────────

describe("createProductSchema — MEDICAL_GARMENT", () => {
  it("T1: MEDICAL_GARMENT + garment_type + MEDICAL area + variants → passes", () => {
    const result = createProductSchema.safeParse(BASE_MEDICAL_PRODUCT);
    expect(result.success).toBe(true);
  });

  it("T2: MEDICAL_GARMENT + missing garment_type → fails", () => {
    const result = createProductSchema.safeParse({
      ...BASE_MEDICAL_PRODUCT,
      garment_type: null,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.errors.map((e) => e.message).join(" ");
      expect(messages).toMatch(
        /tipo de prenda.*obligatorio|obligatorio.*tipo de prenda/i,
      );
    }
  });

  it("T2b: MEDICAL_GARMENT + undefined garment_type → fails", () => {
    const { garment_type: _gt, ...withoutGarmentType } = BASE_MEDICAL_PRODUCT;
    const result = createProductSchema.safeParse(withoutGarmentType);
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.errors.map((e) => e.path.join("."));
      expect(paths).toContain("garment_type");
    }
  });

  it("T3: MEDICAL_GARMENT + OFFICE area → fails", () => {
    const result = createProductSchema.safeParse({
      ...BASE_MEDICAL_PRODUCT,
      warehouse_area: "OFFICE",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.errors.map((e) => e.message).join(" ");
      expect(messages.toLowerCase()).toMatch(/medic/i);
    }
  });

  it("T3b: MEDICAL_GARMENT + wrong area error is on warehouse_area field", () => {
    const result = createProductSchema.safeParse({
      ...BASE_MEDICAL_PRODUCT,
      warehouse_area: "OFFICE",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.errors.map((e) => e.path.join("."));
      expect(paths).toContain("warehouse_area");
    }
  });

  it("T4: MEDICAL_GARMENT + no variants → fails", () => {
    const result = createProductSchema.safeParse({
      ...BASE_MEDICAL_PRODUCT,
      variants: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.errors.map((e) => e.message).join(" ");
      expect(messages.toLowerCase()).toMatch(/variante/i);
    }
  });

  it("T1b: MEDICAL_GARMENT with multiple valid variants → passes", () => {
    const result = createProductSchema.safeParse({
      ...BASE_MEDICAL_PRODUCT,
      variants: [
        { size: "M", gender: "MASCULINO", color: "Azul", initial_stock: 10 },
        { size: "L", gender: "FEMENINO", color: "Verde", initial_stock: 5 },
        { size: "S", gender: "UNISEX", color: "Blanco", initial_stock: 0 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("T1c: MEDICAL_GARMENT with all valid garment types → passes", () => {
    const garmentTypes = [
      "PIJAMA",
      "BATA",
      "MANDIL",
      "POLERA",
      "GORRO",
    ] as const;
    for (const garment_type of garmentTypes) {
      const result = createProductSchema.safeParse({
        ...BASE_MEDICAL_PRODUCT,
        garment_type,
      });
      expect(result.success).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// OFFICE_SUPPLY
// ─────────────────────────────────────────────────────────────────────────────

describe("createProductSchema — OFFICE_SUPPLY", () => {
  it("T5: OFFICE_SUPPLY + no garment_type + OFFICE area → passes", () => {
    const result = createProductSchema.safeParse(BASE_OFFICE_PRODUCT);
    expect(result.success).toBe(true);
  });

  it("T5b: OFFICE_SUPPLY without initial_stock → passes (defaults to 0)", () => {
    const { initial_stock: _is, ...withoutStock } = BASE_OFFICE_PRODUCT;
    const result = createProductSchema.safeParse(withoutStock);
    expect(result.success).toBe(true);
  });

  it("T6: OFFICE_SUPPLY + garment_type present → fails", () => {
    const result = createProductSchema.safeParse({
      ...BASE_OFFICE_PRODUCT,
      garment_type: "PIJAMA",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.errors.map((e) => e.message).join(" ");
      expect(messages.toLowerCase()).toMatch(/no aplica|oficina/i);
    }
  });

  it("T6b: OFFICE_SUPPLY + garment_type error is on garment_type field", () => {
    const result = createProductSchema.safeParse({
      ...BASE_OFFICE_PRODUCT,
      garment_type: "BATA",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.errors.map((e) => e.path.join("."));
      expect(paths).toContain("garment_type");
    }
  });

  it("T7: OFFICE_SUPPLY + MEDICAL area → fails", () => {
    const result = createProductSchema.safeParse({
      ...BASE_OFFICE_PRODUCT,
      warehouse_area: "MEDICAL",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.errors.map((e) => e.message).join(" ");
      expect(messages.toLowerCase()).toMatch(/oficina/i);
    }
  });

  it("T7b: OFFICE_SUPPLY + wrong area error is on warehouse_area field", () => {
    const result = createProductSchema.safeParse({
      ...BASE_OFFICE_PRODUCT,
      warehouse_area: "MEDICAL",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.errors.map((e) => e.path.join("."));
      expect(paths).toContain("warehouse_area");
    }
  });

  it("T8: OFFICE_SUPPLY + medical variants → fails", () => {
    const result = createProductSchema.safeParse({
      ...BASE_OFFICE_PRODUCT,
      variants: [
        { size: "M", gender: "MASCULINO", color: "Azul", initial_stock: 0 },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.errors.map((e) => e.message).join(" ");
      expect(messages.toLowerCase()).toMatch(/variante/i);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Campo base común (ambas categorías)
// ─────────────────────────────────────────────────────────────────────────────

describe("createProductSchema — common field validation", () => {
  it("SKU is transformed to uppercase and trimmed", () => {
    const result = createProductSchema.safeParse({
      ...BASE_OFFICE_PRODUCT,
      sku: "  resma-001  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sku).toBe("RESMA-001");
    }
  });

  it("name is trimmed", () => {
    const result = createProductSchema.safeParse({
      ...BASE_OFFICE_PRODUCT,
      name: "  Resma A4  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Resma A4");
    }
  });

  it("missing required sku → fails", () => {
    const { sku: _sku, ...withoutSku } = BASE_OFFICE_PRODUCT;
    const result = createProductSchema.safeParse(withoutSku);
    expect(result.success).toBe(false);
  });

  it("missing required name → fails", () => {
    const { name: _name, ...withoutName } = BASE_OFFICE_PRODUCT;
    const result = createProductSchema.safeParse(withoutName);
    expect(result.success).toBe(false);
  });

  it("invalid category → fails", () => {
    const result = createProductSchema.safeParse({
      ...BASE_OFFICE_PRODUCT,
      category: "INVALID_CATEGORY",
    });
    expect(result.success).toBe(false);
  });

  it("min_stock defaults to 5 when not provided", () => {
    const { min_stock: _ms, ...withoutMinStock } = BASE_OFFICE_PRODUCT;
    const result = createProductSchema.safeParse(withoutMinStock);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.min_stock).toBe(5);
    }
  });
});
