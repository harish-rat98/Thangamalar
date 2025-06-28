import { useState, useEffect } from 'react';
import { collection, addDoc, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { EmailNotification } from '@/types/analytics';

export const useEmailNotifications = () => {
  const [notifications, setNotifications] = useState<EmailNotification[]>([]);

  const scheduleNotification = async (
    userId: string,
    email: string,
    type: EmailNotification['type'],
    scheduledFor: Date
  ) => {
    const templates = {
      trial_reminder: {
        subject: 'Your Thanga Malar trial expires soon',
        content: `Your free trial expires in 3 days. Upgrade now to continue using all features.`,
      },
      trial_expired: {
        subject: 'Your Thanga Malar trial has expired',
        content: `Your trial has expired. Upgrade to continue managing your jewelry business.`,
      },
      upgrade_success: {
        subject: 'Welcome to Thanga Malar Professional!',
        content: `Thank you for upgrading! You now have access to all professional features.`,
      },
      feature_limit_warning: {
        subject: 'You\'re approaching your plan limits',
        content: `You're close to reaching your plan limits. Consider upgrading for unlimited access.`,
      },
    };

    try {
      await addDoc(collection(db, 'email_notifications'), {
        userId,
        email,
        type,
        subject: templates[type].subject,
        content: templates[type].content,
        scheduledFor,
        status: 'pending',
        createdAt: new Date(),
      });
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  };

  const markAsSent = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'email_notifications', notificationId), {
        status: 'sent',
        sentAt: new Date(),
      });
    } catch (error) {
      console.error('Error marking notification as sent:', error);
    }
  };

  const getPendingNotifications = async () => {
    try {
      const q = query(
        collection(db, 'email_notifications'),
        where('status', '==', 'pending'),
        where('scheduledFor', '<=', new Date())
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EmailNotification));
    } catch (error) {
      console.error('Error getting pending notifications:', error);
      return [];
    }
  };

  // Simulate email sending (replace with actual email service)
  const sendEmail = async (notification: EmailNotification) => {
    console.log('Sending email:', notification);
    // Here you would integrate with SendGrid, AWS SES, or similar
    await markAsSent(notification.id);
  };

  return {
    scheduleNotification,
    markAsSent,
    getPendingNotifications,
    sendEmail,
    notifications,
  };
};