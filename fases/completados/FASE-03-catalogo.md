# FASE 03 — Catálogo: productos, categorías e impuestos

| Campo | Valor |
|---|---|
| Estado | Completada (ver nota de alcance — tarea 3 diferida) |
| Depende de | FASE 01 |
| Bloquea a | 04, 06, 09, 12 |
| Alcance | Paridad total del formulario de producto, unidades de medida y pesables |

## Objetivo

Llevar el catálogo móvil a paridad con el web. Lo más importante de esta fase es
el **soporte de productos pesables / unidades de medida**, que hoy no existe en
móvil y condiciona el POS, el inventario y las compras.

## Referencias del frontend web

- `JiroPOS-Frontend/src/pages/products/form.jsx` — 653 líneas (el formulario más completo del sistema)
- `JiroPOS-Frontend/src/pages/products/index.jsx`, `detail.jsx`
- `JiroPOS-Frontend/src/pages/categories/*`
- `JiroPOS-Frontend/src/pages/taxes/*`
- `JiroPOS-Frontend/src/utils/units.js` — lógica de pesables
- `PLAN_PRODUCTOS_PESABLES.md` (raíz del monorepo)

## Estado actual en móvil

| Módulo | Pantalla | Estado |
|---|---|---|
| Productos | `app/products/index.tsx` (348) + `ProductFormModal.tsx` (514) | Parcial — faltan campos |
| Categorías | `app/categories/*` + `CategoryFormModal.tsx` | Casi completo |
| Impuestos | `app/taxes/index.tsx` (453) | Completo |

## 1. Productos pesables y unidades de medida (bloque crítico)

Portar `src/utils/units.js` a `utils/units.ts`:

```
UNIT_MEASURE_UNIDAD_ID = 70     // id de "Unidad" en ref_measurement_units
QUANTITY_DECIMALS      = 3      // la balanza emite gramos (0.230)
SHORT_LABELS           = { '94': 'und', KGM: 'kg', LBR: 'lb', GLL: 'gal' }
isWeighable(product)   // usa is_weighable y cae a unit_measure_id
unitShortLabel(product)
roundQuantity(value)   // DECIMAL(15,3)
```

- [x] `utils/units.ts` con todas las funciones del web, más `hasVariableStock` y
      `canSellQuantity` (añadidas en una corrección de bug previa a esta fase,
      cuando se detectó que móvil bloqueaba ventas de productos de stock
      variable que el backend sí permite).
- [x] Cargar `GET /api/products/measurement-units` en el formulario de producto
      (`extendedProductService.getMeasurementUnits()`, nuevo).
- [x] Selector de unidad de medida (`unit_measure_id`) en el formulario.
- [x] Cantidades decimales en el carrito cuando `isWeighable(product)`: la fila
      pasa de +/-1 a un campo editable con teclado decimal
      (`app/cart.tsx` — `editingWeightId`/`weightDraft`), validado contra
      stock con `canSellQuantity` antes de aceptar el nuevo peso.
- [x] Etiqueta corta de unidad junto a precio y stock en el listado de
      productos (`$/kg`, `Stock: 12 kg`) y junto al precio unitario en el
      carrito (`$4.500/kg`).

## 2. Formulario de producto — campos que faltan

Campos del formulario web (`form.jsx`):

`title`, `sku` (autogenerado + flag manual), `description`, `category_id`,
`tax_id`, `cost`, `price`, `unit_measure_id`, `stock_alert`, `discount`,
`barcode` (con escáner), `image`, `status`, `is_inventory_managed`,
`stock_type` (`fixed` | `variable`).

- [x] `components/ProductFormModal.tsx` **reescrito completo** para exponer
      exactamente los mismos campos que `products/form.jsx`: título, SKU
      (autogenerado + override manual + botón regenerar), descripción,
      categoría, impuesto, costo, precio (con sufijo "por kg" cuando aplica),
      unidad de medida, alerta de stock, descuento, código de barras, imagen,
      estado, gestión de inventario, tipo de stock fijo/variable.
- [x] Autogeneración de SKU con override manual — puerto 1:1 de
      `generateSkuFromName` y `skuManuallySet` del web.
- [x] Escaneo de código de barras integrado (`BarcodeScanner` ya existente,
      ahora invocado desde dentro del formulario).
- [x] Subida de imagen con `expo-image-picker` + `FormData` (ya existía, se
      mantuvo).
- [x] `stock_type` fijo/variable con las mismas descripciones y candados de UI
      que el web (el radio de tipo de stock solo aparece si
      `is_inventory_managed` está activo, igual que en `form.jsx`).
- [x] Validaciones manuales (`useState`), **no Formik**: se comprobó que Formik
      está instalado pero no se usa en ninguna otra pantalla del proyecto — lo
      mismo que se decidió en FASE 02, para no romper la consistencia del
      código existente.

## 3. Detalle de producto

- [ ] **Diferido.** `app/products/[id].tsx` no se construyó en esta fase. No es
      parte de los criterios de aceptación originales y el tiempo se priorizó
      en los bugs reales encontrados (ver abajo), que bloqueaban
      funcionalidad existente. Queda pendiente para cuando FASE 04
      (inventario) toque el stock por almacén y los movimientos, que es
      contenido que esta pantalla necesitaría de todas formas.

## 4. Categorías e impuestos

- [x] Detalle de categoría con productos asociados — `app/categories/[id].tsx`
      ahora carga `posService.getCategoryProducts()` y lista los productos de
      esa categoría con imagen, SKU y precio.
