# 🤖 UPDS Inventory System - Orquestador Central (AGENTS.md)

## 📌 Contexto del Proyecto

Sistema de Control de Inventarios para la Unidad de Bienes, Servicios y Compras de la Universidad Privada Domingo Savio (UPDS).

El sistema gestiona dos ramas principales:
1. **Indumentaria Médica:** Pijamas, batas, mandiles, poleras, gorros quirúrgicos (control por talla, tipo, género, color, stock por variante).
2. **Materiales de Oficina:** Papelería, insumos, control de stock mínimo.

**Módulos Core:** Inventario Médico, Inventario de Oficina, Movimientos (Entradas/Salidas/Ajustes/Donaciones), Órdenes de Fabricación, Usuarios/Roles, y Reportes.

### Contexto de Negocio

- La indumentaria médica **se manda a fabricar** a talleres externos (no se compra a proveedores). Esto requiere un módulo de fabricantes y órdenes de fabricación con soporte para recepciones parciales.
- Existen **ventas con precio** a estudiantes y personal de la universidad.
- Existe un flujo especial de **dotación gratuita a becarios** que no genera registro económico pero sí debe trazarse en reportes estadísticos.
- Los **materiales de oficina** se entregan únicamente a departamentos internos de la universidad (no a estudiantes).
- Se dan de baja productos por **deterioro**, con justificación obligatoria.
- El almacén es **uno solo**, separado físicamente en dos áreas: sector médico y sector de oficina.

---

## 🏗️ Arquitectura y Stack Tecnológico

El proyecto es un **Monorepo** (Turborepo/pnpm workspaces recomendado) con la siguiente estructura:

```
/
├── apps/
│   ├── web/          # Frontend + Backend API (Next.js App Router)
│   └── admin/        # Panel administrativo técnico
├── packages/
│   ├── db/           # Esquema Prisma + cliente PostgreSQL
│   ├── ui/           # Componentes compartidos (Tailwind CSS + Shadcn UI)
│   ├── validators/   # Esquemas de validación unificados (Zod)
│   └── services/     # Lógica de negocio pura
```

---

## 🗄️ Modelo de Datos (Prisma + PostgreSQL)

### Convenciones de base de datos
- `snake_case` para nombres de tabla y campos (estándar PostgreSQL).
- UUID v4 como primary key (seguridad + distribución futura).
- Soft delete via campo `is_active` (nunca borrado físico).
- Timestamps `created_at` / `updated_at` en toda entidad mutable.
- Índices explícitos en campos de búsqueda frecuente.

### Entidades principales

| Entidad | Propósito | Relaciones clave |
|---|---|---|
| `User` | Usuarios del sistema con roles | Procesa movimientos, genera audit logs |
| `Product` | Producto base (ej: "Pijama Quirúrgico", "Resma A4") | Tiene variantes |
| `ProductVariant` | Variante específica (talla+género+color) — **el stock vive aquí** | Referenciada en movimientos y órdenes |
| `Manufacturer` | Taller/fabricante de indumentaria | Recibe órdenes de fabricación |
| `ManufactureOrder` | Orden enviada a un taller | Contiene ítems, genera movimientos ENTRY |
| `ManufactureOrderItem` | Línea de detalle de una orden | Vincula variante + cantidad + costo |
| `InventoryMovement` | Cabecera de movimiento (corazón del sistema) | Contiene ítems, referencia contextual a recipient/department/order |
| `MovementItem` | Línea de detalle de un movimiento | Variante + cantidad + precio |
| `Recipient` | Persona que recibe productos (estudiante, personal, becario) | Destinatario de ventas y donaciones |
| `Department` | Departamento interno de la universidad | Destinatario de entregas de material de oficina |
| `AuditLog` | Registro inmutable de acciones del sistema | Nunca se modifica ni elimina |

### Patrón Producto → Variante

- Para **indumentaria médica**: un `Product` tiene N `ProductVariant` (cada combinación talla+género+color).
- Para **materiales de oficina**: un `Product` tiene 1 `ProductVariant` con `size`, `gender` y `color` en null.
- El `current_stock` siempre está en `ProductVariant`, nunca en `Product`.
- Esto permite que la lógica de movimientos sea uniforme sin condicionales por categoría.

### Coherencia categoría-área

