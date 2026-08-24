# FASE 17 — Web: refresh automático y cierre de sesión real

| Campo | Valor |
|---|---|
| Estado | Completada* |
| Depende de | FASE 15 |
| Alcance | `JiroPOS-Frontend`: renovación transparente, logout real, limpieza de ipify |

## Punto de partida

- **No había interceptores de axios.** `grep -rn "interceptors" src` daba cero
  resultados; en su lugar había un `handleAuthError` llamado a mano desde el
  `catch` de cada método `*Token`.
- Ese helper solo cerraba sesión en **401**, e ignoraba el 403 a propósito
  ("puede ser un error de límite de plan"). Como el backend devolvía **403**
  para token expirado, **el web nunca deslogueaba al expirar la sesión**: se
  quedaba con el token muerto en `localStorage` indefinidamente.
- El logout (`Navbar_app.jsx`) era solo `localStorage.clear()`: el token seguía
  siendo válido en el servidor.
- `x-ip-address` se calculaba llamando a **api.ipify.org en cada petición**,
  para un dato que el backend nunca leía.
- `import-export.api.js` leía el token directamente y **no pasaba por
  `handleAuthError`**, así que ni siquiera deslogueaba en 401.

## Tareas

- [x] `axios.api.js` reescrito: `withAuthRetry(run)` envuelve cada petición
      autenticada y reintenta **una** vez tras renovar el token.
- [x] **Single-flight** del refresh compartido a nivel de módulo, por la misma
      razón que en móvil: el backend rota el refresh en cada uso, y varios
      refresh concurrentes harían que el backend cancelara la sesión entera
      por `reuse_detected`.
- [x] `run` recibe las cabeceras como argumento para que el reintento use el
      token **nuevo** y no el viejo capturado en el primer intento.
- [x] Solo `TOKEN_EXPIRED` / `TOKEN_MISSING` se reintentan; el resto cierra
      sesión.
- [x] `login.jsx` guarda el `refreshToken` (sin esto el usuario volvería al
      login cada 15 minutos).
- [x] `TOKEN_KEY` / `REFRESH_TOKEN_KEY` exportados como constantes en vez de la
      cadena `"chococrispy"` repetida — se mantiene el **mismo valor** de clave
      para no invalidar sesiones existentes por accidente.
- [x] `axiosAPi.logout()` nuevo: revoca en el servidor y después limpia.
      `Navbar_app.jsx` lo usa.
- [x] `import-export.api.js` enganchado al mismo `withAuthRetry` (helper
      exportado), en vez de leer el token a mano.
- [x] Eliminada la llamada a ipify por petición; se manda `x-client-type: web`.

## Pendiente conocido (no arreglado)

Quedan sitios que leen el token a mano y hacen `fetch`/`axios` crudos, así que
**no renuevan** y fallarán en silencio cuando el access token expire:
`ThemeContext.jsx` (guardar tema), `AuthImage*.jsx` (4 componentes de imagen),
`SubscriptionContext.jsx` y `pages/ai-chat/index.jsx`.

No se tocaron en esta fase para no mezclar un refactor amplio con el cambio de
autenticación, que ya toca tres repositorios a la vez. El impacto real es
menor (imágenes que no cargan, un guardado de tema que se pierde), pero con
tokens de 15 minutos ocurrirá **mucho más seguido** que con los de 24h. Es la
primera deuda a pagar después de este despliegue.

También sigue vivo el `localStorage.getItem('Rrope')` de la capa de API
legada (`get.api.jsx`, `delete.api.jsx`, `POS/*.api.jsx`): nada escribe nunca
esa clave y esos módulos no tienen importadores. Es código muerto, se deja
documentado en vez de borrarlo dentro de esta fase.

## Verificación

- `npx vite build` → build de producción limpio (643 módulos).
- **Sin pruebas contra el backend levantado** ni en navegador real: no se
  verificó el ciclo login → expiración → refresh → logout end-to-end.
- **Nota de seguridad, decidida con el usuario**: el refresh token del web vive
  en `localStorage` y su binding es `client_type` + `user-agent`, que es
  falsificable trivialmente. Es una barrera contra reutilización casual, no
  contra un atacante decidido; por eso su TTL es de 7 días y no de 30 como en
  móvil. La alternativa (cookie `httpOnly`) se descartó porque obligaba a
  cambiar el CORS de `origin: '*'` a lista blanca de dominios.

\* Implementación y build verificados; falta la prueba end-to-end en navegador
contra el backend desplegado.
