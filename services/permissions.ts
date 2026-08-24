import { ENDPOINTS } from '@/constants/api';
import { apiService } from './api';

/**
 * `GET /api/hub` — igual endpoint que usa el web (`Hub.jsx`) para decidir qué
 * módulos mostrar. Devuelve solo los permisos `view_*` del usuario, como
 * `[{ permission_name: 'view_products' }, ...]`.
 */
class PermissionService {
  async getMyViewPermissions(): Promise<string[]> {
    const response = await apiService.getToken<
      { permission_name: string }[] | { data: { permission_name: string }[] }
    >(ENDPOINTS.USERS.HUB);
    const rows = Array.isArray(response) ? response : response.data;
    return (rows || []).map((p) => p.permission_name);
  }
}

export const permissionService = new PermissionService();
