// Auth Types
export interface User {
  id: number;
  email: string;
  username: string;
  company_id: number;
  company_name: string;
  company_plan: string;
  role_name: string;
}

export interface LoginRequest {
  username: string;
  password: string;
  /** @deprecated El backend usa `req.ip`; se mantiene opcional por clientes viejos. */
  ip_connection?: string;
}

export interface LoginResponse {
  status: number;
  message: string;
  token: string;
  /** Refresh token opaco. 30 días en móvil, 7 en web. */
  refreshToken?: string;
  /** Segundos de vida del access token (900 = 15 min). */
  expiresIn?: number;
  info: User;
}

// Product Types
export interface Product {
  id: number;
  name: string;
  sku: string;
  barcode?: string;
  category_id: number;
  price: number;
  cost: number;
  stock?: number;
  stock_alert?: number;
  tax_id: number;
  is_active: boolean;
  image_url?: string;
  /**
   * 'variable' = el stock puede quedar en negativo (carnicería, fruver…).
   * El backend solo permite venta por debajo de cero en este caso.
   */
  stock_type?: 'fixed' | 'variable';
  /** 1/0 derivado por el backend: unidad de medida distinta de "Unidad". */
  is_weighable?: number | boolean;
  unit_measure_id?: number;
  /** Código DIAN: '94' (und), 'KGM', 'LBR', 'GLL'. */
  unit_measure_code?: string;
  unit_measure_name?: string;
}

export interface Category {
  id: number;
  name: string;
  image?: string;
  image_url?: string;
  products?: Product[];
}

// Customer Types
/** `ident_type` real de la BD (`customers.ident_type`): no incluye 'TI'. */
export type CustomerIdentType = 'CC' | 'NIT' | 'CE' | 'PASAPORTE';

export interface Customer {
  id: number;
  name: string;
  ident: string;
  ident_type: CustomerIdentType;
  /** Dígito de verificación — solo aplica/se pide si `ident_type === 'NIT'`. */
  dv?: string;
  email?: string;
  phone?: string;
  address?: string;
  is_company?: number;
  requires_electronic_invoice?: boolean | number;
  municipality_id?: number;
  municipality_name?: string;
  municipality_department?: string;
  status: 'active' | 'suspend' | 'disable';
}

export interface CreateCustomerRequest {
  name: string;
  ident: string;
  ident_type: CustomerIdentType;
  dv?: string;
  phone?: string;
  email?: string;
  address?: string;
  is_company?: number;
  requires_electronic_invoice?: boolean;
  municipality_id?: number | null;
  status?: 'active' | 'suspend' | 'disable';
}

// Coupon Types
export interface Coupon {
  id: number;
  code: string;
  name?: string;
  description?: string;
  discount: number; // Porcentaje o valor fijo
  discount_type?: 'percentage' | 'fixed';
  is_active: boolean;
  valid_until?: string;
  usage_limit?: number;
  current_usage?: number;
}

// Pause Order Types
export interface PauseOrderRequest {
  customer_id: number;
  customer_name: string;
  order_number: string;
  sale_type?: string;
  coupon_id?: number | null;
  discount_percentage: number;
  subtotal: number;
  discount: number;
  tax_total: number;
  total: number;
  products: {
    id: number;
    price: number;
    quantity: number;
    discount: number;
  }[];
}

// Cart Types
export interface CartItem {
  product_id: number;
  product: Product;
  quantity: number;
  unit_price: number;
  discount: number;
  subtotal: number;
}

// Sale Types
export interface SaleItem {
  product_id: number;
  quantity: number;
  price: number; // Changed from unit_price to match backend
  tax_rate: number; // Tasa de IVA (19 para Colombia)
  discount: number;
  is_inventory_managed: boolean; // Indica si se descuenta del inventario
}

export interface CreateSaleRequest {
  shift_id: number; // Requerido - ID del turno activo
  customer_id: number;
  customer_name?: string;
  sale_type?: string; // carry, delivery, dine_in
  payment_method: 'cash' | 'transfer';
  coupon_id?: number | null;
  discount_percentage?: number;
  subtotal?: number;
  total?: number;
  amount_received?: number;
  change_amount?: number;
  products: Array<{
    product_id: number;
    quantity: number;
    unit_price: number;
    discount?: number;
  }>;
}

