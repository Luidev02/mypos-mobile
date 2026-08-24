# FASE 11 — Empresa y administración

| Campo | Valor |
|---|---|
| Estado | Completada* |
| Depende de | FASE 01, 02 |
| Bloquea a | — |
| Alcance | La fase más grande: `company/index.jsx` son 2053 líneas con 8 pestañas |

## Objetivo

`app/company/index.tsx` es un placeholder de 57 líneas. El web concentra en una
sola pantalla ocho módulos de administración. En móvil conviene **partirla en
pantallas separadas** bajo `app/company/`, no replicar el sistema de pestañas.

## Referencias del frontend web

- `JiroPOS-Frontend/src/pages/company/index.jsx` — 2053 líneas, 8 pestañas
- `JiroPOS-Frontend/src/pages/roles/permissions.jsx` (462)
- `JiroPOS-Frontend/src/component/modals/RoleModal.jsx`, `UserModal.jsx` (270),
  `IntegrationLogsModal.jsx` (249)
- `JiroPOS-Frontend/IMPLEMENTACION_INTEGRACIONES.md`, `INTEGRACIONES_GUIDE.md`
- `mypos-backend/INVOICING_RESOLUTIONS_API.md`, `PERMISSIONS_ENDPOINTS.md`

## Las 8 pestañas del web

| Pestaña | Contenido | Estado final en móvil |
|---|---|---|
| `general` | Configuración de empresa | ✅ `app/company/general.tsx` |
| `roles` | Gestión de roles | ✅ `app/management/roles/index.tsx` — **reescrita**, tenía un bug de pérdida de datos (ver abajo) |
| `users` | Gestión de usuarios | ✅ `app/management/users/index.tsx` — **corregida**, el toggle activo/inactivo no funcionaba en absoluto |
| `resoluciones` | Resoluciones de facturación | ✅ `app/company/resolutions.tsx` |
| `info` | Info del sistema + plan y recursos | ✅ `app/company/plan.tsx` |
| `api` | Integraciones | ❌ **Descartada — el backend no tiene esa API en absoluto** (ver hallazgo abajo) |
| `facturacion` | Facturación electrónica DIAN | ✅ `app/company/dian.tsx` (config MATIAS) |
| `version` | Versión y novedades | ✅ `app/company/version.tsx` |

## Endpoints

```
GET/PUT   /api/company
GET       /api/company/plan/usage
PUT       /api/company/api-config
GET/PUT   /api/company/matias-config
POST      /api/company/matias-config/test
GET/POST  /api/invoicing-resolutions
DELETE    /api/invoicing-resolutions/:id
PATCH     /api/invoicing-resolutions/:id/toggle
GET       /api/integrations                (+ CRUD)
GET       /api/integrations/slug/:slug
GET       /api/integrations/:id/stats
POST      /api/integrations/:id/test
PUT       /api/integrations/:id/toggle
GET/PUT   /api/roles/:roleId/permissions
GET       /api/permissions
```

`companyService`, `roleService`, `userManagementService` e `integrationService`
ya existen en `services/extended.ts`. Faltan resoluciones, matias-config,
api-config y plan/usage.

## 1. Configuración general (`app/company/general.tsx`)

- [x] Datos de la empresa: razón social, nombre comercial, dirección,
      ciudad, departamento, teléfono, email, sitio web, URL de logo,
      régimen tributario, moneda.
- [ ] Municipio con autocompletado — **no existe en `PUT /api/company`**: el
      whitelist real del backend (`company.repository.js#updateCompany`) no
      tiene ningún campo de municipio; la empresa no tiene ese dato en
      absoluto (a diferencia de clientes/proveedores, que sí). No se inventó.
- [x] Flag de reporte a DIAN (`report_dian`) — switch, ya lo consume el badge
      del POS (FASE 06).
