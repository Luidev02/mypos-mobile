# FASE 05 — Clientes y cupones

| Campo | Valor |
|---|---|
| Estado | Completada* |
| Depende de | FASE 01 |
| Bloquea a | 06 |
| Alcance | CRUD de cupones (hoy placeholder) y paridad del formulario de cliente |

## Objetivo

Cupones es hoy un placeholder de 57 líneas en móvil (`app/coupons/index.tsx`,
*"Gestión de cupones - En desarrollo"*) pese a que `couponService` ya está
implementado. Clientes está avanzado pero le faltan campos fiscales del web.

## Referencias del frontend web

- `JiroPOS-Frontend/src/pages/coupons/index.jsx` (160), `form.jsx` (216), `detail.jsx` (213)
- `JiroPOS-Frontend/src/pages/customers/index.jsx` (166), `form.jsx` (359), `detail.jsx` (161)
- `JiroPOS-Frontend/src/component/newsales/btns/BtnCustomer.jsx` (298)

## Endpoints

```
GET/POST      /api/coupons
GET/PUT/DEL   /api/coupons/:id
GET           /api/coupons/:code        (validación en POS)
GET/POST      /api/customers
GET/PUT/DEL   /api/customers/:id
GET           /api/pos/customers/search
GET           /api/municipalities?q=    (autocompletado)
```

`couponService` y `customerService` ya existen en `services/extended.ts`.

## 1. Cupones — módulo completo

- [x] Listado con búsqueda, estado (activo/vencido/agotado) y descuento — igual a `coupons/index.jsx`.
- [x] Formulario: código, nombre, descuento (%), usos máximos, vigencia (`app/coupons/new.tsx`).
- [x] Detalle con barra de progreso de uso, estado y auditoría (`app/coupons/[id].tsx`).
- [x] Eliminar con `ConfirmModal`.
- [ ] Tipo de descuento (porcentaje / monto fijo), vigencia "desde", monto mínimo de compra —
      **no existen en el web**: la tabla `coupons` real (`coupons.repository.js`) solo tiene
      `code, name, discount, usage_limit, current_usage, valid_until` — sin `discount_type`,
      `valid_from` ni `min_purchase_amount`. El descuento siempre es porcentaje
      (`coupons/index.jsx`: `` `${coupon.discount}%` ``). No se inventó UI para columnas
      que no existen en la BD.
- [ ] Validación de código duplicado — el backend no valida duplicados (no hay `UNIQUE` en
      `code`, ni check en `coupons.service.js#create`); el propio web tampoco lo hace. Se deja
      igual, cualquier mensaje de error del backend se muestra tal cual.

### Bug corregido: edición de cupones estaba rota en el propio web

`coupons.controller.js` solo expone `GET /:code` (busca por columna `code`) — no existe
`GET /:id`. `coupons/index.jsx` navega a editar con `coupon.code` como parámetro de ruta, y
`coupons/form.jsx` reutiliza ese mismo parámetro para el `PUT /api/coupons/:id`, que sí espera
un `id` numérico (`WHERE id = ?`). Resultado: guardar la edición de un cupón en el web
actualiza 0 filas y responde 404 "Coupon not found" — **la edición de cupones está rota en
producción, no solo en el análisis**. Mobile evita el bug: `app/coupons/[id].tsx` y
`app/coupons/new.tsx` obtienen el cupón vía `getCoupons()` (lista completa) y usan el `id`
numérico real del objeto para `updateCoupon`/`deleteCoupon`, nunca el `code`.
`CouponService.getCoupon(id)` (que asumía un `GET /:id` inexistente) se renombró a
`getCouponByCode(code)` para reflejar el único endpoint real, y `createCoupon`/`updateCoupon`
se corrigieron para devolver lo que el backend realmente responde (`{id,message}` /
`{message}`, no el cupón completo).

## 2. Clientes — completar paridad

- [x] Tipo de documento (`CC`/`NIT`/`CE`/`PASAPORTE` — el enum real de la BD; se quitó `TI`,
      que no existe en `customers.ident_type` y que tanto el móvil como el propio
      `BtnCustomer.jsx` del web ofrecían sin que el backend pudiera guardarlo).
- [x] Dígito de verificación (`dv`, solo para NIT).
- [x] Municipio con autocompletado (`/api/municipalities?q=`) vía nuevo componente
      `components/MunicipalityAutocomplete.tsx`, usado en `app/customers/index.tsx` y `[id].tsx`.
- [x] Dirección, teléfono, email.
- [x] Facturación electrónica DIAN (`requires_electronic_invoice`) y estado
      (`active`/`disable`) — con switches, igual que el web.
