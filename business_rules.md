# UPDS Inventory System — Reglas de Negocio y Flujos

> Documento de referencia para el desarrollo.  
> Todas las reglas aquí definidas deben implementarse en `/packages/validators` (Zod)  
> y en `/packages/services` (lógica de negocio).

---

## 1. Regla maestra: El movimiento es el corazón del sistema

Toda operación que afecte el stock pasa por un `InventoryMovement`. No existe ningún camino para modificar `current_stock` directamente — siempre se hace a través de un movimiento confirmado. Esto garantiza trazabilidad total.

### Ciclo de vida de un movimiento

```
DRAFT → CONFIRMED    (afecta stock, irreversible)
DRAFT → CANCELLED    (no afecta stock, requiere motivo)
```

- Un movimiento en `DRAFT` es editable: se pueden agregar, quitar o modificar ítems.
- Al pasar a `CONFIRMED`, el stock se actualiza en una transacción atómica y el movimiento se vuelve inmutable.
- `CONFIRMED` es irreversible. Si hubo un error, se debe crear un movimiento de `ADJUSTMENT` para corregir.
- `CANCELLED` requiere un campo `reason` y queda registrado en `audit_log`.

---

## 2. Flujos por tipo de movimiento

### 2.1 ENTRY — Entrada por fabricación

**Trigger:** Se recibe mercadería de un taller/fabricante.  
**Campos obligatorios:** `manufacture_order_id`  
**Efecto en stock:** `current_stock += quantity`

**Reglas:**
- Toda entrada debe estar vinculada a una orden de fabricación existente.
- La orden debe estar en estado `IN_PROGRESS` o `PENDING`.
- La `quantity` de cada ítem no puede exceder la diferencia `quantity_ordered - quantity_received` de la línea de la orden correspondiente.
- Al confirmar el movimiento, se actualiza `quantity_received` en cada `ManufactureOrderItem`.
- Si todas las líneas están completas (received >= ordered), la orden pasa automáticamente a `COMPLETED`.
- Se permite recepción parcial: una orden puede generar múltiples movimientos de entrada.

### 2.2 SALE — Venta a estudiante o personal

**Trigger:** Un estudiante o personal compra indumentaria.  
**Campos obligatorios:** `recipient_id` (tipo STUDENT o STAFF), `unit_price > 0` en cada ítem.  
**Efecto en stock:** `current_stock -= quantity`

**Reglas:**
- El destinatario debe existir en `recipients` con tipo `STUDENT` o `STAFF`.
- Cada `MovementItem` debe tener `unit_price > 0` (validado por Zod).
- `subtotal = quantity × unit_price` se calcula automáticamente.
- `total_amount = Σ subtotales` se calcula al crear/actualizar el movimiento.
- Validación de stock: `current_stock >= quantity` por cada variante. Se verifica al crear (preventivo) y al confirmar (definitivo, en transacción).
- `is_donated = false` → aparece en reportes financieros.

### 2.3 DONATION — Dotación gratuita a becario

**Trigger:** El responsable de inventario entrega indumentaria gratis a un becario.  
**Campos obligatorios:** `recipient_id` (tipo SCHOLAR obligatoriamente).  
**Efecto en stock:** `current_stock -= quantity`

**Reglas:**
- El destinatario debe ser de tipo `SCHOLAR`. Si no lo es, el sistema rechaza la operación.
- `unit_price` se fuerza a `0` en el validador Zod (literal, no editable).
- `total_amount = 0` siempre.
- `is_donated = true` → queda excluido de reportes financieros.
- Sí aparece en el reporte de dotaciones: becario, ítems, tallas, fecha, procesado por.
- Se valida stock de la misma forma que una venta.
- No hay límite de dotaciones por becario definido en sistema (pero se puede consultar el historial para auditoría).

### 2.4 WRITE_OFF — Baja por deterioro

**Trigger:** Productos dañados, vencidos o en mal estado se retiran del inventario.  
**Campos obligatorios:** `notes` (mínimo 10 caracteres, justificación obligatoria).  
**Efecto en stock:** `current_stock -= quantity`

