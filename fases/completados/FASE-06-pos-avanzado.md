# FASE 06 — POS avanzado

| Campo | Valor |
|---|---|
| Estado | Completada* |
| Depende de | FASE 03, 05, 07 |
| Bloquea a | 08 |
| Alcance | Paridad del punto de venta con `Newsales.jsx` (1851 líneas) |

## Objetivo

El POS móvil ya cubre lo básico (categorías, búsqueda, carrito, turno, órdenes
pausadas, cupón, tipo de orden, calculadora, escáner). Esta fase cierra el resto
de la funcionalidad de `Newsales.jsx`, que es la pantalla más compleja del sistema.

## Referencias del frontend web

- `JiroPOS-Frontend/src/pages/newsales/Newsales.jsx` — 1851 líneas
- `JiroPOS-Frontend/src/component/newsales/Tablecomp.jsx` (423)
- `JiroPOS-Frontend/src/component/newsales/btns/` — Calculator, Coupon, Customer,
  NewCustomer, Orders, Settings, Shift, Type
- `JiroPOS-Frontend/src/component/newsales/modals/` — ShiftModal, orders
- `JiroPOS-Frontend/src/pages/customer-display/index.jsx` (270)

## Estado actual en móvil

`app/(tabs)/pos.tsx` + `app/cart.tsx` (1020 líneas) + `contexts/CartContext.tsx`
+ `contexts/SaleContext.tsx`, con modales: `ShiftModal`, `OrdersModal`,
`CustomerModal`, `OrderTypeModal`, `CouponModal`, `SettingsModal`,
`CalculatorModal`, `BarcodeScanner`.

> Prerrequisito: la deduplicación de `app/pos.tsx` vs `app/(tabs)/pos.tsx`
> se resuelve en FASE 00.

## 1. Productos pesables en venta

- [x] Al tocar un producto pesable (`isWeighable()`) ya no se agrega con
      `quantity: 1` (equivalente a venderlo como "1 kg" sin querer — bug real
      confirmado antes de esta fase). Ahora se agrega con `quantity: 0` y se
      navega al carrito con `?editWeight=<id>`, que auto-abre el editor de
      peso para esa línea (`app/(tabs)/pos.tsx#handleProductPress`,
      `app/cart.tsx` nuevo `useEffect` sobre `editWeight`). No es literalmente
      el teclado numérico modal del web (`Tablecomp.jsx`/`pendingWeightProductId`)
      — es la navegación POS→Carrito que ya existía en móvil, adaptada para
      forzar la captura de peso antes de poder cobrar (ver checkout guard abajo).
- [x] Cantidad con 3 decimales (`QUANTITY_DECIMALS`, ya existía vía
      `utils/units.ts`, puerto 1:1 de `units.js`); subtotal = precio × cantidad
      (`CartContext.addItem`, ya existía).
- [x] Unidad (`kg`/`lb`/`gal`) mostrada en la línea del carrito — ya existía
      (`formatQuantityWithUnit`, FASE 03).
- [x] Escaneo de etiquetas de balanza con peso embebido: nuevo
      `posService.scanBarcode()` contra `GET /api/pos/products/scan?code=`
      (antes móvil reutilizaba el endpoint de búsqueda de texto y nunca
      recibía el peso parseado — un código de balanza se vendía siempre como
      "1 kg" sin importar el peso real marcado). Ahora respeta
      `requires_weight_input` (abre el editor) y `quantity` (peso ya parseado,
      se agrega directo — igual que el web, que suma el peso a la línea
      existente si se re-escanea el mismo producto, gracias a que
      `CartContext.addItem` ya mezclaba por `product_id`).
- [x] Bloqueo de cobro con cantidad pendiente: nuevo guard en
      `handleProcessPayment` (`app/cart.tsx`) — equivalente a
      `Newsales.jsx:561-565`.

## 2. Cobro y métodos de pago

