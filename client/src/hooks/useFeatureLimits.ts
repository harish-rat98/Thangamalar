import { useState } from 'react';
import { useAuth } from './useAuth';
import { useAnalytics } from './useAnalytics';

export const useFeatureLimits = () => {
  const { userSubscription } = useAuth();
  const { trackEvent } = useAnalytics();
  const [limitModal, setLimitModal] = useState<{
    isOpen: boolean;
    feature: string;
    currentLimit: number;
    upgradeLimit: number | string;
  }>({
    isOpen: false,
    feature: '',
    currentLimit: 0,
    upgradeLimit: 0,
  });

  const checkLimit = (feature: 'inventory' | 'customers' | 'sales', currentCount: number) => {
    if (!userSubscription) return false;

    const limits = {
      inventory: userSubscription.features.maxInventoryItems,
      customers: userSubscription.features.maxCustomers,
      sales: userSubscription.features.maxSalesPerMonth,
    };

    const upgradeLimit = {
      inventory: 1000,
      customers: 500,
      sales: 1000,
    };

    const limit = limits[feature];
    
    if (limit !== -1 && currentCount >= limit) {
      // Track feature limit hit
      trackEvent('feature_limit_hit', { feature, currentCount, limit });
      
      setLimitModal({
        isOpen: true,
        feature: feature === 'inventory' ? 'inventory items' : feature,
        currentLimit: limit,
        upgradeLimit: upgradeLimit[feature],
      });
      return true;
    }
    
    return false;
  };

  const closeLimitModal = () => {
    setLimitModal(prev => ({ ...prev, isOpen: false }));
  };

  const showUpgradePrompt = () => {
    trackEvent('upgrade_prompt_shown', { feature: limitModal.feature });
  };

  return {
    checkLimit,
    limitModal,
    closeLimitModal,
    showUpgradePrompt,
    userSubscription,
  };
};