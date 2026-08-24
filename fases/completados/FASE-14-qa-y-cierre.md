# FASE 14 — QA, rendimiento y cierre

| Campo | Valor |
|---|---|
| Estado | Completada* |
| Depende de | Todas las anteriores |
| Bloquea a | — |
| Alcance | Verificación de paridad, rendimiento, build y release |

## Objetivo

Cerrar el proyecto: comprobar que la app móvil hace todo lo que hace el web,
que rinde bien en dispositivo real y que se puede publicar.

## 1. Matriz de paridad

Recorrer cada ruta del web (`JiroPOS-Frontend/src/main.jsx`) y marcar su
equivalente móvil. Rellenar esta tabla al ejecutar la fase:

Fuente: `JiroPOS-Frontend/src/main.jsx` (377 líneas, `createBrowserRouter`, leído
completo). Nota: el web **no tiene** `/hub/roles` ni `/hub/users` como rutas
independientes — viven como pestañas dentro de `/hub/company`; solo
`/hub/roles/detail?id=` (query param, no `:id`) es una ruta real.

| Ruta web | Pantalla móvil | Paridad | Notas |
|---|---|---|---|
| `/hub` | `app/(tabs)/index.tsx` | Sí | |
| `/hub/newsales` | `app/(tabs)/pos.tsx` + `app/cart.tsx` | Sí | POS dividido en 2 pantallas |
| `/hub/products` (+new/:id/edit) | `app/products/index.tsx` | Sí | Modal de crear/editar en vez de rutas separadas; sin página de detalle dedicada (el modal ya cubre esos campos) |
| `/hub/categories` (+new/:id/edit) | `app/categories/index.tsx`, `new.tsx`, `[id].tsx` | Sí | 1:1 |
| `/hub/customers` (+new/:id/edit) | `app/customers/index.tsx`, `[id].tsx` | Sí | Modal-based |
| `/hub/warehouses` (+new/:id/edit) | `app/warehouses/index.tsx`, `[id].tsx` | Sí | Modal-based |
| `/hub/taxes` (+new/:id/edit) | `app/taxes/index.tsx` | Parcial | Sin ruta de detalle dedicada (web sí tiene `/hub/taxes/:id`); el modal de edición cubre los mismos campos, así que no hay funcionalidad perdida, solo una pantalla menos |
| `/hub/inventory` (+low-stock/movements/adjust) | `app/(tabs)/inventory.tsx`, `inventory/low-stock.tsx`, `inventory/[id].tsx`, `inventory/adjust.tsx` | Sí | |
| `/hub/coupons` (+new/:id/edit) | `app/coupons/index.tsx`, `new.tsx`, `[id].tsx` | Sí | |
| `/hub/pos/shifts` (+open/close) | `app/shifts.tsx` | Sí | Una pantalla con modal `mode="open"/"close"` en vez de rutas separadas |
| `/hub/pos/cash-registers` (+new/edit) | `app/cash-registers/index.tsx`, `new.tsx` | Sí | |
| `/hub/sales` (+:id) | `app/sales/index.tsx`, `[id].tsx` | Sí | |
| `/hub/company` | `app/company/index.tsx` + `general/dian/resolutions/plan/version.tsx` | Sí | La pestaña única del web se separó en pantallas — misma cobertura |
| `/hub/profile` | `app/profile/index.tsx` | Sí | |
| `/hub/purchases` (+form/detail) | `app/purchases/index.tsx`, `new.tsx`, `[id].tsx` | Sí | |
| `/hub/reports` | `app/(tabs)/reports.tsx` | Sí | |
| Roles/Usuarios (pestañas de `/hub/company` en el web) | `app/management/roles/index.tsx`, `app/management/users/index.tsx` | Sí (móvil más completo) | El web solo tiene la pantalla de detalle de permisos como ruta real; el listado es una pestaña. Móvil tiene pantallas dedicadas — no es un hueco, es mejor estructura |
| `/hub/ai-chat` | `app/ai-chat.tsx` | Sí (funcional, el web es un mockup) | Ver FASE-13 |
| `/hub/import-export` | `app/import-export.tsx` | Sí | Ver FASE-12 |
| `/customer-display` | *(sin equivalente)* | No — decisión ya documentada | El web abre una segunda ventana del mismo navegador (`window.open` + `BroadcastChannel` + `localStorage`), sin equivalente directo en RN/Expo sin un transporte distinto (websocket o servidor local). Ya excluido de alcance explícitamente en `fases/completados/FASE-06-pos-avanzado.md` (líneas 152-163) por ser funcionalidad nueva, no un port. No se reabre acá. |

