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
  ip_connection: string;
}

export interface LoginResponse {
  status: number;
  message: string;
  token: string;
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
}

export interface Category {
  id: number;
  name: string;
  image?: string;
  image_url?: string;
  products?: Product[];
}

// Customer Types
export interface Customer {
  id: number;
  name: string;
  ident: string;
  ident_type: 'CC' | 'NIT' | 'CE' | 'TI';
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  status: 'active' | 'inactive';
  is_company?: number;
  // Campos legacy para compatibilidad
  nit?: string;
  identification?: string;
  identification_type?: 'CC' | 'NIT' | 'CE' | 'TI';
  is_active?: boolean;
}

export interface CreateCustomerRequest {
  name: string;
  ident: string;
  ident_type: 'CC' | 'NIT' | 'CE' | 'TI';
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  is_company?: number;
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
  total: number;
  total_amount?: number; // Alias de total
  change?: number;
  payment_method: string;
  status?: string;
  invoice_url?: string;
  created_at: string;
  items_count?: number;
  items?: SaleItem[];
}

// Shift Types
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
}

export interface OpenShiftRequest {
  cash_register_id: number;
  base_amount: number;
}

export interface CloseShiftRequest {
  final_cash_real: number;
  notes?: string;
}

// Cash Register Types
export interface CashRegister {
  id: number;
  name: string;
  code: string;
  description?: string;
  is_active: boolean;
  created_at?: string;
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
export interface SalesReport {
  date: string;
  total_sales: number;
  total_revenue: number;
  total_transactions: number;
}

export interface TopProduct {
  product_id: number;
  product_name: string;
  quantity_sold: number;
  revenue: number;
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
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  id: number;
}

// Extended Customer Types
export interface CustomerDetailed extends Customer {
  ident?: string; // Número de identificación
  ident_type?: 'CC' | 'NIT' | 'CE' | 'TI' | 'PASSPORT';
  status?: 'active' | 'inactive';
  created_at?: string;
  total_purchases?: number;
  total_spent?: number;
}

export interface UpdateCustomerRequest extends Partial<CreateCustomerRequest> {
  id: number;
  status?: 'active' | 'inactive';
}

// Extended Sale Types
export interface SaleDetailed extends Sale {
  warehouse_name?: string;
  warehouse_id?: number;
  created_by_name?: string;
  customer_identification?: string;
  items: SaleItemDetailed[];
}

export interface SaleItemDetailed extends SaleItem {
  product_name?: string;
  sku?: string;
  subtotal?: number;
  tax?: number;
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

// Purchase Types
export interface Purchase {
  id: number;
  purchase_date: string;
  supplier_name?: string;
  invoice_number?: string;
  total_amount: number;
  status: 'pending' | 'completed' | 'cancelled';
  created_at?: string;
  notes?: string;
}

export interface PurchaseItem {
  product_id: number;
  product_name?: string;
  quantity: number;
  unit_cost: number;
  total: number;
}

export interface PurchaseDetailed extends Purchase {
  warehouse_id?: number;
  warehouse_name?: string;
  items: PurchaseItem[];
}

export interface CreatePurchaseRequest {
  purchase_date: string;
  supplier_id?: number;
  supplier_name?: string;
  invoice_number?: string;
  warehouse_id: number;
  status?: 'pending' | 'completed' | 'cancelled';
  items: PurchaseItem[];
  notes?: string;
}

export interface UpdatePurchaseRequest extends Partial<CreatePurchaseRequest> {
  id: number;
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

export interface CreateInventoryAdjustmentRequest {
  product_id: number;
  warehouse_id: number;
  quantity: number;
  type: 'adjustment' | 'entry' | 'exit';
  reason?: string;
  notes?: string;
}

export interface ProductMovement {
  id: number;
  product_id: number;
  warehouse_id: number;
  type: 'sale' | 'purchase' | 'adjustment' | 'transfer';
  quantity: number;
  reference_id?: number;
  reference_type?: string;
  reason?: string;
  created_at: string;
  created_by?: string;
  notes?: string;
}

// Report Types Extended
export interface ReportFilters {
  start_date?: string;
  end_date?: string;
  group_by?: 'day' | 'week' | 'month';
  warehouse_id?: number;
  category_id?: number;
  product_id?: number;
}

export interface SalesReportData {
  id: number;
  invoice_number: string;
  date: string;
  customer_name?: string;
  seller?: string;
  subtotal: number;
  discount: number;
  tax_total: number;
  total: number;
  payment_method: string;
  status: string;
}

export interface SalesReportSummary {
  'Total Ventas': number;
  'Subtotal': number;
  'Descuentos': number;
  'Impuestos': number;
  'Total': number;
}

export interface ProductsReportData {
  product_id: number;
  product_name: string;
  category: string;
  quantity_sold: number;
  revenue: number;
  profit?: number;
}

export interface InventoryReportData {
  product_id: number;
  product_name: string;
  sku: string;
  warehouse: string;
  stock: number;
  stock_alert: number;
  status: string;
}

// Profile Types
export interface UserProfile {
  id: number;
  username: string;
  email: string;
  pin_code?: string;
  role_name?: string;
  role_id?: number;
  created_at?: string;
}

export interface UpdateProfileRequest {
  username?: string;
  email?: string;
  pin_code?: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

// Company Types
export interface Company {
  id: number;
  name: string; // Razón social
  trade_name?: string; // Nombre comercial
  address?: string;
  city?: string;
  department?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo_url?: string;
  regimen_type?: string; // responsable_iva, regimen_simple, etc.
  currency?: string; // COP, USD, etc.
  api_client_id?: string;
  api_client_secret?: string;
  api_environment?: 'PRODUCTION' | 'SANDBOX';
}

export interface UpdateCompanyRequest extends Partial<Company> {}

// Role & Permission Types
export interface Permission {
  id: number;
  name: string;
  is_granted?: boolean;
}

export interface Role {
  id: number;
  name: string;
  permissions?: Permission[];
  created_at?: string;
}

export interface CreateRoleRequest {
  name: string;
  permissions: number[]; // Array of permission IDs
}

export interface UpdateRoleRequest extends Partial<CreateRoleRequest> {
  id: number;
}

// User Management Types
export interface UserManagement {
  id: number;
  username: string;
  email: string;
  role_id: number;
  role_name?: string;
  is_active: boolean;
  created_at?: string;
  pin_code?: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  role_id: number;
  pin_code?: string;
  is_active?: boolean;
}

export interface UpdateUserRequest extends Partial<CreateUserRequest> {
  id: number;
  password?: string; // Optional
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
