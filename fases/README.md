# Sistema de Fases — Paridad `JiroPOS-Frontend` → `mypos-mobile`

Tablero de control para portar **todo** lo implementado en el frontend web
(`JiroPOS-Frontend`, v2.6.0) a la app móvil (`mypos-mobile`, Expo SDK 54 /
expo-router 6 / RN 0.81).

## Cómo funciona

```
fases/
├── README.md          ← este índice (tablero de control)
├── pendientes/        ← fases por hacer o en curso
└── completados/       ← fases terminadas y verificadas
```

**Reglas:**

1. Cada fase es **un archivo `.md` independiente** dentro de `pendientes/`.
2. Se trabaja **una fase a la vez**, en orden (salvo que las dependencias permitan paralelo).
3. Al terminar una fase: marcar todas las tareas `[x]`, completar la sección
   *Verificación*, y **mover el archivo** a `completados/`:
   `git mv fases/pendientes/FASE-XX-*.md fases/completados/`
4. Actualizar la tabla de abajo (estado + fecha).
5. Una fase solo se mueve a `completados/` si cumple **todos** sus criterios de aceptación.

**Estados:** `Pendiente` · `En curso` · `Bloqueada` · `Completada`

## Tablero

| # | Fase | Archivo | Depende de | Estado | Fecha cierre |
|---|------|---------|-----------|--------|--------------|
| 00 | Auditoría y fundamentos | [FASE-00-auditoria-y-fundamentos.md](completados/FASE-00-auditoria-y-fundamentos.md) | — | Completada | 2026-08-23 |
| 01 | Infraestructura core | [FASE-01-infraestructura-core.md](completados/FASE-01-infraestructura-core.md) | 00 | Completada | 2026-08-23 |
| 02 | Perfil y sesión | [FASE-02-perfil-y-sesion.md](completados/FASE-02-perfil-y-sesion.md) | 01 | Completada | 2026-08-23 |
| 03 | Catálogo: productos, categorías, impuestos | [FASE-03-catalogo.md](completados/FASE-03-catalogo.md) | 01 | Completada* | 2026-08-23 |
| 04 | Inventario y almacenes | [FASE-04-inventario-y-almacenes.md](completados/FASE-04-inventario-y-almacenes.md) | 03 | Completada* | 2026-08-23 |
| 05 | Clientes y cupones | [FASE-05-clientes-y-cupones.md](completados/FASE-05-clientes-y-cupones.md) | 01 | Completada* | 2026-08-23 |
| 06 | POS avanzado | [FASE-06-pos-avanzado.md](completados/FASE-06-pos-avanzado.md) | 03, 05, 07 | Completada* | 2026-08-23 |
| 07 | Turnos y cajas registradoras | [FASE-07-turnos-y-cajas.md](completados/FASE-07-turnos-y-cajas.md) | 01 | Completada* | 2026-08-23 |
| 08 | Ventas y facturación DIAN | [FASE-08-ventas-y-dian.md](completados/FASE-08-ventas-y-dian.md) | 06 | Completada* | 2026-08-23 |
| 09 | Compras y proveedores | [FASE-09-compras-y-proveedores.md](completados/FASE-09-compras-y-proveedores.md) | 03, 04 | Completada* | 2026-08-23 |
| 10 | Reportes y exportación | [FASE-10-reportes.md](completados/FASE-10-reportes.md) | 08 | Completada* | 2026-08-23 |
| 11 | Empresa y administración | [FASE-11-empresa-y-administracion.md](completados/FASE-11-empresa-y-administracion.md) | 01, 02 | Completada* | 2026-08-23 |
| 12 | Import / Export Excel | [FASE-12-import-export.md](completados/FASE-12-import-export.md) | 03 | Completada* | 2026-08-23 |
| 13 | Asistente IA (AI Chat) | [FASE-13-ai-chat.md](completados/FASE-13-ai-chat.md) | 01 | Completada* | 2026-08-23 |
| 14 | QA, rendimiento y cierre | [FASE-14-qa-y-cierre.md](completados/FASE-14-qa-y-cierre.md) | todas | Completada* | 2026-08-23 |
| 15 | Auth backend: sesiones y refresh tokens | [FASE-15-auth-backend.md](completados/FASE-15-auth-backend.md) | — | Completada* | 2026-08-23 |
| 16 | Auth móvil: dispositivo y refresh | [FASE-16-auth-movil.md](completados/FASE-16-auth-movil.md) | 15 | Completada* | 2026-08-23 |
| 17 | Auth web: refresh y logout real | [FASE-17-auth-web.md](completados/FASE-17-auth-web.md) | 15 | Completada* | 2026-08-23 |

## Estado de partida (auditoría 2026-08-23)

Lo que **ya existe** en `mypos-mobile` y sirve como base:

- Capa de servicios (`services/extended.ts`, 691 líneas) cubre CRUD de casi todas
  las entidades — el hueco principal está en las **pantallas**, no en la API.
- Pantallas funcionales: POS, carrito, inventario (listado/detalle), productos,
  categorías, clientes, ventas, impuestos, almacenes, usuarios, roles, reportes básicos.
- Contextos: `AuthContext`, `CartContext`, `SaleContext`, `ToastContext`.

Lo que **falta o es placeholder** (`"En desarrollo"`):

- `app/coupons/index.tsx`, `app/purchases/index.tsx`, `app/company/index.tsx`,
  `app/profile/index.tsx` — 57 líneas cada uno, solo cabecera.
- `app/shifts.tsx` — 10 líneas.
- Sin equivalente móvil: resoluciones de facturación, integraciones, DIAN,
  import/export, AI chat, ajustes de inventario, low-stock, movimientos,
  cajas registradoras, productos pesables, tema/paletas, suscripción, permisos.

## Cierre del proyecto (2026-08-23)

Las 15 fases (00–14) están completadas. La app móvil tiene paridad funcional
con el web en todas las rutas (`/customer-display` es la única excepción,
formalmente fuera de alcance desde FASE-06 por no tener equivalente directo en
RN). Varios hallazgos reales de bugs de backend, encontrados auditando el
código real en vez de asumir que el web estaba bien, quedaron corregidos en el
propio `mypos-backend` durante el proceso (ver FASE-05, 07, 08, 11 para el
detalle de cada uno).

Trabajo real pendiente antes de un release, fuera del alcance de este entorno:

- Pruebas funcionales completas en dispositivo físico Android/iOS (FASE-14 §2).
- `ios.bundleIdentifier` sin asignar — decisión de negocio, bloquea cualquier
  build de iOS (FASE-14 §5).
- Build EAS de producción y submit a las tiendas.
- Virtualizar la grilla de productos del POS (`app/(tabs)/pos.tsx`), la única
  lista de la app sin `FlatList` — deferido a propósito por ser la pantalla
  más crítica y no poder probarse sin dispositivo (FASE-14 §3).

## Convenciones de la app móvil

- Rutas con **expo-router** (file-based) bajo `app/`.
- Estilos con `constants/theme.ts` (`Colors`, `Spacing`, `FontSize`, `FontWeight`, `BorderRadius`, `Shadow`).
- Alias de import `@/` (ver `tsconfig.json`).
- Tipos centralizados en `types/index.ts`; endpoints en `constants/api.ts`.
- Estados de UI reutilizables: `LoadingState`, `EmptyState`, `ErrorState`, `ConfirmModal`, `SearchBar`.
- Feedback al usuario vía `useToast()`, no `Alert.alert` (salvo confirmaciones destructivas).
