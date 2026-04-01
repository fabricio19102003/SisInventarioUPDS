// =============================================================================
// UPDS Inventory System — Database Seed
// Datos completos para probar todos los flujos de trabajo del sistema.
//
// Ejecutar: pnpm --filter @upds/db db:seed
// Requiere: pnpm add -D bcryptjs @types/bcryptjs --filter @upds/db
// =============================================================================

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

interface SeedMovementItem {
  product_variant_id: string;
  quantity: number;
  unit_price?: number;
}

interface SeedMovementInput {
  movement_number: string;
  movement_type:
    | "ENTRY"
    | "SALE"
    | "DONATION"
    | "WRITE_OFF"
    | "ADJUSTMENT"
    | "DEPARTMENT_DELIVERY";
  processed_by: string;
  created_at: Date;
  processed_at?: Date;
  cancelled_at?: Date;
  cancel_reason?: string;
  recipient_id?: string;
  department_id?: string;
  manufacture_order_id?: string;
  notes?: string;
  items?: SeedMovementItem[];
  status: "DRAFT" | "CONFIRMED" | "CANCELLED";
}

async function createSeedMovement(input: SeedMovementInput) {
  await prisma.$transaction(async (tx) => {
    const items = input.items ?? [];
    const totalAmount = items.reduce(
      (sum, item) => sum + item.quantity * (item.unit_price ?? 0),
      0,
    );

    const movement = await tx.inventoryMovement.create({
      data: {
        movement_number: input.movement_number,
        movement_type: input.movement_type,
        status: input.status,
        is_donated: input.movement_type === "DONATION",
        total_amount:
          input.status === "CONFIRMED" || items.length > 0 ? totalAmount : 0,
        notes: input.notes ?? null,
        cancel_reason:
          input.status === "CANCELLED"
            ? (input.cancel_reason ??
              "Cancelado durante la carga de datos inicial.")
            : null,
        recipient_id: input.recipient_id ?? null,
        department_id: input.department_id ?? null,
        manufacture_order_id: input.manufacture_order_id ?? null,
        processed_by: input.processed_by,
        processed_at: input.processed_at ?? null,
        cancelled_at:
          input.status === "CANCELLED" ? (input.cancelled_at ?? null) : null,
        created_at: input.created_at,
      },
    });

    for (const item of items) {
      await tx.movementItem.create({
        data: {
          inventory_movement_id: movement.id,
          product_variant_id: item.product_variant_id,
          quantity: item.quantity,
          unit_price: item.unit_price ?? 0,
          subtotal: item.quantity * (item.unit_price ?? 0),
        },
      });
    }

    if (input.status !== "CONFIRMED") {
      return;
    }

    for (const item of items) {
      const variant = await tx.productVariant.findUniqueOrThrow({
        where: { id: item.product_variant_id },
        select: { id: true, current_stock: true },
      });

      const nextStock =
        input.movement_type === "ENTRY" || input.movement_type === "ADJUSTMENT"
          ? variant.current_stock + item.quantity
          : variant.current_stock - item.quantity;

      await tx.productVariant.update({
        where: { id: item.product_variant_id },
        data: { current_stock: nextStock },
      });
    }

    if (input.movement_type === "ENTRY" && input.manufacture_order_id) {
      for (const item of items) {
        await tx.manufactureOrderItem.update({
          where: {
            manufacture_order_id_product_variant_id: {
              manufacture_order_id: input.manufacture_order_id,
              product_variant_id: item.product_variant_id,
            },
          },
          data: {
            quantity_received: {
              increment: item.quantity,
            },
          },
        });
      }

      const orderItems = await tx.manufactureOrderItem.findMany({
        where: { manufacture_order_id: input.manufacture_order_id },
        select: { quantity_ordered: true, quantity_received: true },
      });

      const allComplete = orderItems.every(
        (item) => item.quantity_received >= item.quantity_ordered,
      );

      await tx.manufactureOrder.update({
        where: { id: input.manufacture_order_id },
        data: {
          status: allComplete ? "COMPLETED" : "IN_PROGRESS",
          completed_at: allComplete
            ? (input.processed_at ?? input.created_at)
            : null,
        },
      });
    }
  });
}

