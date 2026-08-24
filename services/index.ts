import { ENDPOINTS } from '@/constants/api';
import type {
    CashRegister,
    Category,
    CloseShiftRequest,
    Coupon,
    CreateCashRegisterRequest,
    CreateCustomerRequest,
    CreateSaleRequest,
    Customer,
    InventoryItem,
    LoginRequest,
    LoginResponse,
    OpenShiftRequest,
    PauseOrderRequest,
    Product,
    ProductDetailed,
    InventoryReportRow,
    ReportFilters,
    Sale,
    SalesReportRow,
    Shift,
    TopProductRow,
    UpdateCashRegisterRequest,
    User
} from '@/types';
import { apiService } from './api';
import { storageService } from './storage';

/**
 * Normaliza un producto del POS conservando los campos de stock y unidad de
 * medida que expone el backend. `stock_type` e `is_weighable` son obligatorios
 * para replicar las reglas de venta del web y del backend: un producto de
 * stock variable (carnicería, fruver…) se puede vender aunque su stock esté en
 * cero o en negativo.
 */
function normalizePosProduct(p: any): Product {
  return {
    id: p.product_id || p.id,
    name: p.title || p.name,
    sku: p.sku || '',
    barcode: p.barcode,
    price: parseFloat(p.price?.toString() || '0'),
    cost: parseFloat(p.cost?.toString() || '0'),
    tax_id: p.tax_id ?? 0,
    stock: parseFloat(p.stock?.toString() || '0'),
    stock_alert: p.stock_alert !== undefined ? Number(p.stock_alert) : undefined,
    category_id: p.category_id,
    is_active: p.is_active ?? true,
    stock_type: p.stock_type === 'variable' ? 'variable' : 'fixed',
    is_weighable: p.is_weighable,
    unit_measure_id: p.unit_measure_id,
    unit_measure_code: p.unit_measure_code,
    unit_measure_name: p.unit_measure_name,
  };
}

class AuthService {
  async login(username: string, password: string): Promise<LoginResponse> {
    // Ya no se consulta api.ipify.org: el backend registra la IP real desde
    // `req.ip`, que además es la única confiable (la de antes la declaraba el
    // propio cliente).
    const data: LoginRequest = { username, password };
    const response = await apiService.post<LoginResponse>(ENDPOINTS.AUTH.LOGIN, data);

    await storageService.saveToken(response.token);
    await storageService.saveUserInfo(response.info);
    if (response.refreshToken) {
      await storageService.saveRefreshToken(response.refreshToken);
    }

    return response;
  }

  async logout(): Promise<void> {
    try {
      // Ahora esta ruta existe de verdad y revoca la sesión en el servidor
      // (antes el backend no la tenía y el 404 se tragaba en silencio, así
      // que el token seguía siendo válido después de "cerrar sesión").
      await apiService.postToken(ENDPOINTS.AUTH.LOGOUT);
    } catch (error) {
      // Si el servidor no responde igual se limpia la sesión local.
    } finally {
      await storageService.clearAuth();
    }
  }

  async getCurrentUser(): Promise<User | null> {
    return await storageService.getUserInfo();
  }

  async isAuthenticated(): Promise<boolean> {
    // Basta con tener refresh token: el access token puede faltar o estar
    // caducado y aun así la sesión es recuperable — `services/api.ts` pide uno
    // nuevo antes de la primera petición. Mirar solo el access token
    // (comportamiento anterior) mandaba al login a usuarios con sesión válida.
    const [token, refreshToken] = await Promise.all([
      storageService.getToken(),
      storageService.getRefreshToken(),
    ]);
    return !!(token || refreshToken);
  }
}

class POSService {
  async getCategories(): Promise<Category[]> {
    const response = await apiService.getToken<Category[] | { data: Category[] }>(ENDPOINTS.POS.CATEGORIES);
    // Manejar ambos formatos de respuesta
    return Array.isArray(response) ? response : response.data;
  }

  async getCategoryProducts(categoryId: number): Promise<Product[]> {
    const response = await apiService.getToken<any[] | { data: any[] }>(
      ENDPOINTS.POS.CATEGORY_PRODUCTS(categoryId)
    );
    const products = Array.isArray(response) ? response : response.data;

    // Normalizar estructura de productos
    return products.map(normalizePosProduct);
  }

