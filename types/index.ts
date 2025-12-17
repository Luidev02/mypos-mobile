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
  unit_price: number;
  discount: number;
}

export interface CreateSaleRequest {
  customer_id: number;
  sale_type: 'factura_electronica' | 'nota_venta';
  payment_method: 'cash' | 'transfer';
  coupon_id?: number | null;
  items: SaleItem[];
  amount_received: number;
}

export interface Sale {
  id: number;
  folio: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  change: number;
  payment_method: string;
  invoice_url?: string;
  created_at: string;
}

// Shift Types
export interface Shift {
  id: number;
  user_id: number;
  cash_register_id: number;
  opening_amount: number;
  closing_amount?: number;
  opened_at: string;
  closed_at?: string;
  status: 'open' | 'closed';
}

export interface OpenShiftRequest {
  cash_register_id: number;
  opening_amount: number;
}

export interface CloseShiftRequest {
  shift_id: number;
  closing_amount: number;
}

// Cash Register Types
export interface CashRegister {
  id: number;
  name: string;
  is_active: boolean;
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
