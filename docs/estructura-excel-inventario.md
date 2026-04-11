# Estructura del Excel de Inventario Temporal — UPDS

## Objetivo

Este documento define la estructura que debe tener el archivo Excel para registrar **temporalmente** el inventario de indumentaria medica que llego en un lote grande. El personal de almacen usara este Excel hasta que el sistema de inventario este en produccion.

Una vez que el sistema este listo, el contenido del Excel se exportara a **formato JSON** y se importara directamente al sistema, por lo que es **critico** respetar exactamente los nombres de columna y valores permitidos que se describen aqui.

---

## Hojas del Excel

El archivo debe tener **3 hojas** (tabs):

| Hoja                 | Contenido                     | Descripcion                                           |
| -------------------- | ----------------------------- | ----------------------------------------------------- |
| `productos`          | Catalogo de productos base    | Un producto por fila (ej: "Pijama Quirurgico Verde")  |
| `variantes`          | Variantes con stock actual    | Una fila por cada combinacion talla + genero + color  |
| `valores_permitidos` | Referencia de valores validos | Para que el personal consulte que poner en cada campo |

---

## Hoja 1: `productos`

Registra cada **producto base** (el concepto general, sin desglosar por talla/genero).

| Columna | Nombre en Excel | Tipo   | Obligatorio | Descripcion                                                                                                  | Ejemplo                                   |
| ------- | --------------- | ------ | :---------: | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| A       | `sku`           | Texto  |     SI      | Codigo unico del producto. Formato libre pero debe ser unico por producto.                                   | `PIJ-VERDE`                               |
| B       | `nombre`        | Texto  |     SI      | Nombre descriptivo del producto.                                                                             | `Pijama Quirurgico Verde`                 |
| C       | `descripcion`   | Texto  |     NO      | Descripcion adicional. Dejar vacio si no aplica.                                                             | `Pijama dos piezas color verde quirofano` |
| D       | `categoria`     | Texto  |     SI      | Categoria del producto. **Solo usar valores de la lista.**                                                   | `MEDICAL_GARMENT`                         |
| E       | `tipo_prenda`   | Texto  | Condicional | Tipo de prenda. **Obligatorio solo si la categoria es `MEDICAL_GARMENT`**. Dejar vacio para `OFFICE_SUPPLY`. | `PIJAMA`                                  |
| F       | `area_almacen`  | Texto  |     SI      | Sector del almacen. **Debe ser coherente con la categoria.**                                                 | `MEDICAL`                                 |
| G       | `stock_minimo`  | Numero |     NO      | Cantidad minima antes de generar alerta. Si se deja vacio, el sistema usara 5 por defecto.                   | `10`                                      |
| H       | `observaciones` | Texto  |     NO      | Notas internas del personal (NO se importara al sistema, solo para uso temporal).                            | `Lote recibido el 05/04/2026`             |

### Reglas de validacion para `productos`

- **`sku`**: No puede repetirse. Recomendacion: usar prefijo del tipo + color. Ej: `PIJ-VERDE`, `BAT-BLANCA`, `MAN-AZUL`.
- **`categoria`** + **`area_almacen`** deben ser coherentes:
  - Si `categoria` = `MEDICAL_GARMENT` → `area_almacen` DEBE ser `MEDICAL`
  - Si `categoria` = `OFFICE_SUPPLY` → `area_almacen` DEBE ser `OFFICE`
- **`tipo_prenda`**:
  - Si `categoria` = `MEDICAL_GARMENT` → es **obligatorio** (elegir de la lista)
  - Si `categoria` = `OFFICE_SUPPLY` → DEBE dejarse **vacio**

---

## Hoja 2: `variantes`

Registra cada **combinacion especifica** de un producto (talla + genero + color) junto con su **stock actual**. Esta es la hoja mas importante: **el stock vive aqui, no en la hoja de productos**.

