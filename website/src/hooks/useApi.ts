import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../lib/auth'
import type { UsageStats, BuildListResponse } from '../services/apiClient'
import { billingService, PLANS } from '../services/billingService'
import { supabase } from '../lib/supabase'

export function useUserProfile() {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ['user', 'profile'],
    queryFn: async () => {
      if (!user) return null
      
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, tier, storage_used_bytes, created_at')
        .eq('id', user.id)
        .single()
      
      if (error) return null
      return data
    },
    enabled: !!user?.id,
  })
}

export function useUsageStats() {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ['user', 'usage'],
    queryFn: async (): Promise<UsageStats | null> => {
      if (!user) return null
      
      const { data: userData, error } = await supabase
        .from('users')
        .select('tier, storage_used_bytes')
        .eq('id', user.id)
        .single()
      
      if (error || !userData) return null

      const tierLimits: Record<string, { monthly: number; concurrent: number; storageGB: number }> = {
        free: { monthly: 50, concurrent: 2, storageGB: 1 },
        pro: { monthly: 500, concurrent: 10, storageGB: 10 },
        enterprise: { monthly: -1, concurrent: 50, storageGB: 100 },
      }

      const limits = tierLimits[userData.tier] || tierLimits.free
      
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      const { count: monthlyUsed } = await supabase
        .from('builds')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth)

      const { count: concurrentUsed } = await supabase
        .from('builds')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('status', ['pending', 'compiling'])

      return {
        tier: userData.tier,
        monthly_used: monthlyUsed || 0,
        monthly_limit: limits.monthly,
        concurrent_used: concurrentUsed || 0,
        concurrent_limit: limits.concurrent,
        storage_used_gb: (userData.storage_used_bytes || 0) / (1024 * 1024 * 1024),
        storage_limit_gb: limits.storageGB,
      }
    },
    enabled: !!user?.id,
  })
}

export function useBuilds(page: number = 1, pageSize: number = 10) {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ['builds', page, pageSize],
    queryFn: async (): Promise<BuildListResponse | null> => {
      if (!user) return null
      
      const offset = (page - 1) * pageSize
      
      const { data, error, count } = await supabase
        .from('builds')
        .select('id, status, engine, main_file, created_at, expires_at, error_message', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1)
      
      if (error) return null
      
      return {
        builds: (data || []).map(b => ({
          id: b.id,
          status: b.status,
          engine: b.engine,
          main_file: b.main_file,
          created_at: b.created_at,
          expires_at: b.expires_at,
          error_message: b.error_message,
        })),
        total: count || 0,
        page,
        page_size: pageSize,
        total_pages: Math.ceil((count || 0) / pageSize),
      }
    },
    enabled: !!user?.id,
  })
}

export function useCreateSubscription() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (planId: string) => {
      if (!user) throw new Error('Not authenticated')
      
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('No session')
      
      billingService.setToken(token)
      return billingService.createSubscription(planId)
    },
    onSuccess: (data) => {
      if (data?.checkout_url) {
        window.location.href = data.checkout_url
      }
      queryClient.invalidateQueries({ queryKey: ['user'] })
    },
  })
}

export function useCancelSubscription() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated')
      
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('No session')
      
      billingService.setToken(token)
      return billingService.cancelSubscription()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] })
    },
  })
}

export function usePlans() {
  return PLANS
}

export function useSubscriptionStatus() {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ['subscription', 'status'],
    queryFn: async () => {
      if (!user) return null
      
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) return null
      
      billingService.setToken(token)
      return billingService.getSubscriptionStatus()
    },
    enabled: !!user?.id,
  })
}

export function useRedeemCoupon() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ couponCode, planId }: { couponCode: string; planId: string }) => {
      if (!user) throw new Error('Not authenticated')
      
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('No session')
      
      billingService.setToken(token)
      return billingService.redeemCoupon(couponCode, planId)
    },
    onSuccess: (data) => {
      if (data?.checkout_url) {
        window.location.href = data.checkout_url
      }
      queryClient.invalidateQueries({ queryKey: ['user'] })
    },
  })
}

export function useExportData() {
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated')
      
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('No session')
      
      billingService.setToken(token)
      return billingService.exportData()
    },
  })
}

export function useDeleteAccount() {
  const { user, signOut } = useAuth()
  
  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated')
      
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id)
      
      if (error) throw error
    },
    onSuccess: async () => {
      await signOut()
      window.location.href = '/'
    },
  })
}

export function useInvoices() {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      if (!user) return []
      
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) return []
      return data || []
    },
    enabled: !!user?.id,
  })
}
