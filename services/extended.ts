import { ENDPOINTS } from '@/constants/api';
import type {
    AiHistoryItem,
    AiQueryResponse,
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
    CreateInvoicingResolutionRequest,
    CreateSupplierRequest,
    CreateRoleRequest,
    CreateTaxRequest,
    CreateUserRequest,
    CreateWarehouseRequest,
    CustomerDetailed,
    DianRetryResponse,
    DianStatusResponse,
    Integration,
    IntegrationLog,
    IntegrationStats,
    IntegrationTestResponse,
    InvoicingResolution,
    LowStockItem,
    MatiasConfig,
    MeasurementUnit,
    Municipality,
    PlanUsage,
    Permission,
    ProductDetailed,
    ProductMovement,
    Purchase,
    PurchaseDetailed,
    PurchaseStatus,
    SaveMatiasConfigRequest,
    Supplier,
    Role,
    SaleDetailed,
    Tax,
    TestMatiasConnectionResponse,
    UpdateCategoryRequest,
    UpdateCompanyRequest,
    UpdateCouponRequest,
    UpdateCustomerRequest,
    UpdateIntegrationRequest,
    UpdateInvoicingResolutionRequest,
    UpdateProductRequest,
    UpdateProfileRequest,
    UpdatePurchaseRequest,
    UpdateSupplierRequest,
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
    const response = await apiService.getToken<any>(ENDPOINTS.CATEGORIES.DETAIL(id));
    console.log('=== RESPUESTA DEL SERVICIO ===');
    console.log('Response completa:', JSON.stringify(response, null, 2));
    
    let result: CategoryDetailed;
    
    // Si la respuesta es un array con un solo elemento
    if (Array.isArray(response)) {
      result = response[0];
    }
    // Si tiene data y es un array
    else if (response.data && Array.isArray(response.data)) {
      result = response.data[0];
    }
    // Si tiene data y es un objeto
    else if (response.data && typeof response.data === 'object') {
      result = response.data;
    }
    // Si es un objeto directo
    else {
      result = response;
    }
    
    console.log('Resultado final:', JSON.stringify(result, null, 2));
    return result;
  }

  // `category.controller.js` NO envuelve la respuesta en `{ data }` al crear
  // (devuelve `{ id, name, image }` en el nivel raíz), y al actualizar solo
  // devuelve `{ message, data: { name, image } }` — sin `id`. Ninguno de los
  // dos es un `CategoryDetailed` completo, así que se tipan como lo que
  // realmente son y el llamador debe refrescar la lista tras guardar.
  async createCategory(data: CreateCategoryRequest): Promise<{ id: number; name: string; image: string }> {
    const formData = new FormData();
    formData.append('name', data.name);
    if (data.image) {
      formData.append('image', data.image);
    }

    return apiService.postToken<{ id: number; name: string; image: string }>(
      ENDPOINTS.CATEGORIES.CREATE,
      formData
    );
  }

  async updateCategory(id: number, data: UpdateCategoryRequest): Promise<void> {
    const formData = new FormData();
    formData.append('name', data.name);
    if (data.image) {
      formData.append('image', data.image);
    }

    await apiService.putToken(ENDPOINTS.CATEGORIES.UPDATE(id), formData);
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

  async getMeasurementUnits(): Promise<MeasurementUnit[]> {
    const response = await apiService.getToken<MeasurementUnit[] | { data: MeasurementUnit[] }>(
      ENDPOINTS.PRODUCTS.MEASUREMENT_UNITS
    );
    return Array.isArray(response) ? response : response.data;
  }

  // `products.service.js` (createProduct/updateProduct) responde con
  // `{ id, ...data }` — un eco de lo enviado, NO el producto completo
  // (sin stock, category_name, tax_name...). Por eso el llamador debe
  // refrescar la lista tras guardar, igual que hace el web.
  async createProduct(data: CreateProductRequest): Promise<{ id: number }> {
    const formData = new FormData();
    
    // Separar la imagen del resto de los datos
    const { image, ...productData } = data as any;
    
    // Agregar campos normales
    Object.keys(productData).forEach(key => {
      const value = productData[key];
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });
    
    // Agregar imagen si existe
    if (image) {
      const imageFile = {
        uri: image.uri,
        type: image.mimeType || image.type || 'image/jpeg',
        name: image.fileName || image.name || 'product.jpg',
      } as any;
      formData.append('image', imageFile);
    }
    
    const response = await apiService.postToken<{ success: boolean; data: { id: number } }>(
      ENDPOINTS.PRODUCTS.CREATE,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  }

  async updateProduct(id: number, data: UpdateProductRequest): Promise<{ id: number }> {
    const formData = new FormData();
    
    // Separar la imagen del resto de los datos
    const { image, ...productData } = data as any;
    
    // Agregar campos normales
    Object.keys(productData).forEach(key => {
      const value = productData[key];
      if (value !== undefined && value !== null && key !== 'id') {
        formData.append(key, value.toString());
      }
    });
    
    // Agregar imagen si existe
    if (image) {
      const imageFile = {
        uri: image.uri,
        type: image.mimeType || image.type || 'image/jpeg',
        name: image.fileName || image.name || 'product.jpg',
      } as any;
      formData.append('image', imageFile);
    }
    
    const response = await apiService.putToken<{ success: boolean; data: { id: number } }>(
      ENDPOINTS.PRODUCTS.UPDATE(id),
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
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
  // Sin filtros, `GET /api/sales` devuelve hasta 500 ventas de toda la
  // historia (el backend solo acota por `date_from`/`date_to` si se envían)
  // — igual que `sales/index.jsx` en el web, que siempre manda un rango de
  // fechas (por defecto hoy→hoy) en vez de pedir todo sin acotar.
  async getSales(filters?: { date_from?: string; date_to?: string; limit?: number }): Promise<SaleDetailed[]> {
    const params = new URLSearchParams();
    if (filters?.date_from) params.set('date_from', filters.date_from);
    if (filters?.date_to) params.set('date_to', filters.date_to);
    params.set('limit', String(filters?.limit ?? 500));

    const response = await apiService.getToken<any>(`${ENDPOINTS.SALES.LIST}?${params.toString()}`);

    // Manejar diferentes formatos de respuesta
    if (Array.isArray(response)) {
      return response;
    } else if (response.data && Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  }

  async getSale(id: number): Promise<SaleDetailed> {
    const response = await apiService.getToken<any>(ENDPOINTS.SALES.DETAIL(id));

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

  // `/api/dian/*` no usa `ResponseHandler` (a diferencia del resto del API) —
  // la respuesta cruda ya trae el shape final, no hay `.data` que desenvolver
  // salvo en el retry (ver `DianRetryResponse`).
  async getDianStatus(saleId: number): Promise<DianStatusResponse> {
    const response = await apiService.getToken<{ ok: boolean; data: DianStatusResponse; message?: string }>(
      ENDPOINTS.DIAN.STATUS(saleId)
    );
    if (!response.ok) {
      throw new Error(response.message || 'No se pudo consultar el estado DIAN');
    }
    return response.data;
  }

  async retryDianInvoice(saleId: number): Promise<DianRetryResponse> {
    return apiService.postToken<DianRetryResponse>(ENDPOINTS.DIAN.RETRY(saleId), {});
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

  /**
   * `coupons.controller.js` solo expone `GET /:code` (busca por columna
   * `code`, no por `id`) — no existe un `GET /:id`. Para editar/ver el
   * detalle de un cupón se usa `getCoupons()` + búsqueda por `id` en el
   * cliente (ver `app/coupons/[id].tsx` y `app/coupons/new.tsx`).
   */
  async getCouponByCode(code: string): Promise<CouponDetailed> {
    const response = await apiService.getToken<CouponDetailed | { data: CouponDetailed }>(
      ENDPOINTS.COUPONS.VALIDATE(code)
    );
    return 'data' in response ? response.data : response;
  }

  async validateCoupon(code: string): Promise<CouponDetailed> {
    return this.getCouponByCode(code);
  }

  // El backend responde `{ id, message }` (sin `data`), no el cupón completo.
  async createCoupon(data: CreateCouponRequest): Promise<{ id: number }> {
    const response = await apiService.postToken<{ id: number; message: string }>(
      ENDPOINTS.COUPONS.CREATE,
      data
    );
    return { id: response.id };
  }

  // El backend responde solo `{ message }` al actualizar.
  async updateCoupon(id: number, data: UpdateCouponRequest): Promise<void> {
    await apiService.putToken(ENDPOINTS.COUPONS.UPDATE(id), data);
  }

  async deleteCoupon(id: number): Promise<void> {
    await apiService.deleteToken(ENDPOINTS.COUPONS.DELETE(id));
  }
}

// Purchase Service
export class PurchaseService {
  async getPurchases(): Promise<Purchase[]> {
    const response = await apiService.getToken<Purchase[] | { data: Purchase[] }>(
      ENDPOINTS.PURCHASES.LIST
    );
    return Array.isArray(response) ? response : response.data;
  }

  async getPurchase(id: number): Promise<PurchaseDetailed> {
    const response = await apiService.getToken<PurchaseDetailed | { data: PurchaseDetailed }>(
      ENDPOINTS.PURCHASES.DETAIL(id)
    );
    return 'data' in response ? response.data : response;
  }

  async createPurchase(data: CreatePurchaseRequest): Promise<PurchaseDetailed> {
    const response = await apiService.postToken<{ data: PurchaseDetailed }>(
      ENDPOINTS.PURCHASES.CREATE,
      data
    );
    return response.data;
  }

  // El backend NO admite actualizar `items` por esta vía — solo cabecera
  // (ver `UpdatePurchaseRequest`).
  async updatePurchase(id: number, data: UpdatePurchaseRequest): Promise<PurchaseDetailed> {
    const response = await apiService.putToken<{ data: PurchaseDetailed }>(
      ENDPOINTS.PURCHASES.UPDATE(id),
      data
    );
    return response.data;
  }

  // `PATCH /api/purchases/:id/status` — valida contra `['ordered','received','cancelled']`
  // server-side; a diferencia de `updatePurchase`, esta ruta es la que usa el
  // web para cambiar de estado. No toca stock/inventario en ningún caso — el
  // stock solo se aplica una vez, al crear con `status: 'received'`.
  async updatePurchaseStatus(id: number, status: PurchaseStatus): Promise<void> {
    await apiService.patchToken(ENDPOINTS.PURCHASES.UPDATE_STATUS(id), { status });
  }

  async deletePurchase(id: number): Promise<void> {
    await apiService.deleteToken(ENDPOINTS.PURCHASES.DELETE(id));
  }
}

// Supplier Service — el web solo consume `GET /api/suppliers` (dropdown del
// formulario de compra, sin pantalla de administración propia), pero el
// backend expone CRUD completo; se deja disponible por si una fase futura
// (o el propio módulo de compras) necesita más que el picker.
export class SupplierService {
  async getSuppliers(): Promise<Supplier[]> {
    const response = await apiService.getToken<Supplier[] | { data: Supplier[] }>(
      ENDPOINTS.SUPPLIERS.LIST
    );
    return Array.isArray(response) ? response : response.data;
  }

  async getSupplier(id: number): Promise<Supplier> {
    const response = await apiService.getToken<Supplier | { data: Supplier }>(
      ENDPOINTS.SUPPLIERS.DETAIL(id)
    );
    return 'data' in response ? response.data : response;
  }

  async createSupplier(data: CreateSupplierRequest): Promise<Supplier> {
    const response = await apiService.postToken<{ data: Supplier }>(ENDPOINTS.SUPPLIERS.LIST, data);
    return response.data;
  }

  async updateSupplier(id: number, data: UpdateSupplierRequest): Promise<Supplier> {
    const response = await apiService.putToken<{ data: Supplier }>(ENDPOINTS.SUPPLIERS.DETAIL(id), data);
    return response.data;
  }

  async deleteSupplier(id: number): Promise<void> {
    await apiService.deleteToken(ENDPOINTS.SUPPLIERS.DETAIL(id));
  }
}

// Extended Inventory Service
export class ExtendedInventoryService {
  async adjustInventory(data: CreateInventoryAdjustmentRequest): Promise<void> {
    await apiService.postToken(ENDPOINTS.INVENTORY.ADJUST, data);
  }

  async getProductMovements(productId: number, limit: number = 100): Promise<ProductMovement[]> {
    const response = await apiService.getToken<ProductMovement[] | { data: ProductMovement[] }>(
      `${ENDPOINTS.INVENTORY.PRODUCT_MOVEMENTS(productId)}?limit=${limit}`
    );
    return Array.isArray(response) ? response : response.data;
  }

  async getWarehouseMovements(warehouseId: number, limit: number = 100): Promise<ProductMovement[]> {
    const response = await apiService.getToken<ProductMovement[] | { data: ProductMovement[] }>(
      `${ENDPOINTS.INVENTORY.WAREHOUSE_MOVEMENTS(warehouseId)}?limit=${limit}`
    );
    return Array.isArray(response) ? response : response.data;
  }

  async getLowStock(warehouseId?: number): Promise<LowStockItem[]> {
    const url = warehouseId
      ? `${ENDPOINTS.INVENTORY.LOW_STOCK}?warehouseId=${warehouseId}`
      : ENDPOINTS.INVENTORY.LOW_STOCK;
    const response = await apiService.getToken<LowStockItem[] | { data: LowStockItem[] }>(url);
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

  // El backend confirma éxito pero no re-envía el perfil actualizado
  // (`profile.service.js` responde con `data: null`) — igual que el web,
  // hay que volver a pedir el perfil tras guardar.
  async updateProfile(data: UpdateProfileRequest): Promise<void> {
    await apiService.putToken(ENDPOINTS.PROFILE.UPDATE, data);
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

  // El backend responde `data: null` (`ResponseHandler.success(null, ...)`)
  // — no reenvía la empresa actualizada, hay que volver a pedir `getCompany()`.
  async updateCompany(data: UpdateCompanyRequest): Promise<void> {
    await apiService.putToken(ENDPOINTS.COMPANY.UPDATE, data);
  }

  async getPlanUsage(): Promise<PlanUsage> {
    const response = await apiService.getToken<PlanUsage | { data: PlanUsage }>(
      ENDPOINTS.COMPANY.PLAN_USAGE
    );
    return 'data' in response ? response.data : response;
  }
}

// Matias (proveedor DIAN) — único "integrations" realmente funcional; el
// resto de `/api/integrations/*` que consume `IntegrationService` no existe
// en el backend (confirmado leyendo todas las rutas registradas), así que
// no se construye pantalla alguna contra ese servicio.
export class MatiasConfigService {
  async getConfig(): Promise<MatiasConfig> {
    const response = await apiService.getToken<MatiasConfig | { data: MatiasConfig }>(
      ENDPOINTS.COMPANY.MATIAS_CONFIG
    );
    return 'data' in response ? response.data : response;
  }

  // Responde `data: null` — no reenvía la config guardada.
  async saveConfig(data: SaveMatiasConfigRequest): Promise<void> {
    await apiService.putToken(ENDPOINTS.COMPANY.MATIAS_CONFIG, data);
  }

  // Prueba de conexión real contra MATIAS (no es un stub) — si se omiten
  // email/password usa las credenciales ya guardadas.
  async testConnection(data?: { email: string; password: string }): Promise<TestMatiasConnectionResponse> {
    const response = await apiService.postToken<{ data: TestMatiasConnectionResponse } | TestMatiasConnectionResponse>(
      ENDPOINTS.COMPANY.MATIAS_CONFIG_TEST,
      data || {}
    );
    return 'data' in response ? response.data : response;
  }
}

// Resoluciones de facturación (DIAN/POS)
export class InvoicingResolutionsService {
  async getResolutions(): Promise<InvoicingResolution[]> {
    const response = await apiService.getToken<InvoicingResolution[] | { data: InvoicingResolution[] }>(
      ENDPOINTS.INVOICING_RESOLUTIONS.LIST
    );
    return Array.isArray(response) ? response : response.data;
  }

  async createResolution(data: CreateInvoicingResolutionRequest): Promise<InvoicingResolution> {
    const response = await apiService.postToken<{ data: InvoicingResolution }>(
      ENDPOINTS.INVOICING_RESOLUTIONS.CREATE,
      data
    );
    return response.data;
  }

  async updateResolution(id: number, data: UpdateInvoicingResolutionRequest): Promise<InvoicingResolution> {
    const response = await apiService.putToken<{ data: InvoicingResolution }>(
      ENDPOINTS.INVOICING_RESOLUTIONS.UPDATE(id),
      data
    );
    return response.data;
  }

  // Bloqueado (400) si la resolución sigue activa — hay que desactivarla primero.
  async deleteResolution(id: number): Promise<void> {
    await apiService.deleteToken(ENDPOINTS.INVOICING_RESOLUTIONS.DELETE(id));
  }

  async toggleResolution(id: number): Promise<InvoicingResolution> {
    const response = await apiService.patchToken<{ data: InvoicingResolution }>(
      ENDPOINTS.INVOICING_RESOLUTIONS.TOGGLE(id)
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
    const response = await apiService.postToken<{ data: Role }>(ENDPOINTS.ROLES.CREATE, data);
    return response.data;
  }

  // Solo `role_name`/`status` — los permisos se guardan aparte
  // (`updateRolePermissions`), ver nota en `UpdateRoleRequest`.
  async updateRole(id: number, data: UpdateRoleRequest): Promise<Role> {
    const response = await apiService.putToken<{ data: Role }>(ENDPOINTS.ROLES.UPDATE(id), data);
    return response.data;
  }

  async deleteRole(id: number): Promise<void> {
    await apiService.deleteToken(ENDPOINTS.ROLES.DELETE(id));
  }

  async getPermissions(): Promise<Permission[]> {
    const response = await apiService.getToken<Permission[] | { data: Permission[] }>(
      ENDPOINTS.PERMISSIONS.LIST
    );
    return Array.isArray(response) ? response : response.data;
  }

  // `GET /api/roles/:id/permissions` devuelve un arreglo plano de IDs
  // numéricos — no objetos, no envuelto en `{permissions:[...]}`.
  async getRolePermissionIds(roleId: number): Promise<number[]> {
    const response = await apiService.getToken<number[] | { data: number[] }>(
      ENDPOINTS.ROLES.PERMISSIONS(roleId)
    );
    return Array.isArray(response) ? response : response.data;
  }

  // `PUT /api/roles/:id/permissions` — body `{permissions: number[]}`,
  // reemplaza todos los permisos del rol (delete-then-insert server-side).
  // Bloqueado (403) para roles base del sistema.
  async updateRolePermissions(roleId: number, permissionIds: number[]): Promise<Permission[]> {
    const response = await apiService.putToken<{ data: Permission[] }>(
      ENDPOINTS.ROLES.PERMISSIONS(roleId),
      { permissions: permissionIds }
    );
    return response.data;
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

// Clase combinada para user management
class ExtendedUserService extends UserManagementService {
  private roleServiceInstance = new RoleService();

  async getRoles() {
    return this.roleServiceInstance.getRoles();
  }

  async getRole(id: number) {
    return this.roleServiceInstance.getRole(id);
  }

  async createRole(data: CreateRoleRequest) {
    return this.roleServiceInstance.createRole(data);
  }

  async updateRole(id: number, data: UpdateRoleRequest) {
    return this.roleServiceInstance.updateRole(id, data);
  }

  async deleteRole(id: number) {
    return this.roleServiceInstance.deleteRole(id);
  }

  async getPermissions() {
    return this.roleServiceInstance.getPermissions();
  }

  async getRolePermissionIds(roleId: number) {
    return this.roleServiceInstance.getRolePermissionIds(roleId);
  }

  async updateRolePermissions(roleId: number, permissionIds: number[]) {
    return this.roleServiceInstance.updateRolePermissions(roleId, permissionIds);
  }
}

// AI Chat Service — a diferencia del web (`ai-chat/index.jsx`, un mockup 100%
// estático con input deshabilitado), el backend real (`POST /api/ai/query` →
// `mypos-ai-service`, Gemini + ejecución de intents contra el propio backend
// de myPOS) sí está operativo, así que acá se implementa el chat funcional.
export class AiChatService {
  async query(message: string, history: AiHistoryItem[]): Promise<AiQueryResponse> {
    // El validador del ai-service acepta hasta 12 entradas de historial.
    const trimmedHistory = history.slice(-12);
    const response = await apiService.postToken<{ data: AiQueryResponse }>(ENDPOINTS.AI.QUERY, {
      message,
      history: trimmedHistory,
    });
    return response.data;
  }
}

// Municipality Service — usado por el autocompletado del formulario de clientes
export class MunicipalityService {
  async search(query: string): Promise<Municipality[]> {
    const response = await apiService.getToken<Municipality[] | { data: Municipality[] }>(
      ENDPOINTS.MUNICIPALITIES.SEARCH(query)
    );
    return Array.isArray(response) ? response : response.data;
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
export const supplierService = new SupplierService();
export const extendedInventoryService = new ExtendedInventoryService();
export const profileService = new ProfileService();
export const companyService = new CompanyService();
export const roleService = new RoleService();
export const userManagementService = new UserManagementService();
export const integrationService = new IntegrationService();
export const extendedUserService = new ExtendedUserService();
export const municipalityService = new MunicipalityService();
export const matiasConfigService = new MatiasConfigService();
export const invoicingResolutionsService = new InvoicingResolutionsService();
export const aiChatService = new AiChatService();
