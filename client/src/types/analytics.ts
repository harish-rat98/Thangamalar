export interface UserAnalytics {
  userId: string;
  email: string;
  plan: string;
  signupDate: Date;
  lastLoginDate: Date;
  trialEndDate?: Date;
  subscriptionStartDate?: Date;
  isActive: boolean;
  totalLogins: number;
  featuresUsed: string[];
  usageStats: {
    inventoryItems: number;
    customers: number;
    salesThisMonth: number;
    totalSales: number;
  };
  conversionEvents: ConversionEvent[];
}

export interface ConversionEvent {
  id: string;
  userId: string;
  eventType: 'signup' | 'trial_start' | 'feature_limit_hit' | 'upgrade_prompt_shown' | 'upgrade_completed' | 'trial_expired';
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface SystemAnalytics {
  totalUsers: number;
  activeUsers: number;
  trialUsers: number;
  paidUsers: number;
  conversionRate: number;
  churnRate: number;
  monthlyRecurringRevenue: number;
  averageRevenuePerUser: number;
  popularFeatures: { feature: string; usage: number }[];
  userGrowth: { date: string; count: number }[];
}

export interface EmailNotification {
  id: string;
  userId: string;
  email: string;
  type: 'trial_reminder' | 'trial_expired' | 'upgrade_success' | 'feature_limit_warning';
  subject: string;
  content: string;
  scheduledFor: Date;
  sentAt?: Date;
  status: 'pending' | 'sent' | 'failed';
}