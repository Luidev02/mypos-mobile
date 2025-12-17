import { ENDPOINTS } from '@/constants/api';
import type {
    CashRegister,
    Category,
    CloseShiftRequest,
    CreateSaleRequest,
    Customer,
    InventoryItem,
    LoginRequest,
    LoginResponse,
    OpenShiftRequest,
    Product,
    Sale,
    SalesReport,
    Shift,
    TopProduct,
    User,
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
    const response = await apiService.getToken<{ data: Category[] }>(ENDPOINTS.POS.CATEGORIES);
    return response.data;
  }

  async getProducts(): Promise<Product[]> {
    const response = await apiService.getToken<{ data: Product[] }>(ENDPOINTS.POS.PRODUCTS);
    return response.data;
  }

  async getCustomers(): Promise<Customer[]> {
    const response = await apiService.getToken<{ data: Customer[] }>(ENDPOINTS.POS.CUSTOMERS);
    return response.data;
  }

  async createSale(saleData: CreateSaleRequest): Promise<Sale> {
    const response = await apiService.postToken<{ data: Sale }>(ENDPOINTS.POS.SALES, saleData);
    return response.data;
  }

  async getActiveShift(): Promise<Shift | null> {
    try {
      const response = await apiService.getToken<{ data: Shift }>(ENDPOINTS.POS.SHIFTS.ACTIVE);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async openShift(data: OpenShiftRequest): Promise<Shift> {
    const response = await apiService.postToken<{ data: Shift }>(ENDPOINTS.POS.SHIFTS.OPEN, data);
    return response.data;
  }

  async closeShift(data: CloseShiftRequest): Promise<Shift> {
    const response = await apiService.postToken<{ data: Shift }>(ENDPOINTS.POS.SHIFTS.CLOSE, data);
    return response.data;
  }

  async getCashRegisters(): Promise<CashRegister[]> {
    const response = await apiService.getToken<{ data: CashRegister[] }>(ENDPOINTS.POS.CASH_REGISTERS);
    return response.data;
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
  async getInventory(): Promise<InventoryItem[]> {
    const response = await apiService.getToken<{ data: InventoryItem[] }>(ENDPOINTS.INVENTORY.LIST);
    return response.data;
  }

  async getLowStock(): Promise<InventoryItem[]> {
    const response = await apiService.getToken<{ data: InventoryItem[] }>(ENDPOINTS.INVENTORY.LOW_STOCK);
    return response.data;
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
}

export const authService = new AuthService();
export const posService = new POSService();
export const productService = new ProductService();
export const inventoryService = new InventoryService();
export const reportService = new ReportService();