| Categoría | Área obligatoria | garment_type | Variantes |
|---|---|---|---|
| `MEDICAL_GARMENT` | `MEDICAL` | Obligatorio (PIJAMA, BATA, MANDIL, POLERA, GORRO) | Con talla + género + color |
| `OFFICE_SUPPLY` | `OFFICE` | Null | Una sola variante sin talla/género |

### Campos inmutables (no editables post-creación)

- `Product`: `sku`, `category`, `garment_type`, `warehouse_area`
- `ProductVariant`: `size`, `gender`, `sku_suffix`
- `Recipient`: `document_number`

Si alguno necesita cambiar → se desactiva el registro (`is_active = false`) y se crea uno nuevo.

### Enums del sistema

```
UserRole:                ADMIN | INVENTORY_MANAGER | VIEWER
ProductCategory:         MEDICAL_GARMENT | OFFICE_SUPPLY
GarmentType:             PIJAMA | BATA | MANDIL | POLERA | GORRO
Size:                    XS | S | M | L | XL | XXL
Gender:                  MASCULINO | FEMENINO | UNISEX
WarehouseArea:           MEDICAL | OFFICE
MovementType:            ENTRY | SALE | DONATION | WRITE_OFF | ADJUSTMENT | DEPARTMENT_DELIVERY
MovementStatus:          DRAFT | CONFIRMED | CANCELLED
ManufactureOrderStatus:  PENDING | IN_PROGRESS | COMPLETED | CANCELLED
RecipientType:           STUDENT | STAFF | SCHOLAR
```

---

## 🔄 Flujos de Negocio y Movimientos de Inventario

### Regla maestra

**Toda operación que afecte stock pasa por un `InventoryMovement`.** No existe ningún camino para modificar `current_stock` directamente. Esto garantiza trazabilidad total.

### Ciclo de vida de un movimiento

```
DRAFT → CONFIRMED    (afecta stock, irreversible)
DRAFT → CANCELLED    (no afecta stock, requiere motivo)
```

- `DRAFT`: editable, se pueden agregar/quitar ítems.
- `CONFIRMED`: stock actualizado en transacción atómica, movimiento inmutable.
- `CONFIRMED` es **irreversible**. Si hubo error → crear movimiento `ADJUSTMENT`.
- `CANCELLED`: requiere campo `reason`, queda en `audit_log`.

### Tipos de movimiento

#### ENTRY — Entrada por fabricación
- **Campos obligatorios:** `manufacture_order_id`
- **Efecto:** `current_stock += quantity`
- Vinculada a orden de fabricación existente (estado `PENDING` o `IN_PROGRESS`).
- `quantity` no puede exceder `quantity_ordered - quantity_received` de la línea de la orden.
- Al confirmar, se actualiza `quantity_received` en `ManufactureOrderItem`.
- Si todas las líneas completas → orden pasa automáticamente a `COMPLETED`.
- Soporta recepción parcial (una orden puede generar múltiples entradas).

#### SALE — Venta a estudiante o personal
- **Campos obligatorios:** `recipient_id` (tipo STUDENT o STAFF), `unit_price > 0` por ítem.
- **Efecto:** `current_stock -= quantity`
- `subtotal = quantity × unit_price` calculado automáticamente.
- `total_amount = Σ subtotales`.
- `is_donated = false` → **aparece en reportes financieros**.
- Validación de stock en dos fases: preventiva (UI) + definitiva (transacción al confirmar).

#### DONATION — Dotación gratuita a becario
- **Campos obligatorios:** `recipient_id` (tipo **SCHOLAR** obligatoriamente).
- **Efecto:** `current_stock -= quantity`
- `unit_price` forzado a `0` por el validador Zod (literal, no editable).
- `total_amount = 0` siempre.
- `is_donated = true` → **excluido de reportes financieros**.
- **Sí aparece** en reporte de dotaciones: becario, ítems, tallas, fecha, procesado por.
- Si el destinatario no es tipo SCHOLAR → el sistema rechaza la operación.
- Misma validación de stock que una venta.

#### WRITE_OFF — Baja por deterioro
- **Campos obligatorios:** `notes` (mínimo 10 caracteres, justificación).
- **Efecto:** `current_stock -= quantity`
- Sin destinatario, sin departamento, sin orden de fabricación.
- `unit_price = 0`, `total_amount = 0`, `is_donated = false`.
- Aparece en reportes de inventario como salida; no en reportes financieros.
- Genera entrada en `audit_log` con stock antes/después.

