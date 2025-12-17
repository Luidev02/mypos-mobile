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
    PRODUCTS: '/api/pos/products',
    CUSTOMERS: '/api/pos/customers',
    SALES: '/api/pos/sales',
    SHIFTS: {
      ACTIVE: '/api/pos/shifts/active',
      OPEN: '/api/pos/shifts/open',
      CLOSE: '/api/pos/shifts/close',
    },
    CASH_REGISTERS: '/api/pos/cash-registers',
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
  },

  // Reports
  REPORTS: {
    SALES: '/api/reports/sales',
    TOP_PRODUCTS: '/api/reports/top-products',
    REVENUE: '/api/reports/revenue',
  },

  // Company
  COMPANY: {
    INFO: '/api/company',
    UPDATE: '/api/company',
  },

  // Users
  USERS: {
    LIST: '/api/users',
    HUB: '/api/hub',
  },
};
