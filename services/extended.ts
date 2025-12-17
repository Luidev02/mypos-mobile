import { ENDPOINTS } from '@/constants/api';
import type {
    CategoryDetailed,
    ChangePasswordRequest,
    Company,
    CouponDetailed,
    CreateCategoryRequest,
    CreateCouponRequest,
    CreateCustomerRequest,
    CreateIntegrationRequest,
    CreateInventoryAdjustmentRequest,
    CreateProductRequest,
    CreatePurchaseRequest,
    CreateRoleRequest,
    CreateTaxRequest,
    CreateUserRequest,
    CreateWarehouseRequest,
    CustomerDetailed,
    Integration,
    IntegrationLog,
    IntegrationStats,
    IntegrationTestResponse,
    ProductDetailed,
    ProductMovement,
    Purchase,
    PurchaseDetailed,
    Role,
    SaleDetailed,
    Tax,
    UpdateCategoryRequest,
    UpdateCompanyRequest,
    UpdateCouponRequest,
    UpdateCustomerRequest,
    UpdateIntegrationRequest,
    UpdateProductRequest,
    UpdateProfileRequest,
    UpdatePurchaseRequest,
    UpdateRoleRequest,
    UpdateTaxRequest,
    UpdateUserRequest,
    UpdateWarehouseRequest,
    UserManagement,
    UserProfile,
    Warehouse,
    WarehouseStock,
} from '@/types';
import { apiService } from './api';

// Categories Service
export class CategoryService {
  async getCategories(): Promise<CategoryDetailed[]> {
    const response = await apiService.getToken<CategoryDetailed[] | { data: CategoryDetailed[] }>(
      ENDPOINTS.CATEGORIES.LIST
    );
    return Array.isArray(response) ? response : response.data;
  }

  async getCategory(id: number): Promise<CategoryDetailed> {
    const response = await apiService.getToken<CategoryDetailed | { data: CategoryDetailed }>(
      ENDPOINTS.CATEGORIES.DETAIL(id)
    );
    return 'data' in response ? response.data : response;
  }

  async createCategory(data: CreateCategoryRequest): Promise<CategoryDetailed> {
    const formData = new FormData();
    formData.append('name', data.name);
    if (data.image) {
      formData.append('image', data.image);
    }
    
    const response = await apiService.postToken<{ success: boolean; data: CategoryDetailed }>(
      ENDPOINTS.CATEGORIES.CREATE,
      formData
    );
    return response.data;
  }

  async updateCategory(id: number, data: UpdateCategoryRequest): Promise<CategoryDetailed> {
    const formData = new FormData();
    formData.append('name', data.name);
    if (data.image) {
      formData.append('image', data.image);
    }
    
    const response = await apiService.putToken<{ success: boolean; data: CategoryDetailed }>(
      ENDPOINTS.CATEGORIES.UPDATE(id),
      formData
    );
    return response.data;
  }

  async deleteCategory(id: number): Promise<void> {
    await apiService.deleteToken(ENDPOINTS.CATEGORIES.DELETE(id));
  }
}

// Extended Product Service
export class ExtendedProductService {
  async getProducts(): Promise<ProductDetailed[]> {
    const response = await apiService.getToken<ProductDetailed[] | { data: ProductDetailed[] }>(
      ENDPOINTS.PRODUCTS.LIST
    );
    return Array.isArray(response) ? response : response.data;
  }

  async getProduct(id: number): Promise<ProductDetailed> {
    const response = await apiService.getToken<ProductDetailed | { data: ProductDetailed }>(
      ENDPOINTS.PRODUCTS.DETAIL(id)
    );
    return 'data' in response ? response.data : response;
  }

