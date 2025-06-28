import { useState, useEffect } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { UserSubscription, SubscriptionPlan } from '@/types/subscription';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        // Fetch user subscription data
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserSubscription({
            ...data,
            trialEndDate: data.trialEndDate?.toDate(),
            subscriptionStartDate: data.subscriptionStartDate?.toDate(),
          } as UserSubscription);
        } else {
          // Create default subscription for new user
          const defaultSubscription: UserSubscription = {
            id: user.uid,
            email: user.email!,
            plan: 'free',
            isActive: true,
            trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
            subscriptionStartDate: new Date(),
            features: {
              maxInventoryItems: 50,
              maxCustomers: 25,
              maxSalesPerMonth: 100,
              hasAdvancedReports: false,
              hasMultiLocation: false,
              hasAPIAccess: false,
            },
          };
          
          await setDoc(doc(db, 'users', user.uid), {
            ...defaultSubscription,
            trialEndDate: defaultSubscription.trialEndDate,
            subscriptionStartDate: defaultSubscription.subscriptionStartDate,
          });
          
          setUserSubscription(defaultSubscription);
        }
      } else {
        setUserSubscription(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string) => {
    return createUserWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    return signOut(auth);
  };

  const updateSubscription = async (newPlan: SubscriptionPlan) => {
    if (!user) return;

    const planFeatures = {
      free: {
        maxInventoryItems: 50,
        maxCustomers: 25,
        maxSalesPerMonth: 100,
        hasAdvancedReports: false,
        hasMultiLocation: false,
        hasAPIAccess: false,
      },
      professional: {
        maxInventoryItems: 1000,
        maxCustomers: 500,
        maxSalesPerMonth: 1000,
        hasAdvancedReports: true,
        hasMultiLocation: false,
        hasAPIAccess: false,
      },
      enterprise: {
        maxInventoryItems: -1,
        maxCustomers: -1,
        maxSalesPerMonth: -1,
        hasAdvancedReports: true,
        hasMultiLocation: true,
        hasAPIAccess: true,
      },
    };

    const updatedSubscription = {
      ...userSubscription,
      plan: newPlan,
      features: planFeatures[newPlan],
      subscriptionStartDate: new Date(),
    };

    await setDoc(doc(db, 'users', user.uid), updatedSubscription);
    setUserSubscription(updatedSubscription as UserSubscription);
  };

  return {
    user,
    userSubscription,
    loading,
    signIn,
    signUp,
    logout,
    updateSubscription,
  };
};