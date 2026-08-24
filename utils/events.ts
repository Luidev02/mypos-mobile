// Emisor de eventos mínimo — equivalente RN de los `window.dispatchEvent` /
// `window.addEventListener` que usa el frontend web para desacoplar el
// cliente HTTP (services/api.ts) de los contextos que reaccionan a sus
// eventos (por ejemplo, SubscriptionContext ante un 402).

type Listener = () => void;

class EventBus {
  private listeners: Record<string, Set<Listener>> = {};

  on(event: string, listener: Listener): () => void {
    if (!this.listeners[event]) this.listeners[event] = new Set();
    this.listeners[event].add(listener);
    return () => this.off(event, listener);
  }

  off(event: string, listener: Listener): void {
    this.listeners[event]?.delete(listener);
  }

  emit(event: string): void {
    this.listeners[event]?.forEach((listener) => listener());
  }
}

export const appEvents = new EventBus();

/** Eventos usados por la app — nombres calcados del CustomEvent del web. */
export const APP_EVENTS = {
  SUBSCRIPTION_BLOCKED: 'subscription:blocked',
} as const;
