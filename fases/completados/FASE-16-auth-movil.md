# FASE 16 — Móvil: identidad de dispositivo y refresh automático

| Campo | Valor |
|---|---|
| Estado | Completada* |
| Depende de | FASE 15 |
| Alcance | `mypos-mobile`: install_id cifrado, huella de dispositivo, renovación transparente |

## Punto de partida

- El token vivía en `AsyncStorage` **sin cifrar** (clave `chococrispy`).
- `isAuthenticated()` solo comprobaba que el token **existiera**, nunca si
  había expirado: la app arrancaba "logueada" con un token muerto.
- **Cero** información de dispositivo. Lo único que viajaba era `ip_connection`
  (de `api.ipify.org`) y una cabecera `x-ip-address` que el backend nunca leía.
- `authService.logout()` llamaba a `/api/user/logout`, **que no existía** en el
  backend; el 404 se tragaba en un `catch` vacío, así que el token seguía vivo
  después de "cerrar sesión".

## Dependencias añadidas (aprobadas por el usuario)

`expo-secure-store`, `expo-device`, `expo-crypto`. La primera registró sola su
config plugin en `app.json`.

## Tareas

- [x] `services/device.ts` nuevo: `install_id` (UUID de `expo-crypto`) creado
      una vez y guardado cifrado, más modelo / SO / versión vía `expo-device`,
      y las cabeceras `x-*` que consume el backend.
- [x] **Fallback de web**: `expo-secure-store` lanza en web, y esta app también
      compila a web. Todo acceso pasa por un wrapper `secureStorage` que cae a
      `AsyncStorage` en web (y también si el keystore del dispositivo falla,
      para no dejar la app inutilizable). En web `client_type` es `'web'` y no
      hay `install_id`.
- [x] Refresh token en almacenamiento **cifrado**; el access token se queda en
      `AsyncStorage` a propósito: se lee en cada petición y dura 15 min, así
      que una lectura nativa cifrada por request no se justifica.
- [x] Interceptor de refresh en `services/api.ts` con **single-flight**: si
      diez peticiones reciben 401 a la vez, todas esperan a la misma promesa.
      Sin esto, con rotación de tokens, nueve de ellas presentarían un refresh
      ya rotado y el backend cancelaría la sesión por `reuse_detected`.
- [x] El refresh usa una instancia de axios **limpia**: con `this.api`, un 401
      de la propia llamada de refresh volvería a entrar al interceptor y se
      refrescaría a sí misma en bucle.
- [x] `getAccessToken()`: si no hay access token pero sí refresh, renueva antes
      de mandar la petición. Cubre el caso de abrir la app días después, donde
      mandar `Bearer null` habría dado `TOKEN_INVALID` (no recuperable) en vez
      de `TOKEN_EXPIRED`.
- [x] Solo `TOKEN_EXPIRED` / `TOKEN_MISSING` se reintentan. `TOKEN_INVALID`,
      `REFRESH_REUSED` y `DEVICE_MISMATCH` cierran sesión directamente: son
      estados de los que el cliente no puede recuperarse.
- [x] `logout()` ahora sí revoca en el servidor.
- [x] Eliminado `getIP()` y la cabecera `x-ip-address`: era una llamada a un
      tercero por request para un dato que el backend nunca leía.

## Verificación

- `npx tsc --noEmit` → 0 errores.
- `npx expo export --platform web` → build limpio (49 rutas), que es lo que
  confirma que el fallback de `expo-secure-store` en web funciona.
- **Bug real detectado y corregido durante la fase**: un `sed` para redirigir
  las llamadas a `getAccessToken()` se aplicó también **dentro del propio
  método**, dejando `getAccessToken()` llamándose a sí mismo — recursión
  infinita en cada petición autenticada. Se detectó al releer el diff, antes
  de compilar.
- **Sin pruebas en dispositivo físico.** No se ha verificado en hardware real
  que `Device.modelName`/`osVersion` devuelvan lo esperado, ni que SecureStore
  persista entre reinicios. Es la comprobación pendiente más importante de
  esta fase, porque **de esos valores depende que la sesión no se cancele
  sola**.

\* Implementación y verificación estática completas; falta la prueba en
dispositivo real y el end-to-end contra el backend desplegado.