async function main() {
  console.log("Limpiando base de datos...");
  await prisma.movementItem.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.manufactureOrderItem.deleteMany();
  await prisma.manufactureOrder.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.manufacturer.deleteMany();
  await prisma.recipient.deleteMany();
  await prisma.department.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();

  // ===========================================================================
  // 1. USUARIOS
  // ===========================================================================
  console.log("Creando usuarios...");

  const [admin, manager, viewer] = await Promise.all([
    prisma.user.create({
      data: {
        email: "admin@upds.edu.bo",
        password_hash: await bcrypt.hash("Admin123!", SALT_ROUNDS),
        full_name: "Administrador del Sistema",
        role: "ADMIN",
      },
    }),
    prisma.user.create({
      data: {
        email: "inventario@upds.edu.bo",
        password_hash: await bcrypt.hash("Inventario123!", SALT_ROUNDS),
        full_name: "Juan Carlos Mendoza",
        role: "INVENTORY_MANAGER",
      },
    }),
    prisma.user.create({
      data: {
        email: "consulta@upds.edu.bo",
        password_hash: await bcrypt.hash("Consulta123!", SALT_ROUNDS),
        full_name: "Laura Fernández",
        role: "VIEWER",
      },
    }),
  ]);

  // ===========================================================================
  // 2. FABRICANTES
  // ===========================================================================
  console.log("Creando fabricantes...");

  const [mfgBoliviana, mfgMediWear, mfgTexSur] = await Promise.all([
    prisma.manufacturer.create({
      data: {
        name: "Confecciones Bolivianas S.R.L.",
        contact_name: "Roberto Gutiérrez",
        phone: "+591 72345678",
        email: "ventas@confecbolivianas.com",
        address: "Av. Blanco Galindo Km 5, Cochabamba",
      },
    }),
    prisma.manufacturer.create({
      data: {
        name: "Taller MediWear",
        contact_name: "Patricia Rojas",
        phone: "+591 76543210",
        email: "contacto@mediwear.bo",
        address: "Calle Jordán #456, Cochabamba",
      },
    }),
    prisma.manufacturer.create({
      data: {
        name: "Textiles del Sur",
        contact_name: "Fernando Vargas",
        phone: "+591 71234567",
        email: "info@textilesdelsur.bo",
        address: "Zona Franca Industrial, Oruro",
        is_active: false,
      },
    }),
  ]);

  // ===========================================================================
  // 3. DEPARTAMENTOS
  // ===========================================================================
  console.log("Creando departamentos...");

  const [deptAdmin, deptRec, deptMed, deptDer, deptRRHH] = await Promise.all([
    prisma.department.create({ data: { name: "Administración", code: "ADM" } }),
    prisma.department.create({ data: { name: "Rectorado", code: "REC" } }),
    prisma.department.create({
      data: { name: "Facultad de Medicina", code: "MED" },
    }),
    prisma.department.create({
      data: { name: "Facultad de Derecho", code: "DER" },
    }),
    prisma.department.create({
      data: { name: "Recursos Humanos", code: "RRHH" },
    }),
  ]);

  // ===========================================================================
  // 4. DESTINATARIOS
  // ===========================================================================
  console.log("Creando destinatarios...");

  const [recMaria, recCarlos, recRoberto, recAna, recPedro] = await Promise.all(
    [
      prisma.recipient.create({
        data: {
          document_number: "12345678",
          full_name: "María López Quisbert",
          type: "STUDENT",
          phone: "+591 78901234",
          email: "maria.lopez@est.upds.edu.bo",
          career: "Medicina",
        },
      }),
      prisma.recipient.create({
        data: {
          document_number: "23456789",
          full_name: "Carlos Mamani Condori",
          type: "STUDENT",
          phone: "+591 79012345",
          career: "Odontología",
        },
      }),
      prisma.recipient.create({
        data: {
          document_number: "34567890",
          full_name: "Dr. Roberto Suárez Paz",
          type: "STAFF",
          phone: "+591 70123456",
          email: "roberto.suarez@upds.edu.bo",
        },
      }),
      prisma.recipient.create({
        data: {
          document_number: "45678901",
          full_name: "Ana Quispe Huanca",
          type: "SCHOLAR",
          phone: "+591 71234567",
          career: "Enfermería",
        },
      }),
      prisma.recipient.create({
        data: {
          document_number: "56789012",
          full_name: "Pedro Flores Mendieta",
          type: "SCHOLAR",
          phone: "+591 72345678",
          career: "Bioquímica",
        },
      }),
    ],
  );

  // ===========================================================================
  // 5. PRODUCTOS — INDUMENTARIA MÉDICA
  // ===========================================================================
  console.log("Creando productos médicos con variantes...");

  // --- Pijama Quirúrgico ---
  const prodPijama = await prisma.product.create({
    data: {
      sku: "PIJ-QUI",
      name: "Pijama Quirúrgico",
      description:
        "Pijama de dos piezas para uso en quirófano. Tela antifluido.",
      category: "MEDICAL_GARMENT",
      garment_type: "PIJAMA",
      warehouse_area: "MEDICAL",
      min_stock: 5,
    },
  });

  const [pijMA, pijLA, pijMV, pijLV] = await Promise.all([
    prisma.productVariant.create({
      data: {
        product_id: prodPijama.id,
        sku_suffix: "M-UNISEX-AZUL",
        size: "M",
        gender: "UNISEX",
        color: "Azul",
        current_stock: 0,
      },
    }),
    prisma.productVariant.create({
      data: {
        product_id: prodPijama.id,
        sku_suffix: "L-UNISEX-AZUL",
        size: "L",
        gender: "UNISEX",
        color: "Azul",
        current_stock: 0,
      },
    }),
    prisma.productVariant.create({
      data: {
        product_id: prodPijama.id,
        sku_suffix: "M-UNISEX-VERDE",
        size: "M",
        gender: "UNISEX",
        color: "Verde",
        current_stock: 0,
      },
    }),
    prisma.productVariant.create({
      data: {
        product_id: prodPijama.id,
        sku_suffix: "L-UNISEX-VERDE",
        size: "L",
        gender: "UNISEX",
        color: "Verde",
        current_stock: 0,
      },
    }),
  ]);

  // --- Bata Médica ---
  const prodBata = await prisma.product.create({
    data: {
      sku: "BAT-MED",
      name: "Bata Médica",
      description: "Bata blanca manga larga con botones. Algodón-poliéster.",
      category: "MEDICAL_GARMENT",
      garment_type: "BATA",
      warehouse_area: "MEDICAL",
      min_stock: 5,
    },
  });

  const [batMF, batLM, batXLM] = await Promise.all([
    prisma.productVariant.create({
      data: {
        product_id: prodBata.id,
        sku_suffix: "M-FEMENINO-BLANCO",
        size: "M",
        gender: "FEMENINO",
        color: "Blanco",
        current_stock: 0,
      },
    }),
    prisma.productVariant.create({
      data: {
        product_id: prodBata.id,
        sku_suffix: "L-MASCULINO-BLANCO",
        size: "L",
        gender: "MASCULINO",
        color: "Blanco",
        current_stock: 0,
      },
    }),
    prisma.productVariant.create({
      data: {
        product_id: prodBata.id,
        sku_suffix: "XL-MASCULINO-BLANCO",
        size: "XL",
        gender: "MASCULINO",
        color: "Blanco",
        current_stock: 0,
      },
    }),
  ]);

  // --- Mandil de Laboratorio ---
  const prodMandil = await prisma.product.create({
    data: {
      sku: "MAN-LAB",
      name: "Mandil de Laboratorio",
      description: "Mandil protector para prácticas de laboratorio.",
      category: "MEDICAL_GARMENT",
      garment_type: "MANDIL",
      warehouse_area: "MEDICAL",
      min_stock: 5,
    },
  });

  const [manMB, manLB] = await Promise.all([
    prisma.productVariant.create({
      data: {
        product_id: prodMandil.id,
        sku_suffix: "M-UNISEX-BLANCO",
        size: "M",
        gender: "UNISEX",
        color: "Blanco",
        current_stock: 0, // STOCK BAJO — orden pendiente
      },
    }),
    prisma.productVariant.create({
      data: {
        product_id: prodMandil.id,
        sku_suffix: "L-UNISEX-BLANCO",
        size: "L",
        gender: "UNISEX",
        color: "Blanco",
        current_stock: 0, // STOCK BAJO — orden pendiente
      },
    }),
  ]);

  // --- Gorro Quirúrgico (producto inactivo para probar filtros) ---
  const prodGorro = await prisma.product.create({
    data: {
      sku: "GOR-QUI",
      name: "Gorro Quirúrgico",
      description: "Gorro desechable para sala de operaciones.",
      category: "MEDICAL_GARMENT",
      garment_type: "GORRO",
      warehouse_area: "MEDICAL",
      min_stock: 10,
      is_active: false,
    },
  });

  await prisma.productVariant.create({
    data: {
      product_id: prodGorro.id,
      sku_suffix: "M-UNISEX-CELESTE",
      size: "M",
      gender: "UNISEX",
      color: "Celeste",
      current_stock: 0,
      is_active: false,
    },
  });

  // ===========================================================================
  // 6. PRODUCTOS — MATERIAL DE OFICINA
  // ===========================================================================
  console.log("Creando productos de oficina...");

  const prodResma = await prisma.product.create({
    data: {
      sku: "RES-A4",
      name: "Resma Papel A4 75g",
      description: "Resma de 500 hojas papel bond tamaño carta.",
      category: "OFFICE_SUPPLY",
      warehouse_area: "OFFICE",
      min_stock: 10,
    },
  });
  const varResma = await prisma.productVariant.create({
    data: {
      product_id: prodResma.id,
      sku_suffix: "DEFAULT",
      current_stock: 0,
    },
  });

  const prodToner = await prisma.product.create({
    data: {
      sku: "TON-HP",
      name: "Tóner HP LaserJet 85A",
      description: "Cartucho de tóner negro compatible con HP LaserJet P1102.",
      category: "OFFICE_SUPPLY",
      warehouse_area: "OFFICE",
      min_stock: 5,
    },
  });
  const varToner = await prisma.productVariant.create({
    data: {
      product_id: prodToner.id,
      sku_suffix: "DEFAULT",
      current_stock: 0,
    },
  });

  const prodCuaderno = await prisma.product.create({
    data: {
      sku: "CUA-UNI",
      name: "Cuaderno Universitario 100 Hojas",
      category: "OFFICE_SUPPLY",
      warehouse_area: "OFFICE",
      min_stock: 5,
    },
  });
  const varCuaderno = await prisma.productVariant.create({
    data: {
      product_id: prodCuaderno.id,
      sku_suffix: "DEFAULT",
      current_stock: 0,
    },
  });

  // ===========================================================================
  // 7. ÓRDENES DE FABRICACIÓN
  // ===========================================================================
  console.log("Creando órdenes de fabricación...");

  // ORD-001: COMPLETED — Pijamas entregados completamente
  const ord001 = await prisma.manufactureOrder.create({
    data: {
      order_number: "ORD-20260101-0001",
      manufacturer_id: mfgBoliviana.id,
      status: "PENDING",
      notes: "Pedido inicial de pijamas quirúrgicos para el semestre.",
      ordered_at: new Date("2026-01-10"),
      expected_at: new Date("2026-02-10"),
      completed_at: new Date("2026-02-08"),
    },
  });

  await Promise.all([
    prisma.manufactureOrderItem.create({
      data: {
        manufacture_order_id: ord001.id,
        product_variant_id: pijMA.id,
        quantity_ordered: 20,
        quantity_received: 0,
        unit_cost: 85.0,
      },
    }),
    prisma.manufactureOrderItem.create({
      data: {
        manufacture_order_id: ord001.id,
        product_variant_id: pijLA.id,
        quantity_ordered: 15,
        quantity_received: 0,
        unit_cost: 90.0,
      },
    }),
    prisma.manufactureOrderItem.create({
      data: {
        manufacture_order_id: ord001.id,
        product_variant_id: pijMV.id,
        quantity_ordered: 12,
        quantity_received: 0,
        unit_cost: 85.0,
      },
    }),
    prisma.manufactureOrderItem.create({
      data: {
        manufacture_order_id: ord001.id,
        product_variant_id: pijLV.id,
        quantity_ordered: 8,
        quantity_received: 0,
        unit_cost: 90.0,
      },
    }),
  ]);

  // ORD-002: IN_PROGRESS — Batas con recepción parcial
  const ord002 = await prisma.manufactureOrder.create({
    data: {
      order_number: "ORD-20260215-0001",
      manufacturer_id: mfgMediWear.id,
      status: "PENDING",
      notes: "Batas para el Hospital Universitario. Entrega parcial aceptada.",
      ordered_at: new Date("2026-02-15"),
      expected_at: new Date("2026-03-30"),
    },
  });

  await Promise.all([
    prisma.manufactureOrderItem.create({
      data: {
        manufacture_order_id: ord002.id,
        product_variant_id: batMF.id,
        quantity_ordered: 15,
        quantity_received: 0,
        unit_cost: 120.0,
      },
    }),
    prisma.manufactureOrderItem.create({
      data: {
        manufacture_order_id: ord002.id,
        product_variant_id: batLM.id,
        quantity_ordered: 10,
        quantity_received: 0,
        unit_cost: 130.0,
      },
    }),
    prisma.manufactureOrderItem.create({
      data: {
        manufacture_order_id: ord002.id,
        product_variant_id: batXLM.id,
        quantity_ordered: 8,
        quantity_received: 0,
        unit_cost: 135.0,
      },
    }),
  ]);

  // ORD-003: PENDING — Mandiles sin iniciar producción
  const ord003 = await prisma.manufactureOrder.create({
    data: {
      order_number: "ORD-20260310-0001",
      manufacturer_id: mfgBoliviana.id,
      status: "PENDING",
      notes: "Mandiles para laboratorio de Bioquímica.",
      ordered_at: new Date("2026-03-10"),
      expected_at: new Date("2026-04-15"),
    },
  });

  await Promise.all([
    prisma.manufactureOrderItem.create({
      data: {
        manufacture_order_id: ord003.id,
        product_variant_id: manMB.id,
        quantity_ordered: 20,
        quantity_received: 0,
        unit_cost: 65.0,
      },
    }),
    prisma.manufactureOrderItem.create({
      data: {
        manufacture_order_id: ord003.id,
        product_variant_id: manLB.id,
        quantity_ordered: 15,
        quantity_received: 0,
        unit_cost: 70.0,
      },
    }),
  ]);

  // ORD-004: CANCELLED
  await prisma.manufactureOrder.create({
    data: {
      order_number: "ORD-20260105-0001",
      manufacturer_id: mfgTexSur.id,
      status: "CANCELLED",
      notes: "Poleras para evento institucional.",
      cancel_reason: "Fabricante dejó de operar. Se reasignará a otro taller.",
      ordered_at: new Date("2026-01-05"),
      expected_at: new Date("2026-02-05"),
      cancelled_at: new Date("2026-01-20"),
    },
  });

  // ===========================================================================
  // 8. MOVIMIENTOS DE INVENTARIO
  // ===========================================================================
  console.log("Creando movimientos de inventario...");

  await createSeedMovement({
    movement_number: "MOV-20260208-0001",
    movement_type: "ENTRY",
    status: "CONFIRMED",
    notes: "Recepción completa de pijamas quirúrgicos.",
    manufacture_order_id: ord001.id,
    processed_by: manager.id,
    processed_at: new Date("2026-02-08"),
    created_at: new Date("2026-02-08"),
    items: [
      { product_variant_id: pijMA.id, quantity: 20, unit_price: 85 },
      { product_variant_id: pijLA.id, quantity: 15, unit_price: 90 },
      { product_variant_id: pijMV.id, quantity: 12, unit_price: 85 },
      { product_variant_id: pijLV.id, quantity: 8, unit_price: 90 },
    ],
  });

  await createSeedMovement({
    movement_number: "MOV-20260305-0001",
    movement_type: "ENTRY",
    status: "CONFIRMED",
    notes: "Primera entrega parcial de batas médicas.",
    manufacture_order_id: ord002.id,
    processed_by: manager.id,
    processed_at: new Date("2026-03-05"),
    created_at: new Date("2026-03-05"),
    items: [
      { product_variant_id: batMF.id, quantity: 8, unit_price: 120 },
      { product_variant_id: batLM.id, quantity: 6, unit_price: 130 },
      { product_variant_id: batXLM.id, quantity: 3, unit_price: 135 },
    ],
  });

  await createSeedMovement({
    movement_number: "MOV-20260115-0001",
    movement_type: "ADJUSTMENT",
    status: "CONFIRMED",
    notes: "Carga inicial de stock de material de oficina.",
    processed_by: manager.id,
    processed_at: new Date("2026-01-15"),
    created_at: new Date("2026-01-15"),
    items: [
      { product_variant_id: varResma.id, quantity: 60 },
      { product_variant_id: varToner.id, quantity: 5 },
      { product_variant_id: varCuaderno.id, quantity: 30 },
    ],
  });

  await createSeedMovement({
    movement_number: "MOV-20260220-0001",
    movement_type: "SALE",
    status: "CONFIRMED",
    recipient_id: recMaria.id,
    processed_by: manager.id,
    processed_at: new Date("2026-02-20"),
    created_at: new Date("2026-02-20"),
    items: [
      { product_variant_id: pijMA.id, quantity: 2, unit_price: 150 },
      { product_variant_id: pijLV.id, quantity: 4, unit_price: 150 },
    ],
  });

  await createSeedMovement({
    movement_number: "MOV-20260225-0001",
    movement_type: "DONATION",
    status: "CONFIRMED",
    recipient_id: recAna.id,
    processed_by: manager.id,
    processed_at: new Date("2026-02-25"),
    created_at: new Date("2026-02-25"),
    items: [
      { product_variant_id: pijMA.id, quantity: 1 },
      { product_variant_id: pijMV.id, quantity: 1 },
    ],
  });

  await createSeedMovement({
    movement_number: "MOV-20260301-0001",
    movement_type: "DEPARTMENT_DELIVERY",
    status: "CONFIRMED",
    department_id: deptAdmin.id,
    processed_by: manager.id,
    processed_at: new Date("2026-03-01"),
    created_at: new Date("2026-03-01"),
    items: [
      { product_variant_id: varResma.id, quantity: 10 },
      { product_variant_id: varToner.id, quantity: 3 },
    ],
  });

  await createSeedMovement({
    movement_number: "MOV-20260310-0001",
    movement_type: "WRITE_OFF",
    status: "CONFIRMED",
    notes:
      "Pijama con defecto de fábrica detectado en revisión. Bata dañada por derrame químico.",
    processed_by: manager.id,
    processed_at: new Date("2026-03-10"),
    created_at: new Date("2026-03-10"),
    items: [
      { product_variant_id: pijMA.id, quantity: 1 },
      { product_variant_id: batXLM.id, quantity: 1 },
    ],
  });

  await createSeedMovement({
    movement_number: "MOV-20260312-0001",
    movement_type: "ADJUSTMENT",
    status: "CONFIRMED",
    notes:
      "Corrección tras conteo físico. Se encontraron 2 pijamas verdes M no registrados.",
    processed_by: admin.id,
    processed_at: new Date("2026-03-12"),
    created_at: new Date("2026-03-12"),
    items: [{ product_variant_id: pijLV.id, quantity: -2 }],
  });

  await createSeedMovement({
    movement_number: "MOV-20260320-0001",
    movement_type: "SALE",
    status: "DRAFT",
    recipient_id: recCarlos.id,
    processed_by: manager.id,
    created_at: new Date("2026-03-20"),
    items: [{ product_variant_id: pijLA.id, quantity: 2, unit_price: 150 }],
  });

  await createSeedMovement({
    movement_number: "MOV-20260321-0001",
    movement_type: "DONATION",
    status: "DRAFT",
    recipient_id: recPedro.id,
    processed_by: manager.id,
    created_at: new Date("2026-03-21"),
    items: [{ product_variant_id: batMF.id, quantity: 1 }],
  });

  await createSeedMovement({
    movement_number: "MOV-20260118-0001",
    movement_type: "SALE",
    status: "CANCELLED",
    recipient_id: recRoberto.id,
    processed_by: manager.id,
    created_at: new Date("2026-01-18"),
    cancelled_at: new Date("2026-01-20"),
    cancel_reason: "El destinatario ya no requiere los artículos solicitados.",
  });

  // ===========================================================================
  // RESUMEN
  // ===========================================================================
  console.log("");
  console.log("=== SEED COMPLETADO ===");
  console.log("");
  console.log("Credenciales de acceso:");
  console.log("  ADMIN:              admin@upds.edu.bo / Admin123!");
  console.log("  INVENTORY_MANAGER:  inventario@upds.edu.bo / Inventario123!");
  console.log("  VIEWER:             consulta@upds.edu.bo / Consulta123!");
  console.log("");
  console.log("Datos creados:");
  console.log("  3 usuarios (ADMIN, INVENTORY_MANAGER, VIEWER)");
  console.log("  3 fabricantes (2 activos, 1 inactivo)");
  console.log("  5 departamentos");
  console.log("  5 destinatarios (2 STUDENT, 1 STAFF, 2 SCHOLAR)");
  console.log("  7 productos (4 MEDICAL_GARMENT, 3 OFFICE_SUPPLY)");
  console.log("    - 1 producto inactivo (Gorro Quirúrgico)");
  console.log("    - 5 variantes con stock bajo");
  console.log(
    "  4 órdenes de fabricación (COMPLETED, IN_PROGRESS, PENDING, CANCELLED)",
  );
  console.log("  11 movimientos de inventario:");
  console.log("    - 2 ENTRY confirmados");
  console.log("    - 2 ADJUSTMENT confirmados");
  console.log("    - 1 SALE confirmado");
  console.log("    - 1 DONATION confirmado");
  console.log("    - 1 DEPARTMENT_DELIVERY confirmado");
  console.log("    - 1 WRITE_OFF confirmado");
  console.log("    - 1 SALE en borrador (listo para confirmar)");
  console.log("    - 1 DONATION en borrador (listo para confirmar)");
  console.log("    - 1 SALE cancelado");
  console.log("");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
