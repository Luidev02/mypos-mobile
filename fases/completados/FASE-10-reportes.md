# FASE 10 — Reportes y exportación

| Campo | Valor |
|---|---|
| Estado | Completada* |
| Depende de | FASE 08 |
| Bloquea a | — |
| Alcance | 6 tipos de reporte, filtros, resumen y exportación |

## Objetivo

`app/(tabs)/reports.tsx` (241 líneas) solo muestra ventas y productos top con
datos fijos. El web (`reports/index.jsx`, 346 líneas) ofrece seis tipos de
reporte con filtros de fecha, agrupación, resumen calculado y exportación.

## Referencias del frontend web

- `JiroPOS-Frontend/src/pages/reports/index.jsx` (346)

## Endpoints

```
GET /api/reports/:reportType?<params>
GET /api/reports/:reportType/export?<params>     (blob: xlsx / pdf / csv)
```

`params` incluye fecha inicio, fecha fin y agrupación (`group_by`).

## Tipos de reporte del web

| id | Nombre | Estado en web |
|---|---|---|
| `sales` | Reporte de Ventas | Activo |
| `top-products` | Productos Más Vendidos | Activo |
| `inventory` | Estado de Inventario | Activo |
| `customers` | Reporte de Clientes | Deshabilitado |
| `financial` | Reporte Financiero | Deshabilitado |
| `taxes` | Reporte de Impuestos | Deshabilitado |

> Los tres deshabilitados se portan con el mismo estado (visibles pero
> deshabilitados) para mantener la paridad; se activan cuando el backend los soporte.

## Tareas

- [x] Selector de tipo de reporte con los 6 tipos y su estado — `sales`/
      `top-products`/`inventory` activos, `customers`/`financial`/`taxes`
      deshabilitados con "Próximamente", igual que el web. Verificado contra
      `reports.service.js`: el backend **solo implementa 4 tipos**
      (`sales`, `inventory`, `purchases`, `top-products` — cualquier otro
      `type`, incluidos los 3 "deshabilitados", responde HTTP 400 "Tipo de
      reporte inválido"), así que deshabilitarlos en vez de construir su UI
      es lo correcto, no una limitación de esta fase.
- [ ] "Agrupar por (día/semana/mes)" — **no se implementó, a propósito**:
      el backend no soporta `group_by` en ningún tipo de reporte (se
      confirmó leyendo `reports.repository.js` completo — el parámetro se
      acepta pero se ignora siempre). El propio web manda `group_by` sin que
      tenga ningún efecto. Se omitió el control en vez de mostrar un
      selector que no hace nada — es una mejora de UX, no una funcionalidad
      perdida.
- [x] Resumen calculado en cabecera — `calculateSalesSummary()`, réplica de
      `calculateSummary('sales')` del web (el web solo calcula resumen para
      `sales`; para los demás tipos devuelve `null`, igual acá).
- [x] Resultados con etiquetas traducidas y badges de estado — adaptado a
      tarjetas en vez de tabla HTML (no tiene sentido una tabla ancha en
      móvil), pero mismos campos/etiquetas.
- [ ] "Gráficos" — el `reports.tsx` original no tenía gráficos reales (solo
      tarjetas de estadística), así que no había nada que "mantener". No se
      agregó una librería de gráficos nueva — hubiera sido una funcionalidad
      nueva, no un port.
- [x] Exportación a Excel/PDF — implementada con `expo-file-system` (API
      nueva `File`/`Paths` de v19, no la legacy) + `expo-sharing`. **Ambos
      paquetes se instalaron en esta fase, con confirmación explícita del
      usuario antes de tocar `package.json`.** El endpoint real
      (`GET /api/reports/:type/export?format=xlsx|pdf`) sí devuelve un
      binario real (`Content-Type` xlsx/pdf + buffer), confirmado leyendo
      `reports.controller.js`/`reports.service.js` — no una URL ni base64.
- [x] Estados vacíos y de error por tipo de reporte.
- [x] Control de permisos: pantalla completa detrás de `view_reports`
      (`RequirePermission`, igual que el `RolMiddleware` del backend a nivel
      de router); los botones de exportar además requieren `export_reports`
      — permiso separado que el backend exige solo en la ruta `/export`
      (`RolMiddleware(['export_reports'])` a nivel de ruta, no de router),
      hallazgo que el web no refleja visualmente (no oculta el botón de
      exportar si falta el permiso, solo fallaría la petición) — móvil sí
      lo oculta.

### Bugs corregidos (tipos apuntaban a una respuesta que nunca llega)

Los tipos previos `SalesReport` (`{date, total_sales, total_revenue,
total_transactions}`) y `TopProduct` (`{product_id, product_name,
quantity_sold, revenue}`) — y el `app/(tabs)/reports.tsx` que ya existía —
asumían una forma de respuesta agregada que el backend **nunca** devuelve:
`GET /api/reports/sales`/`top-products` siempre entrega un arreglo plano de
filas individuales (una por venta / una por producto), nunca un resumen
diario. La pantalla anterior ya hacía la llamada real (no eran datos
hardcodeados, como sugería el objetivo de esta fase — se verificó
leyendo el archivo completo), pero al leer campos inexistentes
(`total_transactions`, `product_name`, `quantity_sold`...) todas las
tarjetas mostraban `0`/`$0`/blanco en silencio. Corregidos con los nombres
reales verificados contra `reports.repository.js`
(`SalesReportRow`/`TopProductRow`/nuevo `InventoryReportRow`).
`getTopProducts()` además pasaba `?limit=5`, que el backend ignora por
completo (`LIMIT 50` fijo en el SQL) — se quitó el parámetro inútil del
llamado.

## Criterios de aceptación

- [x] Cada reporte activo devuelve los mismos datos que el web para el mismo
      rango — mismos endpoints, mismos parámetros (`start_date`/`end_date`
      para sales/top-products; `warehouse_id`/`low_stock` para inventory,
      que no usa fechas en absoluto — verificado que el backend nunca lee
      un parámetro de fecha para `inventory`).
- [x] Cambiar el rango (o la bodega/stock bajo en inventario) refresca los
      datos automáticamente (`useEffect` sobre los filtros).
- [x] La exportación genera un fichero real y lo entrega al share sheet
      nativo del dispositivo (`Sharing.shareAsync`).

## Verificación

- `npx tsc --noEmit` → 0 errores.
- `npx expo export --platform web` → build limpio (confirma que
  `expo-file-system`/`expo-sharing` no rompen el bundle web, tienen
  implementación web propia).
- No se pudo probar la exportación contra un dispositivo/simulador real en
  esta sesión (sin Expo Go). Recomendado antes de producción: exportar un
  reporte de ventas a xlsx y a pdf en un dispositivo real y confirmar que el
  archivo compartido se abre correctamente con una app externa.
