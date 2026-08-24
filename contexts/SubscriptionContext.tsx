import { subscriptionService } from '@/services';
import type { Subscription } from '@/types';
import { APP_EVENTS, appEvents } from '@/utils/events';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

interface SubscriptionContextType {
  subscription: Subscription | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

const REFRESH_INTERVAL_MS = 3 * 60 * 60 * 1000; // 3 horas, igual que el web

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    if (!isAuthenticated) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    try {
      const result = await subscriptionService.getStatus();
      setSubscription(result);
    } catch {
      // No bloquear la app si el endpoint falla — igual que en el web.
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    setLoading(true);
    fetchStatus();
    const interval = setInterval(fetchStatus, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Ante un 402 SUBSCRIPTION_BLOCKED (emitido desde services/api.ts),
  // refrescar el estado para que el modal bloqueante se muestre al momento.
  useEffect(() => {
    return appEvents.on(APP_EVENTS.SUBSCRIPTION_BLOCKED, fetchStatus);
  }, [fetchStatus]);

  return (
    <SubscriptionContext.Provider value={{ subscription, loading, refetch: fetchStatus }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