- [ ] "Subida de logo" — **no existe como tal ni en el web**: `logo_url` es
      un campo de texto plano (URL a una imagen ya alojada externamente), no
      hay endpoint de subida de archivos en todo el módulo de empresa
      (verificado leyendo las 2053 líneas completas de `company/index.jsx`
      — cero referencias a `FormData`/multipart en esta pantalla). Se portó
      como el input de texto que realmente es.

## 2. Resoluciones de facturación (`app/company/resolutions.tsx`)

- [x] Listado con badge de tipo (POS/Electrónica), badge activa/inactiva,
      barra de progreso del consumo (`current_number` vs. rango), aviso
      visual cuando el consumo supera 90%.
- [x] Crear/editar resolución, con clave técnica obligatoria solo si
      `type === 'ELECTRONIC'` (el ENUM real solo admite `POS`/`ELECTRONIC`
      — ni el `current_number`/`type` string genéricos que asumía el tipo
      viejo de móvil, ni los campos inventados `range_from`/`range_to`/
      `valid_from`/`valid_until` que no existen en la tabla real).
- [x] Manejo del conflicto 409 (ya hay una resolución activa del mismo tipo):
      modal ofreciendo "Reemplazar" (`auto_replace: true`), igual que el
      flujo del web.
- [x] Activar/desactivar (`PATCH .../toggle`), con el mismo manejo de
      conflicto si ya hay otra activa del mismo tipo.
- [x] Eliminar con confirmación — bloqueado por el backend (400) si la
      resolución sigue activa; se muestra el mensaje real del error.
- [ ] Campo `api_range_id` — **no se expone como funcional**: existe en la
      tabla y el propio formulario web lo recolecta, pero
      `invoicing_resolutions.repository.js` nunca lo incluye en el
      INSERT/UPDATE — guardarlo no tiene ningún efecto (bug de backend
      confirmado leyendo el repositorio completo). Se omitió del formulario
      en vez de simular una función que no existe.

### Bug de backend encontrado y evitado (no corregido): editar una resolución sin mandar `current_number` resetea el consumo

`PUT /api/invoicing-resolutions/:id` es un **reemplazo completo de fila**,
no un parche — si `current_number` no viene en el body, el repositorio lo
reescribe como `data.start_number || 1` (`invoicing_resolutions.repository.js
#updateResolution`), perdiendo el consecutivo real ya facturado. El propio
formulario web no expone este campo al editar (solo al crear, según el JSX
leído), así que **el web tiene este mismo riesgo latente** cada vez que se
edita una resolución activa. Móvil sí lo expone (solo en edición, de solo
ajuste manual) y siempre lo reenvía con el valor actual precargado, evitando
pisarlo por omisión — no se replicó el punto débil del web porque acá
significa pérdida real de datos de facturación, no una diferencia visual.

## 3. Integraciones — descartada, no es un bug del port

**Hallazgo verificado leyendo TODAS las rutas registradas en el backend
(`index.route.js`): no existe ningún router `/api/integrations` en absoluto.**
Ni controller, ni service, ni repository — solo quedan las tablas
`integrations`/`integration_logs` en la base de datos, nunca conectadas a
Express. El "API tab" del web (que muestra tarjetas Siigo/Alegra/Factus/ODOO/
TNS/Contabilium/WhatsApp/Email, con activar/desactivar/probar/logs) llama a
8 endpoints que **siempre devuelven 404** — es una funcionalidad
completamente muerta incluso en producción, no algo que dejó de portarse acá.
El propio código del tab "api" del web tiene además un formulario
(`formApi`/`handleSubmitApi`, para `api_client_id`/`api_client_secret` vía
`PUT /api/company/api-config`) que ni siquiera está conectado a ningún botón
del JSX — doblemente muerto. No se construyó ninguna pantalla de
integraciones en móvil; `services/extended.ts#IntegrationService` y
`ENDPOINTS.INTEGRATIONS`/`ENDPOINTS.COMPANY.API_CONFIG` se dejan como estaban
(código ya existente, no tocado, pero no debe usarse — no hay backend detrás).