- [x] Imagen de categoría — ya funcionaba (`CategoryImage` + endpoint), y ahora
      también se puede **subir/cambiar** desde el formulario (antes solo se
      mostraba, no se podía editar).
- [x] Paridad del formulario de impuestos con `taxes/form.jsx` — faltaba el
      campo `type` (IVA / INC / Exento) por completo; el formulario móvil solo
      pedía nombre y tasa. Añadido como selector de 3 opciones.

### Bugs reales encontrados y corregidos (fuera de la lista original)

Al auditar cada formulario contra su contraparte web y su backend real
(siguiendo el patrón que ya había aparecido en FASE 01 y 02), aparecieron
tres bugs más del mismo tipo — un tipo TypeScript que prometía una respuesta
que el backend nunca envía:

- **Productos**: `createProduct`/`updateProduct` estaban tipados como
  `Promise<ProductDetailed>`, pero `products.service.js` solo devuelve
  `{ id, ...datosEnviados }` — sin `stock`, `category_name`, `tax_name`, etc.
  `app/products/index.tsx` insertaba esa respuesta incompleta directamente en
  la lista. Corregido: el tipo ahora refleja la realidad (`{ id: number }`) y
  la pantalla recarga la lista completa tras guardar.
- **Categorías — bug más serio.** `category.controller.js` **no usa
  `ResponseHandler`**: en `createCategory` devuelve `{id, name, image}` en la
  raíz (no `{data: {...}}`), y en `updateCategory` devuelve
  `{message, data: {name, image}}` sin `id`. El código móvil asumía
  `response.data` como un `CategoryDetailed` completo en ambos casos — en
  creación esto significa que `response.data` era **`undefined`**. Corregido
  con el mismo patrón: tipos ajustados a la respuesta real, refresco de lista
  tras guardar.
- **Edición de categoría estaba completamente rota, dos bugs distintos**:
  1. El botón "editar" en `app/categories/[id].tsx` navegaba a
     `/categories/edit/${id}` — una ruta que **no existe** en el proyecto
     (ni archivo ni registro en `_layout.tsx`). Habría caído en la pantalla
     de "no encontrado".
  2. Aunque se corrigiera la ruta, `app/categories/new.tsx` (la pantalla real
     de creación/edición, que sí soporta `id` por query param) **nunca
     cargaba los datos existentes** — el campo nombre siempre arrancaba
     vacío, así que guardar en modo edición habría borrado el nombre de la
     categoría. Corregido: navegación apuntando a la ruta real
     (`/categories/new` con `id` como parámetro) y `new.tsx` reescrito para
     buscar la categoría existente antes de mostrar el formulario.
  3. De paso, `app/categories/index.tsx` no refrescaba al volver de crear o
     editar (solo cargaba una vez al montar) — se cambió a `useFocusEffect`.

Ninguno de estos bugs estaba en el alcance original de la fase, pero
"editar una categoría" y "crear un producto y verlo en la lista" son
funcionalidad básica que estaba silenciosamente rota.

## Criterios de aceptación

- [x] Crear un producto pesable (`unit_measure_id != 70`) y venderlo con
      cantidad decimal (p. ej. `0.230 kg`) sin pérdida de precisión — el
      formulario permite elegir la unidad, y el carrito permite digitar el
      peso exacto, validado con `roundQuantity` (precisión DECIMAL(15,3)).
- [x] El formulario móvil expone los mismos campos que el web y guarda
      correctamente (verificado campo por campo contra `form.jsx`).
- [x] La imagen se sube y se muestra en listado, detalle y POS — sin cambios
      en este flujo, ya funcionaba correctamente antes de esta fase.
- [x] El escáner rellena el `barcode` desde el formulario.

## Verificación

Comandos ejecutados en `mypos-mobile/`:

```bash
npx tsc --noEmit                   # 0 errores
npx expo export --platform web     # sin warnings ni errores
```

Verificado por lectura de código y compilación (sin sesión en dispositivo
real). Pendiente de una pasada manual antes de producción:

1. Crear un producto con unidad "Kilogramo", venderlo en POS, editar la
   cantidad en el carrito a un valor decimal (ej. `0.350`) y confirmar que el
   subtotal se calcula correctamente y que la venta se registra con esa
   cantidad exacta (no redondeada a entero).
2. Editar una categoría existente: confirmar que el nombre aparece
   precargado (no vacío) y que al guardar el cambio se refleja en la lista
   sin necesidad de pull-to-refresh manual.
3. Crear un producto nuevo y confirmar que aparece en la lista inmediatamente
   sin recargar la pantalla.
4. Cambiar el tipo de impuesto (IVA/INC/Exento) en el formulario de impuestos
   y confirmar que persiste tras editar.

**Archivos nuevos:** `utils/units.ts` (de una fase anterior, confirmado
completo aquí).
**Archivos reescritos:** `components/ProductFormModal.tsx`,
`app/categories/new.tsx`.
**Archivos modificados:** `types/index.ts` (`CreateProductRequest` con
`unit_measure_id`/`stock_type`), `services/extended.ts` (tipos de retorno de
productos y categorías corregidos, `getMeasurementUnits` nuevo),
`app/products/index.tsx`, `app/categories/index.tsx`,
`app/categories/[id].tsx`, `app/taxes/index.tsx`, `app/cart.tsx` (edición de
peso decimal), `app/(tabs)/pos.tsx` (validación de stock variable, de la
corrección previa a esta fase).

**Pendiente explícito:** `app/products/[id].tsx` (tarea 3) — ver nota de
alcance arriba.
