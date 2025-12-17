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
  stock: number;
  tax_id: number;
  is_active: boolean;
  image_url?: string;
}

export interface Category {
  id: number;
  name: string;
  products?: Product[];
}

// Customer Types
export interface Customer {
  id: number;
  name: string;
  nit?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  is_active: boolean;
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
  customer_id: number;
  cash_register_id: number; // Requerido - ID de la caja registradora
  shift_id: number; // Requerido - ID del turno activo
  warehouse_id: number; // Requerido - ID de la bodega (viene del turno)
  payment_method: 'cash' | 'transfer';
  resolution_id?: number | null; // Opcional - Para facturación electrónica
  invoice_number?: string | null; // Opcional - Número de factura
  items: SaleItem[];
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
  product: Product;
  stock: number;
  last_updated: string;
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
