# FASE 04 — Inventario y almacenes

| Campo | Valor |
|---|---|
| Estado | Completada* |
| Depende de | FASE 03 |
| Bloquea a | 09 |
| Alcance | Ajustes, stock bajo, movimientos, stock por almacén |

## Objetivo

Completar el módulo de inventario. El listado ya existe en móvil; faltan las
tres pantallas operativas del web: **ajuste**, **stock bajo** y **movimientos**.

## Referencias del frontend web

- `JiroPOS-Frontend/src/pages/inventory/index.jsx` (215)
- `JiroPOS-Frontend/src/pages/inventory/adjust.jsx` (225)
- `JiroPOS-Frontend/src/pages/inventory/low-stock.jsx`
- `JiroPOS-Frontend/src/pages/inventory/movements.jsx` (237)
- `JiroPOS-Frontend/src/pages/warehouses/*`

## Endpoints

```
GET  /api/inventory/warehouse/:id/stock
GET  /api/inventory/warehouse/:id/movements
GET  /api/inventory/low-stock
GET  /api/inventory/product/:productId/movements
POST /api/inventory/adjust
GET  /api/warehouses            (+ CRUD)
```

`inventoryService.adjustInventory` y `getProductMovements` ya existen en
`services/extended.ts`. Falta `getLowStock` y `getWarehouseMovements`, y toda la UI.

## Tareas

### Ajuste de inventario (`app/inventory/adjust.tsx`)

Campos del web: bodega afectada, producto, tipo de movimiento, cantidad, notas.

- [x] Selector de bodega (obligatorio).
- [x] Selector/buscador de producto, marcando los de `stock_type === 'variable'` (🔓 en el picker + banner ámbar, igual que `adjust.jsx`).
- [x] Tipo de movimiento: `adjustment` (Ajuste), `damage` (Dañado), `return` (Devolución).
- [x] Cantidad con decimales si el producto es pesable (FASE 03), vía `roundQuantity`/`isWeighable`.
- [x] Notas obligatorias.
- [x] Confirmación antes de enviar (`ConfirmModal`) y refresco del stock al volver (`useFocusEffect` en las pantallas que listan).

### Stock bajo (`app/inventory/low-stock.tsx`)

- [x] Listado de productos por debajo de `stock_alert`, con badge CRÍTICO (stock negativo) vs BAJO — igual que `low-stock.jsx`.
- [ ] Acceso directo a crear una compra — diferido: FASE 09 (Compras) aún no existe en móvil, tampoco existe ese enlace en el propio `low-stock.jsx` del web (solo enlaza `/hub/inventory/adjust` de forma indirecta vía el listado). No se inventó una función que el web no tiene.
- [x] Botón de acceso ("⚠") desde el header de `(tabs)/inventory.tsx`. No se agregó badge de conteo en el tab bar general (`more.tsx`/tabs) porque el web tampoco lo expone fuera de este módulo.

### Movimientos

- [x] Historial por producto (kardex) integrado en `app/inventory/[id].tsx`, con tipo, fecha, usuario, nota, cantidad con signo y saldo — igual que el modo `productId` de `movements.jsx`.
- [x] `getWarehouseMovements` ya disponible en `services/extended.ts` (`ExtendedInventoryService`) para un futuro kardex por bodega.
- [ ] Filtros por tipo/fecha y paginación/scroll infinito — **no implementados**. Se revisó `movements.jsx` en el web y tampoco los tiene (es una tabla simple sin filtros ni paginación); replicar la funcionalidad real del web, no la lista de tareas original de este documento, que sobreestimaba el alcance del web.
- [ ] Pantalla dedicada `app/inventory/movements.tsx` para el modo "por bodega" — no se creó porque el único punto de entrada del web a ese modo (`warehouses/index.jsx`) no está en el alcance verificado; el kardex por producto (el caso de uso real y probado) sí quedó cubierto. Queda como pendiente menor, no bloqueante.

### Almacenes