  async searchProducts(query: string): Promise<Product[]> {
    const response = await apiService.getToken<any[] | { data: any[] }>(
      `${ENDPOINTS.POS.PRODUCTS_SEARCH}?q=${encodeURIComponent(query)}`
    );
    const products = Array.isArray(response) ? response : response.data;

    return products.map(normalizePosProduct);
  }

  // `/api/pos/products/scan` — a diferencia de `searchProducts`, interpreta
  // etiquetas de balanza (EAN-13 de peso variable): del código extrae el PLU
  // del producto y el peso ya parseado en `quantity`. Para un pesable sin
  // peso embebido (etiqueta genérica) devuelve `quantity: 0` y
  // `requires_weight_input: true` para que el cajero lo digite.
  async scanBarcode(code: string): Promise<{
    type: 'weight' | 'unit';
    product: Product;
    quantity: number;
    unitPrice: number;
    requiresWeightInput: boolean;
  }> {
    const response = await apiService.getToken<{ data: any } | any>(
      ENDPOINTS.POS.PRODUCT_SCAN(code)
    );
    const data = 'data' in response ? response.data : response;
    return {
      type: data.type,
      product: normalizePosProduct(data.product),
      quantity: Number(data.quantity) || 0,
      unitPrice: Number(data.unit_price) || 0,
      requiresWeightInput: !!data.requires_weight_input,
    };
  }

  async getProductById(productId: number): Promise<ProductDetailed> {
    const response = await apiService.getToken<any | { data: any }>(
      ENDPOINTS.PRODUCTS.DETAIL(productId)
    );
    const product = 'data' in response ? response.data : response;

    return {
      ...normalizePosProduct(product),
      image_url: product.image_url,
      is_inventory_managed: product.is_inventory_managed ?? true,
    };
  }

  async searchCustomers(query: string): Promise<Customer[]> {
    const response = await apiService.getToken<Customer[] | { data: Customer[] }>(
      `${ENDPOINTS.POS.CUSTOMERS_SEARCH}?q=${encodeURIComponent(query)}`
    );
    return Array.isArray(response) ? response : response.data;
  }

  async createSale(saleData: CreateSaleRequest): Promise<Sale> {
    const response = await apiService.postToken<{ success: boolean; data: Sale; message: string }>(
      ENDPOINTS.POS.SALES, 
      saleData
    );
    return response.data;
  }

  async getRecentOrders(limit: number = 20): Promise<Sale[]> {
    const response = await apiService.getToken<{ data: Sale[] }>(
      `${ENDPOINTS.POS.ORDERS_RECENT}?limit=${limit}`
    );
    return response.data;
  }

  async getOrderDetail(orderId: number): Promise<Sale> {
    const response = await apiService.getToken<{ data: Sale }>(
      ENDPOINTS.POS.ORDER_DETAIL(orderId)
    );
    return response.data;
  }