export interface Sale {
  id: number;
  sale_id?: number; // Alias de id
  invoice_number?: string;
  folio?: string; // Alias de invoice_number
  customer_id?: number;
  customer_name?: string;
  customer_phone?: string;
  subtotal: number;
  tax: number;
  tax_amount?: number; // Alias de tax
  discount: number;
  discount_amount?: number; // Nombre real que usa `GET /api/sales`
  total: number;
  total_amount?: number; // Alias de total
  change?: number;
  payment_method: string;
  status?: string;
  invoice_url?: string;
  created_at: string;
  items_count?: number;
  items?: SaleItem[];
  /** Ganancia de la venta — `SUM((price - unit_cost) * quantity)` de sus líneas. */
  profit_total?: number;
  warehouse_id?: number;
  warehouse_name?: string;
  created_by_name?: string;
  // Campos DIAN — `GET /api/sales` y `GET /api/sales/:id` los devuelven igual;
  // `dian_status` siempre viene presente (default `'not_applicable'`, nunca undefined).
  dian_status?: DianStatus;
  cufe?: string | null;
  dian_pdf_url?: string | null;
  dian_response_message?: string | null;
  sale_type?: string; // carry, delivery, dine_in — presente en órdenes pausadas/retomadas
  coupon_id?: number | null;
}

// Shift Types
/**
 * Desglose de ventas por método de pago para un turno cerrado
 * (`shifts.repository.js#getShiftSalesSummary`, adjunto por
 * `GET /api/shifts/history/me` en cada turno cerrado).
 *
 * OJO: `total_profit` acá (y el `shift.total_profit` de nivel superior, la
 * columna `cash_shifts.total_profit`) suma la ganancia de TODAS las ventas del
 * turno sin importar el método de pago — es el mismo bug que describe
 * `CIERRE_CAJA_FIX.md` del backend, cuyo fix quedó aplicado solo en esta
 * consulta de solo-lectura y nunca se corrigió en `incrementShiftProfit`
 * (el acumulador real que escribe `cash_shifts.total_profit` en cada venta).
 * Por eso la UI de turnos usa `cash_profit` (ganancia de solo las ventas en
 * efectivo) para "Ganancia", no `total_profit` — es el número que sí es
 * correcto para el arqueo de caja.
 */
export interface ShiftSalesSummary {
  total_sales: number;
  total_amount: number;
  cash_sales: number;
  card_sales: number;
  transfer_sales: number;
  credit_sales: number;
  total_profit: number;
  cash_profit: number;
  card_profit: number;
  transfer_profit: number;
  credit_profit: number;
}

export interface Shift {
  id: number;
  user_id: number;
  cash_register_id: number;
  cash_register_name?: string;
  cash_register_code?: string;
  warehouse_id: number; // Requerido para las ventas
  warehouse_name?: string;
  base_amount: number; // Changed from opening_amount
  final_cash_expected?: number;
  final_cash_real?: number;
  difference?: number;
  start_time: string; // Changed from opened_at
  end_time?: string; // Changed from closed_at
  opened_at?: string; // Mantener compatibilidad
  closed_at?: string; // Mantener compatibilidad
  status: 'open' | 'closed';
  notes?: string;
  hours_worked?: number;
  /** Solo presente en turnos cerrados devueltos por `GET /api/shifts/history/me`. */
  total_profit?: number;
  sales_summary?: ShiftSalesSummary;
}

export interface OpenShiftRequest {
  cash_register_id: number;
  base_amount: number;
}

export interface CloseShiftRequest {
  final_cash_real: number;
  notes?: string;
}

// Cash Register Types — `cash_registers` no tiene `description` ni `created_at`
// (confirmado en el schema); el listado del POS (`getCashRegisters`) solo
// devuelve id/name/code/is_active, el detalle (`getCashRegisterById`) además
// trae `warehouse_id`/`warehouse_name` por el JOIN con `warehouses`.
export interface CashRegister {
  id: number;
  name: string;
  code: string;
  is_active: boolean;
  warehouse_id?: number;
  warehouse_name?: string;
}

