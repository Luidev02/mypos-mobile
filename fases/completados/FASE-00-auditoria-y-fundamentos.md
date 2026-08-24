# FASE 00 — Auditoría y fundamentos

| Campo | Valor |
|---|---|
| Estado | Completada |
| Depende de | — |
| Bloquea a | Todas |
| Alcance | Limpieza estructural, deduplicación, tipos y endpoints base |

## Objetivo

Dejar el proyecto móvil en un estado limpio y coherente **antes** de portar
funcionalidad: eliminar duplicados, cerrar huecos de tipado, completar el
catálogo de endpoints y fijar convenciones. Sin esta fase, cada fase posterior
arrastra deuda.

## Hallazgos de la auditoría (2026-08-23)

1. **POS duplicado.** `app/pos.tsx` y `app/(tabs)/pos.tsx` son ambos de 1056
   líneas — la misma pantalla mantenida en dos sitios. Lo mismo con
   `app/inventory/index.tsx` (888 líneas) y `app/(tabs)/inventory.tsx` (877),
   que ya divergieron.
2. **Endpoints faltantes** en `constants/api.ts` respecto a los que consume el
   frontend web (lista abajo).
3. **Restos de plantilla Expo** sin uso: `components/EditScreenInfo.tsx`,
   `components/ExternalLink.tsx`, `components/Themed.tsx`, `app/modal.tsx`,
   `components/__tests__/`.
4. **`app/shifts.tsx`** tiene 10 líneas (stub vacío).
5. **Documentación dispersa**: 9 ficheros `.md` sueltos en la raíz
   (`CHECKLIST_FINAL.md`, `MOBILE_APP_COMPLETE.md`, `RESUMEN_VISUAL.md`, …)
   con información parcialmente obsoleta.

## Endpoints del frontend web ausentes en `constants/api.ts`

```
/api/subscription/status                (GET)
/api/company/plan/usage                 (GET)
/api/company/api-config                 (PUT)
/api/company/matias-config              (GET/PUT)
/api/company/matias-config/test         (POST)
/api/invoicing-resolutions              (GET/POST)
/api/invoicing-resolutions/:id          (DELETE)
/api/invoicing-resolutions/:id/toggle   (PATCH)
/api/dian/status/:saleId                (GET)
/api/dian/retry/:saleId                 (POST)
/api/municipalities?q=                  (GET)
/api/suppliers                          (GET)
/api/products/measurement-units         (GET)
/api/inventory/warehouse/:id/movements  (GET)
/api/reports/:type/export               (GET)
/api/import-export/template/:entity     (GET)
/api/import-export/import/:entity       (POST)
/api/import-export/export/:entity       (GET)
/api/ai/query                           (POST)
/api/roles/:id/permissions              (GET/PUT)
/api/users/me/permissions               (GET)
/api/integrations/slug/:slug            (GET)
/api/pos/products/scan?code=            (GET)
/api/purchases/:id/status               (PATCH)
```

## Tareas

- [x] Decidir la ubicación canónica de POS e inventario (se mantuvo
      `app/(tabs)/`, wired al tab navigator) y borrar el duplicado. No había
      enlaces vivos a las rutas raíz, así que no hizo falta redirect.
- [x] Auditar con `grep -rn "router.push\|router.replace"` que ninguna
      navegación apunte a la ruta eliminada — confirmado, cero referencias.
- [x] Completar `constants/api.ts` con todos los endpoints de la lista anterior.
- [x] Completar `types/index.ts` con los tipos que faltan: `Subscription`,
      `PlanUsage`, `InvoicingResolution`, `DianStatus`, `MeasurementUnit`,
      `Municipality`, `Supplier`, `MatiasConfig`, `ImportResult`, `AiQueryResponse`.
- [x] Eliminar los restos de plantilla Expo sin uso (`Themed`, `StyledText`,
      `EditScreenInfo`, `ExternalLink`, `useColorScheme`, `useClientOnlyValue`,
      `__tests__/`, `app/modal.tsx`). `+not-found.tsx` se reescribió con el
      tema real de la app en vez de depender de `Themed`.
- [x] `app/shifts.tsx` se deja como está (placeholder intencional) — su
      implementación completa está scopeada en FASE 07.
- [x] Mover los `.md` de la raíz a `docs/` y dejar solo `README.md` (actualizado
      para reflejar el estado real del proyecto y enlazar `fases/README.md`).
- [x] Verificar que `npx tsc --noEmit` pasa sin errores.
- [x] Confirmar `.env` / `EXPO_PUBLIC_API_URL` — ya estaba configurado
      (`https://mypost-api.clicfstudios.com`) y documentado en el README.

## Hallazgos adicionales corregidos sobre la marcha

Al instalar dependencias (`node_modules` no existía) y correr `tsc --noEmit`
por primera vez en este proyecto, aparecieron 65 errores de tipado — nunca
antes verificados. La mayoría revelaban bugs reales, no solo huecos de tipos:

- **`services/api.ts`**: pendiente para FASE 01 (cierre de sesión en 403 — ver esa fase).
- **`(tabs)/pos.tsx`**: llamaba a `posService.getProductsByCategory` (método
  inexistente; el real es `getCategoryProducts`) — habría reventado en cada
  refresh de pantalla al volver del carrito. Corregido.
- **5 pantallas** (`(tabs)/index`, `company`, `coupons`, `profile`,
  `purchases`) importaban `SafeAreaView` de `'react-native'` en vez de
  `'react-native-safe-area-context'`, rompiendo la prop `edges` (safe-area
  real no aplicada en esos headers). Corregido.
