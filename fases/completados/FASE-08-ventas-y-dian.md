# FASE 08 — Ventas y facturación electrónica DIAN

| Campo | Valor |
|---|---|
| Estado | Completada* |
| Depende de | FASE 06 |
| Bloquea a | 10 |
| Alcance | Listado y detalle de ventas, estado DIAN, reintento, comprobante |

## Objetivo

Móvil tiene `app/sales/index.tsx` (413) y `app/sales/[id].tsx` (484), pero el
detalle del web (`sales/detail.jsx`, 649 líneas) incluye todo el bloque de
**facturación electrónica DIAN** que en móvil no existe.

## Referencias del frontend web

- `JiroPOS-Frontend/src/pages/sales/index.jsx` (403)
- `JiroPOS-Frontend/src/pages/sales/detail.jsx` (649)
- `mypos-backend/INVOICING_SYSTEM_IMPLEMENTATION.md`
- `mypos-backend/INVOICING_RESOLUTIONS_API.md`

## Endpoints

```
GET  /api/sales?<filtros>
GET  /api/sales/:id
GET  /api/dian/status/:saleId
POST /api/dian/retry/:saleId
```

## 1. Listado de ventas

- [x] Filtro de fecha: hoy / semana / todas, ahora enviado al backend como
      `date_from`/`date_to` (antes móvil pedía `GET /api/sales` sin ningún
      parámetro — traía hasta 500 ventas de toda la historia en cada carga,
      sin acotar; el propio web siempre manda un rango). No se agregaron
      filtros de estado/cliente/turno — el web tampoco los tiene contra el
      backend (su `filters.search` es 100% client-side sobre lo ya
      descargado, no hay endpoint que los soporte).
- [ ] Paginación / scroll infinito — el web tampoco pagina (una sola carga de
      hasta 500 filas). No se inventó algo que el web no tiene.
- [x] Totales del período: ventas, ingresos, ganancia (`profit_total`,
      antes ausente del todo — ni el tipo ni la pantalla lo tenían), y
      desglose efectivo vs. otros medios — igual que `sales/index.jsx`.
- [x] Badge de estado DIAN por venta, con mismos colores/labels que
      `getDianStatusBadge` del web, link "Ver PDF" cuando `approved`, botón
      "Reintentar" cuando `rejected`/`not_sent` (ver bug de backend corregido
      abajo — sin ese fix, este badge nunca habría podido mostrar nada real).

### Bug de backend corregido: el listado de ventas nunca podía mostrar el estado DIAN (ni en el web)

`GET /api/sales` (`sales.repository.js#getAllSales`) no seleccionaba
`dian_status`/`cufe`/`dian_pdf_url`/`dian_response_message` en absoluto —
pese a que `sales/index.jsx` en el propio web ya tiene todo el código para
mostrar el badge DIAN y el botón de reintento por fila
(`getDianStatusBadge`, líneas 58-67). Como esas columnas nunca llegaban en
la respuesta, `sale.dian_status` era siempre `undefined` en cada fila del
listado — el badge/reintento del listado web **nunca ha funcionado en
producción**, solo en el detalle (`GET /api/sales/:id`, que sí las trae).
Se agregaron las 4 columnas al `SELECT` de `getAllSales`
(`mypos-backend/src/repositories/sales.repository.js`) — cambio
puramente aditivo sobre una consulta de solo lectura, arregla el listado
en ambas plataformas. **Requiere reiniciar el backend para tomar el cambio.**

## 2. Detalle de venta

- [x] Cabecera: número, fecha, estado — ya existía.
- [x] Cliente: se agregó `customer_identification` (existía en el tipo, no
      se renderizaba). Nueva sección "Detalles de la Venta" con
      `warehouse_name` y `created_by_name` ("Atendido por") — existían en el
      tipo `SaleDetailed` desde antes de esta fase pero nunca se mostraban.
- [x] Líneas: ahora usan `item.subtotal` (ya calculado por el backend con el
      descuento de línea aplicado) en vez de recalcular `quantity * price` en
      el cliente — el cálculo anterior **ignoraba el descuento por ítem**
      cuando lo había, mostrando un total de línea mayor al real. Se agregó
      el descuento por línea cuando existe (el web también lo muestra).
- [x] Totales: se corrigieron los nombres de campo reales
      (`discount_amount`/`tax_amount`, no `discount`/`tax` a secas — el
      backend nunca envía esos nombres cortos) y se agregó `profit_total`
      al resumen (dato ya disponible, no se mostraba). Se cambió la
      etiqueta fija "IVA (19%)" por "Impuestos" — el backend no garantiza
      que el impuesto sea siempre 19% (impuestos configurables, FASE 03).
- [x] Pago: método y vuelto — ya existía, sin cambios.

## 3. Bloque DIAN