#### ADJUSTMENT — Ajuste manual de inventario
- **Campos obligatorios:** `notes` (mínimo 10 caracteres, justificación).
- **Efecto:** `current_stock += quantity` (puede ser **positivo o negativo**).
- **Único tipo** donde `quantity` puede ser negativa. `quantity = 0` no permitido.
- Se usa para corregir diferencias de conteo físico.
- Solo `ADMIN` e `INVENTORY_MANAGER` pueden crear ajustes.
- `audit_log` registra `old_values` y `new_values` del stock por variante.

#### DEPARTMENT_DELIVERY — Entrega a departamento interno
- **Campos obligatorios:** `department_id`.
- **Efecto:** `current_stock -= quantity`
- **Solo productos** con `warehouse_area = OFFICE`.
- `unit_price = 0`, `total_amount = 0` (consumo interno).
- Aparece en reporte de consumo por departamento; no en reportes financieros.

---

## 🔐 Roles, Permisos y Autorización

### Arquitectura de permisos

- Cada permiso es un string con formato `recurso:acción` (ej: `movement:confirm`).
- Los roles tienen un conjunto fijo de permisos definido en `/packages/validators/src/permissions.ts`.
- La función `can(role, permission)` se usa en **Server Actions** (autorización) y en **UI** (visibilidad).
- Principio: **DENY por defecto**. Solo se permite lo explícitamente listado.

### Matriz de roles

| Área | Permiso | ADMIN | INV_MANAGER | VIEWER |
|---|---|:---:|:---:|:---:|
| **Productos** | Crear / Editar / Desactivar | ✓ | ✓ | — |
| | Ver catálogo | ✓ | ✓ | ✓ |
| **Stock** | Ver niveles y alertas | ✓ | ✓ | ✓ |
| **Movimientos** | Crear / Confirmar / Cancelar | ✓ | ✓ | — |
| | Ver movimientos | ✓ | ✓ | ✓ |
| **Donaciones** | Crear dotaciones | ✓ | ✓ | — |
| | Ver historial | ✓ | ✓ | ✓ |
| **Fabricación** | Crear órdenes / Recibir / Cancelar | ✓ | ✓ | — |
| | Ver órdenes | ✓ | ✓ | ✓ |
| **Catálogos** | Crear / Editar (fabricantes, destinatarios, deptos.) | ✓ | ✓ | — |
| | Ver registros | ✓ | ✓ | ✓ |
| **Reportes** | Financieros (ventas, costos) | ✓ | ✓ | — |
| | Inventario / Dotaciones | ✓ | ✓ | ✓ |
| | Exportar PDF/Excel | ✓ | ✓ | — |
| **Admin** | Gestionar usuarios | ✓ | — | — |
| | Ver auditoría | ✓ | — | — |

### Uso en código

```typescript
// Server Action — bloquea ejecución
if (!can(session.user.role, "movement:confirm")) {
  throw new Error("No autorizado");
}

// Componente UI — oculta elementos
{can(user.role, "movement:create") && <NuevoMovimientoButton />}
```

---

## ✅ Validadores (Zod) — `/packages/validators`

### Estructura de archivos

```
/packages/validators/src/
├── index.ts          # Barrel export
├── enums.ts          # Enums espejo de Prisma + labels para UI
├── permissions.ts    # Matriz de permisos + funciones can/canAll/canAny
├── auth.ts           # Login, crear/actualizar usuario, cambiar contraseña
├── product.ts        # Producto, variante, filtros (con validación condicional médico vs oficina)
├── movement.ts       # Movimientos — discriminatedUnion por tipo (el más crítico)
├── manufacturer.ts   # Fabricante, orden de fabricación, recepción
├── recipient.ts      # Beneficiario/destinatario
└── department.ts     # Departamento interno
```

### Patrón clave: `z.discriminatedUnion` en movimientos

El validador maestro `createMovementSchema` usa `z.discriminatedUnion("movement_type", [...])` con 6 schemas específicos. Zod selecciona automáticamente las reglas según el tipo:

| Tipo | recipient_id | department_id | manufacture_order_id | unit_price | notes |
|---|:---:|:---:|:---:|:---:|:---:|
| ENTRY | — | — | **Requerido** | libre | opcional |
| SALE | **Requerido** | — | — | **> 0** | opcional |
| DONATION | **Requerido (SCHOLAR)** | — | — | **= 0** | opcional |
| WRITE_OFF | — | — | — | = 0 | **Requerido (min 10 chars)** |
| ADJUSTMENT | — | — | — | = 0 | **Requerido (min 10 chars)** |
| DEPARTMENT_DELIVERY | — | **Requerido** | — | = 0 | opcional |

### Validación condicional de productos

El schema `createProductSchema` usa `superRefine` para validar:
- Si `category = MEDICAL_GARMENT` → `garment_type` es obligatorio y `warehouse_area` debe ser `MEDICAL`.
- Si `category = OFFICE_SUPPLY` → `garment_type` debe ser null y `warehouse_area` debe ser `OFFICE`.

---

## 📊 Reglas de Reportes

### Separación económica vs estadística

- `is_donated = true` → **fuera** del cálculo financiero.
- `unit_price = 0` (donaciones, bajas, entregas a depto.) → no genera montos.
- Reportes financieros: `WHERE is_donated = false AND total_amount > 0 AND status = 'CONFIRMED'`.
- Reportes estadísticos (dotaciones, consumo): cuentan **unidades**, no montos.

### Índices compuestos optimizados para reportes

- `[movement_type, status, processed_at]` → "Todas las donaciones confirmadas del mes".
- `[movement_type, is_donated, processed_at]` → "Total de ventas del trimestre excluyendo donaciones".

### Tipos de reporte

| Reporte | Filtro base | Acceso |
|---|---|---|
| Financiero (ventas) | `type=SALE, is_donated=false, status=CONFIRMED` | ADMIN, INV_MANAGER |
| Inventario actual | `ProductVariant WHERE is_active=true` | Todos |
| Movimientos | Filtros por tipo/fecha/estado | Todos (lectura) |
| Dotaciones a becarios | `type=DONATION, status=CONFIRMED` | Todos |
| Consumo por departamento | `type=DEPARTMENT_DELIVERY, status=CONFIRMED` | ADMIN, INV_MANAGER |
| Bajas/deterioro | `type=WRITE_OFF, status=CONFIRMED` | ADMIN, INV_MANAGER |
| Auditoría | `AuditLog` completo | Solo ADMIN |

---

## 📦 Reglas de Stock

### Stock por variante

El campo `current_stock` está en `ProductVariant`, no en `Product`. Un "Pijama Quirúrgico" puede tener 50 unidades en talla M pero 0 en talla XL. Las alertas se evalúan por variante contra el `min_stock` del producto padre.

### Validación en dos fases

1. **Fase preventiva (UI):** Al agregar ítem, el frontend consulta `current_stock` y muestra advertencia. Solo UX, no bloquea.
2. **Fase definitiva (Server Action):** Al confirmar, transacción Prisma con bloqueo que verifica `current_stock >= quantity` por variante. Si falla → rollback completo.

### Alertas de stock bajo

- Se activan cuando `current_stock < product.min_stock` para cualquier variante activa.
- No es tabla separada — query en tiempo real.
- Visible en: dashboard principal + página de inventario (badge).
- `min_stock` por defecto = 5, configurable por producto.

---

## 🏭 Órdenes de Fabricación

### Ciclo de vida

```
PENDING → IN_PROGRESS → COMPLETED
PENDING → CANCELLED
IN_PROGRESS → CANCELLED (solo si no tiene recepciones parciales confirmadas)
```

### Reglas de recepción

- Soporta recepción parcial (múltiples entregas por orden).
- Cada recepción genera un movimiento `ENTRY` vinculado a la orden.
- `quantity_received` se incrementa con cada recepción.
- No se puede recibir más de lo ordenado: `received + nueva <= ordered`.
- Orden pasa a `COMPLETED` automáticamente cuando todas las líneas están completas.

### Cancelación

- Solo en estado `PENDING` o `IN_PROGRESS`.
- Si tiene recepciones parciales confirmadas → cancelación solo aplica a lo pendiente (entradas confirmadas no se revierten).
- Motivo obligatorio.

---

## 🔒 Seguridad Transaccional

### Operaciones atómicas (prisma.$transaction)

