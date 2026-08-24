# FASE 07 — Turnos y cajas registradoras

| Campo | Valor |
|---|---|
| Estado | Completada* |
| Depende de | FASE 01 |
| Bloquea a | 06 |
| Alcance | Historial de turnos, apertura/cierre completos, CRUD de cajas |

## Objetivo

Móvil tiene `ShiftModal.tsx` (600) y `CloseShiftModal.tsx` (447) integrados en el
POS, pero `app/shifts.tsx` es un stub de 10 líneas y **no existe el módulo de
cajas registradoras**, que en el web es un CRUD propio.

## Referencias del frontend web

- `JiroPOS-Frontend/src/pages/pos/shifts/index.jsx` (399) — historial
- `JiroPOS-Frontend/src/pages/pos/shifts/open.jsx` (178)
- `JiroPOS-Frontend/src/pages/pos/shifts/close.jsx` (230) — arqueo de caja
- `JiroPOS-Frontend/src/pages/pos/cash-registers/index.jsx`, `form.jsx` (164)
- `mypos-backend/CIERRE_CAJA_FIX.md`, `mypos-backend/HISTORIAL_TURNOS_MEJORA.md`

## Endpoints

```
GET  /api/pos/shifts/active
GET  /api/pos/shifts/:id
POST /api/pos/shifts/open
POST /api/pos/shifts/:id/close
GET  /api/shifts/active/current
GET  /api/shifts/history/me
GET  /api/pos/shifts/active/by/:shiftId
GET/POST      /api/pos/cash-registers
GET/PUT       /api/pos/cash-registers/:id
```

## 1. Historial de turnos (`app/shifts.tsx` — antes stub de 10 líneas)

- [x] Listado de turnos propios (`GET /api/shifts/history/me`), con banner de
      turno activo (o de "abrir turno" si no hay ninguno) — igual que
      `shifts/index.jsx`.
- [x] Tarjeta por turno: caja, apertura/cierre, horas trabajadas, ventas por
      método de pago, base/esperado/real, diferencia, notas.
- [x] Indicador visual de descuadre (verde/azul/rojo según el signo de `difference`).
- [ ] Filtros por fecha — **no implementados**: el propio `shifts/index.jsx` del
      web tampoco filtra por fecha (lista siempre los últimos N turnos vía
      `?limit=`); no se inventó un filtro que el web no tiene.
- [ ] Exportar a Excel — el web usa la librería `xlsx` (solo disponible en
      navegador); no se agregó una dependencia nueva al proyecto móvil solo
      para esto. Encaja mejor en FASE 12 (Import/Export), que ya es donde se
      centraliza esa funcionalidad.
- [ ] "Detalle de turno con ventas asociadas" como pantalla aparte — el propio
      `shifts/index.jsx` tampoco tiene un detalle por turno; todo el desglose
      (ventas por método de pago, ganancia) ya está en la tarjeta del listado,
      igual que en la tabla del web.

## 2. Apertura y cierre

- [x] Apertura: selección de caja registradora + monto inicial (`ShiftModal.tsx`,
      ya existía y es correcto — verificado contra `open.jsx`).
- [x] Cierre (arqueo): monto contado vs esperado, diferencia, notas
      (`ShiftModal.tsx` en modo `close`, ya existía y es correcto).
- [x] Revisado contra `open.jsx`/`close.jsx` — la lógica y los campos coinciden.
      `components/CloseShiftModal.tsx` (447 líneas) resultó ser código muerto:
      no lo importa ninguna pantalla (`ShiftModal.tsx` ya cubre ambos modos).
      Se dejó sin tocar — no se eliminó porque no era el objetivo de esta fase
      y borrar código no importado no cambia el comportamiento de la app.
- [ ] "Resumen del cierre compartible / imprimible" — no existe en el web
      tampoco (`close.jsx` solo redirige a `/hub/pos/shifts` al cerrar). No se
      inventó.

### Bugs de backend corregidos (afectan por igual a web y móvil)

- **Las notas de cierre de turno nunca se guardaban.** `close.jsx` (web) y
  `ShiftModal.tsx` (móvil) llaman ambos a `POST /api/pos/shifts/:id/close` con
  `{final_cash_real, notes}`. El controlador y el servicio (`pos.controller.js`,
  `pos.service.js`) sí reciben y pasan `notes` correctamente, pero
  `pos.repository.js#closeShift` nunca lo incluía en el `UPDATE` — la columna
  `cash_shifts.notes` (que sí existe) quedaba siempre en `NULL`. Corregido.
- **Editar una caja registradora estaba roto en el propio web.**
  `cash-registers/form.jsx` hace `PUT /api/pos/cash-registers/:id` al editar,
  pero esa ruta **no existía** en el backend (`pos/index.route.js` solo tenía
  `GET`/`POST`/`GET :id`) — el repositorio ya tenía `updateCashRegister`
  implementado y correcto, simplemente nunca se conectó a un controller/ruta.
  Se agregó `PUT /api/pos/cash-registers/:id` (controller, servicio, ruta) y
  se corrigió `cash_registers.repository.js#updateCashRegister` para actualizar
  solo los campos enviados (antes sobrescribía `warehouse_id` con `undefined`
  si no se enviaba, lo cual habría violado la FK `NOT NULL` en cuanto alguien
  usara el endpoint).

