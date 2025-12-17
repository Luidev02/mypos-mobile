// Formatear moneda colombiana (COP)
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Formatear número sin símbolo de moneda
export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Formatear fecha
export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
};

// Formatear fecha y hora
export const formatDateTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
};

// Validar stock
export const validateStock = (current: number, requested: number): boolean => {
  return current >= requested;
};

// Calcular IVA
export const calculateTax = (subtotal: number, taxRate: number = 0.19): number => {
  return subtotal * taxRate;
};

// Calcular total con IVA
export const calculateTotal = (subtotal: number, taxRate: number = 0.19): number => {
  return subtotal + calculateTax(subtotal, taxRate);
};

// Calcular cambio
export const calculateChange = (total: number, received: number): number => {
  return Math.max(0, received - total);
};

// Validar email
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Truncar texto
export const truncate = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

// Obtener saludo según hora del día
export const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
};

// Determinar nivel de stock
export const getStockLevel = (current: number, minimum: number = 10): 'high' | 'medium' | 'low' | 'empty' => {
  if (current === 0) return 'empty';
  if (current <= 5) return 'low';
  if (current <= minimum) return 'medium';
  return 'high';
};

// Colores según nivel de stock
export const getStockColor = (current: number, colors: any): string => {
  const level = getStockLevel(current);
  switch (level) {
    case 'empty':
      return colors.error;
    case 'low':
      return colors.warning;
    case 'medium':
      return colors.info;
    default:
      return colors.success;
  }
};