export interface CreateCashRegisterRequest {
  name: string;
  code: string;
  is_active?: boolean;
}

export interface UpdateCashRegisterRequest {
  name: string;
  code: string;
  is_active?: boolean;
}

// `GET /api/company/plan/usage` — verificado contra `plans.config.js` real.
export interface PlanUsage {
  plan: string;
  planConfig: {
    id?: string;
    name?: string;
    priceMonthly?: number;
    maxUsers?: number;
    initialDianInvoices?: number;
    inventoryLevel?: string;
    multiCash?: boolean;
    multiBranch?: boolean;
    analytics?: boolean;
    supportLevel?: string;
    [key: string]: any;
  };
  dian?: {
    quota: number;
    used: number;
    remaining: number;
    blocked: boolean;
  } | null;
}

// Inventory Types
export interface InventoryItem {
  product_id: number;
  warehouse_id: number;
  quantity: number;
  product_title?: string;
  sku?: string;
  barcode?: string;
  stock_alert?: number;
  location_in_warehouse?: string;
  // Propiedades opcionales para compatibilidad
  product?: Product;
  stock?: number;
  last_updated?: string;
}

export interface InventoryMovement {
  id: number;
  product_id: number;
  type: 'in' | 'out' | 'adjust';
  quantity: number;
  reason: string;
  created_at: string;
}

// Report Types
// Reportes — verificado contra `reports.repository.js`. El backend solo
// implementa 4 tipos (`sales`, `inventory`, `purchases`, `top-products`);
// cualquier otro `type` responde 400 "Tipo de reporte inválido". Cada fila
// es un registro plano (una orden, un producto...), nunca un agregado — el
// resumen se calcula en el cliente (ver `calculateSalesSummary`).

// GET /api/reports/sales — una fila por venta.
export interface SalesReportRow {
  id: number;
  invoice_number: string;
  date: string;
  customer_name?: string;
  customer_ident?: string;
  seller?: string;
  subtotal: number;
  discount: number;
  tax_total: number;
  total: number;
  payment_method: string;
  status: string;
}

// GET /api/reports/top-products — el backend ignora `limit`, siempre trae
// hasta 50 filas (`LIMIT 50` fijo en el SQL).
export interface TopProductRow {
  id: number;
  sku: string;
  title: string;
  price: number;
  category?: string;
  total_sold: number;
  total_revenue: number;
  order_count: number;
}

// GET /api/reports/inventory
export interface InventoryReportRow {
  id: number;
  sku: string;
  title: string;
  barcode?: string;
  category?: string;
  cost: number;
  price: number;
  stock_alert: number;
  warehouse: string;
  quantity: number;
  reserved: number;
  available: number;
  inventory_value: number;
  status: string;
}

export interface SalesReportSummary {
  totalVentas: number;
  subtotal: number;
  descuentos: number;
  impuestos: number;
  total: number;
}

// Extended Category Types
export interface CategoryDetailed extends Category {
  company_id?: number;
  image?: string;
  creation_date?: string;
  updated_at?: string;
}

export interface CreateCategoryRequest {
  name: string;
  image?: File | any; // FormData
}

export interface UpdateCategoryRequest extends CreateCategoryRequest {
  id: number;
}

// Extended Product Types
export interface ProductDetailed extends Product {
  title?: string; // Alias de name
  description?: string;
  category_name?: string;
  tax_name?: string;
  tax_rate?: number;
  stock?: number;
  quantity?: number; // Alias de stock
  stock_alert?: number;
  is_inventory_managed?: boolean;
  status?: 'active' | 'inactive';
  discount?: number;
  image?: string;
}