  async getActiveShift(): Promise<Shift | null> {
    try {
      const response = await apiService.getToken<Shift | { data: Shift }>(
        ENDPOINTS.POS.SHIFTS.ACTIVE
      );
      
      // Manejar diferentes formatos de respuesta
      if (response && 'id' in response) {
        return response as Shift;
      } else if (response && 'data' in response) {
        return response.data;
      }
      
      return null;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  // El backend responde `{id, status, base_amount}`, no el turno completo
  // (sin `cash_register_id`/`start_time`/etc.) — la pantalla debe refrescar
  // vía `getActiveShift()` tras abrir, no confiar en este retorno.
  async openShift(data: OpenShiftRequest): Promise<{ id: number; status: 'open'; base_amount: number }> {
    const response = await apiService.postToken<{ data: { id: number; status: 'open'; base_amount: number } }>(
      ENDPOINTS.POS.SHIFTS.OPEN,
      data
    );
    return response.data;
  }

  // El backend responde `data: null` (`ResponseHandler.success(null, ...)`)
  // — hay que refrescar el turno/historial tras cerrar, no leer el retorno.
  async closeShift(shiftId: number, data: CloseShiftRequest): Promise<void> {
    await apiService.postToken(ENDPOINTS.POS.SHIFTS.CLOSE(shiftId), data);
  }

  async getShiftDetail(shiftId: number): Promise<Shift> {
    const response = await apiService.getToken<Shift | { data: Shift }>(
      ENDPOINTS.POS.SHIFTS.DETAIL(shiftId)
    );
    return 'data' in response ? response.data : response;
  }

  async getShiftHistory(
    limit: number = 20
  ): Promise<{ activeShift: Shift | null; history: Shift[]; totalShifts: number }> {
    const response = await apiService.getToken<{
      data: { active_shift: Shift | null; history: Shift[]; total_shifts: number };
    }>(`${ENDPOINTS.POS.SHIFTS.HISTORY}?limit=${limit}`);
    return {
      activeShift: response.data.active_shift,
      history: response.data.history,
      totalShifts: response.data.total_shifts,
    };
  }

  async getCashRegisters(): Promise<CashRegister[]> {
    const response = await apiService.getToken<CashRegister[] | { data: CashRegister[] }>(
      ENDPOINTS.POS.CASH_REGISTERS
    );
    return Array.isArray(response) ? response : response.data;
  }

  async getCashRegister(id: number): Promise<CashRegister> {
    const response = await apiService.getToken<CashRegister | { data: CashRegister }>(
      ENDPOINTS.POS.CASH_REGISTER_DETAIL(id)
    );
    return 'data' in response ? response.data : response;
  }

  // El backend responde `{id, message}` (create) o `{id, ...data, message}`
  // (update) dentro de `data` — no el registro completo con `warehouse_name`.
  async createCashRegister(data: CreateCashRegisterRequest): Promise<{ id: number }> {
    const response = await apiService.postToken<{ data: { id: number } }>(
      ENDPOINTS.POS.CASH_REGISTERS,
      data
    );
    return response.data;
  }

  async updateCashRegister(id: number, data: UpdateCashRegisterRequest): Promise<void> {
    await apiService.putToken(ENDPOINTS.POS.CASH_REGISTER_DETAIL(id), data);
  }

  async pauseOrder(orderData: PauseOrderRequest): Promise<Sale> {
    const response = await apiService.postToken<{ success: boolean; data: Sale; message: string }>(
      ENDPOINTS.POS.ORDER_PAUSE,
      orderData
    );
    return response.data;
  }

  async deleteOrder(orderId: number): Promise<void> {
    await apiService.deleteToken(ENDPOINTS.POS.ORDER_DELETE(orderId));
  }

  async createCustomer(customerData: CreateCustomerRequest): Promise<Customer> {
    const response = await apiService.postToken<{ success: boolean; data: Customer; message: string }>(
      ENDPOINTS.CUSTOMERS.CREATE,
      customerData
    );
    return response.data;
  }

  async getCustomers(): Promise<Customer[]> {
    const response = await apiService.getToken<Customer[] | { data: Customer[] }>(
      ENDPOINTS.CUSTOMERS.LIST
    );
    return Array.isArray(response) ? response : response.data;
  }

  async getCustomer(id: number): Promise<Customer> {
    const response = await apiService.getToken<any>(ENDPOINTS.CUSTOMERS.DETAIL(id));
    
    // Manejar diferentes formatos de respuesta
    if (Array.isArray(response)) {
      return response[0];
    } else if (response.data && Array.isArray(response.data)) {
      return response.data[0];
    } else if (response.data && typeof response.data === 'object') {
      return response.data;
    }
    return response;
  }

  async updateCustomer(id: number, customerData: CreateCustomerRequest): Promise<Customer> {
    const response = await apiService.putToken<{ success: boolean; data: Customer; message: string }>(
      ENDPOINTS.CUSTOMERS.UPDATE(id),
      customerData
    );
    return response.data;
  }

  async deleteCustomer(id: number): Promise<void> {
    await apiService.deleteToken(ENDPOINTS.CUSTOMERS.DELETE(id));
  }

  async validateCoupon(code: string): Promise<Coupon> {
    const response = await apiService.getToken<Coupon | { data: Coupon }>(
      ENDPOINTS.COUPONS.VALIDATE(code)
    );
    return 'data' in response ? response.data : response;
  }
}

class ProductService {
  async getProducts(): Promise<Product[]> {
    const response = await apiService.getToken<{ data: Product[] }>(ENDPOINTS.PRODUCTS.LIST);
    return response.data;
  }

  async getProduct(id: number): Promise<Product> {
    const response = await apiService.getToken<{ data: Product }>(ENDPOINTS.PRODUCTS.DETAIL(id));
    return response.data;
  }

  async createProduct(product: Partial<Product>): Promise<Product> {
    const response = await apiService.postToken<{ data: Product }>(ENDPOINTS.PRODUCTS.CREATE, product);
    return response.data;
  }

  async updateProduct(id: number, product: Partial<Product>): Promise<Product> {
    const response = await apiService.putToken<{ data: Product }>(ENDPOINTS.PRODUCTS.UPDATE(id), product);
    return response.data;
  }

  async deleteProduct(id: number): Promise<void> {
    await apiService.deleteToken(ENDPOINTS.PRODUCTS.DELETE(id));
  }
}

class InventoryService {
  async getInventory(warehouseId: number = 1): Promise<InventoryItem[]> {
    try {
      const response = await apiService.getToken<any>(ENDPOINTS.INVENTORY.WAREHOUSE_STOCK(warehouseId));
      // Manejar diferentes formatos de respuesta
      if (Array.isArray(response)) {
        return response;
      } else if (response.data && Array.isArray(response.data)) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Error loading inventory:', error);
      return [];
    }
  }

  async getLowStock(warehouseId: number = 1): Promise<InventoryItem[]> {
    try {
      const url = `${ENDPOINTS.INVENTORY.LOW_STOCK}${warehouseId ? `?warehouseId=${warehouseId}` : ''}`;
      const response = await apiService.getToken<any>(url);
      // Manejar diferentes formatos de respuesta
      if (Array.isArray(response)) {
        return response;
      } else if (response.data && Array.isArray(response.data)) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Error loading low stock:', error);
      return [];
    }
  }
}

// Tipos de reporte reales del backend (`reports.service.js`) — cualquier
// otro valor de `type` responde 400 "Tipo de reporte inválido".
export type ReportType = 'sales' | 'inventory' | 'purchases' | 'top-products';

function buildReportParams(filters?: ReportFilters & { limit?: number; format?: 'xlsx' | 'pdf' }): string {
  const params = new URLSearchParams();
  if (filters?.start_date) params.append('start_date', filters.start_date);
  if (filters?.end_date) params.append('end_date', filters.end_date);
  if (filters?.warehouse_id !== undefined) params.append('warehouse_id', String(filters.warehouse_id));
  if (filters?.category_id !== undefined) params.append('category_id', String(filters.category_id));
  if (filters?.supplier_id !== undefined) params.append('supplier_id', String(filters.supplier_id));
  if (filters?.status) params.append('status', filters.status);
  if (filters?.low_stock) params.append('low_stock', 'true');
  if ((filters as any)?.format) params.append('format', (filters as any).format);
  return params.toString();
}

class ReportService {
  // `GET /api/reports/:type` responde siempre `data` como arreglo plano de
  // filas — nunca un resumen; el resumen se calcula en el cliente.
  async getReport<T = any>(type: ReportType, filters?: ReportFilters): Promise<T[]> {
    const response = await apiService.getToken<{ data: T[] } | T[]>(
      `${ENDPOINTS.REPORTS.BY_TYPE(type)}?${buildReportParams(filters)}`
    );
    return Array.isArray(response) ? response : response.data;
  }

  async getSalesReport(startDate?: string, endDate?: string): Promise<SalesReportRow[]> {
    return this.getReport<SalesReportRow>('sales', { start_date: startDate, end_date: endDate });
  }

  // El backend ignora cualquier `limit` — siempre trae hasta 50 filas
  // (`LIMIT 50` fijo en el SQL de `top-products`).
  async getTopProducts(startDate?: string, endDate?: string): Promise<TopProductRow[]> {
    return this.getReport<TopProductRow>('top-products', { start_date: startDate, end_date: endDate });
  }

  async getInventoryReport(filters?: ReportFilters): Promise<InventoryReportRow[]> {
    return this.getReport<InventoryReportRow>('inventory', filters);
  }

  // `GET /api/reports/:type/export?format=xlsx|pdf` — devuelve un binario
  // real (xlsx/pdf), no una URL ni base64. Requiere el permiso
  // `export_reports` además de `view_reports`.
  async exportReport(type: ReportType, format: 'xlsx' | 'pdf', filters?: ReportFilters): Promise<ArrayBuffer> {
    return apiService.getToken<ArrayBuffer>(
      `${ENDPOINTS.REPORTS.EXPORT(type)}?${buildReportParams({ ...filters, format })}`,
      { responseType: 'arraybuffer' }
    );
  }
}

export const authService = new AuthService();
export const posService = new POSService();
export const productService = new ProductService();
export const inventoryService = new InventoryService();
export const reportService = new ReportService();

// Export extended services
export * from './extended';
export * from './permissions';
export * from './subscription';