  async createProduct(data: CreateProductRequest): Promise<ProductDetailed> {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      const value = data[key as keyof CreateProductRequest];
      if (value !== undefined) {
        formData.append(key, value as any);
      }
    });
    
    const response = await apiService.postToken<{ success: boolean; data: ProductDetailed }>(
      ENDPOINTS.PRODUCTS.CREATE,
      formData
    );
    return response.data;
  }

  async updateProduct(id: number, data: UpdateProductRequest): Promise<ProductDetailed> {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      const value = data[key as keyof UpdateProductRequest];
      if (value !== undefined && key !== 'id') {
        formData.append(key, value as any);
      }
    });
    
    const response = await apiService.putToken<{ success: boolean; data: ProductDetailed }>(
      ENDPOINTS.PRODUCTS.UPDATE(id),
      formData
    );
    return response.data;
  }

  async deleteProduct(id: number): Promise<void> {
    await apiService.deleteToken(ENDPOINTS.PRODUCTS.DELETE(id));
  }
}

// Extended Customer Service
export class CustomerService {
  async getCustomers(): Promise<CustomerDetailed[]> {
    const response = await apiService.getToken<CustomerDetailed[] | { data: CustomerDetailed[] }>(
      ENDPOINTS.CUSTOMERS.LIST
    );
    return Array.isArray(response) ? response : response.data;
  }

  async getCustomer(id: number): Promise<CustomerDetailed> {
    const response = await apiService.getToken<CustomerDetailed | { data: CustomerDetailed }>(
      ENDPOINTS.CUSTOMERS.DETAIL(id)
    );
    return 'data' in response ? response.data : response;
  }

  async createCustomer(data: CreateCustomerRequest): Promise<CustomerDetailed> {
    const response = await apiService.postToken<{ success: boolean; data: CustomerDetailed }>(
      ENDPOINTS.CUSTOMERS.CREATE,
      data
    );
    return response.data;
  }

  async updateCustomer(id: number, data: UpdateCustomerRequest): Promise<CustomerDetailed> {
    const response = await apiService.putToken<{ success: boolean; data: CustomerDetailed }>(
      ENDPOINTS.CUSTOMERS.UPDATE(id),
      data
    );
    return response.data;
  }

  async searchCustomers(query: string): Promise<CustomerDetailed[]> {
    const response = await apiService.getToken<CustomerDetailed[] | { data: CustomerDetailed[] }>(
      `${ENDPOINTS.CUSTOMERS.SEARCH}?q=${encodeURIComponent(query)}`
    );
    return Array.isArray(response) ? response : response.data;
  }
}

// Sales Service
export class SalesService {
  async getSales(): Promise<SaleDetailed[]> {
    const response = await apiService.getToken<{ data: SaleDetailed[] }>(
      ENDPOINTS.SALES.LIST
    );
    return response.data;
  }

  async getSale(id: number): Promise<SaleDetailed> {
    const response = await apiService.getToken<{ data: SaleDetailed } | SaleDetailed>(
      ENDPOINTS.SALES.DETAIL(id)
    );
    return 'data' in response ? response.data : response;
  }
}

// Warehouse Service
export class WarehouseService {
  async getWarehouses(): Promise<Warehouse[]> {
    const response = await apiService.getToken<Warehouse[] | { data: Warehouse[] }>(
      ENDPOINTS.WAREHOUSES.LIST
    );
    return Array.isArray(response) ? response : response.data;
  }

  async getWarehouse(id: number): Promise<Warehouse> {
    const response = await apiService.getToken<Warehouse | { data: Warehouse }>(
      ENDPOINTS.WAREHOUSES.DETAIL(id)
    );
    return 'data' in response ? response.data : response;
  }

  async createWarehouse(data: CreateWarehouseRequest): Promise<Warehouse> {
    const response = await apiService.postToken<{ success: boolean; data: Warehouse }>(
      ENDPOINTS.WAREHOUSES.CREATE,
      data
    );
    return response.data;
  }

  async updateWarehouse(id: number, data: UpdateWarehouseRequest): Promise<Warehouse> {
    const response = await apiService.putToken<{ success: boolean; data: Warehouse }>(
      ENDPOINTS.WAREHOUSES.UPDATE(id),
      data
    );
    return response.data;
  }

