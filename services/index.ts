import { ENDPOINTS } from '@/constants/api';
import type {
    CashRegister,
    Category,
    CloseShiftRequest,
    Coupon,
    CreateCustomerRequest,
    CreateSaleRequest,
    Customer,
    InventoryItem,
    LoginRequest,
    LoginResponse,
    OpenShiftRequest,
    PauseOrderRequest,
    Product,
    ReportFilters,
    Sale,
    SalesReport,
    Shift,
    TopProduct,
    User
} from '@/types';
import { apiService } from './api';
import { storageService } from './storage';

class AuthService {
  async login(username: string, password: string): Promise<LoginResponse> {
    const ip = await apiService.getIP();
    const data: LoginRequest = { username, password, ip_connection: ip };
    const response = await apiService.post<LoginResponse>(ENDPOINTS.AUTH.LOGIN, data);
    
    // Save token and user info
    await storageService.saveToken(response.token);
    await storageService.saveUserInfo(response.info);
    
    return response;
  }

  async logout(): Promise<void> {
    try {
      await apiService.postToken(ENDPOINTS.AUTH.LOGOUT);
    } catch (error) {
      // Continue with logout even if API call fails
    } finally {
      await storageService.clearAuth();
    }
  }

  async getCurrentUser(): Promise<User | null> {
    return await storageService.getUserInfo();
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await storageService.getToken();
    return !!token;
  }
}

class POSService {
  async getCategories(): Promise<Category[]> {
    const response = await apiService.getToken<Category[] | { data: Category[] }>(ENDPOINTS.POS.CATEGORIES);
    // Manejar ambos formatos de respuesta
    return Array.isArray(response) ? response : response.data;
  }

  async getCategoryProducts(categoryId: number): Promise<Product[]> {
    const response = await apiService.getToken<Product[] | { data: Product[] }>(
      ENDPOINTS.POS.CATEGORY_PRODUCTS(categoryId)
    );
    const products = Array.isArray(response) ? response : response.data;
    
    // Normalizar estructura de productos
    return products.map(p => ({
      id: p.product_id || p.id,
      product_id: p.product_id || p.id,
      name: p.title || p.name,
      title: p.title || p.name,
      sku: p.sku,
      barcode: p.barcode,
      price: parseFloat(p.price.toString()),
      stock: parseFloat(p.stock?.toString() || '0'),
      image: p.image,
      category_id: p.category_id,
    }));
  }

  async searchProducts(query: string): Promise<Product[]> {
    const response = await apiService.getToken<Product[] | { data: Product[] }>(
      `${ENDPOINTS.POS.PRODUCTS_SEARCH}?q=${encodeURIComponent(query)}`
    );
    const products = Array.isArray(response) ? response : response.data;
    
    return products.map(p => ({
      id: p.product_id || p.id,
      product_id: p.product_id || p.id,
      name: p.title || p.name,
      title: p.title || p.name,
      sku: p.sku,
      barcode: p.barcode,
      price: parseFloat(p.price.toString()),
      stock: parseFloat(p.stock?.toString() || '0'),
      image: p.image,
      category_id: p.category_id,
    }));
  }

  async getProductById(productId: number): Promise<Product> {
    const response = await apiService.getToken<Product | { data: Product }>(
      ENDPOINTS.PRODUCTS.DETAIL(productId)
    );
    const product = 'data' in response ? response.data : response;
    
    return {
      id: product.product_id || product.id,
      product_id: product.product_id || product.id,
      name: product.title || product.name,
      title: product.title || product.name,
      sku: product.sku || '',
      barcode: product.barcode,
      price: parseFloat(product.price?.toString() || '0'),
      stock: parseFloat(product.stock?.toString() || '0'),
      image: product.image,
      image_url: product.image_url,
      category_id: product.category_id,
      is_active: product.is_active ?? true,
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

  async openShift(data: OpenShiftRequest): Promise<Shift> {
    const response = await apiService.postToken<{ success: boolean; data: Shift; message: string }>(
      ENDPOINTS.POS.SHIFTS.OPEN, 
      data
    );
    return response.data;
  }

  async closeShift(shiftId: number, data: CloseShiftRequest): Promise<Shift> {
    const response = await apiService.postToken<{ success: boolean; data: Shift; message: string }>(
      ENDPOINTS.POS.SHIFTS.CLOSE(shiftId), 
      data
    );
    return response.data;
  }

  async getShiftDetail(shiftId: number): Promise<Shift> {
    const response = await apiService.getToken<Shift | { data: Shift }>(
      ENDPOINTS.POS.SHIFTS.DETAIL(shiftId)
    );
    return 'data' in response ? response.data : response;
  }

  async getShiftHistory(limit: number = 20): Promise<Shift[]> {
    const response = await apiService.getToken<{ data: { history: Shift[]; total: number } }>(
      `${ENDPOINTS.POS.SHIFTS.HISTORY}?limit=${limit}`
    );
    return response.data.history;
  }

  async getCashRegisters(): Promise<CashRegister[]> {
    const response = await apiService.getToken<CashRegister[] | { data: CashRegister[] }>(
      ENDPOINTS.POS.CASH_REGISTERS
    );
    return Array.isArray(response) ? response : response.data;
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

class ReportService {
  async getSalesReport(startDate?: string, endDate?: string): Promise<SalesReport[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    const response = await apiService.getToken<{ data: SalesReport[] }>(
      `${ENDPOINTS.REPORTS.SALES}?${params.toString()}`
    );
    return response.data;
  }

  async getTopProducts(limit: number = 10): Promise<TopProduct[]> {
    const response = await apiService.getToken<{ data: TopProduct[] }>(
      `${ENDPOINTS.REPORTS.TOP_PRODUCTS}?limit=${limit}`
    );
    return response.data;
  }

  async getReport(type: string, filters?: ReportFilters): Promise<any> {
    const params = new URLSearchParams();
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    if (filters?.group_by) params.append('group_by', filters.group_by);
    
    const endpoint = `/api/reports/${type}?${params.toString()}`;
    const response = await apiService.getToken<{ data: any; summary?: any }>(endpoint);
    return response;
  }
}

export const authService = new AuthService();
export const posService = new POSService();
export const productService = new ProductService();
export const inventoryService = new InventoryService();
export const reportService = new ReportService();

// Export extended services
export * from './extended';