| Columna | Nombre en Excel   | Tipo   | Obligatorio | Descripcion                                                                                            | Ejemplo                          |
| ------- | ----------------- | ------ | :---------: | ------------------------------------------------------------------------------------------------------ | -------------------------------- |
| A       | `sku_producto`    | Texto  |     SI      | El `sku` del producto padre (debe existir en la hoja `productos`).                                     | `PIJ-VERDE`                      |
| B       | `sufijo_variante` | Texto  |     SI      | Identificador unico de la variante dentro del producto. Formato sugerido: `TALLA-GENERO`.              | `M-MASC`                         |
| C       | `talla`           | Texto  | Condicional | Talla de la prenda. **Obligatorio para indumentaria medica.** Dejar vacio para materiales de oficina.  | `M`                              |
| D       | `genero`          | Texto  | Condicional | Genero de la prenda. **Obligatorio para indumentaria medica.** Dejar vacio para materiales de oficina. | `MASCULINO`                      |
| E       | `color`           | Texto  |     NO      | Color de la variante. Texto libre.                                                                     | `Verde Quirofano`                |
| F       | `stock_actual`    | Numero |     SI      | Cantidad fisica contada en almacen al momento del registro. **Debe ser >= 0.**                         | `25`                             |
| G       | `observaciones`   | Texto  |     NO      | Notas internas (NO se importara al sistema).                                                           | `Contado por Juan el 05/04/2026` |

### Reglas de validacion para `variantes`

- **`sku_producto`**: DEBE existir como `sku` en la hoja `productos`. Si no existe, la fila es invalida.
- **`sufijo_variante`**: No puede repetirse dentro del mismo `sku_producto`. La combinacion `sku_producto` + `sufijo_variante` debe ser unica.
- **`talla`** y **`genero`**:
  - Si el producto padre es `MEDICAL_GARMENT` → ambos son **obligatorios**
  - Si el producto padre es `OFFICE_SUPPLY` → ambos deben estar **vacios** (el producto tiene una sola variante)
- **`stock_actual`**: Numero entero >= 0. No usar decimales. No dejar vacio — si no hay stock, poner `0`.

### Formato sugerido para `sufijo_variante`

Para mantener consistencia, usar este formato:

| Contexto                            | Formato                       | Ejemplo                    |
| ----------------------------------- | ----------------------------- | -------------------------- |
| Indumentaria con talla y genero     | `TALLA-GEN` (3 letras genero) | `M-MAS`, `L-FEM`, `XL-UNI` |
| Indumentaria unisex                 | `TALLA-UNI`                   | `S-UNI`, `XXL-UNI`         |
| Material de oficina (sin variantes) | `DEFAULT`                     | `DEFAULT`                  |

---

## Hoja 3: `valores_permitidos`

Hoja de **referencia** para el personal. No se importa al sistema — es solo una guia.

### Categorias de Producto

| Valor para Excel  | Significado                                                     |
| ----------------- | --------------------------------------------------------------- |
| `MEDICAL_GARMENT` | Indumentaria Medica (pijamas, batas, mandiles, poleras, gorros) |
| `OFFICE_SUPPLY`   | Material de Oficina (papeleria, insumos)                        |

### Tipos de Prenda (solo para MEDICAL_GARMENT)

| Valor para Excel | Significado       |
| ---------------- | ----------------- |
| `PIJAMA`         | Pijama Quirurgico |
| `BATA`           | Bata              |
| `MANDIL`         | Mandil            |
| `POLERA`         | Polera            |
| `GORRO`          | Gorro Quirurgico  |

### Areas de Almacen

| Valor para Excel | Significado    | Categoria obligatoria |
| ---------------- | -------------- | --------------------- |
| `MEDICAL`        | Sector Medico  | `MEDICAL_GARMENT`     |
| `OFFICE`         | Sector Oficina | `OFFICE_SUPPLY`       |

### Tallas

| Valor para Excel | Significado        |
| ---------------- | ------------------ |
| `XS`             | Extra Pequeno      |
| `S`              | Pequeno            |
| `M`              | Mediano            |
| `L`              | Grande             |
| `XL`             | Extra Grande       |
| `XXL`            | Doble Extra Grande |