  async deleteWarehouse(id: number): Promise<void> {
    await apiService.deleteToken(ENDPOINTS.WAREHOUSES.DELETE(id));
  }

  async getWarehouseStock(id: number): Promise<WarehouseStock[]> {
    const response = await apiService.getToken<WarehouseStock[] | { data: WarehouseStock[] }>(
      ENDPOINTS.WAREHOUSES.STOCK(id)
    );
    return Array.isArray(response) ? response : response.data;
  }
}

// Tax Service
export class TaxService {
  async getTaxes(): Promise<Tax[]> {
    const response = await apiService.getToken<Tax[] | { data: Tax[] }>(
      ENDPOINTS.TAXES.LIST
    );
    return Array.isArray(response) ? response : response.data;
  }

  async getTax(id: number): Promise<Tax> {
    const response = await apiService.getToken<Tax | { data: Tax }>(
      ENDPOINTS.TAXES.DETAIL(id)
    );
    return 'data' in response ? response.data : response;
  }

  async createTax(data: CreateTaxRequest): Promise<Tax> {
    const response = await apiService.postToken<{ success: boolean; data: Tax }>(
      ENDPOINTS.TAXES.CREATE,
      data
    );
    return response.data;
  }

  async updateTax(id: number, data: UpdateTaxRequest): Promise<Tax> {
    const response = await apiService.putToken<{ success: boolean; data: Tax }>(
      ENDPOINTS.TAXES.UPDATE(id),
      data
    );
    return response.data;
  }

  async deleteTax(id: number): Promise<void> {
    await apiService.deleteToken(ENDPOINTS.TAXES.DELETE(id));
  }
}

// Extended Coupon Service
export class CouponService {
  async getCoupons(): Promise<CouponDetailed[]> {
    const response = await apiService.getToken<CouponDetailed[] | { data: CouponDetailed[] }>(
      ENDPOINTS.COUPONS.LIST
    );
    return Array.isArray(response) ? response : response.data;
  }

  async getCoupon(id: number): Promise<CouponDetailed> {
    const response = await apiService.getToken<CouponDetailed | { data: CouponDetailed }>(
      ENDPOINTS.COUPONS.DETAIL(id)
    );
    return 'data' in response ? response.data : response;
  }

  async validateCoupon(code: string): Promise<CouponDetailed> {
    const response = await apiService.getToken<CouponDetailed | { data: CouponDetailed }>(
      ENDPOINTS.COUPONS.VALIDATE(code)
    );
    return 'data' in response ? response.data : response;
  }

  async createCoupon(data: CreateCouponRequest): Promise<CouponDetailed> {
    const response = await apiService.postToken<{ success: boolean; data: CouponDetailed }>(
      ENDPOINTS.COUPONS.CREATE,
      data
    );
    return response.data;
  }

  async updateCoupon(id: number, data: UpdateCouponRequest): Promise<CouponDetailed> {
    const response = await apiService.putToken<{ success: boolean; data: CouponDetailed }>(
      ENDPOINTS.COUPONS.UPDATE(id),
      data
    );
    return response.data;
  }

  async deleteCoupon(id: number): Promise<void> {
    await apiService.deleteToken(ENDPOINTS.COUPONS.DELETE(id));
  }
}

// Purchase Service
export class PurchaseService {
  async getPurchases(): Promise<Purchase[]> {
    const response = await apiService.getToken<{ data: Purchase[] }>(
      ENDPOINTS.PURCHASES.LIST
    );
    return response.data;
  }

  async getPurchase(id: number): Promise<PurchaseDetailed> {
    const response = await apiService.getToken<PurchaseDetailed | { data: PurchaseDetailed }>(
      ENDPOINTS.PURCHASES.DETAIL(id)
    );
    return 'data' in response ? response.data : response;
  }

