export type Tier = 'free' | 'pro' | 'enterprise';

export interface TierLimits {
  monthly: number;
  concurrent: number;
  storageGB: number;
}

export const TIER_LIMITS: Record<Tier, TierLimits> = {
  free: { monthly: 50, concurrent: 2, storageGB: 1 },
  pro: { monthly: 500, concurrent: 10, storageGB: 10 },
  enterprise: { monthly: -1, concurrent: 50, storageGB: 100 },
} as const;

export interface Plan {
  id: Tier;
  name: string;
  price: number;
  priceId?: string;
  limits: TierLimits;
  features: string[];
  highlighted?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    limits: TIER_LIMITS.free,
    features: [
      '50 builds/month',
      '2 concurrent builds',
      '1GB storage',
      'Basic LaTeX engines',
      'Community support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 9,
    limits: TIER_LIMITS.pro,
    highlighted: true,
    features: [
      '500 builds/month',
      '10 concurrent builds',
      '10GB storage',
      'All LaTeX engines',
      'Priority support',
      'Custom templates',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 0,
    limits: TIER_LIMITS.enterprise,
    features: [
      'Unlimited builds',
      '50 concurrent builds',
      '100GB storage',
      'Shell-escape enabled',
      'Dedicated support',
      'SLA guarantee',
      'Custom integrations',
    ],
  },
] as const;

export function getTierLimits(tier: Tier): TierLimits {
  return TIER_LIMITS[tier] || TIER_LIMITS.free;
}

export function getPlan(tier: Tier): Plan | undefined {
  return PLANS.find(p => p.id === tier);
}