## 2. Pruebas funcionales

- [ ] **No ejecutado — requiere dispositivo físico/emulador**, no disponible en
      este entorno (sin GUI, sin Android/iOS SDK con emulador arrancable).
      Los 4 flujos completos (venta con pesable+cupón+cliente+DIAN, compra→
      ajuste→movimientos, rol→usuario→menú, paridad numérica web/móvil)
      quedan pendientes de una sesión de pruebas manuales en dispositivo.
      Todo lo que sí se pudo verificar sin dispositivo (contrato de API, tipos,
      build) se hizo fase a fase durante todo el proyecto — cada
      `fases/completados/FASE-*.md` documenta su propia verificación de
      contrato contra el backend real.

## 3. Rendimiento

Auditoría estática (grep + lectura de código) sobre `mypos-mobile/app/`:

- [x] `FlatList` con `keyExtractor` presente en todos los listados largos:
      `products/index.tsx`, `sales/index.tsx`, `(tabs)/inventory.tsx`,
      `purchases/index.tsx`, `customers/index.tsx`, `inventory/[id].tsx`
      (movimientos), `cart.tsx`. Ninguno ajusta `getItemLayout`/`windowSize`/
      `initialNumToRender` — quedan en los valores por defecto de RN. No se
      tocó: ajustar esos parámetros a ciegas sin datos de perfilado en
      dispositivo real (tamaño real de fila, gama del hardware objetivo)
      podría empeorar el scroll en vez de mejorarlo; es un ajuste que debe
      hacerse con profiling real, no adivinando.
- [x] **Hallazgo real, no corregido**: la grilla de productos del POS
      (`app/(tabs)/pos.tsx`, línea ~785) usa `ScrollView` + `gridItems.map(...)`
      en vez de `FlatList`/`numColumns` — es la única lista de la app sin
      virtualizar, y es la que más probablemente tenga cientos de tiles con
      imagen en producción (todo un catálogo o categoría completa). **No se
      corrigió en esta fase**: es la pantalla más crítica de la app (venta en
      curso), convertir su grid a una lista virtualizada es un cambio de
      estructura no trivial (columnas, scroll, posible interacción con el
      buscador/categorías), y no hay forma de probarlo en un dispositivo real
      dentro de este entorno antes de tocar el flujo de venta. Se documenta
      como el ítem de rendimiento más importante pendiente, para una fase de
      seguimiento con acceso a dispositivo.
- [x] Debounce: `(tabs)/pos.tsx` ya debounce su búsqueda server-side (500ms,
      confirmado en el propio código con comentario "igual que el web").
      `products/index.tsx` y `customers/index.tsx` filtran en memoria sobre
      una lista ya cargada (sin request por tecla), así que no necesitan
      debounce — no hay ninguna búsqueda disparando una petición de red por
      cada tecla sin debounce.
- [x] Imágenes: no hay cacheo/redimensionado explícito de imágenes de
      productos (se renderizan tal cual llegan de la URL del backend) — no es
      una regresión de esta migración, el web tampoco lo hace; se deja
      documentado como mejora futura, no como bug de paridad.