  async createPurchase(data: CreatePurchaseRequest): Promise<PurchaseDetailed> {
    const response = await apiService.postToken<{ success: boolean; data: PurchaseDetailed }>(
      ENDPOINTS.PURCHASES.CREATE,
      data
    );
    return response.data;
  }

  async updatePurchase(id: number, data: UpdatePurchaseRequest): Promise<PurchaseDetailed> {
    const response = await apiService.putToken<{ success: boolean; data: PurchaseDetailed }>(
      ENDPOINTS.PURCHASES.UPDATE(id),
      data
    );
    return response.data;
  }

  async deletePurchase(id: number): Promise<void> {
    await apiService.deleteToken(ENDPOINTS.PURCHASES.DELETE(id));
  }
}

// Extended Inventory Service
export class ExtendedInventoryService {
  async adjustInventory(data: CreateInventoryAdjustmentRequest): Promise<void> {
    await apiService.postToken(ENDPOINTS.INVENTORY.ADJUST, data);
  }

  async getProductMovements(productId: number): Promise<ProductMovement[]> {
    const response = await apiService.getToken<ProductMovement[] | { data: ProductMovement[] }>(
      `${ENDPOINTS.INVENTORY.MOVEMENTS}?product_id=${productId}`
    );
    return Array.isArray(response) ? response : response.data;
  }
}

// Profile Service
export class ProfileService {
  async getProfile(): Promise<UserProfile> {
    const response = await apiService.getToken<UserProfile | { data: UserProfile }>(
      ENDPOINTS.PROFILE.GET
    );
    return 'data' in response ? response.data : response;
  }

  async updateProfile(data: UpdateProfileRequest): Promise<UserProfile> {
    const response = await apiService.putToken<{ success: boolean; data: UserProfile }>(
      ENDPOINTS.PROFILE.UPDATE,
      data
    );
    return response.data;
  }

  async changePassword(data: ChangePasswordRequest): Promise<void> {
    await apiService.postToken(ENDPOINTS.PROFILE.CHANGE_PASSWORD, data);
  }
}

// Company Service
export class CompanyService {
  async getCompany(): Promise<Company> {
    const response = await apiService.getToken<Company | { data: Company }>(
      ENDPOINTS.COMPANY.INFO
    );
    return 'data' in response ? response.data : response;
  }

  async updateCompany(data: UpdateCompanyRequest): Promise<Company> {
    const response = await apiService.putToken<{ success: boolean; data: Company }>(
      ENDPOINTS.COMPANY.UPDATE,
      data
    );
    return response.data;
  }
}

// Role Service
export class RoleService {
  async getRoles(): Promise<Role[]> {
    const response = await apiService.getToken<Role[] | { data: Role[] }>(
      ENDPOINTS.ROLES.LIST
    );
    return Array.isArray(response) ? response : response.data;
  }

  async getRole(id: number): Promise<Role> {
    const response = await apiService.getToken<Role | { data: Role }>(
      ENDPOINTS.ROLES.DETAIL(id)
    );
    return 'data' in response ? response.data : response;
  }

  async createRole(data: CreateRoleRequest): Promise<Role> {
    const response = await apiService.postToken<{ success: boolean; data: Role }>(
      ENDPOINTS.ROLES.CREATE,
      data
    );
    return response.data;
  }

  async updateRole(id: number, data: UpdateRoleRequest): Promise<Role> {
    const response = await apiService.putToken<{ success: boolean; data: Role }>(
      ENDPOINTS.ROLES.UPDATE(id),
      data
    );
    return response.data;
  }

  async deleteRole(id: number): Promise<void> {
    await apiService.deleteToken(ENDPOINTS.ROLES.DELETE(id));
  }
}

// User Management Service
export class UserManagementService {
  async getUsers(): Promise<UserManagement[]> {
    const response = await apiService.getToken<UserManagement[] | { data: UserManagement[] }>(
      ENDPOINTS.USERS.LIST
    );
    return Array.isArray(response) ? response : response.data;
  }

