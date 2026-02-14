const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:9000'

export interface ApiResponse<T> {
  data?: T
  error?: string
}

export class ApiClient {
  private baseUrl: string
  
  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl
  }
  
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    token?: string
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      })
      
      if (!response.ok) {
        const error = await response.text()
        return { error }
      }
      
      const data = await response.json()
      return { data }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }
  
  async get<T>(endpoint: string, token?: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' }, token)
  }
  
  async post<T>(endpoint: string, body: unknown, token?: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    }, token)
  }
  
  async delete<T>(endpoint: string, token?: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' }, token)
  }
}

export const apiClient = new ApiClient()

export interface Build {
  id: string
  status: string
  engine: string
  main_file: string
  created_at: string
  expires_at: string
  pdf_path?: string
  error_message?: string
}

export interface BuildListResponse {
  builds: Build[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface UsageStats {
  tier: string
  monthly_used: number
  monthly_limit: number
  monthly_reset_at?: string
  concurrent_used: number
  concurrent_limit: number
  storage_used_gb: number
  storage_limit_gb: number
}

export interface UserProfile {
  id: string
  email: string
  name?: string
  tier: string
  storage_used: number
  subscription: {
    paused: boolean
    canceled: boolean
  }
}

export interface SubscriptionStatus {
  tier: string
  status: string
  current_start?: string
  current_end?: string
  paid_count?: number
  total_count?: number
  canceled_at?: string
  paused?: boolean
}

export interface CreateSubscriptionResponse {
  checkout_url: string
  plan: string
}

export interface DataExportResponse {
  download_url: string
  expires_at: string
}

export interface AccountDeleteResponse {
  status: string
  message: string
}
