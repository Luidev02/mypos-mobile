# FASE 15 — Backend: sesiones, refresh tokens y device binding

| Campo | Valor |
|---|---|
| Estado | Completada* |
| Depende de | — |
| Bloquea a | FASE 16, FASE 17 |
| Alcance | `mypos-backend`: tabla de sesiones, refresh tokens, revocación real, arreglo de 401/403 |

## Punto de partida (auditado 2026-08-23)

Hallazgos verificados leyendo el código real, no asumidos:

1. **No existe refresh token en ninguna parte.** `grep -rni "refresh"` sobre todo
   `mypos-backend` devuelve un único hit: un hook de ejemplo de Git. Cero
   código, ni siquiera muerto.
2. **No existe logout.** Las únicas rutas públicas son `/api/user/new` y
   `/api/user/login`. El móvil llama a `/api/user/logout` (que no existe) y se
   traga el 404 en un `catch` vacío.
3. **No hay tabla de sesiones ni de tokens.** La única tabla relacionada es
   `connection_history` (append-only, `INSERT` desde el login, nunca se hace
   `SELECT` desde ningún lado del código).
4. **🚨 `JWT_SECRET` es la cadena literal `"test"` en todos los entornos.**
   `variables.config.js:7` tiene `process.env.JWT_SECRET || "test"`, y
   `dotenv.config()` sin ruta carga **solo** `.env`, que no define
   `JWT_SECRET`. `.env.development` sí lo define pero **nunca se carga** (no
   hay `--env-file` ni carga condicional). Con `.env` apuntando a una DB real,
   cualquiera puede firmar un JWT HS256 válido para cualquier usuario/empresa.
5. **Token expirado devuelve 403, no 401.** `jwtUtil.verify` captura todos los
   errores de `jsonwebtoken` y devuelve un genérico `"Invalid or expired
   token"`; el middleware lo traduce a 403. El 401 solo sale cuando **falta**
   la cabecera. Como los dos clientes solo cierran sesión en 401 (y el web
   ignora el 403 a propósito), **hoy nadie se desloguea nunca al expirar el
   token**: la app queda en un estado medio roto con el token viejo.
6. **El login nunca revisa `users.status`.** `getUserByEmail` sí lo trae en el
   `SELECT`, pero no se compara nunca: un usuario `suspend` o `disable` entra
   normal.
7. **`RolMiddleware(['a','b'])` solo valida el primer permiso** — toma
   `requiredPermission[0]` e ignora el resto.
8. **La cabecera `x-ip-address` no se lee nunca.** Los dos clientes la mandan
   en cada request (el web haciendo una llamada a `api.ipify.org` **por
   request**), y el backend solo lee `authorization`. La IP que sí llega a la
   DB es el campo `ip_connection` del body.

## Decisiones tomadas con el usuario

- **TTL del refresh: 7 días en web, 30 días en móvil.** En móvil la intención
  es que la sesión prácticamente no se cierre.
- **Web: refresh token en `localStorage`** (no cookie httpOnly). Se compensa
  atándolo a metadata del cliente. Implica que **no** se toca el CORS
  (`origin: '*'`), que con cookies habría habido que cambiar a lista blanca.
- **Móvil: binding estricto** — `install_id` (UUID generado en el primer
  arranque, en almacenamiento cifrado) **+ modelo + SO + versión de SO**.
  Cualquier variación cancela el refresh.
  > Advertido explícitamente al usuario y aceptado: atar la **versión** del SO
  > significa que actualizar Android/iOS cierra la sesión. Para poder aflojarlo
  > sin cirugía, los campos que entran en la huella viven en **una sola
  > constante** (`DEVICE_BINDING_FIELDS` en `sessions.service.js`).

## Diseño

**Access token (JWT):** 15 min, claims actuales + `sid` (id de sesión) +
`typ: 'access'`. Sigue siendo stateless: no se consulta la DB en cada request.

**Refresh token:** opaco (`crypto.randomBytes(32)`, hex), guardado **hasheado
con SHA-256** en `user_sessions.refresh_token_hash` — si se filtra la DB, los
tokens no son utilizables. Rotación en cada uso: el viejo se revoca y se emite
uno nuevo. Reutilizar un refresh ya rotado revoca la sesión entera
(`revoked_reason = 'reuse_detected'`).

**Validación de dispositivo:** se hace en el **refresh**, no en cada request.
Es el límite de seguridad real y evita que un cliente que olvide una cabecera
quede bloqueado. Consecuencia documentada: si el dispositivo cambia, la sesión
muere en el siguiente refresh, es decir en **≤15 min**, no instantáneamente.

