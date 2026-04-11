# Sistema de Control de Inventarios — UPDS

Sistema de gestión de inventarios para la **Unidad de Bienes, Servicios y Compras** de la Universidad Privada Domingo Savio (UPDS).

Gestiona dos áreas de almacén:

- **Indumentaria Médica** — Pijamas, batas, mandiles, poleras, gorros quirúrgicos (control por talla, género y color).
- **Materiales de Oficina** — Papelería e insumos para departamentos internos.

---

## Stack Tecnológico

| Tecnología                                     | Versión   | Uso                                              |
| ---------------------------------------------- | --------- | ------------------------------------------------ |
| [Next.js](https://nextjs.org/)                 | ^15.1     | Framework web (App Router + Server Actions)      |
| [React](https://react.dev/)                    | ^19.0     | UI                                               |
| [TypeScript](https://www.typescriptlang.org/)  | ^5.7      | Lenguaje — modo estricto en todo el proyecto     |
| [Prisma](https://www.prisma.io/)               | ^6.1      | ORM + migraciones                                |
| [PostgreSQL](https://www.postgresql.org/)      | 15+       | Base de datos                                    |
| [NextAuth v5](https://authjs.dev/)             | ^5.0-beta | Autenticación (JWT, Credentials)                 |
| [Zod](https://zod.dev/)                        | ^3.24     | Validación de schemas                            |
| [Tailwind CSS](https://tailwindcss.com/)       | ^3.4      | Estilos                                          |
| [Shadcn UI](https://ui.shadcn.com/) + Radix UI | —         | Componentes de UI                                |
| [Turborepo](https://turbo.build/)              | ^2.3      | Monorepo + caché de tareas                       |
| [pnpm](https://pnpm.io/)                       | 9.15      | Gestor de paquetes                               |
| [Vitest](https://vitest.dev/)                  | ^4.1      | Testing (packages/services, packages/validators) |
| [ExcelJS](https://github.com/exceljs/exceljs)  | ^4.4      | Exportación de reportes a Excel                  |

---

## Estructura del Monorepo

```
/
├── apps/
│   ├── web/          # App principal (Next.js) — gestión de inventario, movimientos y reportes
│   └── admin/        # Panel administrativo técnico (Next.js) — gestión de usuarios y auditoría
│
├── packages/
│   ├── db/           # Esquema Prisma + cliente PostgreSQL compartido
│   ├── services/     # Lógica de negocio pura (sin dependencias de framework)
│   ├── validators/   # Schemas Zod + matriz de permisos por rol
│   ├── ui/           # Componentes React compartidos (Tailwind + Shadcn UI)
│   └── types/        # Tipos TypeScript compartidos entre apps
│
├── turbo.json        # Configuración de tareas y caché de Turborepo
├── pnpm-workspace.yaml
└── package.json      # Scripts raíz del monorepo
```

---

## Prerrequisitos

- **Node.js** >= 20.0.0
- **pnpm** >= 9.0.0
- **PostgreSQL** 15+

---

## Primeros Pasos

### 1. Clonar el repositorio

```bash
git clone <repo-url>
cd SisInventarioUPDS
```

### 2. Instalar dependencias

```bash
pnpm install
```

### 3. Configurar variables de entorno

```bash
# App web principal
cp apps/web/.env.example apps/web/.env

# Panel administrativo
cp apps/admin/.env.example apps/admin/.env

# Base de datos
cp packages/db/.env.example packages/db/.env
```

Editar cada archivo `.env` con los valores correspondientes. Ver la sección [Variables de Entorno](#variables-de-entorno) para referencia.

### 4. Generar el cliente Prisma

```bash
pnpm db:generate
```

### 5. Ejecutar migraciones

```bash
pnpm db:migrate
```

### 6. Cargar datos de prueba (opcional)

```bash
pnpm db:seed
```

### 7. Iniciar en desarrollo

```bash
# Ambas apps en paralelo
pnpm dev

# Solo la app web (puerto 3000)
pnpm dev:web

# Solo el panel admin (puerto 3001)
pnpm dev:admin
```

---

## Scripts Disponibles

### Raíz del monorepo

| Script             | Descripción                                                    |
| ------------------ | -------------------------------------------------------------- |
| `pnpm dev`         | Inicia `web` (puerto 3000) y `admin` (puerto 3001) en paralelo |
| `pnpm dev:web`     | Inicia solo la app web                                         |
| `pnpm dev:admin`   | Inicia solo el panel administrativo                            |
| `pnpm build`       | Compila todas las apps y packages                              |
| `pnpm lint`        | Ejecuta ESLint en todo el proyecto                             |
| `pnpm type-check`  | Verifica tipos TypeScript en todo el proyecto                  |
| `pnpm test`        | Ejecuta todos los tests                                        |
| `pnpm db:generate` | Genera el cliente Prisma                                       |
| `pnpm db:push`     | Sincroniza el schema con la DB (sin migraciones)               |
| `pnpm db:migrate`  | Ejecuta migraciones pendientes                                 |
| `pnpm db:seed`     | Carga datos de prueba                                          |
| `pnpm db:studio`   | Abre Prisma Studio (explorador de DB)                          |
| `pnpm format`      | Formatea todos los archivos con Prettier                       |
| `pnpm clean`       | Limpia artefactos de build y caché                             |

---

## Apps

### `apps/web` — Aplicación Principal

| Ítem      | Valor                                                                                     |
| --------- | ----------------------------------------------------------------------------------------- |
| URL local | http://localhost:3000                                                                     |
| Framework | Next.js 15 (App Router)                                                                   |
| Propósito | Gestión completa del inventario: productos, movimientos, órdenes de fabricación, reportes |

### `apps/admin` — Panel Administrativo

| Ítem      | Valor                                                                                         |
| --------- | --------------------------------------------------------------------------------------------- |
| URL local | http://localhost:3001                                                                         |
| Framework | Next.js 15 (App Router)                                                                       |
| Propósito | Administración técnica: gestión de usuarios, consulta de auditoría, configuración del sistema |

---

## Variables de Entorno

### `apps/web/.env`

| Variable       | Requerida | Descripción                                           |
| -------------- | :-------: | ----------------------------------------------------- |
| `DATABASE_URL` |     ✓     | Cadena de conexión PostgreSQL                         |
| `AUTH_SECRET`  |     ✓     | Clave secreta para firmar tokens JWT (NextAuth v5)    |
| `AUTH_URL`     |     —     | URL base de la app (default: `http://localhost:3000`) |

### `apps/admin/.env`

| Variable          | Requerida | Descripción                                             |
| ----------------- | :-------: | ------------------------------------------------------- |
| `DATABASE_URL`    |     ✓     | Cadena de conexión PostgreSQL (misma DB que `apps/web`) |
| `AUTH_SECRET`     |     ✓     | Misma clave que en `apps/web`                           |
| `AUTH_TRUST_HOST` |     —     | `true` en entornos sin HTTPS (desarrollo)               |

> **Nota:** `apps/admin` usa Prisma directamente y requiere `DATABASE_URL` igual que `apps/web`.

### `packages/db/.env`

| Variable       | Requerida | Descripción                                          |
| -------------- | :-------: | ---------------------------------------------------- |
| `DATABASE_URL` |     ✓     | Cadena de conexión PostgreSQL (usada por Prisma CLI) |

---

## Convenciones del Proyecto

### TypeScript

- Modo estricto habilitado (`strict: true`) en todos los packages.
- Prohibido `any` explícito — usar tipos inferidos de Prisma y Zod.

### Mutaciones y API

- **Server Actions primero** — mutaciones a través de Server Actions de Next.js.
- Route Handlers (`/api/...`) solo para integraciones externas.
- Todo dato entrante pasa por un schema Zod de `@upds/validators`.

### Base de Datos

- **Soft delete** — nunca borrado físico. Siempre `is_active = false`.
- Transacciones Prisma (`prisma.$transaction`) para operaciones que tocan múltiples tablas.
- El stock siempre vive en `ProductVariant`, nunca en `Product`.

### Auditoría

- Toda mutación genera una entrada en `AuditLog` (solo INSERT, nunca UPDATE/DELETE).
- Solo usuarios con rol `ADMIN` pueden consultar el log.

### Roles y Permisos

- Sistema de permisos basado en strings `recurso:acción`.
- Función `can(role, permission)` disponible en `@upds/validators`.
- Principio DENY por defecto.

---

## Testing

Los tests viven en `packages/services` y `packages/validators`:

```bash
# Ejecutar todos los tests
pnpm test

# Tests con hot reload (desde el package)
pnpm --filter @upds/services test:watch
pnpm --filter @upds/validators test:watch
```

Los archivos de test siguen el patrón `**/__tests__/*.test.ts` y usan **Vitest** con mocks via `vitest-mock-extended`.

---

## Módulos de Negocio

| Módulo                     | Descripción                                                              |
| -------------------------- | ------------------------------------------------------------------------ |
| **Inventario Médico**      | Productos con variantes (talla + género + color), stock por variante     |
| **Inventario de Oficina**  | Productos sin variantes, entrega a departamentos internos                |
| **Movimientos**            | ENTRY, SALE, DONATION, WRITE_OFF, ADJUSTMENT, DEPARTMENT_DELIVERY        |
| **Órdenes de Fabricación** | Pedidos a talleres externos con soporte de recepción parcial             |
| **Destinatarios**          | Estudiantes, personal y becarios que reciben productos                   |
| **Reportes**               | Financieros, inventario, dotaciones, consumo por departamento, auditoría |

---

## Documentación Detallada

| Documento | Contenido |
| --------- | --------- |
| [`docs/flujos-de-trabajo.md`](docs/flujos-de-trabajo.md) | Todos los flujos de trabajo y casos de uso del sistema — autenticación, productos, movimientos, órdenes, catálogos, reportes, auditoría y reglas de stock |
| [`docs/estructura-excel-inventario.md`](docs/estructura-excel-inventario.md) | Estructura del Excel temporal para registro de inventario previo a producción |
| [`AGENTS.md`](AGENTS.md) | Reglas de negocio, arquitectura, modelo de datos y convenciones técnicas |
