import { permissionService } from '@/services';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

interface PermissionsContextType {
  permissions: string[];
  loading: boolean;
  /** ¿El usuario tiene este permiso `view_*`? */
  can: (permission: string) => boolean;
  refetch: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!isAuthenticated) {
      setPermissions([]);
      setLoading(false);
      return;
    }
    try {
      const result = await permissionService.getMyViewPermissions();
      setPermissions(result);
    } catch (error) {
      // Sin permisos cargados, el menú se oculta por completo — más seguro
      // que asumir acceso cuando la petición falla.
      console.error('Error cargando permisos:', error);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    setLoading(true);
    fetchPermissions();
  }, [fetchPermissions]);

  const can = useCallback(
    (permission: string) => permissions.includes(permission),
    [permissions]
  );

  return (
    <PermissionsContext.Provider value={{ permissions, loading, can, refetch: fetchPermissions }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
}
