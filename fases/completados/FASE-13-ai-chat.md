# FASE 13 — Asistente IA (AI Chat)

| Campo | Valor |
|---|---|
| Estado | Completada* |
| Depende de | FASE 01 |
| Bloquea a | — |
| Alcance | Pantalla de chat con el asistente; en el web está parcialmente activa |

## Objetivo

Portar el módulo de asistente IA. **Nota importante (resuelta al auditar):**
en el web (`ai-chat/index.jsx`, 330 líneas) la entrada de texto está
deshabilitada — mensajes y conversaciones son un mock hardcodeado
(`MOCK_MESSAGES`/`MOCK_CONVERSATIONS`), banner "🚀 Función en desarrollo" y
placeholder *"…(próximamente)"* con `disabled`/`cursor-not-allowed`. **Pero el
backend real ya está completamente implementado** y nunca se conectó a esa
UI: `POST /api/ai/query` (mypos-backend) hace de gateway hacia
`mypos-ai-service`, que usa Gemini para detectar intención
(`detectIntent`) y ejecuta esa intención contra el propio backend de myPOS
(`executeIntent` → ventas de hoy/rango, top productos, stock bajo/inventario,
compras, clientes, categorías, proveedores, turno actual, comparativas,
reporte diario, small talk) antes de resumir la respuesta con Gemini
(`summarizeData`). Es real, no un stub — confirmado leyendo
`ai.controller.js`, `ai.gateway.service.js`, `mypos-ai-service/src/controllers/ai.controller.js`
e `intent.service.js` completos. Se implementó el **chat funcional**, como la
propia fase indica para este caso.

## Referencias

- `JiroPOS-Frontend/src/pages/ai-chat/index.jsx` (330)
- `mypos-ai-service/` — servicio de IA del monorepo
- `mypos-ai-service/docs/atlas-apm.md`

## Endpoints

```
POST /api/ai/query      { message: string, history: HistoryItem[] }
GET  /api/hub            (control de acceso al módulo — solo view_*)
```

`HistoryItem = { role: 'user'|'assistant', content: string, intent?: string, data?: any }`.
Validado con `zod` en `mypos-ai-service` (`message` 3–500 chars, `history`
máx. 12 entradas) — confirmado leyendo `validator.js` completo.

Respuesta `200`: `{ ok: true, type: 'success'|'not_allowed', intent: {intent, parameters?}, summary: string, data?: any }`.
El tipo `AiQueryResponse`/`AiQueryRequest` que ya existía en `types/index.ts`
era una adivinanza incorrecta (`{query}` → `{answer, data}`) de la auditoría
FASE 00 — nunca se había usado en ningún archivo (verificado con grep antes de
reemplazarlo), así que se corrigió sin riesgo de romper nada.

## Decisión previa (resuelta)

- [x] Verificado en `mypos-ai-service` y el backend: `/api/ai/query` **sí está
      operativo** end-to-end (Gemini + ejecución real de intents contra el
      backend de myPOS). Se implementó el chat funcional.

## Tareas

- [x] Pantalla `app/ai-chat.tsx` (archivo único, sin subrutas — mismo criterio
      que `app/shifts.tsx`/`app/import-export.tsx`) con lista de mensajes y
      compositor.
- [x] Control de acceso: se replicó el único chequeo del web que realmente
      puede pasar. El web comprueba `view_settings || manage_roles ||
      edit_roles` sobre lo que devuelve `/api/hub`, pero `hub.service.js`
      filtra esa consulta a `permission_name LIKE 'view_%'` — `manage_roles`/
      `edit_roles` JAMÁS llegan al cliente por esa vía, así que esas dos
      condiciones del web son código muerto. Mobile usa `RequirePermission
      perm="view_settings"` directamente (mismo componente que ya gatea
      `app/company/*`), que es funcionalmente idéntico al comportamiento real
      del web.
- [x] Historial de conversación: **sin sidebar de conversaciones pasadas** —
      las de `MOCK_CONVERSATIONS` en el web son 100% inventadas y no existe
      ningún endpoint para listar/cargar conversaciones anteriores (no hay
      persistencia de chats en el backend). Portar ese sidebar habría sido
      construir UI para datos que no existen. Sí se mantiene el historial de
      la conversación **activa** en memoria y se reenvía (recortado a las
      últimas 12 entradas) en cada request, tal como exige el validador del
      ai-service para dar contexto a Gemini entre mensajes.
- [x] Estado de carga (burbuja "escribiendo…" con spinner) y manejo de errores
      (toast + mensaje de fallback del asistente en el hilo).
- [x] Entrada de texto **habilitada** — la decisión previa se resolvió a
      "operativo".
- [x] Entrada en ambos hubs (`app/(tabs)/index.tsx` y `app/(tabs)/more.tsx`),
      gateada por `view_settings`, oculta si el usuario no tiene acceso.

## Criterios de aceptación

- [x] El módulo aparece únicamente para usuarios con acceso (`view_settings`).
- [x] El backend está operativo: enviar una consulta hace el request real
      (`aiChatService.query`) y la respuesta queda en el hilo de la
      conversación activa.

## Verificación

- `npx tsc --noEmit` → 0 errores.
- `npx expo export --platform web` → build limpio, 49 rutas estáticas
  generadas incluyendo `/ai-chat` (36.4 kB).
- Contrato de API verificado leyendo el código real de 3 repos distintos del
  monorepo (`mypos-backend`, `mypos-ai-service`) en vez de confiar en la UI
  mock del web — evitó repetir el patrón de esta migración de construir sobre
  una forma de request/response asumida.
- Hallazgo de bug latente en el propio web, documentado arriba: sus checks de
  acceso `manage_roles`/`edit_roles` son código muerto porque `/api/hub` solo
  devuelve permisos `view_%`. No se "corrigió" en el web (fuera del alcance de
  esta migración) pero mobile no replica el código muerto, solo el
  comportamiento real (`view_settings`).
- No se pudo probar en un dispositivo/emulador real ni contra una clave de
  Gemini real (eso depende de que `mypos-ai-service` tenga
  `GEMINI_API_KEY`/`AI_SERVICE_URL` configurados en el entorno donde corra el
  backend) — solo verificación estática (tipos + build) y lectura completa del
  código de los tres servicios involucrados.

\* "Completada" en el sentido de este tablero: implementación + verificación
estática completas. La prueba manual end-to-end (con el ai-service realmente
corriendo y respondiendo) no se ejecutó en esta sesión.