export interface CreateProductRequest {
  sku: string;
  title: string;
  description?: string;
  category_id: number;
  tax_id: number;
  cost: number;
  price: number;
  discount?: number;
  stock_alert?: number;
  barcode?: string;
  image?: File | any; // FormData
  is_inventory_managed?: boolean;
  status?: 'active' | 'inactive';
  /** id en ref_measurement_units — 70 = Unidad. Define si el producto es pesable. */
  unit_measure_id?: number;
  /** 'variable' permite vender aunque el stock quede en negativo (carnicería, fruver). */
  stock_type?: 'fixed' | 'variable';
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  id: number;
}

// Extended Customer Types
// `getAllCustomers`/`getCustomerById` no traen fecha de creación ni
// totales de compras — el propio `customers/detail.jsx` del web tampoco
// los muestra, así que no se inventan aquí.
export type CustomerDetailed = Customer;

export interface UpdateCustomerRequest extends Partial<CreateCustomerRequest> {
  id: number;
}

// Extended Sale Types
export interface SaleDetailed extends Sale {
  customer_identification?: string;
  customer_ident_type?: string;
  customer_email?: string;
  customer_address?: string;
  // Resolución de facturación (`invoicing_resolutions`, vía JOIN) — solo
  // relevante cuando `dian_status === 'not_applicable'` (factura POS, no
  // electrónica): es la autorización de numeración, no un estado DIAN.
  resolution_auth_number?: string;
  resolution_prefix?: string;
  resolution_from?: number;
  resolution_to?: number;
  resolution_type?: string;
  company_name?: string;
  company_trade_name?: string;
  company_nit?: string;
  company_dv?: string;
  items: SaleItemDetailed[];
}

// `GET /api/dian/status/:orderId` — respuesta cruda (bypassa ResponseHandler),
// solo trae el núcleo DIAN, no toda la venta.
export interface DianStatusResponse {
  id: number;
  cufe: string | null;
  dian_pdf_url: string | null;
  dian_status: DianStatus;
  dian_response_message: string | null;
}

// `POST /api/dian/retry/:orderId` — también cruda: `{ ok:true, data: {...} }`
// en éxito de transporte, o `{ ok:false, message }` en error. `data.ok` es el
// resultado real del reintento — si el pedido no estaba en un estado
// reintentable (`not_sent`/`rejected`), `data.ok` es `false` con `data.error`
// explicando por qué, sin `data.result`.
export interface DianRetryResponse {
  ok: boolean;
  message?: string;
  data?: {
    ok: boolean;
    result?: {
      dian_status: DianStatus;
      cufe: string | null;
      dian_response_message: string | null;
    };
    error?: string;
  };
}

export interface SaleItemDetailed extends SaleItem {
  product_name?: string;
  sku?: string;
  subtotal?: number;
  tax?: number;
  tax_amount?: number;
  tax_name?: string;
  unit_cost?: number;
  /** Ganancia de la línea — `(price - unit_cost) * quantity`. */
  profit_total?: number;
}

// Warehouse Types
export interface Warehouse {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  employee_name?: string;
  is_active: boolean;
  created_at?: string;
}

export interface CreateWarehouseRequest {
  name: string;
  address?: string;
  phone?: string;
  employee_name?: string;
  is_active?: boolean;
}

export interface UpdateWarehouseRequest extends Partial<CreateWarehouseRequest> {
  id: number;
}

export interface WarehouseStock {
  product_id: number;
  product_title: string;
  sku: string;
  barcode?: string;
  warehouse_id: number;
  quantity: number;
  location_in_warehouse?: string;
  stock_alert?: number;
  unit_measure_id?: number;
  unit_measure_code?: string;
  unit_measure_name?: string;
  is_weighable?: number | boolean;
}

// Shape real de `getLowStockProducts` (product_stock.repository.js)
export interface LowStockItem {
  id: number;
  title: string;
  sku: string;
  stock_alert: number;
  warehouse_id: number;
  warehouse_name: string;
  quantity: number;
}

// Tax Types
export interface Tax {
  id: number;
  name: string;
  rate: number; // Porcentaje
  type?: 'IVA' | 'INC' | 'EXENTO';
  created_at?: string;
}

export interface CreateTaxRequest {
  name: string;
  rate: number;
  type?: 'IVA' | 'INC' | 'EXENTO';
}

