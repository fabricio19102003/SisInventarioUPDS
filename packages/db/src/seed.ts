import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";

const prisma = new PrismaClient();

function hashPassword(plain: string): string {
  return createHash("sha256").update(plain).digest("hex");
}

async function main(): Promise<void> {
  console.log("Iniciando seed de base de datos...");

  const admin = await prisma.user.upsert({
    where: { email: "admin@upds.edu.bo" },
    update: {},
    create: {
      email: "admin@upds.edu.bo",
      password_hash: hashPassword("Admin1234!"),
      full_name: "Administrador del Sistema",
      role: "ADMIN",
      is_active: true,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "inventario@upds.edu.bo" },
    update: {},
    create: {
      email: "inventario@upds.edu.bo",
      password_hash: hashPassword("Manager1234!"),
      full_name: "Encargado de Inventario",
      role: "INVENTORY_MANAGER",
      is_active: true,
    },
  });

  console.log(`Usuarios creados: ${admin.email}, ${manager.email}`);

  const fabricante1 = await prisma.manufacturer.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Confecciones Medicas Bolivia",
      contact_name: "Juan Flores",
      phone: "75512345",
      email: "contacto@confmedbolivia.com",
      address: "Calle Comercio 123, Santa Cruz",
      is_active: true,
    },
  });

  const fabricante2 = await prisma.manufacturer.upsert({
    where: { id: "00000000-0000-0000-0000-000000000002" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Taller Textil del Este",
      contact_name: "Maria Lopez",
      phone: "70098765",
      is_active: true,
    },
  });

  console.log(`Fabricantes creados: ${fabricante1.name}, ${fabricante2.name}`);

  const deptRectorado = await prisma.department.upsert({
    where: { code: "RECT" },
    update: {},
    create: {
      name: "Rectorado",
      code: "RECT",
      is_active: true,
    },
  });

  const deptAcademica = await prisma.department.upsert({
    where: { code: "ACAD" },
    update: {},
    create: {
      name: "Direccion Academica",
      code: "ACAD",
      is_active: true,
    },
  });

  const deptAdministracion = await prisma.department.upsert({
    where: { code: "ADMN" },
    update: {},
    create: {
      name: "Administracion",
      code: "ADMN",
      is_active: true,
    },
  });

  const deptSalud = await prisma.department.upsert({
    where: { code: "SLUD" },
    update: {},
    create: {
      name: "Salud Universitaria",
      code: "SLUD",
      is_active: true,
    },
  });

  console.log(
    `Departamentos creados: ${deptRectorado.name}, ${deptAcademica.name}, ${deptAdministracion.name}, ${deptSalud.name}`,
  );

  const estudiante1 = await prisma.recipient.upsert({
    where: { document_number: "9876543" },
    update: {},
    create: {
      document_number: "9876543",
      full_name: "Carlos Mamani Quispe",
      type: "STUDENT",
      career: "Medicina",
      is_active: true,
    },
  });

  const becario1 = await prisma.recipient.upsert({
    where: { document_number: "8765432" },
    update: {},
    create: {
      document_number: "8765432",
      full_name: "Ana Rojas Vargas",
      type: "SCHOLAR",
      career: "Enfermeria",
      is_active: true,
    },
  });

  const personal1 = await prisma.recipient.upsert({
    where: { document_number: "7654321" },
    update: {},
    create: {
      document_number: "7654321",
      full_name: "Dr. Pedro Salinas",
      type: "STAFF",
      is_active: true,
    },
  });

  console.log(
    `Destinatarios creados: ${estudiante1.full_name}, ${becario1.full_name}, ${personal1.full_name}`,
  );

  console.log("Seed completado exitosamente.");
}

main()
  .catch((e) => {
    console.error("Error en seed:", e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
