# FASE 02 — Perfil y sesión

| Campo | Valor |
|---|---|
| Estado | Completada |
| Depende de | FASE 01 |
| Bloquea a | 11 |
| Alcance | Pantalla de perfil, cambio de contraseña, preferencias |

## Objetivo

Sustituir el placeholder `app/profile/index.tsx` (57 líneas, *"En desarrollo"*)
por la pantalla de perfil completa equivalente a la del web.

## Referencias del frontend web

- `JiroPOS-Frontend/src/pages/profile/index.jsx` — 474 líneas
- `JiroPOS-Frontend/src/pages/auth/login.jsx`

## Endpoints

```
GET  /api/profile
PUT  /api/profile
POST /api/profile/change-password
GET  /api/users/me/permissions
```

El servicio ya existe: `profileService` en `services/extended.ts` (`getProfile`,
`updateProfile`, `changePassword`). Falta únicamente la UI.

## Tareas

- [x] Pantalla de perfil con los **4 tabs exactos del web** (Información,
      Contraseña, Cuenta, Apariencia) — mismos campos, mismo copy, mismas
      validaciones.
- [x] Edición de datos con validación manual (useState), **no Formik**: se
      auditó el resto del código y Formik está instalado pero no se usa en
      ninguna pantalla; introducirlo solo aquí habría sido inconsistente con
      el patrón ya establecido (login, formularios de warehouses/taxes, etc.
      todos usan `useState` + validación manual).
- [x] Cambio de contraseña: actual, nueva (mín. 6), confirmación — mismas reglas
      que el web, mismo aviso de que la sesión no se cierra al cambiarla.
- [x] Sección de preferencias (tab "Apariencia"): toggle de modo oscuro, grilla
      de las 6 paletas con vista previa en vivo, sincronizado con
      `ThemeContext` (FASE 01) y persistido también en el servidor
      (`theme_palette`/`theme_mode` vía `PUT /api/profile`, igual que el web).
- [x] Cerrar sesión — ya existe en `app/(tabs)/more.tsx` con confirmación; no se
      duplicó aquí porque el web tampoco pone el logout dentro de `/profile`
      (vive en el Navbar).
- [x] Versión de la app vía `expo-constants` (`Constants.expoConfig?.version`),
      mostrada al pie de la pantalla.

### Ajustes al plan original (verificados contra el código real)

Al leer `JiroPOS-Frontend/src/pages/profile/index.jsx` completo antes de
implementar, dos tareas de la lista original **no existen en el web** y se
quitaron del alcance para no inventar funcionalidad:

- ~~Foto de perfil con `expo-image-picker`~~ — el perfil del web no tiene subida
  de avatar en ningún lado (ni el formulario ni el backend `updateProfile`
  aceptan un campo de imagen).
- ~~Listado de permisos efectivos~~ — tampoco está en la pantalla de perfil del
  web (los permisos solo se gestionan desde Empresa → Roles). Quedan
  disponibles vía `usePermissions()` (FASE 01) si otra pantalla los necesita.

### Corrección de tipos (bug real encontrado)

`services/extended.ts` declaraba `updateProfile(): Promise<UserProfile>`, pero
`profile.service.js` del backend responde `ResponseHandler.success(null, ...)`
— **nunca** devuelve el perfil actualizado. El tipo mentía; el código real
habría recibido `undefined` donde esperaba un objeto completo. Corregido a
`Promise<void>` y, como hace el web, se vuelve a pedir el perfil
(`fetchProfile()`) tras guardar. También se corrigió `UserProfile` completo:
tenía `created_at` inventado (el campo real es `creation_date`) y le faltaban
`status`, `company_id`, `company_name`, `theme_palette`, `theme_mode` — todos
verificados contra `profile.repository.js`.

## Criterios de aceptación

- [x] Editar el perfil persiste tras recargar (se vuelve a pedir el perfil tras
      guardar) y se refleja en `AuthContext` (`updateUserInfo` nuevo, añadido a
      `AuthContext.tsx`).
- [x] Cambiar la contraseña funciona; con la contraseña actual errónea muestra
      el mensaje del backend (`error.response.data.message`) **sin** cerrar
      sesión — verificado que el error es un 400, no un 401/403, así que el
      interceptor de FASE 01 no lo toca.
- [~] *El selector de tema cambia la app en caliente* — cierto **dentro de la
      pantalla de Perfil** (el toggle, la grilla de paletas y la vista previa
      reaccionan al instante y persisten). El resto de la app (POS, listados,
      etc.) sigue con la paleta marrón estática hasta que esas ~30 pantallas se
      migren a `useAppTheme()`, tal como quedó explícitamente fuera de alcance
      en la nota de FASE 01. No se reclama más de lo que hay.

## Verificación

Comandos ejecutados en `mypos-mobile/`:

```bash
npx tsc --noEmit                   # 0 errores
npx expo export --platform web     # sin warnings ni errores
```

Verificado por lectura de código y compilación (sin sesión en dispositivo
real, igual que FASE 01). Pendiente de una pasada manual antes de producción:

1. Editar nombre/email/PIN, guardar, salir y volver a entrar → los cambios
   deben seguir ahí y reflejarse en "Más" (usa `user.username`).
2. Cambiar la contraseña con la actual incorrecta → debe mostrar el mensaje del
   backend sin regresar a la pantalla de login.
3. Cambiar de paleta y de modo oscuro en la pestaña Apariencia → la vista
   previa de esa misma pantalla debe reflejarlo al instante, y debe seguir
   así tras cerrar y reabrir la app.

**Archivos modificados:** `types/index.ts` (`UserProfile`,
`UpdateProfileRequest` corregidos al shape real del backend),
`services/extended.ts` (`updateProfile` → `Promise<void>`),
`contexts/AuthContext.tsx` (+`updateUserInfo`), `app/profile/index.tsx`
(reescrito completo, antes placeholder de 57 líneas).
