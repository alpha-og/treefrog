import type { Plan, Subscription, Invoice, Usage } from '@treefrog/types';
import { apiClient } from './apiClient';

export class BillingService {
  async getPlans() {
    const response = await apiClient.get<Plan[]>('/billing/plans');
    return response.data.data || [];
  }

  async getCurrentSubscription() {
    const response = await apiClient.get<Subscription>(
      '/billing/subscriptions/current'
    );
    return response.data.data;
  }

  async upgradeSubscription(planId: string) {
    const response = await apiClient.post<Subscription>(
      '/billing/subscriptions/upgrade',
      { planId }
    );
    return response.data.data;
  }

  async cancelSubscription() {
    const response = await apiClient.post<Subscription>(
      '/billing/subscriptions/cancel',
      {}
    );
    return response.data.data;
  }

  async getInvoices(page = 1, limit = 10) {
    const response = await apiClient.get<Invoice[]>('/billing/invoices', {
      params: { page, limit },
    });
    return response.data.data || [];
  }

  async getUsage() {
    const response = await apiClient.get<Usage>('/billing/usage');
    return response.data.data;
  }
}

export const billingService = new BillingService();
export default billingService;
