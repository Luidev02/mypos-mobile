// Configuración de API
export const API_CONFIG = {
  BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'https://mypost-api.clicfstudios.com',
  TIMEOUT: 30000,
  TOKEN_KEY: 'chococrispy',
  USER_INFO_KEY: 'userInfo',
};

// Endpoints
export const ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: '/api/user/login',
    LOGOUT: '/api/user/logout',
  },

  // POS
  POS: {
    CATEGORIES: '/api/pos/categories',
    CATEGORY_PRODUCTS: (id: number) => `/api/pos/categories/${id}/products`,
    PRODUCTS_SEARCH: '/api/pos/products/search',
    CUSTOMERS_SEARCH: '/api/pos/customers/search',
    SALES: '/api/pos/sales',
    ORDERS_RECENT: '/api/pos/orders/recent',
    ORDER_DETAIL: (id: number) => `/api/pos/orders/${id}`,
    ORDER_PAUSE: '/api/pos/orders/pause',
    ORDER_DELETE: (id: number) => `/api/pos/orders/${id}`,
    SHIFTS: {
      ACTIVE: '/api/pos/shifts/active',
      OPEN: '/api/pos/shifts/open',
      CLOSE: (id: number) => `/api/pos/shifts/${id}/close`,
      DETAIL: (id: number) => `/api/pos/shifts/${id}`,
      HISTORY: '/api/shifts/history/me',
      CURRENT: '/api/shifts/active/current',
    },
    CASH_REGISTERS: '/api/pos/cash-registers',
    CASH_REGISTER_DETAIL: (id: number) => `/api/pos/cash-registers/${id}`,
  },

  // Products
  PRODUCTS: {
    LIST: '/api/products',
    DETAIL: (id: number) => `/api/products/${id}`,
    CREATE: '/api/products',
    UPDATE: (id: number) => `/api/products/${id}`,
    DELETE: (id: number) => `/api/products/${id}`,
    IMAGE: (id: number) => `/api/products/${id}/image`,
  },

  // Inventory
  INVENTORY: {
    LIST: '/api/inventory',
    LOW_STOCK: '/api/inventory/low-stock',
    MOVEMENTS: '/api/inventory/movements',
    ADJUST: '/api/inventory/adjust',
  },

  // Customers
  CUSTOMERS: {
    LIST: '/api/customers',
    DETAIL: (id: number) => `/api/customers/${id}`,
    CREATE: '/api/customers',
    UPDATE: (id: number) => `/api/customers/${id}`,
    SEARCH: '/api/pos/customers/search',
  },

  // Categories
  CATEGORIES: {
    LIST: '/api/categories',
    DETAIL: (id: number) => `/api/categories/${id}`,
    CREATE: '/api/categories',
    UPDATE: (id: number) => `/api/categories/${id}`,
    DELETE: (id: number) => `/api/categories/${id}`,
    IMAGE: (id: number) => `/api/categories/image/${id}`,
  },

  // Coupons
  COUPONS: {
    LIST: '/api/coupons',
    DETAIL: (id: number) => `/api/coupons/${id}`,
    VALIDATE: (code: string) => `/api/coupons/${code}`,
    CREATE: '/api/coupons',
    UPDATE: (id: number) => `/api/coupons/${id}`,
    DELETE: (id: number) => `/api/coupons/${id}`,
  },

  // Sales
  SALES: {
    LIST: '/api/sales',
    DETAIL: (id: number) => `/api/sales/${id}`,
  },

  // Warehouses
  WAREHOUSES: {
    LIST: '/api/warehouses',
    DETAIL: (id: number) => `/api/warehouses/${id}`,
    CREATE: '/api/warehouses',
    UPDATE: (id: number) => `/api/warehouses/${id}`,
    DELETE: (id: number) => `/api/warehouses/${id}`,
    STOCK: (id: number) => `/api/inventory/warehouse/${id}/stock`,
  },

  // Taxes
  TAXES: {
    LIST: '/api/taxes',
    DETAIL: (id: number) => `/api/taxes/${id}`,
    CREATE: '/api/taxes',
    UPDATE: (id: number) => `/api/taxes/${id}`,
    DELETE: (id: number) => `/api/taxes/${id}`,
  },

  // Purchases
  PURCHASES: {
    LIST: '/api/purchases',
    DETAIL: (id: number) => `/api/purchases/${id}`,
    CREATE: '/api/purchases',
    UPDATE: (id: number) => `/api/purchases/${id}`,
    DELETE: (id: number) => `/api/purchases/${id}`,
  },

  // Reports
  REPORTS: {
    SALES: '/api/reports/sales',
    PRODUCTS: '/api/reports/products',
    INVENTORY: '/api/reports/inventory',
    CUSTOMERS: '/api/reports/customers',
    FINANCIAL: '/api/reports/financial',
    TAXES: '/api/reports/taxes',
    TOP_PRODUCTS: '/api/reports/top-products',
    REVENUE: '/api/reports/revenue',
  },

  // Profile
  PROFILE: {
    GET: '/api/profile',
    UPDATE: '/api/profile',
    CHANGE_PASSWORD: '/api/profile/change-password',
  },

  // Company
  COMPANY: {
    INFO: '/api/company',
    UPDATE: '/api/company',
  },

  // Roles
  ROLES: {
    LIST: '/api/roles',
    DETAIL: (id: number) => `/api/roles/${id}`,
    CREATE: '/api/roles',
    UPDATE: (id: number) => `/api/roles/${id}`,
    DELETE: (id: number) => `/api/roles/${id}`,
  },

  // Users
  USERS: {
    LIST: '/api/users',
    DETAIL: (id: number) => `/api/users/${id}`,
    CREATE: '/api/users',
    UPDATE: (id: number) => `/api/users/${id}`,
    DELETE: (id: number) => `/api/users/${id}`,
    HUB: '/api/hub',
  },

  // Integrations
  INTEGRATIONS: {
    LIST: '/api/integrations',
    DETAIL: (id: number) => `/api/integrations/${id}`,
    CREATE: '/api/integrations',
    UPDATE: (id: number) => `/api/integrations/${id}`,
    DELETE: (id: number) => `/api/integrations/${id}`,
    TEST: (id: number) => `/api/integrations/${id}/test`,
    LOGS: (id: number) => `/api/integrations/${id}/logs`,
    STATS: (id: number) => `/api/integrations/${id}/stats`,
  },
};
