import { API_CONFIG } from '@/constants/api';
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { router } from 'expo-router';
import { storageService } from './storage';

class ApiService {
  private api: AxiosInstance;
  private cachedIP: string | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.api.interceptors.request.use(
      async (config) => {
        // Add IP address to headers
        if (!this.cachedIP) {
          this.cachedIP = await this.getIP();
        }
        config.headers['x-ip-address'] = this.cachedIP;

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        // Handle 401/403 errors
        if (error.response?.status === 401 || error.response?.status === 403) {
          await storageService.clearAuth();
          router.replace('/login');
        }
        return Promise.reject(error);
      }
    );
  }

  // Get device IP
  async getIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || '0.0.0.0';
    } catch {
      return '0.0.0.0';
    }
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
    const token = await storageService.getToken();
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
    const token = await storageService.getToken();
    
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
    const token = await storageService.getToken();
    
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
    const token = await storageService.getToken();
    const response = await this.api.delete(url, {
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
