# FASE 12 — Import / Export Excel

| Campo | Valor |
|---|---|
| Estado | Completada* |
| Depende de | FASE 03 |
| Bloquea a | — |
| Alcance | Plantillas, importación masiva y exportación de catálogo |

## Objetivo

Portar el módulo de importación/exportación del web, que no existe en móvil.
Es la fase con mayor diferencia de plataforma: el web usa `Blob`,
`URL.createObjectURL` y `<a download>`, nada de lo cual existe en React Native.

## Referencias del frontend web

- `JiroPOS-Frontend/src/pages/import-export/index.jsx` (343)
- `JiroPOS-Frontend/src/api/import-export.api.js`
- `JiroPOS-Frontend/src/component/General/ExcelPreview.jsx`
- `JiroPOS-Frontend/src/component/General/ImportResults.jsx`

## Endpoints

```
GET  /api/import-export/template/:entity     (blob xlsx)
POST /api/import-export/import/:entity       (multipart/form-data, campo "file")
GET  /api/import-export/export/:entity       (blob xlsx)
```

Entidades soportadas: `products`, `categories`, `taxes`.

Respuesta de importación: `{ ok, message, data: { created, updated, errors } }`, donde
cada `errors[i]` es `{ row: number | string, field: string, message: string }`
(confirmado leyendo `import.service.js` completo — la forma documentada arriba
solo tenía `row`/`message`, faltaba `field`). Status HTTP: `422` si
`errors.length > 0 && created === 0 && updated === 0` (fallo total), `200` en
cualquier otro caso (éxito total o parcial con errores). El gate de permiso es
uno solo para las 3 rutas y las 3 entidades: `RolMiddleware(['view_products'])`
en `routes/index.route.js` — no hay permisos separados por entidad.

## Adaptación a React Native

| Web | Móvil |
|---|---|
| `responseType: 'blob'` | `expo-file-system` (`downloadAsync` / escritura en cache) |
| `URL.createObjectURL` + `<a download>` | `expo-sharing.shareAsync()` |
| `<input type="file">` | `expo-document-picker` (**añadir dependencia**) |
| Vista previa con `xlsx` | Previsualizar en servidor o mostrar solo el resumen |

## Tareas

- [x] Añadir `expo-document-picker` a las dependencias (`expo-sharing` ya se
      había añadido en FASE 10 y se reutiliza acá).
- [x] `services/importExport.ts` con `downloadTemplate`, `importFile`, `exportData`.
- [x] Pantalla `app/import-export.tsx` con selector de entidad (archivo único,
      no carpeta — no hay subrutas que justifiquen `app/import-export/index.tsx`,
      mismo criterio que `app/shifts.tsx`). Se agregó su tile "Importar/Exportar"
      a los dos hubs (`app/(tabs)/index.tsx` y `app/(tabs)/more.tsx`), gateado
      por `view_products` — confirmado que el propio `BtnHub.jsx` del web
      también lo gatea así y con ese mismo permiso.
- [x] Descargar plantilla → guardar en `Paths.cache` y compartir el `.xlsx`
      (mismo patrón `File`+`Sharing.shareAsync()` de FASE 10).
- [x] Seleccionar fichero del dispositivo (`expo-document-picker`, filtrado a
      mimetypes xlsx/xls) y subirlo como `FormData` con campo `file`.
- [x] Pantalla de resultados: banner ✅/⚠️/❌, grid Creados/Actualizados/Errores,
      tabla colapsable de errores por fila (Fila · Campo · Mensaje) — réplica
      de `ImportResults.jsx`.
- [x] Exportar datos actuales → guardar y compartir.
- [x] Indicador de progreso (spinner in-button) durante descarga/importación/exportación.
- [x] Decisión sobre `ExcelPreview.jsx`: **se omite en móvil**. Es una
      previsualización 100% cliente (parsea el xlsx con la librería `xlsx` antes
      de subirlo) que no aporta corrección — el backend ya valida fila por fila
      y el resultado con errores detallados se muestra igual después de
      importar. Añadir `xlsx` de vuelta solo para esto no se justifica: haría
      doble el trabajo que ya hace el import real, con un archivo grande
      (paquete `xlsx` completo) por un beneficio puramente cosmético. El propio
      criterio de la fase (arriba) permite documentar esto como omitido.
- [x] "Descargar reporte de errores" de `ImportResults.jsx` (que en el web
      genera un `.xlsx` nuevo client-side con `xlsx`/SheetJS): en móvil se
      resolvió con `Share.share({message})` en texto plano (fila, campo,
      mensaje) en vez de escribir un `.xlsx` — mismo patrón ya usado en
      `app/sales/[id].tsx` para compartir el detalle de una venta. Evita
      instalar `xlsx` (paquete pesado, sin uso en ningún otro lado de la app
      móvil) solo para un reporte de errores que ya se ve completo en pantalla.

## Criterios de aceptación

- Descargar la plantilla de productos y abrirla desde el móvil.
- Importar un fichero con filas válidas e inválidas: las válidas se crean y las
  inválidas se listan con su motivo.
- Exportar productos genera un `.xlsx` con los mismos datos que el export del web.

## Verificación

- `npx tsc --noEmit` → 0 errores.
- `npx expo export --platform web` → build limpio, 48 rutas estáticas
  generadas incluyendo `/import-export` (36 kB).
- Contrato de API verificado leyendo el backend completo (no solo el web):
  `import-export.route.js`, `import-export.controller.js` e
  `import.service.js` (grep de cada `errors.push(...)` en las 3 funciones de
  importación) — confirmó la forma real `{row, field, message}` y los códigos
  de estado 200/422, evitando repetir el patrón de este proyecto de construir
  sobre una forma de respuesta asumida/incorrecta.
- No se pudo probar en un dispositivo/emulador real (selección de archivo,
  compartir, permisos del sistema operativo) — solo verificación estática
  (tipos + build). Queda pendiente de una prueba manual en dispositivo antes
  de considerar el flujo 100% verificado end-to-end.
- Pendiente real, no de esta fase: la vista de importación no diferencia
  "archivo rechazado por `fileFilter`" (mimetype inválido, respondería 400 con
  `err.message` de multer) de otros errores de red — ambos caen en el mismo
  `toast.error(e.response?.data?.message || '...')`, igual que el resto de
  pantallas de esta app; no se trató como caso especial porque el mensaje de
  multer ya es suficientemente claro para el usuario.

\* "Completada" en el sentido de este tablero: implementación + verificación
estática completas. La prueba manual en dispositivo físico/emulador (selección
real de archivo, permisos del SO, apertura del share sheet) no se ejecutó en
esta sesión.