1. Confirmar movimiento → actualizar stock de todas las variantes involucradas.
2. Recibir mercadería → actualizar `quantity_received` en la orden + crear movimiento de entrada.
3. Cancelar movimiento → revertir estado + registrar en `audit_log`.

### Concurrencia

- Validación de stock al confirmar usa bloqueo pesimista o transacción serializable.
- Dos confirmaciones simultáneas sobre la misma variante → una falla limpiamente.
- Mensaje de error claro: "Stock insuficiente para [variante]. Stock actual: X, solicitado: Y."

### Auditoría

- Toda acción de escritura (CREATE, UPDATE, CONFIRM, CANCEL) genera entrada en `AuditLog`.
- El log es **inmutable** (solo INSERT, nunca UPDATE ni DELETE).
- Registra: quién, qué hizo, sobre qué, estado anterior, estado nuevo, IP, timestamp.
- Solo ADMIN puede consultar logs.

---

## ⚙️ Flujo de Trabajo Obligatorio: Spec-Driven Development (SDD)

No escribas código sin antes planificar. Ante cualquier requerimiento nuevo (ej. "Crear módulo de salidas"), debes seguir este orden:

1. **Explorar:** Revisa el estado actual del código en `/apps` y `/packages`.
2. **Proponer/Diseñar:** Define cómo se conectará la base de datos, qué Server Actions se necesitan y qué componentes de UI se usarán.
3. **Planificar Tareas:** Divide el trabajo en pasos pequeños y secuenciales.
4. **Implementar:** Escribe el código paso a paso.
5. **Verificar:** Asegúrate de que cumple con los requerimientos y el tipado estricto.

---

## 🧠 Protocolo de Memoria (Engram)

Este proyecto utiliza `engram` para persistir el contexto.
- **Antes de diseñar:** Usa `mem_search` para buscar si ya existen decisiones previas sobre el módulo que vas a tocar (ej. `mem_search("arquitectura movimientos inventario")`).
- **Al tomar una decisión clave:** (Ej. Estructura de la tabla de movimientos, reglas de validación de stock), usa `mem_save` para registrar el `qué`, `por qué` y `dónde`.
- **Al finalizar una sesión:** Usa `mem_session_summary` para guardar en qué estado quedó el trabajo.

---

## 🔀 Enrutador de Skills (Carga de Contexto bajo Demanda)

Para mantener el contexto limpio, carga **solo** los archivos `.md` de la carpeta `/skills` que coincidan con la tarea actual:

- **Si la tarea involucra Base de Datos, Modelos o Consultas:**
  👉 *Trigger:* "prisma", "postgresql", "esquema", "modelos", "db".
  👉 *Acción:* Lee `skills/prisma-db.md`.

- **Si la tarea involucra UI, Frontend o Componentes Visuales:**
  👉 *Trigger:* "frontend", "componente", "tailwind", "shadcn", "interfaz", "vista".
  👉 *Acción:* Lee `skills/nextjs-ui.md`.

- **Si la tarea involucra Lógica de Negocio, Mutaciones o API:**
  👉 *Trigger:* "server actions", "endpoint", "guardar datos", "movimientos", "zod".
  👉 *Acción:* Lee `skills/server-actions-zod.md`.

- **Si la tarea involucra Autenticación o Permisos:**
  👉 *Trigger:* "login", "roles", "nextauth", "sesión", "admin".
  👉 *Acción:* Lee `skills/auth.md`.

---

## 📜 Reglas Generales de Código (Globales)

- **Cero `any`:** TypeScript estricto en todo el proyecto. Utiliza los tipos generados por Prisma y los inferidos por Zod.
- **Server Actions Primero:** Evita crear Route Handlers (`/api/...`) a menos que sea estrictamente necesario para integraciones externas. Usa Server Actions para mutaciones.
- **Validación Fuerte:** Todo dato que entre al sistema (formularios o bases de datos) debe pasar por un validador de Zod importado de `@upds/validators`.
- **Soft Delete:** Nunca borrado físico. Siempre `is_active = false`. Las queries de listado filtran activos; las de reportes incluyen inactivos.
- **Transacciones para operaciones compuestas:** Cualquier operación que modifique más de una tabla debe usar `prisma.$transaction`.
- **Auditoría automática:** Toda mutación que pase por un Server Action debe generar una entrada en `AuditLog`.

---