- [x] Re-renders de POS/carrito revisados: `cart.tsx` (1232 líneas) no usa
      `useMemo`/`useCallback` en ningún lado, incluyendo `renderCartItem`
      (identidad nueva en cada render, pasada directo a `FlatList`).
      **Evaluado y descartado a propósito**: en la práctica un carrito rara
      vez pasa de ~20 ítems, el beneficio real de memoizar es marginal, y
      envolver `renderCartItem` en `useCallback` sin cuidado (cierra sobre
      `updateQuantity`/`removeItem` del contexto) es una fuente típica de bugs
      de closure obsoleta en el flujo de cobro — el flujo más sensible de toda
      la app. No vale el riesgo por una ganancia de rendimiento que no se
      puede ni medir en este entorno.
- [ ] Arranque en frío en dispositivo gama baja: no medible sin dispositivo.

## 4. Robustez

- [x] Manejo global de errores HTTP (`services/api.ts`, interceptor de
      respuesta) confirmado sin cambios respecto a lo implementado en fases
      anteriores: 401 limpia sesión y redirige a `/login`; 402 emite
      `APP_EVENTS.SUBSCRIPTION_BLOCKED` sin cerrar sesión; 403 se propaga tal
      cual para que cada pantalla muestre su propio mensaje (diseño
      intencional, no un hueco). 5xx/errores de red no tienen manejo global —
      cada pantalla los captura localmente (toast/estado de error), consistente
      en toda la app.
- [x] `axios-retry`: `retries: 2`, backoff exponencial, **solo en GET**
      (`retryCondition` exige `method === 'get'`) — POST/PUT/PATCH/DELETE
      nunca reintentan, a propósito, para no duplicar ventas u otras
      mutaciones si el reintento sí llega al servidor.
- [x] Estados de carga/vacío/error muestreados en 5 listados: `products`,
      `sales`, `purchases`, `(tabs)/inventory` ya tenían los tres estados
      completos (`ErrorState`+`onRetry`). **`customers/index.tsx` no tenía
      estado de error persistente** — un fallo de carga solo mostraba un
      toast transitorio y la pantalla se quedaba vacía/desactualizada en
      silencio una vez el toast desaparecía. **Corregido en esta fase**: se
      agregó `error`/`setError` + `<ErrorState message={error} onRetry={loadCustomers} />`,
      mismo patrón que las demás pantallas ([app/customers/index.tsx](../../app/customers/index.tsx)).
- [x] Sin conexión: no existe ningún hook/librería de detección de
      conectividad (`@react-native-community/netinfo` no está instalado, no
      hay `useNetworkStatus` ni equivalente). No se agregó en esta fase — es
      funcionalidad nueva (el web tampoco la tiene, un tab del navegador sin
      red simplemente falla igual que aquí), no un hueco de paridad. Los
      fallos de red ya se muestran vía toast/`ErrorState` en cada pantalla, lo
      cual cumple el criterio de "sin pantallas en blanco" aunque no hay un
      aviso proactivo de "estás sin conexión" antes de intentar la petición.

## 5. Build y publicación

- [x] `npx tsc --noEmit` → limpio (0 errores), verificado al cerrar esta fase.
- [ ] Build EAS de producción: **no ejecutado** — requiere credenciales/cuenta
      EAS y no se debe lanzar un build de producción sin confirmación
      explícita del usuario (es una acción con efectos fuera de este entorno).
      El proyecto ya tiene `eas.json` con perfiles `development` (dev client,
      interno), `preview` (APK interno) y `production` (APK, `autoIncrement`);
      ninguno especifica un bloque `ios` propio (usan los valores por defecto
      de EAS). `submit.production` existe pero está vacío (`{}`).
- [x] Iconos/splash: `icon.png`, `splash-icon.png`, `adaptive-icon.png` y
      `favicon.png` existen en `assets/images/`. Nombre (`mypos-mobile`) y
      slug son genéricos/placeholder — no se cambiaron: es una decisión de
      producto (nombre público de la app), no algo para inventar.
