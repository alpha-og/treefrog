import axios, { AxiosInstance, AxiosError } from 'axios';
import type { ApiResponse } from '@treefrog/types';

export class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;
  private authToken: string | null = null;

  constructor(baseURL: string = '/api') {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth headers
    this.client.interceptors.request.use((config) => {
      const token = this.authToken || this.getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired or invalid, clear it
          this.clearAuthToken();
          // Optionally redirect to login
        }
        return Promise.reject(error);
      }
    );
  }

  private getAuthToken(): string | null {
    try {
      const stored = localStorage.getItem('treefrog-auth');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.state?.sessionToken || null;
      }
    } catch {
      return null;
    }
    return null;
  }

  private clearAuthToken(): void {
    this.authToken = null;
    localStorage.removeItem('treefrog-auth');
  }

  /**
   * Set the authentication token programmatically (e.g., from Clerk)
   */
  setAuthToken(token: string | null): void {
    this.authToken = token;
    if (token) {
      // Token will be used in request interceptor
    } else {
      this.clearAuthToken();
    }
  }

  /**
   * Get the current authentication token
   */
  getToken(): string | null {
    return this.authToken || this.getAuthToken();
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

// Export singleton instance
export const apiClient = new ApiClient(
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || '/api'
);

export default apiClient;