  async getUser(id: number): Promise<UserManagement> {
    const response = await apiService.getToken<UserManagement | { data: UserManagement }>(
      ENDPOINTS.USERS.DETAIL(id)
    );
    return 'data' in response ? response.data : response;
  }

  async createUser(data: CreateUserRequest): Promise<UserManagement> {
    const response = await apiService.postToken<{ success: boolean; data: UserManagement }>(
      ENDPOINTS.USERS.CREATE,
      data
    );
    return response.data;
  }

  async updateUser(id: number, data: UpdateUserRequest): Promise<UserManagement> {
    const response = await apiService.putToken<{ success: boolean; data: UserManagement }>(
      ENDPOINTS.USERS.UPDATE(id),
      data
    );
    return response.data;
  }

  async deleteUser(id: number): Promise<void> {
    await apiService.deleteToken(ENDPOINTS.USERS.DELETE(id));
  }

  async getHubPermissions(): Promise<string[]> {
    const response = await apiService.getToken<{ permission_name: string }[] | { data: { permission_name: string }[] }>(
      ENDPOINTS.USERS.HUB
    );
    const permissions = Array.isArray(response) ? response : response.data;
    return permissions.map(p => p.permission_name);
  }
}

// Integration Service
export class IntegrationService {
  async getIntegrations(): Promise<Integration[]> {
    const response = await apiService.getToken<Integration[] | { data: Integration[] }>(
      ENDPOINTS.INTEGRATIONS.LIST
    );
    return Array.isArray(response) ? response : response.data;
  }

  async getIntegration(id: number): Promise<Integration> {
    const response = await apiService.getToken<Integration | { data: Integration }>(
      ENDPOINTS.INTEGRATIONS.DETAIL(id)
    );
    return 'data' in response ? response.data : response;
  }

  async createIntegration(data: CreateIntegrationRequest): Promise<Integration> {
    const response = await apiService.postToken<{ success: boolean; data: Integration }>(
      ENDPOINTS.INTEGRATIONS.CREATE,
      data
    );
    return response.data;
  }

  async updateIntegration(id: number, data: UpdateIntegrationRequest): Promise<Integration> {
    const response = await apiService.putToken<{ success: boolean; data: Integration }>(
      ENDPOINTS.INTEGRATIONS.UPDATE(id),
      data
    );
    return response.data;
  }

  async deleteIntegration(id: number): Promise<void> {
    await apiService.deleteToken(ENDPOINTS.INTEGRATIONS.DELETE(id));
  }

  async testIntegration(id: number): Promise<IntegrationTestResponse> {
    const response = await apiService.postToken<IntegrationTestResponse>(
      ENDPOINTS.INTEGRATIONS.TEST(id)
    );
    return response;
  }

  async getIntegrationLogs(id: number): Promise<IntegrationLog[]> {
    const response = await apiService.getToken<IntegrationLog[] | { data: IntegrationLog[] }>(
      ENDPOINTS.INTEGRATIONS.LOGS(id)
    );
    return Array.isArray(response) ? response : response.data;
  }

  async getIntegrationStats(id: number): Promise<IntegrationStats> {
    const response = await apiService.getToken<IntegrationStats | { data: IntegrationStats }>(
      ENDPOINTS.INTEGRATIONS.STATS(id)
    );
    return 'data' in response ? response.data : response;
  }
}

// Export service instances
export const categoryService = new CategoryService();
export const extendedProductService = new ExtendedProductService();
export const customerService = new CustomerService();
export const salesService = new SalesService();
export const warehouseService = new WarehouseService();
export const taxService = new TaxService();
export const couponService = new CouponService();
export const purchaseService = new PurchaseService();
export const extendedInventoryService = new ExtendedInventoryService();
export const profileService = new ProfileService();
export const companyService = new CompanyService();
export const roleService = new RoleService();
export const userManagementService = new UserManagementService();
export const integrationService = new IntegrationService();