### Genero

| Valor para Excel | Significado |
| ---------------- | ----------- |
| `MASCULINO`      | Masculino   |
| `FEMENINO`       | Femenino    |
| `UNISEX`         | Unisex      |

---

## Ejemplo Completo

### Hoja `productos` (ejemplo)

| sku        | nombre                  | descripcion                       | categoria       | tipo_prenda | area_almacen | stock_minimo | observaciones   |
| ---------- | ----------------------- | --------------------------------- | --------------- | ----------- | ------------ | ------------ | --------------- |
| PIJ-VERDE  | Pijama Quirurgico Verde | Pijama dos piezas verde quirofano | MEDICAL_GARMENT | PIJAMA      | MEDICAL      | 10           | Lote abril 2026 |
| PIJ-AZUL   | Pijama Quirurgico Azul  | Pijama dos piezas azul            | MEDICAL_GARMENT | PIJAMA      | MEDICAL      | 10           | Lote abril 2026 |
| BAT-BLANCA | Bata Blanca             | Bata manga larga blanca           | MEDICAL_GARMENT | BATA        | MEDICAL      | 5            |                 |
| MAN-BLANCO | Mandil Blanco           | Mandil de laboratorio             | MEDICAL_GARMENT | MANDIL      | MEDICAL      | 5            |                 |
| GOR-VERDE  | Gorro Quirurgico Verde  | Gorro desechable verde            | MEDICAL_GARMENT | GORRO       | MEDICAL      | 20           |                 |
| RES-A4     | Resma Papel A4          | Resma 500 hojas                   | OFFICE_SUPPLY   |             | OFFICE       | 15           |                 |

### Hoja `variantes` (ejemplo)

| sku_producto | sufijo_variante | talla | genero    | color           | stock_actual | observaciones                        |
| ------------ | --------------- | ----- | --------- | --------------- | ------------ | ------------------------------------ |
| PIJ-VERDE    | XS-FEM          | XS    | FEMENINO  | Verde Quirofano | 8            |                                      |
| PIJ-VERDE    | S-FEM           | S     | FEMENINO  | Verde Quirofano | 15           |                                      |
| PIJ-VERDE    | M-FEM           | M     | FEMENINO  | Verde Quirofano | 22           |                                      |
| PIJ-VERDE    | L-FEM           | L     | FEMENINO  | Verde Quirofano | 18           |                                      |
| PIJ-VERDE    | XL-FEM          | XL    | FEMENINO  | Verde Quirofano | 10           |                                      |
| PIJ-VERDE    | S-MAS           | S     | MASCULINO | Verde Quirofano | 12           |                                      |
| PIJ-VERDE    | M-MAS           | M     | MASCULINO | Verde Quirofano | 30           |                                      |
| PIJ-VERDE    | L-MAS           | L     | MASCULINO | Verde Quirofano | 25           |                                      |
| PIJ-VERDE    | XL-MAS          | XL    | MASCULINO | Verde Quirofano | 14           |                                      |
| PIJ-VERDE    | XXL-MAS         | XXL   | MASCULINO | Verde Quirofano | 6            |                                      |
| PIJ-AZUL     | M-UNI           | M     | UNISEX    | Azul            | 20           |                                      |
| PIJ-AZUL     | L-UNI           | L     | UNISEX    | Azul            | 18           |                                      |
| BAT-BLANCA   | M-UNI           | M     | UNISEX    | Blanco          | 15           |                                      |
| BAT-BLANCA   | L-UNI           | L     | UNISEX    | Blanco          | 12           |                                      |
| BAT-BLANCA   | XL-UNI          | XL    | UNISEX    | Blanco          | 8            |                                      |
| MAN-BLANCO   | M-UNI           | M     | UNISEX    | Blanco          | 40           |                                      |
| MAN-BLANCO   | L-UNI           | L     | UNISEX    | Blanco          | 35           |                                      |
| GOR-VERDE    | UNI-UNI         | XS    | UNISEX    | Verde Quirofano | 100          | Talla unica, usar XS como referencia |
| RES-A4       | DEFAULT         |       |           |                 | 200          |                                      |