export interface UpdateTaxRequest extends Partial<CreateTaxRequest> {
  id: number;
}

// Extended Coupon Types
export interface CouponDetailed extends Coupon {
  created_at?: string;
  updated_at?: string;
}

export interface CreateCouponRequest {
  code: string;
  name?: string;
  discount: number;
  usage_limit: number;
  valid_until: string; // MySQL datetime format
  is_active?: boolean;
}

export interface UpdateCouponRequest extends Partial<CreateCouponRequest> {
  id: number;
}

// Purchase Types — verificado contra `purchases.repository.js` y el schema
// real (`purchases`/`purchase_details` en mypos2v4.sql). El enum de estado
// real es `ordered|received|cancelled` — ni el web (`pending|completed`) ni
// los tipos previos de móvil (`pending|completed`) coincidían con la BD.
export type PurchaseStatus = 'ordered' | 'received' | 'cancelled';

export interface Purchase {
  id: number;
  supplier_id: number;
  supplier_name?: string;
  supplier_nit?: string;
  user_id?: number;
  user_name?: string;
  warehouse_id: number;
  warehouse_name?: string;
  /** Nombre real de columna — no `invoice_number` (así lo usa mal el propio web en el listado). */
  invoice_number_supplier?: string;
  purchase_date: string;
  /** Nombre real de columna — no `total_amount`/`total_cost` (así los usan mal móvil/web). */
  total: number;
  status: PurchaseStatus;
  created_at?: string;
  notes?: string;
}

/** Línea tal como la devuelve `GET /api/purchases/:id` — no lo que se envía al crear. */
export interface PurchaseItemDetailed {
  id: number;
  purchase_id: number;
  product_id: number;
  /** No `product_name` (así lee mal el propio `detail.jsx` del web) — la columna real es `title`, aliada `product_title`. */
  product_title?: string;
  sku?: string;
  quantity: number;
  unit_cost: number;
  subtotal: number;
}

export interface PurchaseDetailed extends Purchase {
  items: PurchaseItemDetailed[];
}

/** Línea para crear una compra — el backend solo lee estos 3 campos por ítem. */
export interface CreatePurchaseItem {
  product_id: number;
  quantity: number;
  unit_cost: number;
}

export interface CreatePurchaseRequest {
  supplier_id: number;
  warehouse_id: number;
  invoice_number_supplier?: string;
  purchase_date: string;
  /** El backend defaultea a `'received'` si se omite. */
  status?: PurchaseStatus;
  items: CreatePurchaseItem[];
}

// `PUT /api/purchases/:id` — el backend NO admite actualizar `items` por
// esta vía (`purchasesRepository.updatePurchase` nunca toca `purchase_details`).
export interface UpdatePurchaseRequest {
  supplier_id?: number;
  warehouse_id?: number;
  invoice_number_supplier?: string;
  purchase_date?: string;
  total?: number;
  status?: PurchaseStatus;
}

// Inventory Adjustment Types
export interface InventoryAdjustment {
  id: number;
  product_id: number;
  warehouse_id: number;
  quantity: number; // Positivo (entrada) o negativo (salida)
  type: 'adjustment' | 'entry' | 'exit';
  reason?: string;
  notes?: string;
  created_at?: string;
  created_by?: string;
}

/**
 * Tipos de movimiento que `inventory.service.js` realmente reconoce en
 * `POST /api/inventory/adjust`. El backend decide sumar o restar SOLO por el
 * valor de `type` (ignora el signo de `quantity`, siempre usa `Math.abs`):
 * `return` resta, cualquier otro valor ('adjustment', 'damage'...) suma.
 * Son los 3 mismos que expone `inventory/adjust.jsx` en el web.
 */
export type InventoryAdjustmentType = 'adjustment' | 'damage' | 'return';

export interface CreateInventoryAdjustmentRequest {
  product_id: number;
  warehouse_id: number;
  /** Con signo tal como lo digita el usuario — el backend hace `Math.abs()`
   *  y decide sumar/restar únicamente según `type`, no según este signo. */
  quantity: number;
  type: InventoryAdjustmentType;
  notes: string;
}

