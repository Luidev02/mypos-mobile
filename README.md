# MyPOS Mobile

Sistema de Punto de Venta móvil desarrollado con **React Native** y **Expo Router**.

## 🚀 Características

### ✅ Implementadas

- **Autenticación**
  - Login con email y contraseña
  - Gestión de tokens JWT
  - Almacenamiento seguro con AsyncStorage
  - Redirección automática en errores 401/403
  - Muestra información de empresa y rol

- **Punto de Venta (POS)**
  - Navegación por categorías
  - Búsqueda de productos en tiempo real
  - Carrito de compras con validación de stock
  - Gestión de cantidades
  - Cálculo automático de subtotal, IVA (19%) y total
  - Formato de moneda colombiana (COP)

- **Gestión de Pagos**
  - Método efectivo con cálculo de cambio
  - Método transferencia
  - Confirmación de venta
  - Generación de folio

- **Inventario**
  - Vista de stock en tiempo real
  - Filtro de stock bajo
  - Productos con alerta de stock crítico
  - Código de colores según nivel de stock

- **Reportes**
  - Ventas del día
  - Top productos más vendidos
  - Estadísticas de ingresos

- **Configuración**
  - Perfil de usuario con información de empresa
  - Muestra rol y plan de la empresa
  - Cerrar sesión

## 📦 Instalación

```bash
# Instalar dependencias
bun install

# Iniciar en desarrollo
bun start

# Android
bun run android

# iOS
bun run ios
```

## 🔧 Configuración

1. Copiar el archivo de ejemplo:
```bash
cp .env.example .env
```

2. Editar `.env` con la URL de tu servidor:

```env
EXPO_PUBLIC_API_URL=http://tu-servidor:3000
```

**Importante:** Si estás probando en un dispositivo físico, usa la IP local de tu máquina:
```env
EXPO_PUBLIC_API_URL=http://192.168.1.X:3000
```

## 📱 Estructura del Proyecto

```
mypos-mobile/
├── app/
│   ├── (tabs)/              # Pantallas principales
│   │   ├── index.tsx        # POS
│   │   ├── inventory.tsx    # Inventario
│   │   ├── reports.tsx      # Reportes
│   │   └── more.tsx         # Más opciones
│   ├── login.tsx            # Pantalla de login
│   ├── cart.tsx             # Carrito y pago
│   └── _layout.tsx          # Layout principal
├── constants/
│   ├── theme.ts             # Colores y estilos
│   └── api.ts               # Configuración API
├── contexts/
│   ├── AuthContext.tsx      # Contexto de autenticación
│   └── CartContext.tsx      # Contexto del carrito
├── services/
│   ├── api.ts               # Cliente HTTP (Axios)
│   ├── storage.ts           # AsyncStorage
│   └── index.ts             # Servicios de API
├── types/
│   └── index.ts             # Tipos TypeScript
└── utils/
    └── helpers.ts           # Funciones de utilidad
```

## 🎨 Paleta de Colores

```
Primary:    #583333 (Marrón clarito)
Success:    #22C55E (Verde)
Error:      #EF4444 (Rojo)
Warning:    #F59E0B (Naranja)
Background: #F8F8F8 (Gris claro)
```

## 🔐 Credenciales de Prueba

```
Email: admin@tecnostore.com
Contraseña: admin123
```

## 📡 API Endpoints

- **Auth:** `POST /api/auth/login`
  - Body: `{ username, password, ip_connection }`
  - Response: `{ status, message, token, info: {...} }`
  
- **POS:** 
  - `GET /api/pos/categories` - Categorías con productos
  - `GET /api/pos/products` - Productos activos
  - `POST /api/pos/sales` - Crear venta
  - `GET /api/pos/shifts/active` - Turno activo
  
- **Inventory:** 
  - `GET /api/inventory` - Stock general
  - `GET /api/inventory/low-stock` - Stock bajo
  
- **Reports:** 
  - `GET /api/reports/sales` - Reporte de ventas
  - `GET /api/reports/top-products` - Top productos

## 🎯 Estructura de Respuesta del Login

```json
{
  "status": 200,
  "message": "Login exitoso",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "info": {
    "id": 1,
    "email": "admin@tecnostore.com",
    "username": "Super Admin",
    "company_id": 1,
    "company_name": "TECNOSTORE COLOMBIA S.A.S.",
    "company_plan": "Premium",
    "role_name": "Administrador"
  }
}
```

## 🚧 Próximas Features

- [ ] Scanner de código de barras
- [ ] Gestión de turnos (abrir/cerrar caja)
- [ ] Gestión de clientes
- [ ] Aplicar descuentos y cupones
- [ ] Compartir ticket por WhatsApp
- [ ] Modo offline con sincronización
- [ ] Impresión Bluetooth
- [ ] Notificaciones push

## 📄 Licencia

Proyecto privado para MyPOS.

---

**Desarrollado con ❤️ usando React Native + Expo**