**Reglas:**
- No tiene destinatario ni departamento ni orden de fabricación.
- Las `notes` son obligatorias y deben explicar el motivo de la baja.
- `unit_price = 0`, `total_amount = 0`.
- `is_donated = false` (no es donación, es pérdida).
- No aparece en reportes financieros como ingreso/gasto — pero sí en reportes de inventario como movimiento de salida.
- Cada baja genera entrada en `audit_log` con detalle del stock antes y después.

### 2.5 ADJUSTMENT — Ajuste manual de inventario

**Trigger:** Diferencia encontrada en conteo físico vs stock del sistema.  
**Campos obligatorios:** `notes` (mínimo 10 caracteres, justificación obligatoria).  
**Efecto en stock:** `current_stock += quantity` (quantity puede ser positivo o negativo).

**Reglas:**
- Es el **único** tipo de movimiento donde `quantity` puede ser negativa.
- Un ajuste positivo significa que se encontraron más unidades de las registradas.
- Un ajuste negativo significa que faltan unidades (diferencia en conteo).
- `quantity = 0` no está permitido (no tiene sentido un ajuste de cero).
- Las `notes` deben explicar por qué existe la diferencia.
- Solo `ADMIN` e `INVENTORY_MANAGER` pueden crear ajustes.
- El `audit_log` registra `old_values` (stock antes) y `new_values` (stock después) para cada variante afectada.

### 2.6 DEPARTMENT_DELIVERY — Entrega a departamento interno

**Trigger:** Un departamento de la universidad solicita material de oficina.  
**Campos obligatorios:** `department_id`.  
**Efecto en stock:** `current_stock -= quantity`

**Reglas:**
- Solo productos con `warehouse_area = OFFICE` pueden incluirse.
- El departamento debe estar activo en el sistema.
- `unit_price = 0`, `total_amount = 0` (consumo interno, sin transacción económica).
- No aparece en reportes financieros.
- Sí aparece en reporte de consumo por departamento: qué depto. consume qué materiales y en qué volumen.
- Se valida stock de la misma forma que una venta.

---

## 3. Reglas de stock

### 3.1 El stock vive en ProductVariant

El campo `current_stock` está en `ProductVariant`, no en `Product`. Esto significa:
- Un "Pijama Quirúrgico" puede tener 50 unidades en talla M pero 0 en talla XL.
- Las alertas de stock bajo se evalúan por variante contra el `min_stock` del producto padre.

### 3.2 Validación de stock en dos fases

1. **Fase preventiva (UI):** Al agregar un ítem al movimiento, el frontend consulta `current_stock` y muestra advertencia si no alcanza. Esto es solo UX — no bloquea.
2. **Fase definitiva (Server Action):** Al confirmar el movimiento, se ejecuta una transacción Prisma que:
   - Lee `current_stock` con bloqueo (`FOR UPDATE` o transacción serializable).
   - Verifica que `current_stock >= quantity` para cada ítem.
   - Si alguno falla, la transacción completa se revierte.
   - Si todo pasa, actualiza todos los `current_stock` y el estado del movimiento.

### 3.3 Alertas de stock bajo

- Se activan cuando `current_stock < product.min_stock` para cualquier variante activa.
- No es una tabla separada — es una query en tiempo real.
- Se muestra en: dashboard principal, página de inventario (badge de alerta), y opcionalmente como notificación.
- El `min_stock` por defecto es 5, configurable por producto.

---

## 4. Reglas de órdenes de fabricación

### 4.1 Ciclo de vida

```
PENDING → IN_PROGRESS → COMPLETED
PENDING → CANCELLED
IN_PROGRESS → CANCELLED (solo si no tiene recepciones parciales confirmadas)
```

### 4.2 Reglas de recepción

- Una orden puede recibirse en una sola entrega o en múltiples entregas parciales.
- Cada recepción genera un movimiento `ENTRY` vinculado a la orden.
- `quantity_received` en cada `ManufactureOrderItem` se incrementa con cada recepción.
- No se puede recibir más de lo ordenado: `quantity_received + nueva_recepcion <= quantity_ordered`.
- La orden pasa a `COMPLETED` automáticamente cuando todas sus líneas tienen `quantity_received >= quantity_ordered`.

### 4.3 Cancelación de órdenes