// Shape real de `im.*` (inventory_movements.repository.js) + los joins de
// `getProductMovements`/`getWarehouseMovements`.
export interface ProductMovement {
  id: number;
  product_id: number;
  warehouse_id: number;
  type: 'ADJUSTMENT' | 'SALE' | 'PURCHASE' | 'TRANSFER' | 'RETURN' | 'DAMAGE' | string;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reference_id?: number;
  reference_type?: string;
  total_cost?: number;
  notes?: string;
  created_at: string;
  user_name?: string;
  warehouse_name?: string;
  product_title?: string;
  sku?: string;
  unit_measure_id?: number;
  unit_measure_code?: string;
  unit_measure_name?: string;
  is_weighable?: number | boolean;
}

// `group_by`/`product_id` no los lee ningún reporte real del backend — se
// omiten (el propio web los manda sin que tengan efecto alguno).
export interface ReportFilters {
  start_date?: string;
  end_date?: string;
  warehouse_id?: number;
  category_id?: number;
  supplier_id?: number;
  status?: string;
  low_stock?: boolean;
}

// Profile Types — shape real de GET /api/profile (profile.repository.js)
export interface UserProfile {
  id: number;
  username: string;
  email: string;
  pin_code?: string;
  status: 'active' | 'inactive';
  creation_date?: string;
  company_id?: number;
  company_name?: string;
  role_id?: number;
  role_name?: string;
  theme_palette?: string;
  theme_mode?: 'light' | 'dark';
}