## Tareas

- [x] Migración `20260823_user_sessions.sql` con la tabla `user_sessions`.
      **Escrita pero NO aplicada** — ver Verificación.
- [x] Arreglar `JWT_SECRET`: eliminado el fallback `"test"`. El proceso ahora
      lanza al arrancar si la variable falta, y también si alguien deja el
      valor viejo `"test"`. Secreto de 96 chars generado y añadido al `.env`
      (que está en `.gitignore`, verificado antes de escribirlo).
- [x] `jwt.util.js`: access token de 15 min (`JWT_ACCESS_EXPIRES_MIN`) y
      `verify` que devuelve `code: TOKEN_EXPIRED | TOKEN_INVALID`.
- [x] `sessions.repository.js` + `services/auth/sessions.service.js` nuevos.
- [x] `login`: crea sesión, devuelve `refreshToken` + `expiresIn`, y **revisa
      `users.status`** (arreglo del punto 6, devuelve 403 `USER_INACTIVE`).
- [x] `POST /api/user/refresh` (público) y `POST /api/user/logout` (autenticado).
- [x] `auth.middleware.js`: 401 con `code`; el 403 queda solo para permisos.
- [x] Extra no planeado: `connection_history` ahora guarda `req.ip` en vez de
      la IP que el cliente declaraba en el body (que venía de api.ipify.org y
      por lo tanto era autoinformada y falsificable).
- [x] Extra no planeado: `usersRepository.getAuthUserById` — el refresh
      necesita `company_plan`, que vive en `company.plan`, y el `getUserById`
      existente es un `SELECT *` sobre `users` que no lo trae.

## Fuera de alcance (documentado, no arreglado acá)

- El bug de `RolMiddleware` (solo valida el primer permiso) — es un arreglo de
  autorización, no de autenticación, y tocarlo cambia el comportamiento de
  todas las rutas a la vez. Se deja anotado para una fase propia.
- Limpiar la cabecera muerta `x-ip-address` — se hace en las fases de cliente
  (16 y 17), que es donde se genera.

## Verificación

- `node --check` limpio en los 9 archivos tocados.
- **Smoke test de configuración y JWT (26 asserts, 0 fallos)** — incluye la
  comprobación clave de que **un token firmado con el viejo secreto `"test"`
  ahora se rechaza**, que el TTL del access token es de 15 min exactos, y que
  expirado e inválido devuelven `code` distinto.
- **Test de `sessions.rotate()` con el repositorio mockeado (22 asserts, 0
  fallos)** — cubre los caminos de mayor riesgo:
  - rotación feliz y **el refresh viejo deja de servir** tras rotar;
  - **reutilización de un refresh ya revocado → revoca TODAS las sesiones del
    usuario** (`reuse_detected`);
  - refresh expirado → revoca esa sesión;
  - `install_id`, `device_model` y `os_version` distintos → `DEVICE_MISMATCH`
    y **la sesión queda cancelada en la DB**, que es literalmente lo que pidió
    el usuario;
  - el refresh se persiste como SHA-256, nunca en claro.
- **La migración NO se ejecutó.** El `.env` del backend apunta a la base de
  producción (`69.62.87.117`), y crear una tabla ahí es una decisión del
  usuario, no algo que deba hacerse por iniciativa propia. Queda pendiente:
  `npm run migrate`.
- **Sin pruebas de integración reales** (login → refresh → logout contra la
  API levantada): arrancar el backend en este entorno lo conectaría a la DB de
  producción. Toda la verificación es estática + unitaria con mocks.

## ⚠️ Notas de despliegue

1. **Backend, móvil y web deben salir juntos.** Los clientes viejos no saben
   renovar y el access token pasó de 24h a 15 min: desplegar solo el backend
   deslogueaba a todo el mundo cada 15 minutos.
2. **Todos los usuarios tendrán que iniciar sesión una vez.** Rotar el
   `JWT_SECRET` invalida los tokens vivos — es el precio inevitable de quitar
   el secreto `"test"`, y conviene hacerlo cuanto antes.
3. `JWT_SECRET` debe existir también en el entorno del servidor (PM2 /
   `ecosystem.config.cjs` solo inyecta `NODE_ENV`), o el proceso no arranca —
   ese fallo es deliberado, para que la falta del secreto se note en el
   arranque y no se degrade en silencio a uno inseguro.
