import { ENDPOINTS } from '@/constants/api';
import type {
  CreditSettings,
  CustomerAccount,
  Debt,
  DebtPayment,
  Debtor,
  DebtsSummary,
} from '@/types';
import { apiService } from './api';

/**
 * Módulo de deudores en la app: fiado, préstamos y abonos.
 *
 * El backend no envuelve sus respuestas de forma uniforme (unas devuelven el
 * envelope de `ResponseHandler`, otras el dato pelado), así que se desenvuelve
 * aquí una sola vez y las pantallas reciben siempre el dato.
 */

function unwrap<T>(res: any): T {
  return (res?.data !== undefined ? res.data : res) as T;
}

/** Error normalizado: el POS necesita el `code` para saber qué ofrecer. */
export interface DebtApiError {
  status: number;
  code: string;
  message: string;
  details: Record<string, any>;
}

export function parseDebtError(error: any): DebtApiError {
  const body = error?.response?.data || {};
  return {
    status: error?.response?.status || 0,
    code: body.code || body.error || 'UNKNOWN',
    message: body.message || error?.message || 'Ocurrió un error inesperado',
    details: body.details || {},
  };
}

function qs(params: Record<string, any> = {}): string {
  const parts: string[] = [];
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== false) {
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    }
  });
  return parts.length ? `?${parts.join('&')}` : '';
}

export class DebtsService {

  // ── Consultas ───────────────────────────────────────────────────

  async getSummary(): Promise<DebtsSummary> {
    return unwrap<DebtsSummary>(await apiService.getToken<any>(ENDPOINTS.DEBTS.SUMMARY));
  }

  async listDebtors(params: {
    q?: string;
    only_overdue?: boolean;
    order_by?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ items: Debtor[]; total: number }> {
    const res = unwrap<any>(await apiService.getToken<any>(ENDPOINTS.DEBTS.DEBTORS + qs(params)));
    return { items: res?.items || [], total: res?.total || 0 };
  }

  async listDebts(params: Record<string, any> = {}): Promise<{ items: Debt[]; total: number }> {
    const res = unwrap<any>(await apiService.getToken<any>(ENDPOINTS.DEBTS.LIST + qs(params)));
    return { items: res?.items || [], total: res?.total || 0 };
  }

  async getDebt(id: number): Promise<Debt> {
    return unwrap<Debt>(await apiService.getToken<any>(ENDPOINTS.DEBTS.DETAIL(id)));
  }

  async getCustomerAccount(customerId: number): Promise<CustomerAccount> {
    return unwrap<CustomerAccount>(
      await apiService.getToken<any>(ENDPOINTS.DEBTS.CUSTOMER_ACCOUNT(customerId))
    );
  }

  async getSettings(): Promise<CreditSettings> {
    return unwrap<CreditSettings>(await apiService.getToken<any>(ENDPOINTS.DEBTS.SETTINGS));
  }

  async getReceipt(paymentId: number): Promise<{ payment: DebtPayment; company: any }> {
    return unwrap<{ payment: DebtPayment; company: any }>(
      await apiService.getToken<any>(ENDPOINTS.DEBTS.RECEIPT(paymentId))
    );
  }

  // ── Escritura ───────────────────────────────────────────────────

  async createDebt(body: {
    type: 'loan' | 'manual';
    customer_id: number;
    principal_amount: number;
    description?: string | null;
    notes?: string | null;
    due_date?: string | null;
    interest_type?: 'none' | 'fixed' | 'percent';
    interest_rate?: number;
    disbursement_method?: 'cash' | 'transfer' | null;
    force_limit?: boolean;
  }): Promise<Debt> {
    return unwrap<Debt>(await apiService.postToken<any>(ENDPOINTS.DEBTS.CREATE, body));
  }

  async registerPayment(debtId: number, body: {
    amount: number;
    payment_method: 'cash' | 'card' | 'transfer' | 'other';
    reference?: string | null;
    notes?: string | null;
  }): Promise<{ payment: DebtPayment; fully_paid: boolean }> {
    return unwrap<{ payment: DebtPayment; fully_paid: boolean }>(
      await apiService.postToken<any>(ENDPOINTS.DEBTS.PAYMENTS(debtId), body)
    );
  }

  async voidPayment(paymentId: number, reason: string): Promise<{ debt: Debt; shift_closed: boolean }> {
    return unwrap<{ debt: Debt; shift_closed: boolean }>(
      await apiService.postToken<any>(ENDPOINTS.DEBTS.VOID_PAYMENT(paymentId), { reason })
    );
  }

  async cancelDebt(debtId: number, reason: string): Promise<Debt> {
    return unwrap<Debt>(await apiService.postToken<any>(ENDPOINTS.DEBTS.CANCEL(debtId), { reason }));
  }

  async updateDebt(debtId: number, body: {
    description?: string | null;
    notes?: string | null;
    due_date?: string | null;
  }): Promise<Debt> {
    return unwrap<Debt>(await apiService.putToken<any>(ENDPOINTS.DEBTS.UPDATE(debtId), body));
  }

  async updateSettings(body: Partial<CreditSettings>): Promise<CreditSettings> {
    return unwrap<CreditSettings>(await apiService.putToken<any>(ENDPOINTS.DEBTS.SETTINGS, body));
  }
}

export const debtsService = new DebtsService();
export default debtsService;
