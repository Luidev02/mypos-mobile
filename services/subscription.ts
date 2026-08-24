import { ENDPOINTS } from '@/constants/api';
import type { Subscription } from '@/types';
import { apiService } from './api';

class SubscriptionService {
  async getStatus(): Promise<Subscription | null> {
    const response = await apiService.getToken<{ data: Subscription }>(
      ENDPOINTS.SUBSCRIPTION.STATUS
    );
    return response?.data ?? null;
  }
}

export const subscriptionService = new SubscriptionService();
