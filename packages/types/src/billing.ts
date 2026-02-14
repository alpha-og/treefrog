// Billing-related types
export interface BillingPlan {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  interval: 'monthly' | 'yearly';
  features: string[];
  buildLimit?: number;
  storageLimit?: number;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  plan?: BillingPlan;
  status: 'active' | 'canceled' | 'expired' | 'pending';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  canceledAt?: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed';
  paidAt?: string;
  dueAt?: string;
  createdAt: string;
}

export interface Usage {
  userId: string;
  period: string;
  builds: number;
  storage: number;
  storageLimit: number;
  buildLimit: number;
}