- [ ] "Tipo de persona (natural/jurídica) y régimen fiscal" — **no existen en el formulario
      web** (`customers/form.jsx` no tiene esos campos; las columnas `legal_organization_id`/
      `tribute_id` existen en la BD para la integración DIAN/Factus pero ningún formulario,
      ni web ni el alcance de esta fase, las expone todavía). Queda para cuando se implemente
      FASE 08 (Ventas y facturación DIAN), que es donde correspondería.
- [x] Auditado `components/CustomerModal.tsx` contra `BtnCustomer.jsx` — ver bugs corregidos abajo.

### Bug de backend corregido: `municipality_id` y `dv` se guardaban en null siempre

`customers.repository.js` tiene columnas `municipality_id` y `dv` en la tabla (confirmadas en
`mypos2v4.sql`), y **el propio formulario web las recolecta y las envía** en el `POST`/`PUT`,
pero el repositorio nunca las incluía en el `INSERT`/`UPDATE` ni en los `SELECT` — se perdían
silenciosamente en cada guardado, en web y en móvil por igual. Mismo bug para `status`: el
checkbox "Cliente Activo" del web (`customers/form.jsx`) envía `status`, pero
`updateCustomer` nunca lo aplicaba — desactivar un cliente desde el formulario no tenía
ningún efecto. Corregido en `mypos-backend/src/repositories/customers.repository.js`:
las tres columnas ahora se leen, guardan y devuelven (con `LEFT JOIN municipalities` para
traer `municipality_name`/`municipality_department`, que el propio `customers/form.jsx` ya
esperaba recibir al editar). **Requiere reiniciar el backend para tomar el cambio.**

### Bug corregido: `identification_type` no coincidía con la columna real

`BtnCustomer.jsx` (POS) envía el campo `identification_type`, pero `customers.repository.js`
lee `data.ident_type` — el tipo de documento elegido en el alta rápida desde POS nunca se
guardaba (quedaba siempre en `CC`, el default). `components/CustomerModal.tsx` (equivalente
móvil) ya usaba `ident_type` correctamente en el payload — se dejó así, no se replicó el bug
del web.

### Campo `city` retirado (dead field)

`app/customers/index.tsx`, `[id].tsx` y `components/CustomerModal.tsx` tenían un input
"Ciudad" que nunca existió como columna en el backend (`customers` no tiene `city`, usa
`municipality_id`) — se guardaba y no se leía nunca. Se quitó de los tres formularios; la
ubicación ahora se captura correctamente vía el autocompletado de municipio.

## 3. Detalle de cliente

- [ ] "Historial de compras con acceso al detalle de venta" y "Totales acumulados" —
      **no existen en `customers/detail.jsx`** del web (161 líneas, solo muestra
      identificación/contacto/dirección/facturación DIAN/estado). No se inventó una
      funcionalidad de reporting que el propio web no tiene. `CustomerDetailed` se simplificó
      a un alias de `Customer` (antes tenía `total_purchases`/`total_spent`/`created_at`
      especulativos que ninguna consulta del backend llenaba nunca).

## Criterios de aceptación

- [x] Crear, editar y eliminar cupones desde móvil, usando siempre el `id` numérico real
      (evitando el bug de edición del web descrito arriba); un cupón creado aquí se valida
      igual en el POS vía `posService.validateCoupon` (ya existente, sin cambios necesarios).
- [x] Un cupón vencido o agotado se rechaza con el mensaje que ya mostraba `CouponModal.tsx`
      (sin cambios, ya estaba correcto).
- [x] Crear un cliente con datos fiscales completos (`ident_type`, `dv`, `municipality_id`,
      `requires_electronic_invoice`) que ahora sí persisten en el backend.
- [x] El autocompletado de municipio devuelve resultados (`GET /api/municipalities?q=`) y
      guarda el `municipality_id` correcto.

## Verificación

- `npx tsc --noEmit` → 0 errores.
- `npx expo export --platform web` → build limpio; nuevas rutas confirmadas:
  `/coupons`, `/coupons/new`, `/coupons/[id]`, más `/customers` y `/customers/[id]` actualizadas.
- `node --check` sobre `customers.repository.js` → sin errores de sintaxis.
- Cambio de backend (`customers.repository.js`) verificado por lectura cruzada contra
  `mypos2v4.sql` (columnas reales) y `customers/form.jsx` (qué envía el web) — no se pudo
  correr contra una base de datos real en esta sesión; recomendado probar en un entorno con
  MySQL antes de desplegar: crear/editar un cliente con NIT+DV+municipio y confirmar que
  `GET /api/customers/:id` los devuelve.
- No se pudo probar en dispositivo/simulador real (sin Expo Go/emulador en esta sesión); la
  verificación funcional se hizo por lectura cruzada de código, igual que en fases anteriores.