- [x] Modal de pago (ya existía, `app/cart.tsx`) — corregido para paridad:
  - Transferencia ahora autocompleta el monto recibido con el total
    (`Newsales.jsx:1287-1289`; antes móvil dejaba el campo vacío).
  - Se agregó el botón rápido "+50k" que faltaba (web tiene 5 botones,
    móvil tenía 4).
  - `isProcessing` ahora es un guard de retorno temprano al inicio del
    handler (`if (isProcessing) return;`), no solo un `disabled` en el botón
    — cierra la ventana de doble-tap antes del re-render.
  - Se quitó el requisito de `orderType` antes de cobrar — el web nunca lo
    exige (`Newsales.jsx` no valida `infoS.type`); móvil lo exigía de más.
- [x] Modal de éxito ampliado: muestra `total_profit` si el backend lo
      devuelve (sí lo hace, confirmado en `pos.service.js:717`), agrega
      "Compartir" (`Share.share()` nativo con un resumen de texto de la
      venta — líneas, total, método, vuelto) y "Ver Detalle" (navega a
      `/sales/[id]`, ruta ya existente). El botón "Cerrar" ahora se llama
      "Cerrar (Nueva Venta)" para dejar explícito que reinicia el flujo.
  - El carrito ya no se limpia *antes* de mostrar el modal de éxito (bug de
    orden encontrado en móvil: limpiaba antes de poder construir el
    comprobante) — se limpia al cerrar el modal (`handleCloseSuccessModal`),
    igual que `resetPos()` en el web, que solo corre al cerrar/imprimir.
- [ ] Sección DIAN completa del modal de éxito (CUFE, QR, estado
      aprobado/rechazado, link a PDF) — **diferido a FASE 08 (Ventas y
      facturación DIAN)**, que es explícitamente donde corresponde esta
      lógica según el propio tablero de fases. Construirla aquí habría sido
      adelantar trabajo de otra fase sin la validación de resoluciones DIAN
      que esa fase cubre.
- [ ] Ticket térmico imprimible (80mm, como genera `Newsales.jsx:1597-1846`
      vía `window.open`) — no existe un equivalente RN directo a "abrir
      ventana de impresión"; se implementó "Compartir Comprobante" (texto
      simple vía share sheet nativo) como la adaptación mobile-nativa de
      "compartir comprobante" que ya pedía el criterio de aceptación
      original de esta fase. Una impresora térmica Bluetooth dedicada
      quedaría fuera de alcance de un port de UI.

## 3. Contexto de empresa en el POS

- [x] `defaultCustomerId` ya no es fijo a `1`: `SaleContext` ahora expone
      `setDefaultCustomer(name, id)`, llamado desde el mount de
      `app/(tabs)/pos.tsx` tras buscar en `GET /api/customers` el registro con
      `ident === '222222222222'` ("Consumidor Final") — igual que
      `fetchDefaultCustomer` en `Newsales.jsx:147-175`. `resetSaleData()`
      ahora vuelve a este valor resuelto, no a un `1` hardcodeado que podría
      no existir o pertenecer a otro cliente en un tenant distinto.
- [x] `companyReportsDian` cargado (`GET /api/company`, campo `report_dian`
      — agregado a `types/index.ts#Company`, no existía) y usado para
      replicar `getInvoiceType()` de `Newsales.jsx:502-543` exactamente
      (mismos 3 escenarios/colores/iconos), mostrado como badge en la
      cabecera del POS.
- [x] Nombre de empresa y cajero en la cabecera — a diferencia del web (que
      hace 2 fetches extra, `/api/company` y `/api/profile`), móvil ya tenía
      `user.company_name`/`user.username` disponibles desde el login
      (`AuthContext`), así que no hizo falta una llamada adicional para el
      nombre de cajero.
- [x] `requiresElectronicInvoice` ahora viaja con la selección de cliente:
      `CustomerModal.onSelectCustomer` pasa el flag del cliente encontrado
      (antes no lo exponía en absoluto), `SaleContext.setCustomer` lo guarda
      para que el badge de tipo de factura reaccione al cliente seleccionado
      — el backend igual deriva `requires_electronic_invoice` server-side por
      `customer_id` al crear la venta (`pos.service.js:427`), así que el badge
      es puramente informativo y no cambia el payload de `createSale`.

