import type { Plan, Subscription, Invoice, Usage } from '@treefrog/types';
import { apiClient } from './apiClient';

export class BillingService {
  async getPlans(): Promise<Plan[]> {
    const response = await apiClient.get<Plan[]>('/billing/plans');
    return response.data.data || [];
  }

  async getCurrentSubscription(): Promise<Subscription | undefined> {
    const response = await apiClient.get<Subscription>(
      '/billing/subscriptions/current'
    );
    return response.data.data;
  }

  async upgradeSubscription(planId: string): Promise<Subscription | undefined> {
    const response = await apiClient.post<Subscription>(
      '/billing/subscriptions/upgrade',
      { planId }
    );
    return response.data.data;
  }

  async cancelSubscription(): Promise<Subscription | undefined> {
    const response = await apiClient.post<Subscription>(
      '/billing/subscriptions/cancel',
      {}
    );
    return response.data.data;
  }

  async getInvoices(page = 1, limit = 10): Promise<Invoice[]> {
    const response = await apiClient.get<Invoice[]>('/billing/invoices', {
      params: { page, limit },
    });
    return response.data.data || [];
  }

  async getUsage(): Promise<Usage | undefined> {
    const response = await apiClient.get<Usage>('/billing/usage');
    return response.data.data;
  }
}

export const billingService = new BillingService();
export default billingService;