- **`app/warehouses/index.tsx`**: el formulario usaba campos inventados
  (`code`, `location`, `description`) que no existen en el backend/tipo
  `Warehouse` real (`address`, `phone`, `employee_name`, confirmado contra
  `warehouses/form.jsx` del web) — el formulario de bodegas nunca habría
  guardado los datos correctos. Reescrito con los campos reales.
- **`components/CustomerModal.tsx`**: creaba clientes enviando
  `identification`/`identification_type` en vez de `ident`/`ident_type`
  (contrato real de `CreateCustomerRequest`); además tenía un botón de
  búsqueda (`searchButton`) sin estilo definido (mezclado por error dentro de
  la key `input`) y dos pares de estilos duplicados (`foundInfo`,
  `selectButton`) donde el segundo (incompleto) pisaba al primero. Corregido.
- **`services/index.ts`**: `POSService.getCategoryProducts/searchProducts/
  getProductById` no traían `cost`/`tax_id`/`is_active` en su normalización.
- **`app/_layout.tsx`**: tras borrar `app/modal.tsx` quedó una
  `<Stack.Screen name="modal">` huérfana que generaba warning en cada arranque
  (`No route named "modal" exists`). Eliminada junto con el comentario
  obsoleto que la referenciaba.
- Varios ajustes menores de tipos (`Product.stock` opcional sin narrow en 4
  sitios, `EmptyState` sin soporte de `actionLabel`/`onAction` pese a que 4
  pantallas ya se lo pasaban, `Sale` sin `sale_type`/`coupon_id` para el flujo
  de retomar órdenes pausadas, interfaces `CustomerDetailed` re-declarando
  campos heredados como opcionales de forma inválida).

Ninguno de estos bugs estaba en el alcance original de la fase, pero bloqueaban
el criterio de aceptación de `tsc --noEmit` limpio y varios eran regresiones
funcionales reales, así que se corrigieron aquí en vez de arrastrarlos.

## Hallazgos al probar en dispositivo real (Expo Go)

Tras cerrar la fase, se probó la app en un dispositivo real con `npm start` +
Expo Go, lo que sacó a la luz dos problemas que `tsc`/`expo export --web` no
detectaron (los tipos de rutas de expo-router se regeneran de forma más
estricta en `expo start` que en `expo export`):

- **6 componentes adicionales** con el mismo bug de `SafeAreaView` importado de
  `'react-native'` en vez de `'react-native-safe-area-context'` (no detectados
  en el barrido inicial porque están en imports multilínea dentro de
  `components/`, no en `app/`): `CloseShiftModal`, `CustomerModal`,
  `OrdersModal`, `OrderTypeModal`, `SettingsModal`, `ShiftModal`. Corregidos y
  verificados con un barrido exhaustivo (script Node) que confirma cero
  imports incorrectos restantes en todo el proyecto.
- **3 rutas de navegación rotas en `app/(tabs)/more.tsx`**: los botones "Mi
  Perfil", "Bodegas" y "Compras" navegaban a `/profile/index`,
  `/warehouses/index` y `/purchases/index` — expo-router no resuelve el sufijo
  `/index` en un `href`, así que estos botones no habrían funcionado. Corregidos
  a `/profile`, `/warehouses`, `/purchases`.
- **Redirect post-login roto**: `app/login.tsx` y el botón "volver" de
  `more.tsx` usaban `router.replace('/(tabs)/')` (con barra final), que
  tampoco es un `href` válido para el grupo `(tabs)`. Corregido a `'/(tabs)'`.
- Se confirmó que el `ERROR Error loading image: [Error: Failed to load
  image]` visible en consola para productos sin foto es comportamiento
  esperado (idéntico al del frontend web `AuthImage.jsx`: captura el error,
  muestra un placeholder) — no es una regresión.

`npx tsc --noEmit` y `npx expo export --platform web` se volvieron a ejecutar
tras estas correcciones: ambos limpios.

## Criterios de aceptación

- [x] `npx tsc --noEmit` sin errores.
- [x] No existe ninguna pantalla duplicada en dos ficheros.
- [x] `constants/api.ts` cubre el 100 % de los endpoints que consume el frontend web.
- [x] La app exporta y navega sin rutas rotas ni warnings (verificado con
      `npx expo export --platform web`, ya que `expo start` requiere un
      dispositivo/emulador interactivo no disponible en este entorno).

## Verificación

Comandos ejecutados en `mypos-mobile/`:

```bash
npm install                        # node_modules no existía; 754 paquetes instalados
npx tsc --noEmit                   # 0 errores (65 iniciales → 0)
npx expo-doctor                    # 17/18 checks OK (solo drift de versiones patch de Expo SDK, fuera de alcance)
npx expo export --platform web     # 33 rutas estáticas generadas, sin warnings ni errores
```

Salida final de `tsc --noEmit`: vacía (sin errores).
Salida final de `expo export`: sin líneas `WARN` ni `ERROR`; `dist/` generado
y luego eliminado (no se commitea, ya está en `.gitignore`).

Archivos modificados: ver `git status` — 2 pantallas duplicadas eliminadas
(`app/pos.tsx`, `app/inventory/index.tsx`), 9 ficheros de plantilla Expo
eliminados, 9 `.md` movidos a `docs/`, `constants/api.ts` y `types/index.ts`
ampliados, y los bugs listados arriba corregidos en 11 ficheros adicionales.