---

## Estructura JSON Resultante (para importacion futura)

Cuando el sistema este listo, el Excel se convertira a un JSON con esta estructura. **Esto es solo referencia para el equipo tecnico**, el personal de almacen no necesita entenderlo.

```json
{
  "productos": [
    {
      "sku": "PIJ-VERDE",
      "name": "Pijama Quirurgico Verde",
      "description": "Pijama dos piezas verde quirofano",
      "category": "MEDICAL_GARMENT",
      "garment_type": "PIJAMA",
      "warehouse_area": "MEDICAL",
      "min_stock": 10,
      "variants": [
        {
          "sku_suffix": "XS-FEM",
          "size": "XS",
          "gender": "FEMENINO",
          "color": "Verde Quirofano",
          "current_stock": 8
        },
        {
          "sku_suffix": "S-FEM",
          "size": "S",
          "gender": "FEMENINO",
          "color": "Verde Quirofano",
          "current_stock": 15
        },
        {
          "sku_suffix": "M-MAS",
          "size": "M",
          "gender": "MASCULINO",
          "color": "Verde Quirofano",
          "current_stock": 30
        }
      ]
    },
    {
      "sku": "RES-A4",
      "name": "Resma Papel A4",
      "description": "Resma 500 hojas",
      "category": "OFFICE_SUPPLY",
      "garment_type": null,
      "warehouse_area": "OFFICE",
      "min_stock": 15,
      "variants": [
        {
          "sku_suffix": "DEFAULT",
          "size": null,
          "gender": null,
          "color": null,
          "current_stock": 200
        }
      ]
    }
  ]
}
```

### Mapeo de columnas Excel → campos JSON → base de datos

| Excel (productos) | JSON             | Prisma (Product)                            |
| ----------------- | ---------------- | ------------------------------------------- |
| `sku`             | `sku`            | `sku`                                       |
| `nombre`          | `name`           | `name`                                      |
| `descripcion`     | `description`    | `description`                               |
| `categoria`       | `category`       | `category` (enum ProductCategory)           |
| `tipo_prenda`     | `garment_type`   | `garment_type` (enum GarmentType, nullable) |
| `area_almacen`    | `warehouse_area` | `warehouse_area` (enum WarehouseArea)       |
| `stock_minimo`    | `min_stock`      | `min_stock`                                 |

| Excel (variantes) | JSON                 | Prisma (ProductVariant)            |
| ----------------- | -------------------- | ---------------------------------- |
| `sku_producto`    | (relacion por `sku`) | `product_id` (se resuelve por SKU) |
| `sufijo_variante` | `sku_suffix`         | `sku_suffix`                       |
| `talla`           | `size`               | `size` (enum Size, nullable)       |
| `genero`          | `gender`             | `gender` (enum Gender, nullable)   |
| `color`           | `color`              | `color`                            |
| `stock_actual`    | `current_stock`      | `current_stock`                    |

---

## Checklist para el Personal de Almacen

Antes de entregar el Excel completado, verificar:

- [ ] Cada `sku` en la hoja `productos` es unico (no hay repetidos)
- [ ] Cada combinacion `sku_producto` + `sufijo_variante` en la hoja `variantes` es unica
- [ ] Todo `sku_producto` en `variantes` existe en la hoja `productos`
- [ ] Los valores de `categoria`, `tipo_prenda`, `area_almacen`, `talla` y `genero` son EXACTAMENTE los de la hoja `valores_permitidos` (respetar mayusculas)
- [ ] Si la categoria es `MEDICAL_GARMENT`: `tipo_prenda`, `talla` y `genero` estan completos
- [ ] Si la categoria es `OFFICE_SUPPLY`: `tipo_prenda`, `talla` y `genero` estan vacios
- [ ] El `stock_actual` es un numero entero >= 0 (sin decimales, sin texto)
- [ ] No hay filas vacias entre los datos
- [ ] No hay espacios en blanco antes o despues de los valores
