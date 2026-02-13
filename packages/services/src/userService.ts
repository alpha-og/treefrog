import type { User, UserProfile } from '@treefrog/types';
import { supabase } from '@treefrog/supabase';

export class UserService {
  async getCurrentUser(userId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) return null;
    return data;
  }

  async getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, tier, storage_used_bytes, created_at')
      .eq('id', userId)
      .single();
    
    if (error) return null;
    return data ? {
      id: data.id,
      email: data.email,
      name: data.name,
      tier: data.tier,
      storageUsedBytes: data.storage_used_bytes,
      createdAt: data.created_at,
    } : null;
  }

  async updateProfile(userId: string, profile: Partial<Pick<UserProfile, 'name'>>): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('users')
      .update({ name: profile.name })
      .eq('id', userId)
      .select('id, email, name, tier, storage_used_bytes, created_at')
      .single();
    
    if (error) return null;
    return data ? {
      id: data.id,
      email: data.email,
      name: data.name,
      tier: data.tier,
      storageUsedBytes: data.storage_used_bytes,
      createdAt: data.created_at,
    } : null;
  }

  async getUsageStats(userId: string): Promise<{
    tier: string;
    monthlyUsed: number;
    monthlyLimit: number;
    concurrentUsed: number;
    concurrentLimit: number;
    storageUsedGB: number;
    storageLimitGB: number;
  } | null> {
    const { data: user, error } = await supabase
      .from('users')
      .select('tier, storage_used_bytes')
      .eq('id', userId)
      .single();
    
    if (error || !user) return null;

    const tierLimits: Record<string, { monthly: number; concurrent: number; storageGB: number }> = {
      free: { monthly: 50, concurrent: 2, storageGB: 1 },
      pro: { monthly: 500, concurrent: 10, storageGB: 10 },
      enterprise: { monthly: -1, concurrent: 50, storageGB: 100 },
    };

    const limits = tierLimits[user.tier] || tierLimits.free;
    
    const { count: monthlyUsed } = await supabase
      .from('builds')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

    const { count: concurrentUsed } = await supabase
      .from('builds')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', ['pending', 'compiling']);

    return {
      tier: user.tier,
      monthlyUsed: monthlyUsed || 0,
      monthlyLimit: limits.monthly,
      concurrentUsed: concurrentUsed || 0,
      concurrentLimit: limits.concurrent,
      storageUsedGB: (user.storage_used_bytes || 0) / (1024 * 1024 * 1024),
      storageLimitGB: limits.storageGB,
    };
  }
}

export const userService = new UserService();
export default userService;
