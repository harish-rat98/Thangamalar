import { SubscriptionTier } from '@/types/subscription';

export const subscriptionPlans: SubscriptionTier[] = [
  {
    id: 'free',
    name: 'Free Trial',
    price: 0,
    currency: 'INR',
    interval: 'month',
    features: {
      maxInventoryItems: 50,
      maxCustomers: 25,
      maxSalesPerMonth: 100,
      hasAdvancedReports: false,
      hasMultiLocation: false,
      hasAPIAccess: false,
    },
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 2999,
    currency: 'INR',
    interval: 'month',
    popular: true,
    features: {
      maxInventoryItems: 1000,
      maxCustomers: 500,
      maxSalesPerMonth: 1000,
      hasAdvancedReports: true,
      hasMultiLocation: false,
      hasAPIAccess: false,
    },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 7999,
    currency: 'INR',
    interval: 'month',
    features: {
      maxInventoryItems: -1, // Unlimited
      maxCustomers: -1, // Unlimited
      maxSalesPerMonth: -1, // Unlimited
      hasAdvancedReports: true,
      hasMultiLocation: true,
      hasAPIAccess: true,
    },
  },
];

export const getSubscriptionPlan = (planId: string) => {
  return subscriptionPlans.find(plan => plan.id === planId);
};