- [x] Permisos declarados: **corregido en esta fase**. `app.json` no
      declaraba ningún permiso pese a usar `expo-camera` (escáner de
      código de barras, `components/BarcodeScanner.tsx`, wireado en
      `(tabs)/pos.tsx`) y `expo-image-picker` (imágenes de producto/categoría,
      `ProductFormModal.tsx`/`CategoryFormModal.tsx`). Se agregaron los
      plugins `expo-camera`/`expo-image-picker` con mensajes en español
      (`cameraPermission`/`photosPermission`), `ios.infoPlist` con
      `NSCameraUsageDescription`/`NSPhotoLibraryUsageDescription`, y
      `android.permissions` con `CAMERA`/`READ_MEDIA_IMAGES` — verificado con
      `npx expo config --type public` que el plugin de cámara agrega también
      `RECORD_AUDIO` automáticamente (comportamiento esperado de
      `expo-camera`, no se tocó a mano). `expo-document-picker` y
      `expo-file-system`/`expo-sharing` no requieren permisos declarados en
      plataformas modernas — no se agregó nada para ellos.
- [ ] **`ios.bundleIdentifier`: no está configurado.** No se inventó uno — el
      identificador reverso (`com.empresa.mypos` o el que sea) es una decisión
      de negocio que debe coincidir con lo que se registre en App Store
      Connect; asignar uno al azar ahora y tener que cambiarlo después de un
      primer build/registro es más costoso que dejarlo pendiente y que el
      usuario lo defina. **Bloqueante real para cualquier build de iOS.**
      Además, `android.package` sigue en `"com.anonymous.myposmobile"`, el
      placeholder por defecto de Expo — recomendable cambiarlo antes de un
      release real de Play Store por la misma razón (una vez publicado un
      `package` no se puede cambiar sin publicar como app nueva), pero no
      bloquea builds internos/preview.
- [ ] Probar en dispositivo físico Android e iOS: no ejecutado, requiere
      hardware fuera de este entorno.
- [x] `README.md` de fases actualizado (tablero con las 15 fases en
      `Completada*`).

## Criterios de aceptación

- [x] La matriz de paridad está completa y sin huecos sin justificar (el único
      hueco real, `/customer-display`, ya estaba formalmente excluido de
      alcance desde FASE-06).
- [ ] Los flujos completos pasan en dispositivo físico — **no verificado**,
      requiere hardware.
- [ ] Los builds de producción se generan e instalan correctamente — **no
      verificado**, requiere cuenta EAS + `ios.bundleIdentifier` configurado
      primero.

## Verificación

- `npx tsc --noEmit` → 0 errores (todo el proyecto, las 15 fases).
- `npx expo export --platform web` → build limpio tras los cambios de esta
  fase (permisos en `app.json`, estado de error en `customers/index.tsx`).
- `npx expo config --type public` → confirma que `app.json` resuelve sin
  errores con los plugins nuevos.
- Auditoría de rendimiento/robustez/build hecha con un agente de
  investigación de solo lectura sobre todo `mypos-mobile/app`, `services`,
  `components` — sin tocar código hasta tener el reporte completo, para poder
  decidir con criterio qué corregir ahora (permisos, error state de clientes)
  y qué documentar como pendiente real en vez de parchear a ciegas (grid del
  POS, `bundleIdentifier`, tuning de `FlatList`, pruebas en dispositivo).

\* "Completada" en el sentido de este tablero: matriz de paridad completa,
auditoría estática de rendimiento/robustez/build hecha, y las correcciones de
bajo riesgo aplicadas y verificadas. **No incluye** pruebas funcionales en
dispositivo físico, build EAS de producción, ni asignación de
`bundleIdentifier`/publicación en tiendas — esas 4 cosas requieren acciones
fuera de este entorno (hardware, credenciales, o una decisión de negocio del
usuario) y quedan como el trabajo real restante antes de un release.