- [x] Nuevo `DianSection` en `app/sales/[id].tsx`, réplica exacta de los 5
      estados de `sales/detail.jsx:294-434` (aprobada / procesando /
      rechazada-con-CUFE / rechazada-sin-CUFE / sin-enviar), mismos colores
      y textos.
- [x] Pie de resolución de facturación POS (`resolution_auth_number` +
      rango `resolution_prefix`-`resolution_from`/`to`) cuando
      `dian_status === 'not_applicable'` — igual que el bloque final de
      `sales/detail.jsx:428-434`.
- [x] Enlace "Ver PDF de factura" (`dian_pdf_url`, vía `Linking.openURL`).
- [ ] **No se agregó el botón de reintento a la pantalla de detalle** — el
      propio web tampoco lo tiene ahí, solo en el listado (`sales/index.jsx`);
      se mantuvo la paridad exacta en vez de "mejorarlo" añadiendo algo que
      el web no ofrece en esa pantalla.
- [x] Reintento (`POST /api/dian/retry/:saleId`) implementado en
      `app/sales/index.tsx`, igual que el web: llama retry y luego
      `GET /api/dian/status/:saleId` para refrescar solo esa fila.
- [ ] **Código QR real — decisión documentada: no se agregó.** El web genera
      el QR client-side con el paquete npm `qrcode` (Canvas del navegador).
      RN no tiene Canvas; la alternativa (`react-native-qrcode-svg`) requiere
      agregar una dependencia nueva (más su peer `react-native-svg`, que
      tampoco está instalada) — se optó por no instalar paquetes nuevos sin
      pedirlo explícitamente y en su lugar mostrar el CUFE como texto
      seleccionable junto a un link tocable "Verificar en el portal DIAN"
      (mismo URL que codificaría el QR:
      `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey={cufe}`).
      La verificación sigue siendo posible, solo que abriendo el navegador en
      vez de escanear un código en la misma pantalla que lo muestra (que de
      todas formas es un gesto redundante en el mismo dispositivo). Si se
      quiere el QR visual real, es una tarea acotada: instalar
      `react-native-qrcode-svg`+`react-native-svg` y renderizar
      `<QRCode value={verifyUrl} />` en el mismo bloque.

## 4. Comprobante

- [x] "Compartir" (`Share.share`) ya existía; se corrigieron los nombres de
      campo (`discount_amount`/`tax_amount`) y se agregó el CUFE al texto
      compartido cuando la venta lo tiene.
- [ ] Ticket térmico / impresión Bluetooth — **descartado para esta versión,
      decisión documentada aquí** (ya se había tomado la misma decisión en
      FASE 06 para el ticket de checkout del POS; aplica igual acá: no hay
      integración de impresora térmica en el alcance de este port, y
      `expo-print`/`expo-sharing` generan PDFs de app, no tickets de 80mm).
      `handlePrint()` se deja como estaba (alerta "no implementada") en vez
      de fingir una función que no existe.

## Criterios de aceptación

- [x] El detalle móvil muestra los mismos importes que el web para la misma
      venta — corregido el bug de líneas ignorando el descuento (ver arriba),
      verificado por lectura cruzada de `sales.service.js#getSale` contra la
      pantalla.
- [x] El estado DIAN se consulta y refresca — reintento en el listado
      actualiza solo la fila afectada vía `getDianStatus` tras el retry,
      igual que `handleRetryDian` del web.
- [x] Los filtros del listado usan los mismos parámetros que el web
      (`date_from`/`date_to`) — antes móvil no enviaba ninguno.

## Verificación

- `npx tsc --noEmit` → 0 errores.
- `npx expo export --platform web` → build limpio (mismas rutas, sin nuevas
  — esta fase solo tocó `app/sales/index.tsx`, `app/sales/[id].tsx`,
  `services/extended.ts`, `types/index.ts`).
- `node --check` sobre `sales.repository.js` → sin errores de sintaxis.
- Se encontró y corrigió un `DianStatus` especulativo preexistente en
  `types/index.ts` (de una fase anterior, nunca usado en ningún archivo) con
  campos inventados (`status: 'pending'|'accepted'|...`, `qr_url`, `pdf_url`)
  que no coincidían con los valores/campos reales (`not_sent|processing|
  approved|rejected|not_applicable`, `cufe`, `dian_pdf_url`) — reemplazado
  por el tipo verificado contra `dian.service.js`.
- No se pudo probar contra una venta real con envío DIAN en esta sesión (sin
  acceso a MySQL ni a la integración MATIAS/DIAN). Recomendado antes de
  producción: abrir el detalle de una venta con cada uno de los 5 estados
  DIAN y confirmar que el bloque correcto se renderiza; probar "Reintentar"
  sobre una venta `rejected` real.
