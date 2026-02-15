import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { createLogger } from '@/utils/logger'

const log = createLogger('useCloudData')

interface TierLimits {
  monthly: number
  concurrent: number
  storageGB: number
}

const TIER_LIMITS: Record<string, TierLimits> = {
  free: { monthly: 50, concurrent: 2, storageGB: 1 },
  pro: { monthly: 500, concurrent: 10, storageGB: 10 },
  enterprise: { monthly: -1, concurrent: 50, storageGB: 100 },
}

export interface CloudBuild {
  id: string
  status: string
  engine: string
  main_file: string | null
  created_at: string
  expires_at: string | null
  error_message: string | null
}

export interface CloudUsageStats {
  tier: string
  monthlyUsed: number
  monthlyLimit: number
  concurrentUsed: number
  concurrentLimit: number
  storageUsedGB: number
  storageLimitGB: number
}

export interface CloudUserData {
  id: string
  email: string
  name: string | null
  tier: string
  storageUsedBytes: number
  createdAt: string
}

export function useCloudData() {
  const { mode, user } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [userData, setUserData] = useState<CloudUserData | null>(null)
  const [usageStats, setUsageStats] = useState<CloudUsageStats | null>(null)
  const [recentBuilds, setRecentBuilds] = useState<CloudBuild[]>([])

  const isAuthenticated = mode === 'supabase' && user?.id

  const fetchAll = useCallback(async () => {
    if (!isAuthenticated || !supabase || !user?.id) {
      return
    }

    setIsLoading(true)
    try {
      const { data: userRow, error: userError } = await supabase
        .from('users')
        .select('id, email, name, tier, storage_used_bytes, created_at')
        .eq('id', user.id)
        .single()

      if (userError) {
        log.error('Failed to fetch user data', userError)
        return
      }

      if (userRow) {
        setUserData({
          id: userRow.id,
          email: userRow.email,
          name: userRow.name,
          tier: userRow.tier,
          storageUsedBytes: userRow.storage_used_bytes,
          createdAt: userRow.created_at,
        })

        const limits = TIER_LIMITS[userRow.tier] || TIER_LIMITS.free
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

        const { count: monthlyUsed } = await supabase!
          .from('builds')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', startOfMonth)

        const { count: concurrentUsed } = await supabase!
          .from('builds')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .in('status', ['pending', 'compiling'])

        setUsageStats({
          tier: userRow.tier,
          monthlyUsed: monthlyUsed || 0,
          monthlyLimit: limits.monthly,
          concurrentUsed: concurrentUsed || 0,
          concurrentLimit: limits.concurrent,
          storageUsedGB: (userRow.storage_used_bytes || 0) / (1024 * 1024 * 1024),
          storageLimitGB: limits.storageGB,
        })
      }

      const { data: builds, error: buildsError } = await supabase
        .from('builds')
        .select('id, status, engine, main_file, created_at, expires_at, error_message')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30)

      if (buildsError) {
        log.error('Failed to fetch builds', buildsError)
      } else {
        setRecentBuilds((builds || []).map(b => ({
          id: b.id,
          status: b.status,
          engine: b.engine,
          main_file: b.main_file,
          created_at: b.created_at,
          expires_at: b.expires_at,
          error_message: b.error_message,
        })))
      }
    } catch (err) {
      log.error('Failed to fetch cloud data', err)
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, user?.id])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  return {
    isLoading,
    userData,
    usageStats,
    recentBuilds,
    refresh: fetchAll,
    isAuthenticated,
  }
}

export function useCloudBuild(buildId: string | null) {
  const { mode, user } = useAuthStore()
  const [build, setBuild] = useState<CloudBuild | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const isAuthenticated = mode === 'supabase' && user?.id

useEffect(() => {
    if (!buildId || !isAuthenticated || !supabase || !user?.id) {
      return;
    }

    let mounted = true;
    
    const fetchBuild = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('builds')
          .select('*')
          .eq('id', buildId)
          .eq('user_id', user.id)
          .single();
        
        if (!mounted) return;
        
        if (error) {
          log.error('Failed to fetch build', error);
        } else if (data) {
          setBuild({
            id: data.id,
            status: data.status,
            engine: data.engine,
            main_file: data.main_file,
            created_at: data.created_at,
            expires_at: data.expires_at,
            error_message: data.error_message,
          });
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    
    fetchBuild();
    
    return () => { mounted = false; };
  }, [buildId, isAuthenticated, user?.id]);

  return { build, isLoading }
}