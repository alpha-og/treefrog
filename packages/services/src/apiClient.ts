import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse } from '@treefrog/types';

type TokenGetter = () => Promise<string | null>;

export class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;
  private tokenGetter: TokenGetter | null = null;
  private isGuestMode: boolean = false;

  constructor(baseURL: string = '/api') {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        if (this.isGuestMode) {
          return config;
        }

        if (this.tokenGetter) {
          try {
            const token = await this.tokenGetter();
            if (token) {
              config.headers.Authorization = `Bearer ${token}`;
            }
          } catch (error) {
            console.warn('Failed to get auth token:', error);
          }
        }
        return config;
      }
    );

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401 && !this.isGuestMode) {
          console.warn('Unauthorized request - token may be expired');
        }
        return Promise.reject(error);
      }
    );
  }

  setTokenGetter(getter: TokenGetter | null): void {
    this.tokenGetter = getter;
  }

  setGuestMode(isGuest: boolean): void {
    this.isGuestMode = isGuest;
    if (isGuest) {
      this.tokenGetter = null;
    }
  }

  isGuest(): boolean {
    return this.isGuestMode;
  }

  async get<T = unknown>(url: string, config = {}) {
    return this.client.get<ApiResponse<T>>(url, config);
  }

  async post<T = unknown>(url: string, data?: unknown, config = {}) {
    return this.client.post<ApiResponse<T>>(url, data, config);
  }

  async put<T = unknown>(url: string, data?: unknown, config = {}) {
    return this.client.put<ApiResponse<T>>(url, data, config);
  }

  async delete<T = unknown>(url: string, config = {}) {
    return this.client.delete<ApiResponse<T>>(url, config);
  }

  async patch<T = unknown>(url: string, data?: unknown, config = {}) {
    return this.client.patch<ApiResponse<T>>(url, data, config);
  }

  setBaseURL(url: string): void {
    this.baseURL = url;
    this.client.defaults.baseURL = url;
  }

  getBaseURL(): string {
    return this.baseURL;
  }
}

export const apiClient = new ApiClient(
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || '/api'
);

export default apiClient;