### Hallazgo documentado, NO corregido: `total_profit` de turno no distingue método de pago

`CIERRE_CAJA_FIX.md` (en el propio repo del backend) documenta un descuadre de
$1.800 causado porque `cash_shifts.total_profit` sumaba la ganancia de **todas**
las ventas (efectivo + tarjeta + transferencia) en vez de solo efectivo, y dice
haberlo corregido en `shifts.service.js#closeShift` /
`shifts.repository.js#getShiftSalesSummary` (ruta `POST /api/shifts/:id/close`,
protegida por el rol `manage_shifts`). **Ese fix nunca llegó a la ruta que
realmente usan el botón "Cerrar Turno" del POS ni `ShiftModal.tsx`**
(`POST /api/pos/shifts/:id/close`, otra implementación en `pos.repository.js`).
Peor aún: la columna `cash_shifts.total_profit` se incrementa en vivo en cada
venta desde `pos.service.js#createSale` (línea `incrementShiftProfit(...)`) con
la ganancia total del pedido **sin filtrar por método de pago** — el bug sigue
vivo en el acumulador real, no solo en el cierre.

No se tocó `incrementShiftProfit` ni `createSale` en esta fase: es lógica
financiera central de la ruta de ventas, con impacto directo en reportes y
contabilidad, y corregirla a ciegas sin poder probarla contra una base de
datos real es un riesgo que no correspondía asumir dentro de un port de UI.
En su lugar, `app/shifts.tsx` usa `sales_summary.cash_profit` (que sí está
calculado correctamente, vía `getShiftSalesSummary`, y ya viaja en la
respuesta de `GET /api/shifts/history/me`) para mostrar "Ganancia" en vez del
`total_profit` de nivel superior — es un ajuste de qué campo de la misma
respuesta se muestra, no una reescritura de lógica de negocio. **Recomendado:
tratar la corrección de `incrementShiftProfit` como su propia tarea, con
pruebas contra datos reales antes de tocar el flujo de venta.**

## 3. Cajas registradoras (módulo nuevo)

- [x] `app/cash-registers/index.tsx` — listado con badge de estado
      (activa/inactiva), banner de límite de plan (multi-caja), igual que
      `cash-registers/index.jsx`.
- [x] `app/cash-registers/new.tsx` — formulario de alta/edición (código
      bloqueado al editar, igual que el web).
- [x] `posService` en `services/index.ts` ampliado con `getCashRegister`,
      `createCashRegister`, `updateCashRegister` (antes solo tenía
      `getCashRegisters`).
- [x] Entrada "Cajas" (y "Turnos", que tampoco existía) agregadas al hub
      (`app/(tabs)/index.tsx`) y al menú "Más" (`app/(tabs)/more.tsx`), con el
      mismo permiso que usa `BtnHub.jsx`: `view_pos` para Cajas, `view_shifts`
      para Turnos.
- [ ] No se agregó eliminar cajas registradoras — el propio
      `cash-registers/index.jsx` tampoco tiene ese botón (aunque el
      repositorio backend sí tiene `deleteCashRegister` sin conectar a una
      ruta); no se expuso una función que el web no ofrece.

## Criterios de aceptación

- [x] Abrir turno desde móvil, vender, y cerrar con arqueo cuadrado y
      descuadrado — sin cambios de comportamiento respecto a lo que ya hacía
      `ShiftModal.tsx` (se verificó correcto contra `open.jsx`/`close.jsx`).
- [x] El historial lista los turnos del usuario con sus totales — usando
      `sales_summary.cash_profit` para "Ganancia" en vez del `total_profit`
      con el bug conocido (ver hallazgo arriba).
- [x] Crear y editar cajas registradoras desde móvil — la edición ahora
      funciona en el backend real (antes 404 tanto en web como en móvil).
- [x] "El POS bloquea la venta si no hay turno activo" — verificado que ya
      era el comportamiento existente en `app/(tabs)/pos.tsx` (fuera del
      alcance de esta fase, no se tocó).

## Verificación

- `npx tsc --noEmit` → 0 errores.
- `npx expo export --platform web` → build limpio; nuevas rutas confirmadas:
  `/shifts`, `/cash-registers`, `/cash-registers/new`.
- `node --check` sobre los 5 archivos de backend tocados
  (`pos.controller.js`, `pos.service.js`, `pos.repository.js`,
  `routes/pos/index.route.js`, `cash_registers.repository.js`) → sin errores
  de sintaxis.
- No se pudo probar contra una base de datos real en esta sesión (sin acceso
  a MySQL/Expo Go). Recomendado antes de producción: abrir un turno, hacer una
  venta en efectivo y otra por transferencia, cerrar con notas, y confirmar
  que las notas quedan guardadas (`cash_shifts.notes`) y que la caja recién
  editada conserva su `warehouse_id` original.
