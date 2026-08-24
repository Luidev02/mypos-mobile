import { authService } from '@/services';
import { storageService } from '@/services/storage';
import type { User } from '@/types';
import { APP_EVENTS, appEvents } from '@/utils/events';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Actualiza campos del usuario en memoria y en storage (tras editar perfil). */
  updateUserInfo: (patch: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();

    // `services/api.ts` limpia el almacenamiento y navega a /login cuando una
    // sesión muere, pero no puede tocar este estado. Sin esta suscripción el
    // usuario seguía en memoria, la pantalla de login lo veía autenticado y
    // rebotaba al hub, que volvía a dar 401: un bucle entre login y hub.
    const unsubscribe = appEvents.on(APP_EVENTS.SESSION_EXPIRED, () => {
      setUser(null);
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  const checkAuth = async () => {
    try {
      const isAuth = await authService.isAuthenticated();
      if (isAuth) {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } else {
        // Sin credenciales utilizables: si quedaban restos (por ejemplo el
        // userInfo de una sesión anterior sin token), se descartan para no
        // aparentar una sesión que ya no existe.
        setUser(null);
        await storageService.clearAuth();
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    const response = await authService.login(username, password);
    setUser(response.info);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const updateUserInfo = async (patch: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      storageService.saveUserInfo(next);
      return next;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        updateUserInfo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