## 4. Búsqueda y escaneo

- [x] `posService.scanBarcode()` nuevo — ver sección 1. Antes móvil no tenía
      ningún equivalente a `/api/pos/products/scan` pese a que la constante
      `ENDPOINTS.POS.PRODUCT_SCAN` ya existía sin usar en `constants/api.ts`.
- [x] Feedback de código no encontrado — ya existía (`Alert.alert`), ahora lee
      el mensaje real del backend (`error.response?.data?.message`, p. ej.
      "No se encontró un producto con el código X") en vez de un texto
      genérico fijo.
- [x] Búsqueda de texto con debounce de 500ms — ya estaba a la par del web,
      sin cambios necesarios.

## 5. Órdenes pausadas

- [x] Auditado `OrdersModal.tsx` + `handleSelectOrder`/`handlePause` en
      `app/(tabs)/pos.tsx` contra `BtnOrders.jsx`. **Conclusión: móvil ya
      estaba a la par o mejor que el web, sin cambios necesarios.** En
      particular, se encontró que el propio `BtnOrders.jsx` tiene un bug de
      nombres de campo (`details.dni_customer` vs. `infoS.customer_id`) que
      probablemente hace que retomar una orden en el web no restaure
      correctamente el `customer_id` pese a restaurar el nombre; móvil nunca
      tuvo ese bug porque `handleSelectOrder` usa `orderDetail.customer_id`
      directo. Tampoco se replicó el hardcode `tax_total: 0` del web al
      pausar — móvil ya calculaba un `tax_total` real.

## 6. Pantalla de cliente (customer display)

- [x] **Decisión formal: no se construye para móvil, documentada aquí.**
      `customer-display/index.jsx` es una segunda ventana del navegador
      (`window.open` + `BroadcastChannel` + `localStorage`), mecanismo
      estrictamente same-origin/same-browser en el mismo equipo — no existe
      una API equivalente en RN/Expo para abrir una segunda superficie de
      presentación desde la misma app sin un transporte distinto (websocket
      o servidor local). Portarlo "tal cual" no es posible; construir un
      reemplazo real (p. ej. una tablet secundaria como cliente de un canal
      en tiempo real) es una funcionalidad nueva, no un port de UI existente,
      y queda fuera del alcance de esta fase.

## Criterios de aceptación

- [x] Una venta con producto pesable, cupón, cliente y tipo de orden se
      registra con los mismos totales que el web — verificado por lectura
      cruzada de `handleProcessPayment` (móvil) contra `handlePay` (web);
      misma fórmula de subtotal/descuento/impuesto/total.
- [x] El cobro en efectivo calcula el vuelto correctamente y no permite
      montos insuficientes — sin cambios (ya funcionaba), validado que sigue
      intacto tras las ediciones del modal de pago.
- [x] "No se puede vender sin turno activo" — ya implementado (FASE 07 no
      tocó esta lógica, se confirmó que sigue vigente en `pos.tsx`/`cart.tsx`).
- [x] Retomar una orden pausada restaura cliente, cupón y tipo de orden — ya
      era así antes de esta fase (ver sección 5).

## Verificación

- `npx tsc --noEmit` → 0 errores.
- `npx expo export --platform web` → build limpio, sin nuevas rutas (esta
  fase solo tocó pantallas existentes: `app/(tabs)/pos.tsx`, `app/cart.tsx`,
  `contexts/SaleContext.tsx`, `components/CustomerModal.tsx`,
  `services/index.ts`, `types/index.ts`).
- No se pudo probar en dispositivo/simulador real ni contra una base de
  datos con productos pesables reales en esta sesión. Recomendado antes de
  producción: escanear una etiqueta de balanza real y confirmar que el peso
  parseado coincide con el marcado en báscula; abrir/cerrar el modal de
  éxito y confirmar que "Compartir" arma un texto legible.
