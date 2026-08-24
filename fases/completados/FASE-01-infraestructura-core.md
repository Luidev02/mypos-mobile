# FASE 01 — Infraestructura core

| Campo | Valor |
|---|---|
| Estado | Completada |
| Depende de | FASE 00 |
| Bloquea a | 02, 03, 05, 07, 11, 13 |
| Alcance | Cliente HTTP, permisos, tema/paletas, suscripción |

## Objetivo

Portar las piezas transversales del frontend web de las que depende **todo** lo
demás: manejo de errores HTTP, control de permisos por rol, sistema de temas y
estado de suscripción.

## Referencias del frontend web

- `JiroPOS-Frontend/src/api/axios.api.js` — manejo de 401 / 402 / 403
- `JiroPOS-Frontend/src/context/ThemeContext.jsx` — paletas y modo oscuro
- `JiroPOS-Frontend/src/context/SubscriptionContext.jsx`
- `JiroPOS-Frontend/src/component/modals/SubscriptionModal.jsx`
- `JiroPOS-Frontend/src/component/ThemeByRoute.jsx`

## 1. Cliente HTTP — corrección de semántica de errores

**Bug detectado.** `services/api.ts` cierra sesión ante `401` **y** `403`:

```ts
if (error.response?.status === 401 || error.response?.status === 403) {
  await storageService.clearAuth();
  router.replace('/login');
}
```

El frontend web es explícito en que esto es incorrecto: *"El 403 puede ser un
error de límite de plan, NO debe cerrar la sesión"*. En móvil, un usuario sin
permiso para una pantalla queda expulsado de la app.

- [x] `401` → limpiar sesión y redirigir a login (único caso que cierra sesión).
- [x] `403` → propagar el error; la pantalla muestra "sin permisos" sin cerrar sesión.
- [x] `402` con `code === 'SUBSCRIPTION_BLOCKED'` → dispara la apertura del modal
      de suscripción vía `utils/events.ts` (emitter propio — equivalente RN del
      `CustomEvent` del web).
- [x] Añadir `patchToken`.
- [x] Configurar `axios-retry`: solo reintenta `GET` (nunca POST/PUT/DELETE, para
      no duplicar ventas u otras mutaciones si el reintento sí llega al servidor).
- [ ] ~~Soportar descarga de ficheros (reportes e import/export)~~ — **diferido a
      FASE 10/12**, que son los primeros consumidores reales. Instalar
      `expo-file-system` + `expo-sharing` sin nada que los use todavía habría sido
      código muerto.

## 2. Permisos

- [x] `permissionService.getMyViewPermissions()` → `GET /api/hub` (mismo endpoint
      que usa `Hub.jsx` en el web para gatear módulos — devuelve solo los
      permisos `view_*`, que es exactamente lo que necesita el menú).
- [x] `PermissionsContext` que cachea los permisos del usuario y expone
      `can(permission: string): boolean`.
- [x] Componente `<RequirePermission perm="...">` para envolver pantallas.
- [x] Ocultar en `app/(tabs)/index.tsx` (Hub), `app/(tabs)/more.tsx` y
      `app/management/index.tsx` los módulos sin permiso, con el mismo mapeo
      permiso → módulo que `BtnHub.jsx` en el web.

## 3. Tema y paletas

- [x] `ThemeContext` con las 6 paletas del web (`marron` por defecto, `azul`,
      `verde`, `morado`, `teal`, `oscuro`) y modo claro/oscuro.
- [x] Persistir la elección en `AsyncStorage` (vía `storageService`).
- [ ] Selector de tema en Perfil — **se conecta en FASE 02**, como estaba previsto.
- [ ] ~~Refactorizar `constants/theme.ts` para que `Colors` se resuelva desde el
      contexto~~ — no se hizo en esta fase; ver nota de alcance abajo.

> **Nota de alcance (sin cambios respecto al plan).** Hay ~30 pantallas con
> `StyleSheet.create` que referencian `Colors` de forma estática. Esta fase
> entrega el `ThemeContext` con las paletas, persistencia y `tones` calculados,
> pero **no** migra `constants/theme.ts` a resolverse dinámicamente desde el
> contexto — eso exige tocar las 30 pantallas (o introducir `useThemedStyles` y
> aplicarlo una por una) y es mejor hacerlo cuando cada pantalla ya se está
> tocando por otra fase, no de golpe aquí. Hoy `ThemeContext` existe y persiste
> la preferencia, pero la UI todavía usa siempre la paleta marrón / modo claro
> hasta que se conecte el selector (FASE 02) y se migren las pantallas.

## 4. Suscripción

- [x] `subscriptionService.getStatus()` → `GET /api/subscription/status`.
- [x] `SubscriptionContext` con refetch al recibir el evento de bloqueo.
- [x] `SubscriptionModal` (bloqueante) portado a RN — mismos 3 estados que el web
      (`blocked` / `grace` / `active` con aviso ≤7 días, con "cerrar por hoy").
- [x] Montar ambos providers en `app/_layout.tsx`.

## Criterios de aceptación

- [x] Un `403` muestra mensaje de permiso denegado **sin** cerrar la sesión
      (verificado por lectura de código — `services/api.ts` ya no toca `403`).
- [x] Un `401` sí cierra sesión y lleva a `/login`.
- [x] Un `402 SUBSCRIPTION_BLOCKED` abre el modal de suscripción (emite el evento
      que `SubscriptionContext` escucha y refresca `getStatus()`).
- [x] Un usuario sin permiso de un módulo no ve su entrada en el menú (Hub, Más,
      Gestión — los 3 puntos de navegación que listan módulos).
- [ ] *Cambiar de paleta se refleja en la UI* — movido a **FASE 02**, que es donde
      se construye el selector. La infraestructura (persistencia, contexto) ya
      está lista para que esa fase solo tenga que consumirla.

## Verificación

Comandos ejecutados en `mypos-mobile/`:

```bash
npx tsc --noEmit                   # 0 errores
npx expo export --platform web     # 33 rutas, sin warnings ni errores
```

**Alcance verificado por lectura de código y compilación**, no por sesión en
dispositivo real (no disponible en este entorno) — a diferencia de la FASE 00,
donde sí hubo una ronda de pruebas en iPhone. Se recomienda una pasada manual
rápida antes de dar la fase por completamente cerrada en producción:

1. Provocar un `401` (token vencido) → debe cerrar sesión y llevar a `/login`.
2. Provocar un `403` (usuario sin un permiso) → debe mostrar el error de la
   pantalla sin cerrar sesión.
3. Con un usuario de permisos limitados, confirmar que el Hub, "Más" y
   "Gestión" solo muestran los módulos permitidos.
4. Si el backend puede simular estado `grace` o `blocked`, confirmar que el
   modal de suscripción aparece con el contenido correcto.

**Archivos nuevos:** `utils/events.ts`, `services/permissions.ts`,
`services/subscription.ts`, `contexts/PermissionsContext.tsx`,
`contexts/SubscriptionContext.tsx`, `contexts/ThemeContext.tsx`,
`components/RequirePermission.tsx`, `components/SubscriptionModal.tsx`.

**Archivos modificados:** `services/api.ts` (fix 401/403/402 + `patchToken` +
`axios-retry`), `types/index.ts` (`Subscription` corregido al shape real del
backend — el de FASE 00 era una suposición sin verificar contra
`subscription.service.js`), `app/_layout.tsx` (providers + modal montados),
`app/(tabs)/index.tsx`, `app/(tabs)/more.tsx`, `app/management/index.tsx`
(gating por permisos).
