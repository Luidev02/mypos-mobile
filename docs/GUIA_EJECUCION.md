# 🚀 Guía de Ejecución - MyPOS Mobile

## 📋 Pre-requisitos

1. **Node.js** v18 o superior
2. **npm** o **yarn**
3. **Expo CLI** instalado globalmente
4. **Expo Go** app en tu dispositivo móvil (iOS/Android)

## 🔧 Instalación

### 1. Instalar dependencias

```bash
cd mypos-mobile
npm install
```

### 2. Instalar dependencias adicionales (si es necesario)

```bash
npx expo install @react-native-picker/picker expo-image-picker
```

## ▶️ Ejecutar la Aplicación

### Modo Desarrollo

```bash
npm start
# o
expo start
```

Esto abrirá Expo DevTools en tu navegador.

### Opciones de Ejecución

1. **En dispositivo físico:**
   - Escanea el código QR con la app **Expo Go**
   - Android: Escanea directamente desde Expo Go
   - iOS: Usa la cámara nativa para escanear

2. **En emulador Android:**
   ```bash
   npm run android
   ```

3. **En simulador iOS:**
   ```bash
   npm run ios
   ```

4. **En navegador web:**
   ```bash
   npm run web
   ```

## ⚙️ Configuración del Backend

### Actualizar la URL del API

Edita el archivo `constants/api.ts`:

```typescript
export const API_CONFIG = {
  BASE_URL: 'http://TU_IP:3000/api/v1', // Cambia por tu IP
  TIMEOUT: 30000,
};
```

**Importante:** 
- No uses `localhost` si vas a probar en dispositivo físico
- Usa tu IP local (ej: `192.168.1.100`)
- Asegúrate que el backend esté corriendo

## 📱 Primer Uso

### 1. Login
Usa las credenciales de tu backend:
```
Usuario: admin (o tu usuario)
Contraseña: tu contraseña
```

### 2. Abrir Turno
Antes de realizar ventas, debes abrir un turno:
1. Ve a "Turnos" en el menú
2. Tap en "Abrir Turno"
3. Ingresa el monto base en efectivo
4. Confirma

### 3. Realizar una Venta
1. Ve a la pantalla principal (POS)
2. Selecciona productos
3. Agrega al carrito
4. Procesa la venta

## 🧪 Testing

### Probar cada módulo:

1. **Productos** ✅
   - Crear producto con imagen
   - Editar información
   - Eliminar producto
   - Buscar productos

2. **Categorías** ✅
   - Crear categoría con imagen
   - Editar y eliminar
   - Buscar categorías

3. **Clientes** ✅
   - Registrar nuevo cliente
   - Editar información
   - Buscar clientes

4. **Ventas** ✅
   - Ver historial
   - Filtrar por fecha
   - Ver detalles

5. **Bodegas** ✅
   - Crear bodega
   - Editar información
   - Gestionar ubicaciones

6. **Impuestos** ✅
   - Crear impuesto
   - Configurar tasas
   - Aplicar a productos

7. **Turnos** ✅
   - Abrir turno
   - Realizar ventas
   - Cerrar con cuadre de caja

## 🐛 Troubleshooting

### Error de conexión al backend
```
Error: Network Error
```
**Solución:**
- Verifica que el backend esté corriendo
- Confirma la URL en `constants/api.ts`
- Asegúrate de estar en la misma red

### Error de permisos de cámara/galería
```
Error: Missing permissions
```
**Solución:**
```bash
npx expo install expo-image-picker
```
Acepta los permisos cuando la app los solicite

### Error al instalar dependencias
```bash
rm -rf node_modules package-lock.json
npm install
```

### Error de cache
```bash
npx expo start -c
```

## 📦 Build para Producción

### Android APK
```bash
eas build --platform android --profile preview
```

### iOS IPA
```bash
eas build --platform ios --profile preview
```

**Nota:** Requiere configurar EAS Build en `eas.json`

## 🔍 Debugging

### Abrir DevTools
- Sacude el dispositivo
- Presiona `d` en la terminal

### Ver logs
```bash
npx expo start --dev-client
```

### Redux DevTools (si aplica)
- Instala React Native Debugger
- Abre el debugger antes de iniciar la app

## 📊 Estructura de Datos

### Ejemplo de Producto
```typescript
{
  name: "Coca Cola",
  sku: "CC-355",
  barcode: "7894561230",
  category_id: 1,
  price: 2500,
  cost: 1500,
  stock: 100,
  tax_id: 1,
  is_active: true
}
```

### Ejemplo de Venta
```typescript
{
  shift_id: 1,
  customer_id: 1,
  payment_method: "cash",
  products: [
    {
      product_id: 1,
      quantity: 2,
      unit_price: 2500
    }
  ]
}
```

## 🎯 Checklist Pre-Producción

- [ ] Configurar URL de producción del backend
- [ ] Probar todos los flujos de usuario
- [ ] Verificar permisos de cámara/galería
- [ ] Testear en diferentes dispositivos
- [ ] Configurar manejo de errores
- [ ] Implementar analytics (opcional)
- [ ] Configurar push notifications (opcional)
- [ ] Optimizar imágenes y assets
- [ ] Configurar splash screen
- [ ] Configurar app icons

## 🆘 Soporte

Si encuentras algún problema:

1. Revisa la consola de Expo
2. Verifica los logs del backend
3. Consulta la documentación de Expo
4. Revisa el archivo `MOBILE_APP_COMPLETE.md`

## 🎉 ¡Listo!

La app está completamente funcional con:
- ✅ 10+ módulos implementados
- ✅ Sistema de toasts
- ✅ Modales y formularios
- ✅ CRUD completo
- ✅ Búsqueda y filtros
- ✅ Estados de carga/error
- ✅ Diseño profesional

**¡A vender! 🚀💰**
