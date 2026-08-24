# Estructura de Navegación y Rutas - MyPOS Mobile

## 📱 Estructura de Tabs Principal

La aplicación utiliza Expo Router con navegación por tabs:

### Tabs Visibles (Bottom Navigation)
1. **POS** (`index`) - Punto de venta principal (tab bar oculto)
2. **Inventario** (`inventory`) - Control de inventario y stock
3. **Reportes** (`reports`) - Reportes y estadísticas
4. **Más** (`more`) - Menú de opciones y módulos

### Pantallas Ocultas del Tab Bar
- **Hub** (`hub`) - Dashboard principal con grid de módulos

## 🗂️ Estructura de Carpetas Creada

```
app/
├── (tabs)/
│   ├── _layout.tsx          # Layout de tabs principal
│   ├── index.tsx            # POS (ya implementado)
│   ├── inventory.tsx        # Inventario (ya implementado)
│   ├── reports.tsx          # Reportes (ya implementado)
│   ├── more.tsx             # Menú más (actualizado con nuevas rutas)
│   └── hub.tsx              # Hub/Dashboard ✨ NUEVO
│
├── categories/
│   └── index.tsx            # Listado de categorías ✨ NUEVO
│
├── products/
│   └── index.tsx            # Catálogo de productos ✨ NUEVO
│
├── customers/
│   └── index.tsx            # Directorio de clientes ✨ NUEVO
│
├── sales/
│   └── index.tsx            # Historial de ventas ✨ NUEVO
│
├── warehouses/
│   └── index.tsx            # Gestión de bodegas ✨ NUEVO
│
├── taxes/
│   └── index.tsx            # Configuración de impuestos ✨ NUEVO
│
├── coupons/
│   └── index.tsx            # Gestión de cupones ✨ NUEVO
│
├── purchases/
│   └── index.tsx            # Registro de compras ✨ NUEVO
│
├── profile/
│   └── index.tsx            # Perfil de usuario ✨ NUEVO
│
└── company/
    └── index.tsx            # Configuración de empresa ✨ NUEVO
```

## 🎯 Rutas Disponibles

### Navegación Principal
- `/` o `/(tabs)` → POS (Punto de Venta)
- `/(tabs)/inventory` → Inventario
- `/(tabs)/reports` → Reportes
- `/(tabs)/more` → Menú Más
- `/(tabs)/hub` → Hub Principal

### Módulos de Gestión
- `/categories` → Categorías
- `/products` → Productos
- `/customers` → Clientes
- `/sales` → Ventas
- `/warehouses` → Bodegas
- `/taxes` → Impuestos
- `/coupons` → Cupones
- `/purchases` → Compras

### Configuración y Perfil
- `/profile` → Perfil de Usuario
- `/company` → Configuración de Empresa

## 📋 Rutas Pendientes por Crear

### Por cada módulo se necesitarán:

#### Categorías
- [ ] `/categories/new` - Crear categoría
- [ ] `/categories/[id]` - Detalle de categoría
- [ ] `/categories/edit/[id]` - Editar categoría

#### Productos
- [ ] `/products/new` - Crear producto
- [ ] `/products/[id]` - Detalle de producto
- [ ] `/products/edit/[id]` - Editar producto

#### Clientes
- [ ] `/customers/new` - Crear cliente
- [ ] `/customers/[id]` - Detalle de cliente
- [ ] `/customers/edit/[id]` - Editar cliente

#### Ventas
- [ ] `/sales/[id]` - Detalle de venta

#### Inventario
- [ ] `/inventory/low-stock` - Stock bajo
- [ ] `/inventory/adjust` - Ajustar inventario
- [ ] `/inventory/movements/[id]` - Kardex de producto

#### Bodegas
- [ ] `/warehouses/new` - Crear bodega
- [ ] `/warehouses/[id]` - Detalle de bodega
- [ ] `/warehouses/edit/[id]` - Editar bodega

#### Impuestos
- [ ] `/taxes/new` - Crear impuesto
- [ ] `/taxes/[id]` - Detalle de impuesto
- [ ] `/taxes/edit/[id]` - Editar impuesto

#### Cupones
- [ ] `/coupons/new` - Crear cupón
- [ ] `/coupons/[id]` - Detalle de cupón
- [ ] `/coupons/edit/[id]` - Editar cupón

#### Compras
- [ ] `/purchases/new` - Registrar compra
- [ ] `/purchases/[id]` - Detalle de compra
- [ ] `/purchases/edit/[id]` - Editar compra

## 🎨 Características del Hub

El Hub (`/hub`) es la pantalla central que muestra:
- **Saludo personalizado** según hora del día
- **Grid de módulos** con iconos coloridos
- **13 módulos disponibles**:
  1. Punto de Venta (Azul - Primary)
  2. Categorías (Rojo)
  3. Productos (Verde agua)
  4. Clientes (Azul claro)
  5. Ventas (Verde)
  6. Inventario (Amarillo)
  7. Bodegas (Gris claro)
  8. Impuestos (Rosa)
  9. Cupones (Morado claro)
  10. Compras (Morado)
  11. Reportes (Verde esmeralda)
  12. Perfil (Gris)
  13. Empresa (Negro)

## 🧭 Navegación desde "Más"

El menú "Más" actualizado incluye:
1. Hub Principal
2. Mi Perfil
3. Categorías
4. Productos
5. Clientes
6. Ventas
7. Bodegas
8. Impuestos
9. Cupones
10. Compras
11. Configuración de Empresa
12. Acerca de
13. Cerrar Sesión (botón rojo inferior)

## ✅ Estado Actual

### ✨ Completado
- [x] Estructura de tabs principal
- [x] Hub/Dashboard con grid de módulos
- [x] Menú "Más" con navegación completa
- [x] 10 pantallas index básicas creadas:
  - categories/index.tsx
  - products/index.tsx
  - customers/index.tsx
  - sales/index.tsx
  - warehouses/index.tsx
  - taxes/index.tsx
  - coupons/index.tsx
  - purchases/index.tsx
  - profile/index.tsx
  - company/index.tsx

### ⏳ Pendiente
- [ ] Pantallas de detalle ([id].tsx)
- [ ] Pantallas de formulario (new.tsx, edit/[id].tsx)
- [ ] Implementación de funcionalidad CRUD
- [ ] Conexión con APIs backend
- [ ] Componentes reutilizables (SearchBar, Cards, etc.)

## 🚀 Próximos Pasos

1. **Extender API endpoints** - Agregar todos los endpoints necesarios
2. **Extender tipos TypeScript** - Definir interfaces completas
3. **Extender servicios** - Implementar métodos CRUD
4. **Crear componentes reutilizables** - SearchBar, Cards, Badges, etc.
5. **Implementar módulos completos** - Comenzar con Categorías

---

**Fecha de creación:** Diciembre 17, 2025  
**Estado:** Estructura base completada ✅
