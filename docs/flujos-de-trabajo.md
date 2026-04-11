# Flujos de Trabajo y Casos de Uso — Sistema de Inventarios UPDS

Este documento describe todos los flujos de trabajo del sistema, los actores involucrados, las reglas de negocio que se aplican y los posibles errores. Sirve como referencia completa para entender que hace el sistema y como lo hace.

---

## Indice

1. [Autenticacion y Acceso de Usuarios](#1-autenticacion-y-acceso-de-usuarios)
2. [Gestion de Productos](#2-gestion-de-productos)
3. [Movimientos de Inventario](#3-movimientos-de-inventario)
4. [Ordenes de Fabricacion](#4-ordenes-de-fabricacion)
5. [Gestion de Catalogos](#5-gestion-de-catalogos)
6. [Reportes](#6-reportes)
7. [Trazabilidad y Auditoria](#7-trazabilidad-y-auditoria)
8. [Reglas de Stock](#8-reglas-de-stock)

---

## 1. Autenticacion y Acceso de Usuarios

### 1.1 Inicio de Sesion

- **Descripcion**: Un usuario ingresa al sistema validando correo y contrasena.
- **Actor**: Cualquier usuario registrado (`ADMIN`, `INVENTORY_MANAGER`, `VIEWER`).
- **Precondiciones**: El usuario debe existir y tener la cuenta activa.
- **Pasos**:
  1. El usuario ingresa `email` y `password`.
  2. El sistema valida formato y busca el usuario por correo (normalizado a minusculas).
  3. Verifica que `is_active = true`.
  4. Compara la contrasena con el hash almacenado via `bcrypt`.
  5. Si es correcta, actualiza `last_login_at` y registra `LOGIN` en auditoria con IP y user-agent.
  6. Genera un token JWT con los datos del usuario.
- **Resultado**: Sesion iniciada con JWT. El usuario accede al dashboard.
- **Reglas de negocio**:
  - La contrasena nunca se devuelve al frontend.
  - Si la contrasena es incorrecta pero el usuario existe, se registra `LOGIN_FAILED` en auditoria.
  - Si el correo no existe, se devuelve el mismo mensaje generico ("Credenciales invalidas") para no revelar cuentas existentes.
- **Errores posibles**:
  - `Credenciales invalidas`
  - `La cuenta esta desactivada`

### 1.2 Cambio de Contrasena Propia

- **Descripcion**: Un usuario autenticado cambia su propia contrasena.
- **Actor**: Cualquier usuario autenticado.
- **Precondiciones**: Debe conocer su contrasena actual.
- **Pasos**:
  1. Ingresa contrasena actual, nueva contrasena y confirmacion desde la pagina `/perfil`.
  2. El sistema verifica que la nueva contrasena cumpla requisitos de complejidad.
  3. Verifica que la confirmacion coincida.
  4. Verifica que la nueva sea distinta de la actual.
  5. Compara la contrasena actual con el hash almacenado.
  6. Genera nuevo hash y actualiza.
  7. Registra `PASSWORD_CHANGE` en auditoria.
- **Resultado**: Contrasena actualizada.
- **Reglas de negocio**:
  - Minimo 8 caracteres, al menos 1 mayuscula, 1 minuscula y 1 numero.
  - El `user_id` se toma de la sesion del servidor (no del cliente) para evitar manipulacion.
- **Errores posibles**:
  - `La contrasena actual es incorrecta`
  - `Las contrasenas no coinciden`
  - `La nueva contrasena debe ser diferente a la actual`

### 1.3 Reset de Contrasena por Administrador

- **Descripcion**: Un administrador reasigna la contrasena de otro usuario sin necesitar la actual.
- **Actor**: `ADMIN`
- **Precondiciones**: El usuario objetivo debe existir.
- **Pasos**:
  1. El admin selecciona el usuario y define nueva contrasena.
  2. El sistema valida complejidad y genera nuevo hash.
  3. Registra `PASSWORD_RESET` en auditoria.
- **Resultado**: La cuenta objetivo queda con nueva contrasena.

### 1.4 Roles y Permisos

El sistema usa tres roles con principio **DENY por defecto**: solo se permite lo explicitamente asignado.

#### Matriz Completa de Permisos

| Area            | Permiso                                              | ADMIN | INVENTORY_MANAGER | VIEWER |
| --------------- | ---------------------------------------------------- | :---: | :---------------: | :----: |
| **Productos**   | Crear / Editar / Desactivar                          |  Si   |        Si         |   No   |
|                 | Ver catalogo                                         |  Si   |        Si         |   Si   |
| **Stock**       | Ver niveles y alertas                                |  Si   |        Si         |   Si   |
| **Movimientos** | Crear / Confirmar / Cancelar                         |  Si   |        Si         |   No   |
|                 | Ver movimientos                                      |  Si   |        Si         |   Si   |
| **Donaciones**  | Crear dotaciones                                     |  Si   |        Si         |   No   |
|                 | Ver historial                                        |  Si   |        Si         |   Si   |
| **Fabricacion** | Crear ordenes / Recibir / Cancelar                   |  Si   |        Si         |   No   |
|                 | Ver ordenes                                          |  Si   |        Si         |   Si   |
| **Catalogos**   | Crear / Editar (fabricantes, destinatarios, deptos.) |  Si   |        Si         |   No   |
|                 | Ver registros                                        |  Si   |        Si         |   Si   |
| **Reportes**    | Financieros, Consumo, Bajas                          |  Si   |        Si         |   No   |
|                 | Inventario, Movimientos, Dotaciones                  |  Si   |        Si         |   Si   |
|                 | Exportar Excel                                       |  Si   |        Si         |   No   |
| **Admin**       | Gestionar usuarios                                   |  Si   |        No         |   No   |
|                 | Ver auditoria                                        |  Si   |        No         |   No   |

#### Resumen por Rol

- **ADMIN**: Acceso total. Gestiona usuarios, ve auditoria, opera inventario completo.
- **INVENTORY_MANAGER**: Opera inventario completo, genera reportes y exporta. No administra usuarios ni ve auditoria.
- **VIEWER**: Solo lectura. Ve catalogos, stock, movimientos y reportes no sensibles. No puede crear, editar ni eliminar nada.

---

## 2. Gestion de Productos

### 2.1 Crear Producto de Indumentaria Medica

- **Descripcion**: Crea un producto medico con todas sus variantes de talla, genero y color.
- **Actor**: `ADMIN`, `INVENTORY_MANAGER`
- **Precondiciones**:
  - El `sku` no debe existir en el sistema.
  - `category = MEDICAL_GARMENT`, `garment_type` obligatorio, `warehouse_area = MEDICAL`.
- **Pasos**:
  1. Se ingresan datos del producto (SKU, nombre, descripcion, tipo de prenda, stock minimo).
  2. Se definen las variantes (cada combinacion de talla + genero + color).
  3. El sistema valida coherencia categoria-area y unicidad de variantes.
  4. Crea el producto con todas sus variantes, cada una con stock inicial = 0.
  5. Registra auditoria `CREATE`.
- **Resultado**: Producto activo con N variantes y stock 0.
- **Reglas de negocio**:
  - El stock NUNCA se carga al crear producto. Se ingresa despues con movimiento `ENTRY` o `ADJUSTMENT`.
  - Campos inmutables post-creacion: `sku`, `category`, `garment_type`, `warehouse_area`.
  - Cada variante genera un `sku_suffix` como `M-MAS`, `L-FEM`, `XL-UNI`.
- **Errores posibles**:
  - `Ya existe un producto con ese SKU`
  - `Variante duplicada`

### 2.2 Crear Producto de Material de Oficina

- **Descripcion**: Crea un producto de oficina con una sola variante automatica.
- **Actor**: `ADMIN`, `INVENTORY_MANAGER`
- **Precondiciones**:
  - `category = OFFICE_SUPPLY`, `garment_type = null`, `warehouse_area = OFFICE`.
- **Pasos**:
  1. Se ingresan datos del producto (SKU, nombre, descripcion, stock minimo).
  2. El sistema valida que no se asigne tipo de prenda.
  3. Crea el producto con una unica variante `DEFAULT` (sin talla, genero ni color).
- **Resultado**: Producto de oficina con variante unica y stock 0.
- **Reglas de negocio**:
  - Los productos de oficina no usan talla ni genero.
  - El stock sigue viviendo en `ProductVariant`, aunque solo haya una.

### 2.3 Editar Producto

- **Descripcion**: Modifica campos editables de un producto activo.
- **Actor**: `ADMIN`, `INVENTORY_MANAGER`
- **Campos editables**: `name`, `description`, `min_stock`.
- **Campos inmutables**: `sku`, `category`, `garment_type`, `warehouse_area`.
- **Regla**: No se puede editar un producto desactivado.

### 2.4 Desactivar / Reactivar Producto

- **Desactivar**: Baja logica del producto y todas sus variantes. Requiere que ninguna variante tenga stock > 0.
- **Reactivar**: Reactiva solo el producto; las variantes deben reactivarse individualmente.
- **Regla**: Nunca se borra fisicamente. Siempre `is_active = false`.

### 2.5 Agregar Variante a Producto Existente

- **Descripcion**: Agrega una nueva combinacion talla + genero + color a un producto medico.
- **Actor**: `ADMIN`, `INVENTORY_MANAGER`
- **Reglas**:
  - Solo para `MEDICAL_GARMENT`.
  - La combinacion no debe existir previamente.
  - Se crea con stock 0.

### 2.6 Alertas de Stock Bajo

- **Descripcion**: El sistema detecta variantes cuyo stock actual es menor al minimo del producto padre.
- **Calculo**: `current_stock < product.min_stock`
- **Umbral por defecto**: 5 (configurable por producto).
- **Visible en**: Dashboard, pagina de inventario, reporte de inventario.
- **Nota**: No existe tabla de alertas. Se calcula en tiempo real con query optimizada `$queryRaw`.

---

## 3. Movimientos de Inventario

Los movimientos son el **corazon del sistema**. Toda operacion que afecte stock pasa obligatoriamente por un `InventoryMovement`.

### Reglas Generales

- Un movimiento nace en estado `DRAFT` (borrador editable).
- En `DRAFT` se pueden agregar y quitar items libremente.
- Al **confirmar**, pasa a `CONFIRMED` — stock actualizado, movimiento inmutable, irreversible.
- Al **cancelar**, pasa a `CANCELLED` — requiere motivo, no afecta stock.
- No se puede confirmar un movimiento sin items.
- Para corregir un error post-confirmacion, se crea un `ADJUSTMENT`.
- El numero se genera automaticamente: `MOV-YYYYMMDD-####`.

### Ciclo de Vida

```
DRAFT ──→ CONFIRMED   (afecta stock, irreversible)
DRAFT ──→ CANCELLED   (no afecta stock, requiere motivo)
```

### Validacion Preventiva de Stock (UI)

Cuando el usuario agrega items a movimientos de salida (SALE, DONATION, WRITE_OFF, DEPARTMENT_DELIVERY):

- El sistema muestra el stock disponible junto al campo de cantidad.
- **Advertencia amarilla** cuando la cantidad supera el 80% del stock: "Atencion: quedaran solo X unidades".
- **Error rojo** cuando la cantidad excede el stock: "La cantidad excede el stock disponible (X unidades)" — el boton de agregar se deshabilita.
- Esta validacion es **preventiva** (UX). La validacion definitiva ocurre en el backend al confirmar.

---

### 3.1 ENTRY — Entrada por Fabricacion

- **Descripcion**: Registra el ingreso de productos fabricados por un taller externo.
- **Actor**: `ADMIN`, `INVENTORY_MANAGER`
- **Campo obligatorio**: `manufacture_order_id` (orden de fabricacion vinculada).
- **Efecto en stock**: `current_stock += quantity`
- **Flujo**:
  1. Crear movimiento ENTRY vinculado a una orden en `PENDING` o `IN_PROGRESS`.
  2. Agregar items (variantes + cantidades recibidas). El sistema valida que no se exceda lo pendiente de recibir.
  3. Confirmar. El stock aumenta y se actualiza `quantity_received` en la orden.
  4. Si todas las lineas de la orden estan completas, la orden pasa automaticamente a `COMPLETED`.
- **Reglas**:
  - Soporta recepcion parcial (multiples ENTRY para una misma orden).
  - `quantity_received + nueva_cantidad <= quantity_ordered`.
  - `unit_price` es libre.

### 3.2 SALE — Venta a Estudiante o Personal

- **Descripcion**: Registra una salida con valor economico a un estudiante o personal de la universidad.
- **Actor**: `ADMIN`, `INVENTORY_MANAGER`
- **Campos obligatorios**: `recipient_id` (tipo `STUDENT` o `STAFF`), `unit_price > 0` por item.
- **Efecto en stock**: `current_stock -= quantity`
- **Flujo**:
  1. Crear movimiento SALE con destinatario.
  2. Agregar items con precio unitario. Solo admite productos `MEDICAL_GARMENT`.
  3. Confirmar. El stock disminuye y se calcula `total_amount`.
- **Reglas**:
  - `subtotal = quantity * unit_price`. `total_amount = suma de subtotales`.
  - `is_donated = false` — aparece en reportes financieros.
  - No admite materiales de oficina.

### 3.3 DONATION — Dotacion Gratuita a Becario

- **Descripcion**: Registra entrega gratuita de indumentaria a becarios.
- **Actor**: `ADMIN`, `INVENTORY_MANAGER`
- **Campo obligatorio**: `recipient_id` (tipo `SCHOLAR` obligatoriamente).
- **Efecto en stock**: `current_stock -= quantity`
- **Flujo**:
  1. Crear movimiento DONATION con destinatario becario.
  2. Agregar items. El sistema fuerza `unit_price = 0`. Solo admite `MEDICAL_GARMENT`.
  3. Confirmar. El stock disminuye.
- **Reglas**:
  - `is_donated = true` — se **excluye** de reportes financieros.
  - **Si aparece** en reporte de dotaciones: becario, items, tallas, fecha.
  - Si el destinatario no es tipo `SCHOLAR`, el sistema rechaza la operacion.

### 3.4 WRITE_OFF — Baja por Deterioro

- **Descripcion**: Registra merma o perdida por deterioro de productos.
- **Actor**: `ADMIN`, `INVENTORY_MANAGER`
- **Campo obligatorio**: `notes` (minimo 10 caracteres — justificacion).
- **Efecto en stock**: `current_stock -= quantity`
- **Flujo**:
  1. Crear movimiento WRITE_OFF.
  2. Agregar items (admite cualquier categoria). `unit_price` forzado a 0.
  3. Confirmar. El stock disminuye.
- **Reglas**:
  - Sin destinatario, sin departamento, sin orden de fabricacion.
  - `total_amount = 0`, `is_donated = false`.
  - Aparece en reporte de bajas con la justificacion visible.
  - La auditoria registra stock antes/despues por variante.

### 3.5 ADJUSTMENT — Ajuste Manual de Inventario

- **Descripcion**: Corrige diferencias entre el conteo fisico y el stock del sistema.
- **Actor**: `ADMIN`, `INVENTORY_MANAGER`
- **Campo obligatorio**: `notes` (minimo 10 caracteres — justificacion).
- **Efecto en stock**: `current_stock += quantity` (puede ser **positivo o negativo**).
- **Flujo**:
  1. Crear movimiento ADJUSTMENT.
  2. Agregar items con cantidad positiva (faltante) o negativa (sobrante). Admite cualquier categoria.
  3. Confirmar. El stock se ajusta algebraicamente.
- **Reglas**:
  - **Unico tipo** donde `quantity` puede ser negativa.
  - `quantity = 0` no esta permitido.
  - Si el ajuste dejaria stock en negativo, se rechaza.
  - La auditoria registra `old_values` y `new_values` del stock por variante.

### 3.6 DEPARTMENT_DELIVERY — Entrega a Departamento Interno

- **Descripcion**: Registra la entrega de materiales de oficina a departamentos de la universidad.
- **Actor**: `ADMIN`, `INVENTORY_MANAGER`
- **Campo obligatorio**: `department_id`.
- **Efecto en stock**: `current_stock -= quantity`
- **Flujo**:
  1. Crear movimiento DEPARTMENT_DELIVERY con departamento.
  2. Agregar items. **Solo admite productos `OFFICE_SUPPLY`**. `unit_price` forzado a 0.
  3. Confirmar. El stock disminuye.
- **Reglas**:
  - `total_amount = 0` (consumo interno).
  - Aparece en reporte de consumo por departamento, no en reportes financieros.
  - No admite indumentaria medica.

### Resumen: Restricciones por Tipo de Movimiento

| Tipo                |         recipient_id          | department_id | manufacture_order_id | unit_price |            notes             | Categoria permitida  |
| ------------------- | :---------------------------: | :-----------: | :------------------: | :--------: | :--------------------------: | -------------------- |
| ENTRY               |               —               |       —       |    **Requerido**     |   Libre    |           Opcional           | Segun orden          |
| SALE                | **Requerido** (STUDENT/STAFF) |       —       |          —           |  **> 0**   |           Opcional           | Solo MEDICAL_GARMENT |
| DONATION            |    **Requerido** (SCHOLAR)    |       —       |          —           |  **= 0**   |           Opcional           | Solo MEDICAL_GARMENT |
| WRITE_OFF           |               —               |       —       |          —           |    = 0     | **Requerido** (min 10 chars) | Cualquiera           |
| ADJUSTMENT          |               —               |       —       |          —           |    = 0     | **Requerido** (min 10 chars) | Cualquiera           |
| DEPARTMENT_DELIVERY |               —               | **Requerido** |          —           |    = 0     |           Opcional           | Solo OFFICE_SUPPLY   |

---

## 4. Ordenes de Fabricacion

La indumentaria medica se manda a fabricar a talleres externos (no se compra a proveedores).

### Ciclo de Vida

```
PENDING ──→ IN_PROGRESS ──→ COMPLETED
PENDING ──→ CANCELLED
IN_PROGRESS ──→ CANCELLED (lo recibido permanece en stock)
```

### 4.1 Crear Orden

- **Descripcion**: Registra un pedido a un taller externo.
- **Actor**: `ADMIN`, `INVENTORY_MANAGER`
- **Precondiciones**: El fabricante debe existir y estar activo.
- **Resultado**: Orden vacia en estado `PENDING`. El numero se genera como `ORD-YYYYMMDD-####`.

### 4.2 Agregar Items a la Orden

- **Descripcion**: Define que productos y cantidades se mandan a fabricar.
- **Actor**: `ADMIN`, `INVENTORY_MANAGER`
- **Precondiciones**: Orden en `PENDING`. La variante debe ser `MEDICAL_GARMENT`.
- **Reglas**:
  - **No se pueden fabricar materiales de oficina**.
  - No se puede agregar la misma variante dos veces a la misma orden.
  - `quantity_ordered > 0`, `unit_cost >= 0`.

### 4.3 Iniciar Produccion

- **Descripcion**: Marca la orden como en proceso de fabricacion.
- **Actor**: `ADMIN`, `INVENTORY_MANAGER`
- **Precondiciones**: Orden en `PENDING` con al menos un item.
- **Resultado**: Estado pasa a `IN_PROGRESS`.

### 4.4 Recepcion Parcial

- **Descripcion**: Registra una entrega parcial del taller.
- **Actor**: `ADMIN`, `INVENTORY_MANAGER`
- **Precondiciones**: Orden en `PENDING` o `IN_PROGRESS`.
- **Flujo**:
  1. Se seleccionan items y cantidades recibidas.
  2. El sistema valida que no se exceda lo pendiente por item.
  3. Crea automaticamente un movimiento `ENTRY` vinculado a la orden.
  4. Al confirmar el ENTRY, el stock aumenta y `quantity_received` se incrementa.
  5. La orden queda `IN_PROGRESS`.
- **Regla clave**: `received + nueva_cantidad <= quantity_ordered`.

### 4.5 Recepcion Total y Auto-Completado

- **Descripcion**: Cuando todas las lineas quedan completas, la orden se cierra automaticamente.
- **Flujo**: Igual que recepcion parcial, pero al finalizar, el sistema detecta que todas las lineas tienen `quantity_received >= quantity_ordered` y pasa la orden a `COMPLETED`.

### 4.6 Cancelar Orden

- **Descripcion**: Cancela una orden pendiente o en curso.
- **Actor**: `ADMIN`, `INVENTORY_MANAGER`
- **Precondiciones**: Estado `PENDING` o `IN_PROGRESS`. Motivo obligatorio (min 10 caracteres).
- **Comportamiento segun situacion**:

| Situacion                                     | Que pasa                                                                                                                            |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Orden `PENDING` (sin recepciones)             | Cancelacion total. Todos los items se anulan.                                                                                       |
| Orden `IN_PROGRESS` sin recepciones           | Cancelacion total. Igual que PENDING.                                                                                               |
| Orden `IN_PROGRESS` con recepciones parciales | **Solo se cancela lo pendiente**. Los items ya recibidos permanecen en stock (los movimientos ENTRY confirmados son irreversibles). |
| Orden `COMPLETED`                             | **No se puede cancelar**.                                                                                                           |
| Orden ya `CANCELLED`                          | **No se puede cancelar de nuevo**.                                                                                                  |

- **UI**: Antes de confirmar la cancelacion, se muestra un desglose por item: Pedido / Recibido / A Cancelar. Si hay recepciones parciales, se muestra advertencia: "Los items ya recibidos (X unidades) permaneceran en el inventario. Solo se cancelara lo pendiente (Y unidades)."

---

## 5. Gestion de Catalogos

### 5.1 Fabricantes (Talleres Externos)

- **Que son**: Talleres a los que se manda fabricar indumentaria medica.
- **Campos**: Nombre, contacto, telefono, email, direccion.
- **Operaciones**: Crear, editar, desactivar.
- **Restriccion de desactivacion**: No se puede desactivar un fabricante con ordenes `PENDING` o `IN_PROGRESS`.

### 5.2 Destinatarios (Beneficiarios)

Personas que reciben productos del sistema.

| Tipo      | Descripcion                  | Puede recibir                     |
| --------- | ---------------------------- | --------------------------------- |
| `STUDENT` | Estudiante de la universidad | Ventas (`SALE`)                   |
| `STAFF`   | Personal de la universidad   | Ventas (`SALE`)                   |
| `SCHOLAR` | Becario                      | Dotaciones gratuitas (`DONATION`) |

- **Campos**: Numero de documento (unico, inmutable), nombre completo, tipo, telefono, email, carrera.
- **Operaciones**: Crear, editar (excepto documento), desactivar.
- **Regla**: Si necesita cambiarse el documento, se desactiva el registro y se crea uno nuevo.

### 5.3 Departamentos (Areas Internas)

- **Que son**: Departamentos internos de la universidad que reciben materiales de oficina.
- **Campos**: Nombre (unico), codigo (unico).
- **Operaciones**: Crear, editar, desactivar.
- **Restriccion de desactivacion**: No se puede desactivar un departamento con entregas `DRAFT` pendientes.
- **Vinculo**: Destinatario exclusivo de movimientos `DEPARTMENT_DELIVERY`.

---

## 6. Reportes

El sistema genera 6 tipos de reportes operativos mas un visor de auditoria. Todos soportan filtros por rango de fechas y exportacion a Excel.

### Regla General de Fechas

- Los reportes usan `processed_at` (cuando se confirmo el movimiento), no `created_at`.
- Las fechas se normalizan a UTC: `date_from` a inicio del dia (`00:00:00.000Z`), `date_to` a fin del dia (`23:59:59.999Z`).

### 6.1 Reporte Financiero (Ventas)

| Caracteristica  | Detalle                                              |
| --------------- | ---------------------------------------------------- |
| **Que muestra** | Ventas confirmadas con monto economico               |
| **Filtro base** | `type=SALE, is_donated=false, status=CONFIRMED`      |
| **Filtros**     | Rango de fechas, categoria de producto               |
| **Resumen**     | Total en Bs., total movimientos, total items         |
| **Detalle**     | Numero, fecha, destinatario, documento, items, monto |
| **Acceso**      | `ADMIN`, `INVENTORY_MANAGER`                         |
| **Excel**       | Si                                                   |

### 6.2 Reporte de Inventario Actual

| Caracteristica  | Detalle                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------ |
| **Que muestra** | Snapshot en tiempo real del stock por producto y variante                                  |
| **Filtro base** | Productos y variantes activos                                                              |
| **Filtros**     | Area de almacen, categoria, "solo stock bajo", busqueda por texto                          |
| **Resumen**     | Total productos, total variantes, variantes con stock bajo                                 |
| **Detalle**     | Producto, SKU, variante (talla/genero/color), stock actual, stock minimo, estado (OK/Bajo) |
| **Acceso**      | `ADMIN`, `INVENTORY_MANAGER`, `VIEWER`                                                     |
| **Excel**       | Si                                                                                         |

### 6.3 Reporte de Movimientos

| Caracteristica  | Detalle                                                                             |
| --------------- | ----------------------------------------------------------------------------------- |
| **Que muestra** | Historial de movimientos con filtros operativos                                     |
| **Filtro base** | Todos los movimientos                                                               |
| **Filtros**     | Rango de fechas, tipo de movimiento, estado, producto                               |
| **Detalle**     | Numero, tipo, estado, fecha, procesado por, destinatario/departamento, items, monto |
| **Paginacion**  | 20 por pagina (en UI), sin limite para exportacion                                  |
| **Acceso**      | `ADMIN`, `INVENTORY_MANAGER`, `VIEWER`                                              |
| **Excel**       | Si (exporta todos los registros filtrados, sin limite de paginacion)                |

### 6.4 Reporte de Dotaciones a Becarios

| Caracteristica  | Detalle                                                                   |
| --------------- | ------------------------------------------------------------------------- |
| **Que muestra** | Donaciones confirmadas a becarios con detalle de items                    |
| **Filtro base** | `type=DONATION, status=CONFIRMED`                                         |
| **Filtros**     | Rango de fechas, destinatario                                             |
| **Resumen**     | Total dotaciones, total items entregados                                  |
| **Detalle**     | Numero, fecha, becario, documento, producto, talla/genero/color, cantidad |
| **Acceso**      | `ADMIN`, `INVENTORY_MANAGER`, `VIEWER`                                    |
| **Excel**       | Si                                                                        |

### 6.5 Reporte de Consumo por Departamento

| Caracteristica  | Detalle                                                           |
| --------------- | ----------------------------------------------------------------- |
| **Que muestra** | Entregas internas agregadas por departamento                      |
| **Filtro base** | `type=DEPARTMENT_DELIVERY, status=CONFIRMED`                      |
| **Filtros**     | Rango de fechas, departamento                                     |
| **Resumen**     | Total entregas, total items, departamentos atendidos              |
| **Detalle**     | Departamento, codigo, total entregas, total items, ultima entrega |
| **Acceso**      | `ADMIN`, `INVENTORY_MANAGER`                                      |
| **Excel**       | Si                                                                |

### 6.6 Reporte de Bajas por Deterioro

| Caracteristica  | Detalle                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| **Que muestra** | Bajas confirmadas con justificacion visible                                                             |
| **Filtro base** | `type=WRITE_OFF, status=CONFIRMED`                                                                      |
| **Filtros**     | Rango de fechas                                                                                         |
| **Resumen**     | Total bajas, total items dados de baja                                                                  |
| **Detalle**     | Numero, fecha, procesado por, producto, variante, cantidad, justificacion (texto completo, no truncado) |
| **Acceso**      | `ADMIN`, `INVENTORY_MANAGER`                                                                            |
| **Excel**       | Si                                                                                                      |

### 6.7 Visor de Auditoria

| Caracteristica       | Detalle                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------- |
| **Que muestra**      | Registro inmutable de todas las acciones del sistema                                    |
| **Filtros**          | Usuario, accion, tipo de entidad, rango de fechas                                       |
| **Detalle**          | Fecha/hora, usuario, accion, entidad, ID, valores anteriores y nuevos (JSON expandible) |
| **Limite de fechas** | Maximo 90 dias por consulta. Por defecto muestra ultimos 30 dias                        |
| **Paginacion**       | 20 por pagina, maximo 100                                                               |
| **Acceso**           | Solo `ADMIN`                                                                            |
| **Ubicacion**        | Panel admin (`apps/admin`)                                                              |

### Exportacion Excel

- Disponible en los 6 reportes operativos (no en auditoria).
- Solo para `ADMIN` e `INVENTORY_MANAGER` (permiso `report:export`).
- Genera archivo `.xlsx` con:
  - Encabezado: titulo del reporte, rango de fechas, "UPDS - Sistema de Inventario".
  - Columnas tipadas (numeros como numeros, fechas como fechas, montos con formato `Bs. #,##0.00`).
  - Filas de stock bajo resaltadas en rojo (reporte de inventario).
  - Fila de totales donde aplica (consumo por departamento).
- La exportacion aplica los mismos filtros que el usuario tiene activos en la pantalla.

---

## 7. Trazabilidad y Auditoria

### Que se Audita

| Evento                                                                         | Accion registrada                                 |
| ------------------------------------------------------------------------------ | ------------------------------------------------- |
| Login exitoso                                                                  | `LOGIN`                                           |
| Login fallido (usuario existe, contrasena incorrecta)                          | `LOGIN_FAILED`                                    |
| Cambio de contrasena propia                                                    | `PASSWORD_CHANGE`                                 |
| Reset de contrasena por admin                                                  | `PASSWORD_RESET`                                  |
| Crear producto / variante / fabricante / destinatario / departamento / usuario | `CREATE`                                          |
| Editar cualquier entidad                                                       | `UPDATE`                                          |
| Desactivar / Reactivar entidad                                                 | `DEACTIVATE` / `REACTIVATE`                       |
| Crear movimiento (cabecera)                                                    | `CREATE`                                          |
| Agregar item a movimiento                                                      | `UPDATE` (con detalle `ADD_ITEM`)                 |
| Quitar item de movimiento                                                      | `UPDATE` (con detalle `REMOVE_ITEM`)              |
| Confirmar movimiento                                                           | `CONFIRM` (incluye cambios de stock por variante) |
| Cancelar movimiento                                                            | `CANCEL`                                          |
| Crear orden de fabricacion                                                     | `CREATE`                                          |
| Agregar/quitar items de orden                                                  | `UPDATE`                                          |
| Iniciar produccion                                                             | `UPDATE` (status change)                          |
| Recibir items de orden                                                         | `RECEIVE`                                         |
| Cancelar orden                                                                 | `CANCEL`                                          |

### Metadata Capturada por Registro

| Campo         | Descripcion                                                          |
| ------------- | -------------------------------------------------------------------- |
| `user_id`     | Quien ejecuto la accion                                              |
| `action`      | Que hizo (CREATE, UPDATE, CONFIRM, etc.)                             |
| `entity_type` | Sobre que tipo de entidad (Product, InventoryMovement, etc.)         |
| `entity_id`   | ID de la entidad afectada                                            |
| `old_values`  | Estado anterior (JSON)                                               |
| `new_values`  | Estado nuevo (JSON)                                                  |
| `ip_address`  | IP del usuario (extraida de headers `x-forwarded-for` o `x-real-ip`) |
| `user_agent`  | Navegador/cliente del usuario                                        |
| `created_at`  | Timestamp exacto                                                     |

### Reglas de la Auditoria

- **Inmutable**: Solo INSERT, nunca UPDATE ni DELETE sobre `AuditLog`.
- **Completa**: Toda mutacion en el sistema genera una entrada.
- **Solo ADMIN** puede consultar los logs desde el panel admin.
- **Limite de consulta**: Maximo 90 dias por consulta, default 30 dias.

---

## 8. Reglas de Stock

### 8.1 El Stock Vive en ProductVariant

El campo `current_stock` esta en `ProductVariant`, **nunca en `Product`**. Un "Pijama Quirurgico Verde" puede tener 50 unidades en talla M pero 0 en talla XL. Las alertas se evaluan por variante.

### 8.2 Validacion en Dos Fases

| Fase           | Donde                 | Que hace                                                         | Bloquea?                  |
| -------------- | --------------------- | ---------------------------------------------------------------- | ------------------------- |
| **Preventiva** | UI (frontend)         | Muestra stock disponible, advierte al 80%, bloquea al 100%       | Solo bloquea agregar item |
| **Definitiva** | Backend (transaccion) | Verifica `current_stock >= quantity` en transaccion serializable | Si — rollback completo    |

### 8.3 Concurrencia

- La confirmacion de movimientos usa **transaccion serializable** en Prisma.
- Si dos usuarios confirman simultaneamente sobre la misma variante, uno tiene exito y el otro recibe error.
- En caso de conflicto serializable (`P2034`), el sistema reintenta hasta 3 veces antes de fallar.
- Mensaje de error: "Stock insuficiente para [variante]. Stock actual: X, solicitado: Y."

### 8.4 Impacto en Stock por Tipo de Movimiento

| Tipo                | Efecto en stock                               |
| ------------------- | --------------------------------------------- |
| ENTRY               | `+= quantity` (aumenta)                       |
| SALE                | `-= quantity` (disminuye)                     |
| DONATION            | `-= quantity` (disminuye)                     |
| WRITE_OFF           | `-= quantity` (disminuye)                     |
| ADJUSTMENT          | `+= quantity` (puede ser positivo o negativo) |
| DEPARTMENT_DELIVERY | `-= quantity` (disminuye)                     |

### 8.5 Alertas de Stock Bajo

- Se activan cuando `current_stock < product.min_stock` para cualquier variante activa.
- No es tabla separada — query en tiempo real optimizada con `$queryRaw`.
- `min_stock` por defecto = 5, configurable por producto.
- Visible en: dashboard, pagina de inventario (badge rojo), reporte de inventario.