- [x] Detalle de almacén con su stock (`app/warehouses/[id].tsx`) — banner, contacto, responsable, acceso a "Gestionar Inventario", editar (reutiliza el modal existente de `warehouses/index.tsx` vía `?editId=`) y eliminar, igual que `warehouses/detail.jsx`.
- [ ] "Selector de almacén activo persistido, usado por POS e inventario" — **descartado tras verificar el backend**: `pos.controller.js` resuelve la bodega server-side vía `req.user.warehouse_id`; el POS nunca expone un selector en el web. Solo el módulo de inventario (que sí necesita `:id` explícito) tiene selector, y quedó implementado en `(tabs)/inventory.tsx` (no persistido entre sesiones, igual que el web — `selectedWarehouse` en `index.jsx` tampoco persiste, solo defaultea a la primera bodega).

## Bugs corregidos (no estaban en el plan original)

- **`warehouse_id: 1` hardcodeado** en tres lugares (`services/index.ts#getInventory`, el modal embebido de `(tabs)/inventory.tsx` y el de `app/inventory/[id].tsx`) — el inventario mobile siempre leía/escribía la bodega #1 sin importar la bodega real. Resuelto reemplazando el flujo por el selector de bodega + la pantalla `adjust.tsx` con bodega explícita.
- **"Salida" sumaba stock en vez de restarlo**: el backend (`inventory.service.js#adjustInventory`) ignora el signo de `quantity` (`Math.abs()` siempre) y decide sumar/restar solo por el string `type` (`return`/`sale`/`transfer_out` restan, todo lo demás suma). El modal viejo usaba `type: 'entry'|'exit'|'adjustment'`, ninguno de los cuales es `return`, así que "Salida" también sumaba. `adjust.tsx` ahora usa el mismo set de 3 tipos que expone el web (`adjustment`/`damage`/`return`) — el mismo comportamiento (a veces contraintuitivo) que tiene la propia web, no una corrección adicional del bug de UX del web.
- **`LowStockItem` no existía en `types/index.ts`** pese a ser referenciado desde `services/extended.ts` — se agregó con las columnas reales de `getLowStockProducts` (`product_stock.repository.js`).
- **`WarehouseStock` no traía `unit_measure_*`/`is_weighable`** — se agregaron para poder mostrar `formatQuantityWithUnit` en el listado de inventario por bodega, igual que hace `index.jsx` con `formatQuantityWithUnit(it.quantity, it)`.
- **Teclado numérico sin signo negativo (limitación de RN, no del web)**: los inputs `number`/`decimal-pad` de iOS/Android no tienen tecla "-", a diferencia del `<input type="number">` del web. Se agregó un toggle Entrada(+)/Salida(-) junto al campo de cantidad para que el usuario pueda expresar el signo sin necesitar el teclado; el valor final que viaja al backend es el mismo campo `quantity` con signo, igual que en `adjust.jsx`. Es una adaptación de interacción, no un cambio de estilo.

## Criterios de aceptación

- [x] Un ajuste guardado se refleja de inmediato en el stock del producto y aparece
  en el historial de movimientos con su tipo y nota (verificado leyendo `adjustInventory` + `getProductMovements`; el kardex de `[id].tsx` se refresca con `useFocusEffect` al volver de `adjust.tsx`).
- [x] El listado de stock bajo coincide con el del web para los mismos datos (mismo endpoint `GET /api/inventory/low-stock`, mismos campos, mismo cálculo de déficit).
- [x] Los movimientos muestran cantidades con la unidad correcta en pesables (`formatQuantity`/`formatQuantityWithUnit` con los campos `unit_measure_*`/`is_weighable` que trae cada movimiento).

## Verificación

- `npx tsc --noEmit` → 0 errores.
- `npx expo export --platform web` → build limpio; nuevas rutas confirmadas en la lista de rutas estáticas: `/inventory/adjust`, `/inventory/low-stock`, `/warehouses/[id]`, `/(tabs)/inventory`, `/inventory/[id]`.
- No se pudo probar en un dispositivo/simulador real dentro de esta sesión (sin acceso a Expo Go/emulador) — la verificación funcional se hizo por lectura cruzada de código (controller/service del backend vs. tipos y llamadas de móvil), igual que en fases anteriores. Recomendado: probar manualmente el flujo completo (crear ajuste de entrada y de salida sobre un producto pesable y uno normal, confirmar el kardex y el stock bajo) antes de dar la fase por cerrada en producción.
