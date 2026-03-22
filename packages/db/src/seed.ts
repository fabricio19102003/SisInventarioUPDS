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
        current_stock: 16,
      },
    }),
    prisma.productVariant.create({
      data: {
        product_id: prodPijama.id,
        sku_suffix: "L-UNISEX-AZUL",
        size: "L",
        gender: "UNISEX",
        color: "Azul",
        current_stock: 15,
      },
    }),
    prisma.productVariant.create({
      data: {
        product_id: prodPijama.id,
        sku_suffix: "M-UNISEX-VERDE",
        size: "M",
        gender: "UNISEX",
        color: "Verde",
        current_stock: 11,
      },
    }),
    prisma.productVariant.create({
      data: {
        product_id: prodPijama.id,
        sku_suffix: "L-UNISEX-VERDE",
        size: "L",
        gender: "UNISEX",
        color: "Verde",
        current_stock: 2, // STOCK BAJO
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
        current_stock: 8,
      },
    }),
    prisma.productVariant.create({
      data: {
        product_id: prodBata.id,
        sku_suffix: "L-MASCULINO-BLANCO",
        size: "L",
        gender: "MASCULINO",
        color: "Blanco",
        current_stock: 6,
      },
    }),
    prisma.productVariant.create({
      data: {
        product_id: prodBata.id,
        sku_suffix: "XL-MASCULINO-BLANCO",
        size: "XL",
        gender: "MASCULINO",
        color: "Blanco",
        current_stock: 2, // STOCK BAJO
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
      current_stock: 50,
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
      current_stock: 2, // STOCK BAJO
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
      current_stock: 30,
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
      status: "COMPLETED",
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
        quantity_received: 20,
        unit_cost: 85.0,
      },
    }),
    prisma.manufactureOrderItem.create({
      data: {
        manufacture_order_id: ord001.id,
        product_variant_id: pijLA.id,
        quantity_ordered: 15,
        quantity_received: 15,
        unit_cost: 90.0,
      },
    }),
    prisma.manufactureOrderItem.create({
      data: {
        manufacture_order_id: ord001.id,
        product_variant_id: pijMV.id,
        quantity_ordered: 12,
        quantity_received: 12,
        unit_cost: 85.0,
      },
    }),
    prisma.manufactureOrderItem.create({
      data: {
        manufacture_order_id: ord001.id,
        product_variant_id: pijLV.id,
        quantity_ordered: 8,
        quantity_received: 8,
        unit_cost: 90.0,
      },
    }),
  ]);

  // ORD-002: IN_PROGRESS — Batas con recepción parcial
  const ord002 = await prisma.manufactureOrder.create({
    data: {
      order_number: "ORD-20260215-0001",
      manufacturer_id: mfgMediWear.id,
      status: "IN_PROGRESS",
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
        quantity_received: 8,
        unit_cost: 120.0,
      },
    }),
    prisma.manufactureOrderItem.create({
      data: {
        manufacture_order_id: ord002.id,
        product_variant_id: batLM.id,
        quantity_ordered: 10,
        quantity_received: 6,
        unit_cost: 130.0,
      },
    }),
    prisma.manufactureOrderItem.create({
      data: {
        manufacture_order_id: ord002.id,
        product_variant_id: batXLM.id,
        quantity_ordered: 8,
        quantity_received: 3,
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
      cancel_reason:
        "Fabricante dejó de operar. Se reasignará a otro taller.",
      ordered_at: new Date("2026-01-05"),
      expected_at: new Date("2026-02-05"),
      cancelled_at: new Date("2026-01-20"),
    },
  });

  // ===========================================================================
  // 8. MOVIMIENTOS DE INVENTARIO
  // ===========================================================================
  console.log("Creando movimientos de inventario...");

  // --- MOV-001: ENTRY CONFIRMED — Recepción de pijamas (ORD-001) ---
  const mov001 = await prisma.inventoryMovement.create({
    data: {
      movement_number: "MOV-20260208-0001",
      movement_type: "ENTRY",
      status: "CONFIRMED",
      notes: "Recepción completa de pijamas quirúrgicos.",
      manufacture_order_id: ord001.id,
      processed_by: manager.id,
      total_amount: 5495.0, // 20*85 + 15*90 + 12*85 + 8*90
      processed_at: new Date("2026-02-08"),
      created_at: new Date("2026-02-08"),
    },
  });

  await Promise.all([
    prisma.movementItem.create({
      data: {
        inventory_movement_id: mov001.id,
        product_variant_id: pijMA.id,
        quantity: 20,
        unit_price: 85.0,
        subtotal: 1700.0,
      },
    }),
    prisma.movementItem.create({
      data: {
        inventory_movement_id: mov001.id,
        product_variant_id: pijLA.id,
        quantity: 15,
        unit_price: 90.0,
        subtotal: 1350.0,
      },
    }),
    prisma.movementItem.create({
      data: {
        inventory_movement_id: mov001.id,
        product_variant_id: pijMV.id,
        quantity: 12,
        unit_price: 85.0,
        subtotal: 1020.0,
      },
    }),
    prisma.movementItem.create({
      data: {
        inventory_movement_id: mov001.id,
        product_variant_id: pijLV.id,
        quantity: 8,
        unit_price: 90.0,
        subtotal: 720.0,
      },
    }),
  ]);

  // --- MOV-002: ENTRY CONFIRMED — Recepción parcial batas (ORD-002) ---
  const mov002 = await prisma.inventoryMovement.create({
    data: {
      movement_number: "MOV-20260305-0001",
      movement_type: "ENTRY",
      status: "CONFIRMED",
      notes: "Primera entrega parcial de batas médicas.",
      manufacture_order_id: ord002.id,
      processed_by: manager.id,
      total_amount: 2145.0, // 8*120 + 6*130 + 3*135
      processed_at: new Date("2026-03-05"),
      created_at: new Date("2026-03-05"),
    },
  });

  await Promise.all([
    prisma.movementItem.create({
      data: {
        inventory_movement_id: mov002.id,
        product_variant_id: batMF.id,
        quantity: 8,
        unit_price: 120.0,
        subtotal: 960.0,
      },
    }),
    prisma.movementItem.create({
      data: {
        inventory_movement_id: mov002.id,
        product_variant_id: batLM.id,
        quantity: 6,
        unit_price: 130.0,
        subtotal: 780.0,
      },
    }),
    prisma.movementItem.create({
      data: {
        inventory_movement_id: mov002.id,
        product_variant_id: batXLM.id,
        quantity: 3,
        unit_price: 135.0,
        subtotal: 405.0,
      },
    }),
  ]);

  // --- MOV-003: ENTRY CONFIRMED — Ingreso material de oficina (Adjustment) ---
  const mov003 = await prisma.inventoryMovement.create({
    data: {
      movement_number: "MOV-20260115-0001",
      movement_type: "ADJUSTMENT",
      status: "CONFIRMED",
      notes: "Carga inicial de stock de material de oficina.",
      processed_by: manager.id,
      total_amount: 0,
      processed_at: new Date("2026-01-15"),
      created_at: new Date("2026-01-15"),
    },
  });

  await Promise.all([
    prisma.movementItem.create({
      data: {
        inventory_movement_id: mov003.id,
        product_variant_id: varResma.id,
        quantity: 60,
      },
    }),
    prisma.movementItem.create({
      data: {
        inventory_movement_id: mov003.id,
        product_variant_id: varToner.id,
        quantity: 5,
      },
    }),
    prisma.movementItem.create({
      data: {
        inventory_movement_id: mov003.id,
        product_variant_id: varCuaderno.id,
        quantity: 30,
      },
    }),
  ]);

  // --- MOV-004: SALE CONFIRMED — Venta a estudiante ---
  const mov004 = await prisma.inventoryMovement.create({
    data: {
      movement_number: "MOV-20260220-0001",
      movement_type: "SALE",
      status: "CONFIRMED",
      recipient_id: recMaria.id,
      processed_by: manager.id,
      total_amount: 900.0, // 2*150 + 4*150
      processed_at: new Date("2026-02-20"),
      created_at: new Date("2026-02-20"),
    },
  });

  await Promise.all([
    prisma.movementItem.create({
      data: {
        inventory_movement_id: mov004.id,
        product_variant_id: pijMA.id,
        quantity: 2,
        unit_price: 150.0,
        subtotal: 300.0,
      },
    }),
    prisma.movementItem.create({
      data: {
        inventory_movement_id: mov004.id,
        product_variant_id: pijLV.id,
        quantity: 4,
        unit_price: 150.0,
        subtotal: 600.0,
      },
    }),
  ]);

  // --- MOV-005: DONATION CONFIRMED — Dotación a becario ---
  const mov005 = await prisma.inventoryMovement.create({
    data: {
      movement_number: "MOV-20260225-0001",
      movement_type: "DONATION",
      status: "CONFIRMED",
      is_donated: true,
      recipient_id: recAna.id,
      processed_by: manager.id,
      total_amount: 0,
      processed_at: new Date("2026-02-25"),
      created_at: new Date("2026-02-25"),
    },
  });

  await Promise.all([
    prisma.movementItem.create({
      data: {
        inventory_movement_id: mov005.id,
        product_variant_id: pijMA.id,
        quantity: 1,
      },
    }),
    prisma.movementItem.create({
      data: {
        inventory_movement_id: mov005.id,
        product_variant_id: pijMV.id,
        quantity: 1,
      },
    }),
  ]);

  // --- MOV-006: DEPARTMENT_DELIVERY CONFIRMED — Entrega a departamento ---
  const mov006 = await prisma.inventoryMovement.create({
    data: {
      movement_number: "MOV-20260301-0001",
      movement_type: "DEPARTMENT_DELIVERY",
      status: "CONFIRMED",
      department_id: deptAdmin.id,
      processed_by: manager.id,
      total_amount: 0,
      processed_at: new Date("2026-03-01"),
      created_at: new Date("2026-03-01"),
    },
  });

  await Promise.all([
    prisma.movementItem.create({
      data: {
        inventory_movement_id: mov006.id,
        product_variant_id: varResma.id,
        quantity: 10,
      },
    }),
    prisma.movementItem.create({
      data: {
        inventory_movement_id: mov006.id,
        product_variant_id: varToner.id,
        quantity: 3,
      },
    }),
  ]);

  // --- MOV-007: WRITE_OFF CONFIRMED — Baja por deterioro ---
  const mov007 = await prisma.inventoryMovement.create({
    data: {
      movement_number: "MOV-20260310-0001",
      movement_type: "WRITE_OFF",
      status: "CONFIRMED",
      notes:
        "Pijama con defecto de fábrica detectado en revisión. Bata dañada por derrame químico.",
      processed_by: manager.id,
      total_amount: 0,
      processed_at: new Date("2026-03-10"),
      created_at: new Date("2026-03-10"),
    },
  });

  await Promise.all([
    prisma.movementItem.create({
      data: {
        inventory_movement_id: mov007.id,
        product_variant_id: pijMA.id,
        quantity: 1,
      },
    }),
    prisma.movementItem.create({
      data: {
        inventory_movement_id: mov007.id,
        product_variant_id: batXLM.id,
        quantity: 1,
      },
    }),
  ]);

  // --- MOV-008: ADJUSTMENT CONFIRMED — Corrección de inventario ---
  const mov008 = await prisma.inventoryMovement.create({
    data: {
      movement_number: "MOV-20260312-0001",
      movement_type: "ADJUSTMENT",
      status: "CONFIRMED",
      notes:
        "Corrección tras conteo físico. Se encontraron 2 pijamas verdes M no registrados.",
      processed_by: admin.id,
      total_amount: 0,
      processed_at: new Date("2026-03-12"),
      created_at: new Date("2026-03-12"),
    },
  });

  await prisma.movementItem.create({
    data: {
      inventory_movement_id: mov008.id,
      product_variant_id: pijLV.id,
      quantity: -2, // Ajuste negativo
    },
  });

  // --- MOV-009: SALE DRAFT — Venta pendiente (para probar confirmar) ---
  const mov009 = await prisma.inventoryMovement.create({
    data: {
      movement_number: "MOV-20260320-0001",
      movement_type: "SALE",
      status: "DRAFT",
      recipient_id: recCarlos.id,
      processed_by: manager.id,
      total_amount: 300.0,
      created_at: new Date("2026-03-20"),
    },
  });

  await prisma.movementItem.create({
    data: {
      inventory_movement_id: mov009.id,
      product_variant_id: pijLA.id,
      quantity: 2,
      unit_price: 150.0,
      subtotal: 300.0,
    },
  });

  // --- MOV-010: DONATION DRAFT — Dotación pendiente (para probar confirmar) ---
  const mov010 = await prisma.inventoryMovement.create({
    data: {
      movement_number: "MOV-20260321-0001",
      movement_type: "DONATION",
      status: "DRAFT",
      is_donated: true,
      recipient_id: recPedro.id,
      processed_by: manager.id,
      total_amount: 0,
      created_at: new Date("2026-03-21"),
    },
  });

  await prisma.movementItem.create({
    data: {
      inventory_movement_id: mov010.id,
      product_variant_id: batMF.id,
      quantity: 1,
    },
  });

  // --- MOV-011: ENTRY CANCELLED — Entrada cancelada ---
  await prisma.inventoryMovement.create({
    data: {
      movement_number: "MOV-20260118-0001",
      movement_type: "SALE",
      status: "CANCELLED",
      recipient_id: recRoberto.id,
      processed_by: manager.id,
      total_amount: 0,
      cancel_reason: "El destinatario ya no requiere los artículos solicitados.",
      cancelled_at: new Date("2026-01-20"),
      created_at: new Date("2026-01-18"),
    },
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
  console.log("  4 órdenes de fabricación (COMPLETED, IN_PROGRESS, PENDING, CANCELLED)");
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