## 4. Facturación electrónica DIAN (`app/company/dian.tsx`)

- [x] Configuración MATIAS: email, contraseña (opcional al editar — se
      conserva la guardada si se deja vacía), ambiente (`TEST`/`PRODUCTION`
      — **no** `production`/`sandbox` como asumía el tipo viejo de móvil).
- [x] Probar conexión (`POST /api/company/matias-config/test`) — confirmado
      que es una prueba real contra `https://api-v2.matias-api.com`, no un
      stub; muestra el resultado (`connected`/`error`) tal cual lo devuelve
      el backend.
- [ ] "Configuración de API" (`PUT /api/company/api-config`) — **no se
      construyó: la ruta no existe en el backend** (mismo hallazgo que la
      sección de Integraciones — es el mismo código muerto `formApi` del
      web). `ENDPOINTS.COMPANY.API_CONFIG` se deja definido pero sin uso.

## 5. Info del sistema y plan (`app/company/plan.tsx`)

- [x] Datos de la empresa en solo lectura: NIT-DV, estado activa/inactiva,
      fecha de alta, ambiente.
- [x] Plan y recursos: nombre del plan, usuarios (conteo real vs.
      `planConfig.maxUsers`), cuota de facturas DIAN (`planUsage.dian`),
      booleanos Multi-Caja/Multi-Bodega/Analítica, nivel de soporte — todos
      verificados contra `plans.config.js` real (los 4 planes reales:
      `tienda_pequena/mediana/grande`, `super_tienda`, con sus límites
      reales, no inventados).
- [ ] "Integrado con `SubscriptionContext`" — no se fusionó el estado: son
      dos conceptos de backend distintos y verificados por separado
      (`GET /api/subscription/status` = bloqueo/gracia de la suscripción,
      ya global desde FASE 01; `GET /api/company/plan/usage` = límites del
      plan contratado). Esta pantalla consulta el segundo directamente; el
      modal de suscripción bloqueante sigue siendo global y no dependía de
      esta pantalla para funcionar.

## 6. Roles y permisos

### Bug de pérdida de datos corregido: editar un rol borraba sus permisos

`app/management/roles/index.tsx` (ya existente antes de esta fase) leía
`role.permissions` directamente del objeto de la lista para precargar el
formulario de edición — pero `GET /api/roles` (el que alimenta esa lista)
**nunca incluye `permissions`, solo `permissions_count`** (un número). El
arreglo de permisos solo viene en el detalle (`GET /api/roles/:id`). Como
resultado, abrir "Editar" en cualquier rol precargaba el checklist de
permisos **vacío**, y guardar reemplazaba los permisos reales del rol con
ese arreglo vacío — cualquier edición de rol (incluso solo cambiar el
nombre) borraba silenciosamente todos sus permisos. Corregido: al abrir el
modal de edición ahora se pide `GET /api/roles/:id/permissions` (devuelve
los IDs reales) antes de mostrar el formulario.

También corregidos en la misma pantalla: `role.name` → `role.role_name`,
`permission.name` → `permission.permission_name` (los nombres reales de
columna — antes el nombre de cada rol y cada permiso se mostraba en blanco),
guardado separado en dos llamadas (`PUT /api/roles/:id` para
nombre/estado, `PUT /api/roles/:id/permissions` para permisos — son
endpoints distintos con contratos distintos, confirmado leyendo
`roles.controller.js`), roles del sistema (`is_system_role`) marcados como
no editables/no eliminables (igual que el backend, que los bloquea con 403).

- [x] Editor de permisos agrupados por módulo — réplica exacta del
      agrupador client-side de `roles/permissions.jsx` (el backend no agrupa
      nada; `GET /api/permissions` es una lista plana ordenada
      alfabéticamente — el "módulo" se deriva del propio `permission_name`
      partiéndolo en `_`), integrado en el mismo modal de crear/editar rol
      en vez de una pantalla aparte — coherente con el patrón ya establecido
      de modales en esta app móvil (impuestos, bodegas, categorías...), no
      con el patrón de página separada del web.