export interface UpdateProfileRequest {
  username?: string;
  email?: string;
  pin_code?: string;
  theme_palette?: string;
  theme_mode?: 'light' | 'dark';
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

// Company Types — verificado contra `company.repository.js`. No existen
// `api_client_id`/`api_client_secret` en la tabla `company` en absoluto (esa
// era una función muerta del propio web, `formApi`/`handleSubmitApi`, nunca
// conectada a ningún botón — no se porta).
export interface Company {
  id: number;
  nit?: string;
  dv?: string;
  name: string; // Razón social
  trade_name?: string; // Nombre comercial
  address?: string;
  city?: string;
  department?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo_url?: string;
  regimen_type?: 'responsable_iva' | 'no_responsable_iva' | 'simple_tributacion';
  currency?: 'COP' | 'USD' | 'EUR';
  plan?: string;
  /** Si la empresa reporta a la DIAN — decide factura POS vs. electrónica. */
  report_dian?: 'YES' | 'NO';
  is_active?: boolean;
  api_environment?: 'TEST' | 'PRODUCTION';
  creation_date?: string;
  dian_invoices_quota?: number;
  dian_invoices_used?: number;
}

// `PUT /api/company` solo admite estos campos (whitelist real del backend) —
// y responde `data: null`, no la empresa actualizada (hay que volver a pedir
// `GET /api/company` tras guardar, igual que con el perfil).
export interface UpdateCompanyRequest {
  name?: string;
  trade_name?: string;
  address?: string;
  city?: string;
  department?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo_url?: string;
  regimen_type?: Company['regimen_type'];
  currency?: Company['currency'];
  report_dian?: 'YES' | 'NO';
}

// Role & Permission Types
// Verificado contra `permissions.repository.js` — el campo real es
// `permission_name`, no `name`; no existe ningún flag `is_granted` por
// permiso (pertenecer o no a `role.permissions` ES el flag).
export interface Permission {
  id: number;
  permission_name: string;
  description?: string;
}

// Verificado contra `roles.repository.js`. OJO: `GET /api/roles` (listado)
// **nunca** incluye `permissions` — solo `permissions_count`. El arreglo
// `permissions` solo viene en `GET /api/roles/:id` (detalle). Cualquier
// pantalla que edite permisos debe pedir el detalle primero, no asumir que
// el objeto de la lista ya los trae (si no, guardar pisa los permisos reales
// con un arreglo vacío).
export interface Role {
  id: number;
  company_id?: number | null;
  role_name: string;
  /** 1 = activo, 0 = inactivo — no es booleano en la BD. */
  status: number;
  users_count?: number;
  permissions_count?: number;
  /** Roles base del sistema (`company_id IS NULL`) — no se pueden editar ni borrar. */
  is_system_role?: boolean;
  /** Solo presente en el detalle (`GET /api/roles/:id`), nunca en el listado. */
  permissions?: Permission[];
}

export interface CreateRoleRequest {
  role_name: string;
  status?: number;
  /** IDs de permisos — el backend los admite inline solo al crear. */
  permissions?: number[];
}

// `PUT /api/roles/:id` solo actualiza `role_name`/`status` — los permisos
// se guardan aparte vía `PUT /api/roles/:id/permissions` (ver `RoleService`).
export interface UpdateRoleRequest {
  role_name?: string;
  status?: number;
}

// User Management Types — verificado contra `users.repository.js`.
export interface UserManagement {
  id: number;
  username: string;
  email: string;
  role_id: number;
  role_name?: string;
  warehouse_id?: number;
  warehouse_name?: string;
  /** String, no booleano — no existe `is_active` en la respuesta real. */
  status: 'active' | 'inactive';
  creation_date?: string;
  pin_code?: string;
  company_name?: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  role_id: number;
  warehouse_id?: number;
  pin_code?: string;
  status?: 'active' | 'inactive';
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  /** Opcional — si se omite/deja vacío, el backend conserva la contraseña actual. */
  password?: string;
  role_id?: number;
  warehouse_id?: number;
  pin_code?: string;
  status?: 'active' | 'inactive';
}

// Integration Types
export interface Integration {
  id: number;
  name: string;
  type: string; // siigo, alegra, etc.
  is_active: boolean;
  config: {
    username?: string;
    access_key?: string;
    environment?: 'production' | 'sandbox';
    [key: string]: any;
  };
  last_sync?: string;
  created_at?: string;
}

export interface CreateIntegrationRequest {
  name: string;
  type: string;
  config: {
    username?: string;
    access_key?: string;
    environment?: 'production' | 'sandbox';
    [key: string]: any;
  };
}

export interface UpdateIntegrationRequest extends Partial<CreateIntegrationRequest> {
  id: number;
}

export interface IntegrationLog {
  id: number;
  integration_id: number;
  type: 'sync' | 'error' | 'test';
  message: string;
  details?: any;
  created_at: string;
}

export interface IntegrationStats {
  total_syncs: number;
  successful_syncs: number;
  failed_syncs: number;
  last_sync_date?: string;
  uptime_percentage: number;
}

export interface IntegrationTestResponse {
  success: boolean;
  message: string;
  data?: any;
}

// Subscription Types — shape real de GET /api/subscription/status
// (subscription.service.js). El status 'permanent' no vence ni entra en
// periodo de gracia; 'grace' y 'blocked' son los dos estados que la web
// muestra con un modal bloqueante o de aviso.
export interface Subscription {
  status: 'active' | 'grace' | 'blocked' | 'permanent';
  plan?: number;
  planName?: string;
  priceMonthly?: number;
  subscriptionEndsAt?: string | null;
  gracePeriodEndsAt?: string | null;
  daysUntilExpiry?: number | null;
  daysInGrace?: number | null;
  isPermanent: boolean;
  isBlocked: boolean;
  showWarning: boolean;
}

// (`PlanUsage` ya está declarado arriba — este era un duplicado con un shape
// ficticio, `{plan_name, limits, usage}`, que nunca coincidió con la API real.)

// Invoicing Resolution Types (facturación electrónica DIAN) — verificado
// contra `invoicing_resolutions` (mypos2v4.sql) e
// `invoicing_resolutions.repository.js`. `type` real solo admite
// `'POS'|'ELECTRONIC'`. `api_range_id` existe en la BD y el propio web lo
// recolecta, pero el repositorio nunca lo incluye en el INSERT/UPDATE —
// guardarlo no tiene ningún efecto (bug confirmado del backend, no se
// expone como funcional en el formulario móvil).
export interface InvoicingResolution {
  id: number;
  company_id?: number;
  resolution_number: string;
  prefix?: string;
  start_number: number;
  end_number: number;
  current_number: number;
  type: 'POS' | 'ELECTRONIC';
  /** Requerida solo si `type === 'ELECTRONIC'`. */
  technical_key?: string;
  api_range_id?: number;
  is_active: boolean;
}

export interface CreateInvoicingResolutionRequest {
  resolution_number: string;
  prefix?: string;
  start_number: number;
  end_number: number;
  current_number?: number;
  type: 'POS' | 'ELECTRONIC';
  technical_key?: string;
  is_active?: boolean;
  /** Si ya existe otra resolución activa del mismo `type`, desactívala en vez de fallar con 409. */
  auto_replace?: boolean;
}

export interface UpdateInvoicingResolutionRequest extends Partial<CreateInvoicingResolutionRequest> {}

/** Devuelto en el 409 cuando ya hay una resolución activa del mismo `type`. */
export interface ResolutionConflictError {
  conflicting_resolution?: InvoicingResolution;
}

// DIAN Types
/**
 * Estado real que escribe `dian.service.js` (no coincide con el ENUM de
 * `mypos2v4.sql`, que solo declara `not_applicable|not_sent|sent|accepted|rejected`
 * — el código en producción usa `processing`/`approved`, no `sent`/`accepted`).
 */
export type DianStatus = 'not_sent' | 'processing' | 'approved' | 'rejected' | 'not_applicable';

// Measurement Units (productos pesables)
export interface MeasurementUnit {
  id: number;
  code: string; // '94', 'KGM', 'LBR', 'GLL'
  name: string; // 'Unidad', 'Kilogramo', ...
}

// Municipality Types — shape real de `municipalities.repository.js`
export interface Municipality {
  id: number;
  name: string;
  department_name?: string;
  code_matias?: string;
  code_factus?: string;
}

// Supplier Types
// Verificado contra `suppliers` (mypos2v4.sql) — no tiene `is_active`, sí
// `contact_name`/`city` que no estaban tipados antes.
export interface Supplier {
  id: number;
  nit: string;
  name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  creation_date?: string;
}

export interface CreateSupplierRequest {
  nit: string;
  name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
}

export interface UpdateSupplierRequest extends Partial<CreateSupplierRequest> {}

// Matias (proveedor DIAN) — verificado contra `company.service.js`. La
// contraseña NUNCA se devuelve; `GET` solo trae el email guardado (columna
// `integrations.api_key`, expuesta bajo la clave `email`).
export interface MatiasConfig {
  email?: string;
  environment?: 'TEST' | 'PRODUCTION';
  is_active?: boolean;
  token_expires_at?: string | null;
}

export interface SaveMatiasConfigRequest {
  email: string;
  password: string;
  environment: 'TEST' | 'PRODUCTION';
}

export interface TestMatiasConnectionResponse {
  connected: boolean;
  error?: string;
}

// Import / Export Types — verificado contra `import.service.js`.
export type ImportExportEntity = 'products' | 'categories' | 'taxes';

export interface ImportResultRow {
  row: number | string;
  field: string;
  message: string;
}

export interface ImportResult {
  created: number;
  updated: number;
  errors: ImportResultRow[];
}

// AI Assistant Types — verificado contra `mypos-ai-service/src/controllers/ai.controller.js`
// y `mypos-ai-service/src/utils/validator.js` (backend real, no el mockup del web).
export type AiChatRole = 'user' | 'assistant';

export interface AiHistoryItem {
  role: AiChatRole;
  content: string;
  intent?: string;
  data?: any;
}

export interface AiQueryRequest {
  message: string;
  /** Máx. 12 entradas — el resto se recorta antes de enviar. */
  history: AiHistoryItem[];
}

export interface AiQueryIntent {
  intent: string;
  parameters?: Record<string, any>;
}

export interface AiQueryResponse {
  ok: boolean;
  type: 'success' | 'not_allowed';
  intent: AiQueryIntent;
  summary: string;
  data?: any;
}
