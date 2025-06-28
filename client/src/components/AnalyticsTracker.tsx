import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useEmailNotifications } from '@/hooks/useEmailNotifications';

export const AnalyticsTracker: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userSubscription } = useAuth();
  const { trackLogin, trackEvent } = useAnalytics();
  const { scheduleNotification } = useEmailNotifications();

  useEffect(() => {
    if (user) {
      trackLogin(user.uid);
    }
  }, [user]);

  useEffect(() => {
    if (userSubscription && userSubscription.plan === 'free' && userSubscription.trialEndDate && user) {
      const trialEndDate = new Date(userSubscription.trialEndDate);
      const now = new Date();
      const daysLeft = Math.ceil((trialEndDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

      // Schedule trial reminder 3 days before expiry
      if (daysLeft === 3) {
        scheduleNotification(
          user.uid,
          user.email!,
          'trial_reminder',
          new Date()
        );
      }

      // Schedule trial expired notification
      if (daysLeft <= 0) {
        scheduleNotification(
          user.uid,
          user.email!,
          'trial_expired',
          new Date()
        );
      }
    }
  }, [userSubscription, user]);

  return <>{children}</>;
};