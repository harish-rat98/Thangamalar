import { useState, useEffect } from 'react';
import { collection, addDoc, query, where, orderBy, getDocs, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ConversionEvent, UserAnalytics } from '@/types/analytics';

export const useAnalytics = () => {
  const trackEvent = async (userId: string, eventType: ConversionEvent['eventType'], metadata?: Record<string, any>) => {
    if (!userId) return;

    try {
      await addDoc(collection(db, 'analytics_events'), {
        userId,
        eventType,
        timestamp: new Date(),
        metadata: metadata || {},
      });

      // Update user analytics
      const userAnalyticsRef = doc(db, 'user_analytics', userId);
      await updateDoc(userAnalyticsRef, {
        lastActivity: new Date(),
        [`events.${eventType}`]: increment(1),
      });
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  };

  const trackFeatureUsage = async (userId: string, feature: string) => {
    if (!userId) return;

    try {
      await addDoc(collection(db, 'feature_usage'), {
        userId,
        feature,
        timestamp: new Date(),
      });

      const userAnalyticsRef = doc(db, 'user_analytics', userId);
      await updateDoc(userAnalyticsRef, {
        [`featureUsage.${feature}`]: increment(1),
        lastActivity: new Date(),
      });
    } catch (error) {
      console.error('Error tracking feature usage:', error);
    }
  };

  const trackLogin = async (userId: string) => {
    if (!userId) return;

    try {
      const userAnalyticsRef = doc(db, 'user_analytics', userId);
      await updateDoc(userAnalyticsRef, {
        totalLogins: increment(1),
        lastLoginDate: new Date(),
      });
    } catch (error) {
      console.error('Error tracking login:', error);
    }
  };

  return {
    trackEvent,
    trackFeatureUsage,
    trackLogin,
  };
};