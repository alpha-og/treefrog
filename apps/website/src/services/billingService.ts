import { apiClient } from './apiClient'
import type { CreateSubscriptionResponse, SubscriptionStatus, DataExportResponse, AccountDeleteResponse } from './apiClient'

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => {
      open: () => void
      close: () => void
    }
  }
}

interface RazorpayOptions {
  key: string
  subscription_id?: string
  amount?: number
  currency: string
  name: string
  description: string
  order_id?: string
  handler: (response: RazorpayResponse) => void
  theme?: {
    color: string
  }
  prefill?: {
    name?: string
    email?: string
  }
}

interface RazorpayResponse {
  razorpay_payment_id: string
  razorpay_subscription_id?: string
  razorpay_signature: string
}

export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    monthlyBuilds: 50,
    concurrent: 2,
    storageGB: 1,
    features: [
      '50 builds/month',
      '2 concurrent builds',
      '1 GB storage',
      'Community support',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 9,
    monthlyBuilds: 500,
    concurrent: 10,
    storageGB: 10,
    features: [
      '500 builds/month',
      '10 concurrent builds',
      '10 GB storage',
      'Priority support',
      'Early access features',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: null,
    monthlyBuilds: -1,
    concurrent: 50,
    storageGB: 100,
    features: [
      'Unlimited builds',
      '50 concurrent builds',
      '100 GB storage',
      'Dedicated support',
      'SLA guarantee',
      'Custom integrations',
    ],
  },
}

export class BillingService {
  private token: string | null = null
  
  setToken(token: string) {
    this.token = token
  }
  
  async createSubscription(planId: string): Promise<CreateSubscriptionResponse | null> {
    if (!this.token) {
      console.error('No auth token set')
      return null
    }
    
    const response = await apiClient.post<CreateSubscriptionResponse>(
      '/api/subscription/create',
      { plan_id: planId },
      this.token
    )
    
    if (response.error) {
      console.error('Failed to create subscription:', response.error)
      return null
    }
    
    return response.data || null
  }
  
  async getSubscriptionStatus(): Promise<SubscriptionStatus | null> {
    if (!this.token) return null
    
    const response = await apiClient.get<SubscriptionStatus>(
      '/api/subscription/status',
      this.token
    )
    
    return response.data || null
  }
  
  async cancelSubscription(): Promise<boolean> {
    if (!this.token) return false
    
    const response = await apiClient.post<{ status: string }>(
      '/api/subscription/cancel',
      {},
      this.token
    )
    
    return !response.error && response.data?.status === 'canceled'
  }
  
  async redeemCoupon(couponCode: string, planId: string): Promise<CreateSubscriptionResponse | null> {
    if (!this.token) return null
    
    const response = await apiClient.post<CreateSubscriptionResponse>(
      '/api/coupon/redeem',
      { coupon_code: couponCode, plan_id: planId },
      this.token
    )
    
    return response.data || null
  }
  
  async openCheckout(checkoutUrl: string): Promise<void> {
    window.location.href = checkoutUrl
  }
  
  loadRazorpayScript(): Promise<boolean> {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true)
        return
      }
      
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })
  }
  
  async exportData(): Promise<DataExportResponse | null> {
    if (!this.token) return null
    
    const response = await apiClient.post<DataExportResponse>(
      '/api/user/export',
      {},
      this.token
    )
    
    return response.data || null
  }
  
  async deleteAccount(): Promise<AccountDeleteResponse | null> {
    if (!this.token) return null
    
    const response = await apiClient.post<AccountDeleteResponse>(
      '/api/user/delete',
      {},
      this.token
    )
    
    return response.data || null
  }
}

export const billingService = new BillingService()
