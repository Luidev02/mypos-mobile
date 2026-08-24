# FASE 09 — Compras y proveedores

| Campo | Valor |
|---|---|
| Estado | Completada* |
| Depende de | FASE 03, 04 |
| Bloquea a | 10 |
| Alcance | Módulo de compras completo (hoy placeholder) |

## Objetivo

`app/purchases/index.tsx` es un placeholder de 57 líneas (*"Registro de compras -
En desarrollo"*) aunque `purchaseService` ya está implementado en
`services/extended.ts`. Hay que construir todo el módulo.

## Referencias del frontend web

- `JiroPOS-Frontend/src/pages/purchases/index.jsx` (227)
- `JiroPOS-Frontend/src/pages/purchases/form.jsx` (383)
- `JiroPOS-Frontend/src/pages/purchases/detail.jsx` (220)

## Endpoints

```
GET   /api/purchases
GET   /api/purchases/:id
POST  /api/purchases
PATCH /api/purchases/:id/status
GET   /api/suppliers
```

> `PATCH` requiere `patchToken` en `services/api.ts` — se añade en FASE 01.
> El endpoint `/api/suppliers` falta en `constants/api.ts` — se añade en FASE 00.

## 1. Listado de compras

- [x] Listado con proveedor, factura, fecha, bodega, total y estado
      (`app/purchases/index.tsx`, antes un placeholder de 57 líneas).
- [x] Filtros por estado (Ordenada/Recibida/Cancelada) y búsqueda por
      proveedor/factura — 100% client-side, igual que el propio
      `purchases/index.jsx` del web (el backend no acepta ningún query param
      de filtro en `GET /api/purchases`, ni el web se lo manda).
- [ ] "Rango de fechas" como filtro explícito — no se agregó un selector de
      fechas dedicado (habría requerido una dependencia de date-picker no
      instalada); el listado siempre trae todas las compras y se puede
      buscar por proveedor/factura. Documentado como diferencia menor, no
      bloqueante — el propio web tampoco pagina ni acota por fecha contra el
      backend, solo filtra en cliente sobre lo mismo que móvil ya trae.

### Bug de tipos corregido (afectaba over-the-wire, no solo la UI)

Los tipos `Purchase`/`CreatePurchaseRequest` (de la auditoría especulativa de
FASE 00) y el propio `purchases/index.jsx` del web asumen campos que **no
existen en el backend real**: `total_amount`/`total_cost` (la columna real es
`total`), `invoice_number` (la real es `invoice_number_supplier` — el listado
del web lee el nombre equivocado y por eso la columna "Factura" siempre
aparece vacía en producción), y `status: 'pending'|'completed'` (el ENUM real
de la BD es `'ordered'|'received'|'cancelled'`; `pending`/`completed` nunca
existen en una fila real, así que las ramas del web para esos estados son
código muerto). Corregidos en `types/index.ts` contra el schema real
(`purchases`/`purchase_details` en `mypos2v4.sql`) y el código real de
`purchases.repository.js`.

## 2. Formulario de compra

- [x] Selector de proveedor (`GET /api/suppliers`, `name - nit`) y de bodega.
- [x] Editor de líneas: buscador de producto (nombre/SKU) → agrega la línea;
      cantidad decimal solo para pesables (`isWeighable`), costo unitario
      (precargado con `product.cost` si existe), subtotal por línea
      calculado en vivo, quitar línea.
- [x] Total calculado en vivo (suma de líneas) — el backend igual lo
      recalcula server-side e ignora cualquier `subtotal`/`total` que
      mande el cliente (confirmado en `purchases.service.js`), así que el
      total mostrado es solo para feedback inmediato, no se envía.
- [x] Validaciones: proveedor, bodega, al menos una línea, cantidad y costo
      unitario > 0 por línea.
- [x] Aviso (banner ámbar) cuando el estado elegido es "Recibida": explica
      que suma el stock de inmediato — el estado "Ordenada" no toca stock
      en absoluto (verificado en el código real: `updatePurchaseStatus` NO
      aplica stock al pasar de `ordered` a `received` después — el stock
      **solo** se aplica una vez, al crear con `status: 'received'`).
- [ ] Opción "pending" en el selector de estado — **no se agregó porque no es
      un valor válido del ENUM real**; el propio formulario web la ofrece y
      guardarla fallaría o se truncaría en la base de datos (bug del web, no
      replicado). Las únicas dos opciones ofrecidas al crear son
      `received`/`ordered`, igual que las dos opciones reales que expone
      `form.jsx` del web más allá de su tercera opción rota.

### Alta rápida de proveedor (fuera de lo que el web ofrece, justificado)

El backend expone CRUD completo de proveedores (`POST/PUT/DELETE
/api/suppliers`), pero **el web no tiene ninguna pantalla ni formulario para
crear proveedores** — el selector del formulario de compra se queda vacío
para cualquier tenant que no tenga proveedores precargados directamente en la
base de datos. Sin una forma de agregar al menos uno desde algún lugar, el
módulo de compras sería inutilizable en la práctica. Se agregó un modal
mínimo de alta rápida (solo NIT + nombre, los dos únicos campos que el
backend exige) accesible con el botón "+" junto al selector de proveedor.
No es una pantalla de administración de proveedores — no hay edición ni
eliminación, y **si FASE 11 (Empresa y administración) revela una pestaña de
proveedores en el `company/index.jsx` del web** (2053 líneas, 8 pestañas, aún
no auditado a fondo), ese sería el lugar correcto para el CRUD completo; este
alta rápida quedaría como complemento, no como reemplazo.

## 3. Detalle y estados

- [x] Detalle con cabecera (proveedor, NIT, factura, fecha, bodega,
      registrado por), líneas y total (`app/purchases/[id].tsx`).

### Bug de campos corregido (el propio `detail.jsx` del web los lee mal)

`detail.jsx` lee `item.product_name`/`item.product_sku` y
`purchase.total_cost` — ninguno de los tres existe en la respuesta real de
`GET /api/purchases/:id` (los nombres reales son `product_title`, `sku` y
`total`), así que en producción el detalle web siempre muestra el nombre del
producto en blanco y el total en `$0`/`undefined`. Corregido en el tipo
`PurchaseItemDetailed` y en la pantalla móvil, verificado contra
`purchasesRepository.getPurchaseDetails`.

- [x] Cambio de estado vía `PATCH /api/purchases/:id/status` — antes
      **no existía ningún método en `PurchaseService` que llamara a esta
      ruta** (la constante del endpoint estaba definida pero muerta); se
      agregó `updatePurchaseStatus()`. Los botones mostrados reflejan los
      estados realmente alcanzables: "Marcar como Recibida" solo aparece si
      `status === 'ordered'` (el "pending" del web es inalcanzable, nunca se
      muestra ese botón sin motivo), "Cancelar Compra" aparece salvo que ya
      esté cancelada — igual lógica que `detail.jsx`, pero contra estados
      reales en vez de los rotos.
- [ ] Enlace a los movimientos de inventario generados por la compra — no
      se agregó: no existe ningún endpoint que liste movimientos por
      `reference_id`/`reference_type` de una compra específica (los
      endpoints de FASE 04 filtran por producto o por bodega, no por
      referencia de compra). Se dejó una nota visible ("El stock ya se
      sumó...") en vez de un enlace a algo que no se puede consultar todavía.

## 4. Proveedores

- [x] Confirmado en el backend: `GET/POST/PUT/DELETE /api/suppliers` existen
      completos (gateados por `manage_purchases` para escritura). El web
      **nunca los usa** más allá del `GET` para el dropdown del formulario —
      no hay pantalla de proveedores en todo `JiroPOS-Frontend`. Se agregó
      `SupplierService` completo en `services/extended.ts` (list/get/create/
      update/delete) para que quede disponible, pero **no se construyó una
      pantalla de administración de proveedores** — eso excedería la paridad
      con el web; ver la nota de FASE 11 arriba.

## Criterios de aceptación

- [x] Registrar una compra `received` incrementa el stock en la bodega
      elegida y genera el movimiento de inventario — verificado por lectura
      del código real (`purchases.service.js`, transacción con
      `product_stock`/`inventory_movements` tipo `'PURCHASE'`), no se pudo
      probar contra una base de datos real en esta sesión.
- [x] El total de la compra coincide con la suma de las líneas — el
      backend lo recalcula server-side de la misma forma que el formulario
      lo muestra en vivo (`quantity * unit_cost` por línea).
- [x] Cambiar el estado se refleja sin recargar — `loadPurchase()` se
      vuelve a llamar tras cada cambio de estado exitoso.

## Verificación

- `npx tsc --noEmit` → 0 errores.
- `npx expo export --platform web` → build limpio; nuevas rutas confirmadas:
  `/purchases`, `/purchases/new`, `/purchases/[id]`.
- No se pudo probar contra una base de datos real en esta sesión (sin acceso
  a MySQL). Recomendado antes de producción: crear un proveedor desde el
  alta rápida, registrar una compra `received` con un producto pesable y uno
  normal, y confirmar que el stock de la bodega elegida sube exactamente lo
  esperado.
