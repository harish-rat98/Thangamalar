import React, { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useEmailNotifications } from '@/hooks/useEmailNotifications';

export const AnalyticsTracker: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userSubscription } = useAuth();
  const { trackLogin, trackEvent } = useAnalytics();
  const { scheduleNotification } = useEmailNotifications();
  const previousPlan = useRef<string | null>(null);
  const hasTrackedSignup = useRef(false);

  // Track login when user changes
  useEffect(() => {
    if (user) {
      trackLogin(user.uid);
      
      // Check if this is a new signup (creation time equals last sign in time)
      const isNewUser = user.metadata.creationTime === user.metadata.lastSignInTime;
      
      if (isNewUser && !hasTrackedSignup.current) {
        trackEvent(user.uid, 'signup');
        trackEvent(user.uid, 'trial_start');
        hasTrackedSignup.current = true;
      }
    }
  }, [user, trackLogin, trackEvent]);

  // Track subscription changes and schedule notifications
  useEffect(() => {
    if (userSubscription && user) {
      // Track plan changes
      if (previousPlan.current && previousPlan.current !== userSubscription.plan) {
        if (userSubscription.plan !== 'free') {
          trackEvent(user.uid, 'upgrade_completed', { 
            fromPlan: previousPlan.current, 
            toPlan: userSubscription.plan 
          });
          scheduleNotification(user.uid, user.email!, 'upgrade_success', new Date());
        }
      }
      
      // Update previous plan reference
      previousPlan.current = userSubscription.plan;

      // Handle trial notifications for free plan users
      if (userSubscription.plan === 'free' && userSubscription.trialEndDate) {
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
          trackEvent(user.uid, 'trial_expired');
          scheduleNotification(
            user.uid,
            user.email!,
            'trial_expired',
            new Date()
          );
        }
      }
    }
  }, [userSubscription, user, trackEvent, scheduleNotification]);

  return <>{children}</>;
};