- Solo se puede cancelar si está en `PENDING` o `IN_PROGRESS`.
- Si está `IN_PROGRESS` y ya tiene recepciones parciales confirmadas, la cancelación solo aplica a lo pendiente (las entradas ya confirmadas no se revierten).
- Motivo de cancelación obligatorio.

---

## 5. Reglas de productos y variantes

### 5.1 Coherencia categoría-área

| Categoría | Área obligatoria | garment_type | Variantes |
|---|---|---|---|
| MEDICAL_GARMENT | MEDICAL | Obligatorio | Con talla + género + color |
| OFFICE_SUPPLY | OFFICE | Null | Una sola variante (sin talla/género) |

### 5.2 Campos inmutables

Una vez creados, estos campos no se pueden modificar (para preservar integridad histórica):
- `Product`: `sku`, `category`, `garment_type`, `warehouse_area`
- `ProductVariant`: `size`, `gender`, `sku_suffix`
- `Recipient`: `document_number`

Si alguno de estos necesita cambiar, se desactiva el registro actual (`is_active = false`) y se crea uno nuevo.

### 5.3 Soft delete en todo el modelo

- Ninguna entidad se borra físicamente.
- Se usa `is_active = false` para "eliminar".
- Los movimientos históricos siempre pueden referenciar la entidad original.
- Las queries de listado por defecto filtran `WHERE is_active = true`.
- Las queries de reportes incluyen inactivos (para datos históricos completos).

---

## 6. Reglas de reportes

### 6.1 Tipos de reporte y su fuente de datos

| Reporte | Filtro base | Acceso |
|---|---|---|
| Financiero (ventas) | `movement_type = SALE AND is_donated = false AND status = CONFIRMED` | ADMIN, INVENTORY_MANAGER |
| Inventario actual | `ProductVariant WHERE is_active = true` | Todos |
| Movimientos | `InventoryMovement` con filtros por tipo/fecha/estado | Todos (lectura) |
| Dotaciones a becarios | `movement_type = DONATION AND status = CONFIRMED` | Todos |
| Consumo por departamento | `movement_type = DEPARTMENT_DELIVERY AND status = CONFIRMED` | ADMIN, INVENTORY_MANAGER |
| Bajas/deterioro | `movement_type = WRITE_OFF AND status = CONFIRMED` | ADMIN, INVENTORY_MANAGER |
| Auditoría | `AuditLog` completo | Solo ADMIN |

### 6.2 Separación económica vs estadística

- Todo lo que tiene `is_donated = true` queda **fuera** del cálculo financiero.
- Todo lo que tiene `unit_price = 0` (donaciones, bajas, entregas a depto.) no genera montos.
- Los reportes financieros solo suman movimientos con `is_donated = false AND total_amount > 0`.
- Los reportes estadísticos (dotaciones, consumo) cuentan unidades, no montos.

---

## 7. Reglas de auditoría

- Toda acción de escritura (CREATE, UPDATE, CONFIRM, CANCEL) genera una entrada en `AuditLog`.
- El log es inmutable (solo INSERT, nunca UPDATE ni DELETE).
- Registra: quién (`user_id`), qué hizo (`action`), sobre qué (`entity_type` + `entity_id`), estado anterior (`old_values`), estado nuevo (`new_values`), desde dónde (`ip_address`), cuándo (`created_at`).
- Solo el rol `ADMIN` puede consultar los logs de auditoría.
- Los logs no tienen `updated_at` porque nunca se modifican.

---

## 8. Reglas de seguridad transaccional

### 8.1 Operaciones atómicas

Las siguientes operaciones deben ejecutarse dentro de una transacción Prisma (`prisma.$transaction`):
1. Confirmar movimiento → actualizar stock de todas las variantes involucradas.
2. Recibir mercadería → actualizar `quantity_received` en la orden + crear movimiento de entrada.
3. Cancelar movimiento → revertir estado + registrar en audit_log.

### 8.2 Concurrencia

- La validación de stock al confirmar debe usar bloqueo pesimista o transacción serializable.
- Dos usuarios no pueden confirmar movimientos que afecten la misma variante simultáneamente sin que uno de los dos falle limpiamente.
- El error debe ser claro: "Stock insuficiente para [variante]. Stock actual: X, solicitado: Y."