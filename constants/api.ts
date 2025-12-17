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

  // Coupons
  COUPONS: {
    VALIDATE: (code: string) => `/api/coupons/${code}`,
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