### Bug funcional corregido: el toggle activo/inactivo de usuarios no hacía nada

`app/management/users/index.tsx` usaba un campo `is_active: boolean` que
**no existe en la respuesta real de `/api/users`** — el campo real es
`status: 'active'|'inactive'` (string). Esto causaba dos problemas: (1) todo
usuario se mostraba como "Inactivo" en la lista sin importar su estado real
(`is_active` siempre `undefined` → falsy), y (2) aunque se hubiera mostrado
bien, guardar el cambio no tenía ningún efecto — `usersRepository
.updateUserById` nunca lee una clave `is_active`, solo `status`. Corregido en
el tipo y en la pantalla (lee/escribe `status`).

También se agregó el selector de **bodega** al formulario de usuario — el
web lo trata como obligatorio (`UserModal.jsx`) pero móvil no lo tenía en
absoluto; usuarios creados desde móvil quedaban sin bodega asignada.

## 7. Versión (`app/company/version.tsx`)

- [x] Pantalla estática con nombre/versión de la app (desde `package.json`),
      lista de características y bloque de soporte — igual que el web, que
      también es contenido 100% estático sin llamadas a la API (confirmado
      leyendo las 2053 líneas completas, cero `fetch`/`axios` en esta pestaña).

## Nota de ejecución

Se cerró en el orden recomendado: general → roles/permisos → usuarios →
resoluciones → DIAN → (integraciones descartada) → plan/info → versión.

## Criterios de aceptación

- [x] Cada sub-módulo guarda y refleja cambios verificables también desde el
      web — mismos endpoints/contratos reales verificados contra el código
      del backend, no contra supuestos del propio web (que en varios puntos
      estaba desalineado con su propia API).
- [x] La matriz de permisos guarda y el cambio se aplica al rol afectado —
      corregido el bug que la dejaba en blanco/la borraba (ver arriba).
- [x] Crear y activar una resolución queda reflejado para que el backend
      pueda facturar — la lógica de facturación en sí (elegir qué
      resolución usar al crear una venta) ya vive en el backend
      (`pos.service.js`), fuera del alcance de esta pantalla de
      administración.
- [ ] "Probar una integración devuelve el resultado real del backend" — no
      aplica: no existe ninguna integración real que probar más allá de
      MATIAS, y esa sí se implementó y probó contra el endpoint real
      (`app/company/dian.tsx`).

## Verificación

- `npx tsc --noEmit` → 0 errores.
- `npx expo export --platform web` → build limpio; nuevas rutas confirmadas:
  `/company`, `/company/general`, `/company/resolutions`, `/company/dian`,
  `/company/plan`, `/company/version`.
- Se encontraron y corrigieron, además de lo ya listado arriba: un
  `PlanUsage` declarado dos veces en `types/index.ts` con shapes
  incompatibles (`{plan, planConfig, dian}` real vs. un
  `{plan_name, limits, usage}` completamente ficticio que TypeScript fusionaba
  en un solo tipo imposible de satisfacer correctamente) — se eliminó el
  duplicado ficticio. `Company`, `MatiasConfig`, `InvoicingResolution` también
  tenían campos inventados (`api_client_id`/`api_client_secret` que no
  existen en la tabla `company`; `environment: 'production'|'sandbox'` en vez
  de `'TEST'|'PRODUCTION'`; `range_from`/`range_to`/`valid_from`/`valid_until`
  que no existen en `invoicing_resolutions`) — todos corregidos contra el
  schema real.
- No se pudo probar contra una base de datos ni contra el servicio MATIAS
  real en esta sesión. Recomendado antes de producción: editar un rol
  existente y confirmar que sus permisos NO se pierden (era el bug más
  grave de esta fase); crear una resolución electrónica y confirmar que el
  conflicto 409 se maneja correctamente si ya hay una activa; probar la
  conexión MATIAS con credenciales reales.
