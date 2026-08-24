import { API_CONFIG, ENDPOINTS } from '@/constants/api';
import { APP_EVENTS, appEvents } from '@/utils/events';
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import axiosRetry from 'axios-retry';
import { router } from 'expo-router';
import { getDeviceHeaders } from './device';
import { storageService } from './storage';

class ApiService {
  private api: AxiosInstance;

  /**
   * Refresh en vuelo. Si diez peticiones reciben 401 a la vez, todas esperan
   * a ESTA promesa en lugar de disparar diez refresh en paralelo — que además
   * de ser un desperdicio, con rotación de tokens haría que nueve de ellas
   * presentaran un refresh ya rotado y el backend cancelara la sesión entera
   * por `reuse_detected`.
   */
  private refreshPromise: Promise<string | null> | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Reintenta automáticamente errores de red/timeout en peticiones
    // idempotentes (GET) — nunca en POST/PUT/DELETE, para no duplicar ventas
    // ni otras mutaciones si el reintento sí llega al servidor.
    axiosRetry(this.api, {
      retries: 2,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) =>
        (error.config?.method?.toLowerCase() === 'get' &&
          axiosRetry.isNetworkOrIdempotentRequestError(error)) ||
        error.code === 'ECONNABORTED',
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.api.interceptors.request.use(
      async (config) => {
        // Identidad del dispositivo. Reemplaza a la cabecera `x-ip-address`
        // que se mandaba antes: el backend nunca la leía (solo lee
        // `authorization`), y calcularla obligaba a una llamada a
        // api.ipify.org. La IP real ahora la toma el backend de `req.ip`.
        const deviceHeaders = await getDeviceHeaders();
        for (const [key, value] of Object.entries(deviceHeaders)) {
          config.headers[key] = value;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<any>) => {
        const status = error.response?.status;
        const code = error.response?.data?.code;
        const original: any = error.config;

        // 401 = fallo de autenticación. Si el motivo es que el access token
        // expiró, se intenta renovar y reintentar la petición UNA vez; el
        // resto de motivos (token inválido, refresh reutilizado, dispositivo
        // distinto) no tienen arreglo posible desde el cliente.
        if (status === 401 && original && !original._retriedAfterRefresh) {
          if (code === 'TOKEN_EXPIRED' || code === 'TOKEN_MISSING') {
            const newToken = await this.refreshAccessToken();

            if (newToken) {
              original._retriedAfterRefresh = true;
              original.headers = { ...original.headers, Authorization: `Bearer ${newToken}` };
              return this.api.request(original);
            }
          }

          await this.forceLogout();
          return Promise.reject(error);
        }

        if (status === 401) {
          await this.forceLogout();
          return Promise.reject(error);
        }

        // 402 = suscripción bloqueada — no cierra sesión, solo avisa para que
        // SubscriptionContext refresque su estado y el modal se muestre.
        if (status === 402 && error.response?.data?.code === 'SUBSCRIPTION_BLOCKED') {
          appEvents.emit(APP_EVENTS.SUBSCRIPTION_BLOCKED);
        }

        // 403 = permiso insuficiente o límite de plan — se propaga tal cual
        // para que cada pantalla muestre su propio mensaje. NUNCA cierra
        // sesión: un usuario sin permiso para un módulo no debe ser
        // expulsado de la app por eso.
        return Promise.reject(error);
      }
    );
  }

  /**
   * Renueva el access token usando el refresh. Devuelve el token nuevo, o
   * `null` si la sesión ya no se puede recuperar.
   */
  private async refreshAccessToken(): Promise<string | null> {
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      try {
        const refreshToken = await storageService.getRefreshToken();
        if (!refreshToken) return null;

        // Instancia limpia a propósito: si usara `this.api`, un 401 de esta
        // misma llamada volvería a entrar al interceptor y se refrescaría a
        // sí misma en bucle.
        const response = await axios.post(
          `${API_CONFIG.BASE_URL}${ENDPOINTS.AUTH.REFRESH}`,
          { refreshToken },
          { timeout: API_CONFIG.TIMEOUT, headers: await getDeviceHeaders() }
        );

        const { token, refreshToken: rotated } = response.data || {};
        if (!token) return null;

        await storageService.saveToken(token);
        // El backend rota el refresh en cada uso: guardar el nuevo es
        // obligatorio, si no el siguiente intento usaría uno ya revocado y
        // caería la sesión entera por `reuse_detected`.
        if (rotated) await storageService.saveRefreshToken(rotated);

        return token as string;
      } catch {
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private async forceLogout(): Promise<void> {
    await storageService.clearAuth();
    router.replace('/login');
  }

  /**
   * Access token para la cabecera Authorization. Si no hay ninguno guardado
   * pero sí un refresh válido, lo renueva antes de salir: es el caso de abrir
   * la app días después, donde mandar `Bearer null` provocaría un
   * TOKEN_INVALID (no recuperable) en vez de un TOKEN_EXPIRED.
   */
  private async getAccessToken(): Promise<string | null> {
    const token = await storageService.getToken();
    if (token) return token;

    const refreshToken = await storageService.getRefreshToken();
    if (!refreshToken) return null;

    return this.refreshAccessToken();
  }

  // Public methods without token
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.api.post(url, data, config);
    return response.data;
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.api.get(url, config);
    return response.data;
  }

  // Authenticated methods with token
  async getToken<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const token = await this.getAccessToken();
    const response = await this.api.get(url, {
      ...config,
      headers: {
        ...config?.headers,
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  }

  async postToken<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const token = await this.getAccessToken();
    
    // Handle FormData
    const headers: any = {
      ...config?.headers,
      Authorization: `Bearer ${token}`,
    };
    
    if (data instanceof FormData) {
      headers['Content-Type'] = 'multipart/form-data';
    }

    const response = await this.api.post(url, data, {
      ...config,
      headers,
    });
    return response.data;
  }

  async putToken<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const token = await this.getAccessToken();
    
    // Handle FormData
    const headers: any = {
      ...config?.headers,
      Authorization: `Bearer ${token}`,
    };
    
    if (data instanceof FormData) {
      headers['Content-Type'] = 'multipart/form-data';
    }

    const response = await this.api.put(url, data, {
      ...config,
      headers,
    });
    return response.data;
  }

  async deleteToken<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const token = await this.getAccessToken();
    const response = await this.api.delete(url, {
      ...config,
      headers: {
        ...config?.headers,
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  }

  async patchToken<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const token = await this.getAccessToken();
    const response = await this.api.patch(url, data, {
      ...config,
      headers: {
        ...config?.headers,
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  }

  // Update base URL
  setBaseURL(url: string) {
    this.api.defaults.baseURL = url;
  }
}

export const apiService = new ApiService();
