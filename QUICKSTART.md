# 🚀 Inicio Rápido - MyPOS Mobile

## ⚡ Setup Inicial (5 minutos)

### 1. Configurar Variables de Entorno

```bash
# Copiar el archivo de ejemplo
cp .env.example .env

# Editar .env con tu URL de backend
# Para desarrollo local:
EXPO_PUBLIC_API_URL=http://localhost:3000

# Para dispositivo físico (usar IP de tu PC):
EXPO_PUBLIC_API_URL=http://192.168.1.XXX:3000
```

### 2. Instalar y Ejecutar

```bash
# Ya tienes las dependencias instaladas
bun start
```

### 3. Opciones de Ejecución

- **Presiona `a`** - Abrir en Android
- **Presiona `i`** - Abrir en iOS
- **Presiona `w`** - Abrir en web

### 4. Login

```
Email: admin@tecnostore.com
Contraseña: admin123
```

---

## 📱 Guía de Uso

### Pantalla Principal (POS)

1. **Seleccionar Categoría** - Tap en las categorías horizontales
2. **Buscar Producto** - Usar la barra de búsqueda
3. **Agregar al Carrito** - Tap en cualquier producto
4. **Ver Carrito** - Tap en el botón flotante inferior

### Realizar una Venta

1. Agregar productos al carrito
2. Tap en "Ver Carrito"
3. Ajustar cantidades con +/-
4. Tap en "Procesar Pago"
5. Seleccionar método (Efectivo/Transferencia)
6. Si es efectivo, ingresar monto recibido
7. Confirmar venta

### Inventario

- **Ver Todo** - Botón "Todos"
- **Stock Bajo** - Botón "Stock Bajo" (⚠️)
- Colores automáticos según nivel de stock:
  - 🟢 Verde: Stock alto
  - 🔵 Azul: Stock medio
  - 🟠 Naranja: Stock bajo (≤ 5)
  - 🔴 Rojo: Agotado (0)

### Reportes

- Ventas del día
- Top 5 productos más vendidos
- Pull to refresh para actualizar

---

## 🎨 Características Destacadas

### ✨ Formato de Moneda
- Automático en COP (Peso Colombiano)
- Sin decimales
- Ejemplo: `$15.000` en lugar de `$15000`

### 🎯 Validación de Stock
- No permite agregar más productos que stock disponible
- Alertas visuales de stock bajo
- Colores dinámicos según disponibilidad

### 💳 Cálculo Automático
- Subtotal calculado en tiempo real
- IVA 19% automático
- Cambio calculado para pagos en efectivo

### 👤 Información de Usuario
- Nombre completo
- Email
- Empresa y plan
- Rol del usuario

---

## 🔧 Troubleshooting

### No se conecta al backend

1. Verifica que el backend esté corriendo
2. Verifica la URL en `.env`
3. Si usas dispositivo físico, usa la IP local (no localhost)
4. Reinicia la app con `r` en la terminal de Expo

### Error de autenticación

1. Verifica las credenciales
2. Revisa que el endpoint `/api/auth/login` responda
3. Verifica que el token se guarde correctamente

### Productos no cargan

1. Verifica que haya categorías con productos
2. Revisa el endpoint `/api/pos/categories`
3. Pull to refresh en la pantalla

---

## 📊 Flujo de Datos

```
Login → AuthContext → AsyncStorage
  ↓
POS Screen → API → Categorías/Productos
  ↓
CartContext → Agregar Productos
  ↓
Cart Screen → Procesar Pago → API
  ↓
Venta Confirmada → Limpiar Carrito
```

---

## 🎯 Próximos Pasos

- [ ] Implementar gestión de turnos
- [ ] Agregar scanner de código de barras
- [ ] Compartir ticket por WhatsApp
- [ ] Modo offline básico
- [ ] Configuración de impresora térmica

---

**¿Necesitas ayuda?** Revisa el `README.md` principal o contacta al equipo de desarrollo.

---

**Versión:** 1.0.0  
**Última actualización:** Diciembre 2025
