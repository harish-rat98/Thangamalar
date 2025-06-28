export type SubscriptionPlan = 'free' | 'professional' | 'enterprise';

export interface UserSubscription {
  id: string;
  email: string;
  plan: SubscriptionPlan;
  isActive: boolean;
  trialEndDate?: Date;
  subscriptionStartDate: Date;
  features: {
    maxInventoryItems: number;
    maxCustomers: number;
    maxSalesPerMonth: number;
    hasAdvancedReports: boolean;
    hasMultiLocation: boolean;
    hasAPIAccess: boolean;
  };
}

export interface SubscriptionTier {
  id: SubscriptionPlan;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: {
    maxInventoryItems: number;
    maxCustomers: number;
    maxSalesPerMonth: number;
    hasAdvancedReports: boolean;
    hasMultiLocation: boolean;
    hasAPIAccess: boolean;
  };
  popular?: boolean;
}