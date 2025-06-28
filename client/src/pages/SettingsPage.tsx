import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { ArrowLeft, User, Bell, Shield, Database, Palette } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, userSubscription } = useAuth();
  const [, setLocation] = useLocation();
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    push: true,
  });

  const handleNotificationChange = (type: string, value: boolean) => {
    setNotifications(prev => ({ ...prev, [type]: value }));
  };

  return (
    <div className="min-h-screen bg-jewelry-cream p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            onClick={() => setLocation('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-jewelry-navy">Settings</h1>
            <p className="text-jewelry-bronze">Manage your account and application preferences</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Account Information */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-jewelry-navy">
                <User className="h-5 w-5" />
                Account Information
              </CardTitle>
              <CardDescription>
                Your account details and subscription information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <Label htmlFor="plan">Current Plan</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge 
                      variant="outline" 
                      className={`${userSubscription?.plan === 'free' ? 'border-orange-500 text-orange-600' : 'border-jewelry-gold text-jewelry-gold'}`}
                    >
                      {userSubscription?.plan?.charAt(0).toUpperCase() + userSubscription?.plan?.slice(1)} Plan
                    </Badge>
                    <Button
                      variant="link"
                      onClick={() => setLocation('/subscription')}
                      className="text-jewelry-bronze p-0 h-auto"
                    >
                      Upgrade
                    </Button>
                  </div>
                </div>
              </div>

              {userSubscription?.trialEndDate && userSubscription.plan === 'free' && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-medium text-orange-800 mb-1">Trial Information</h4>
                  <p className="text-sm text-orange-700">
                    Your free trial expires on {new Date(userSubscription.trialEndDate).toLocaleDateString()}
                  </p>
                </div>
              )}

              <div className="pt-4">
                <h4 className="font-medium text-jewelry-navy mb-2">Plan Features</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Inventory Items:</span>
                    <span className="ml-2 font-medium">
                      {userSubscription?.features.maxInventoryItems === -1 ? 'Unlimited' : userSubscription?.features.maxInventoryItems}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Customers:</span>
                    <span className="ml-2 font-medium">
                      {userSubscription?.features.maxCustomers === -1 ? 'Unlimited' : userSubscription?.features.maxCustomers}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Sales/Month:</span>
                    <span className="ml-2 font-medium">
                      {userSubscription?.features.maxSalesPerMonth === -1 ? 'Unlimited' : userSubscription?.features.maxSalesPerMonth}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-jewelry-navy">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setLocation('/subscription')}
              >
                <Shield className="h-4 w-4 mr-2" />
                Manage Subscription
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                disabled
              >
                <Database className="h-4 w-4 mr-2" />
                Export Data
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                disabled
              >
                <Palette className="h-4 w-4 mr-2" />
                Customize Theme
              </Button>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-jewelry-navy">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Choose how you want to receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive updates about your account and business
                  </p>
                </div>
                <input
                  type="checkbox"
                  id="email-notifications"
                  checked={notifications.email}
                  onChange={(e) => handleNotificationChange('email', e.target.checked)}
                  className="h-4 w-4"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="sms-notifications">SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Get important alerts via text message
                  </p>
                </div>
                <input
                  type="checkbox"
                  id="sms-notifications"
                  checked={notifications.sms}
                  onChange={(e) => handleNotificationChange('sms', e.target.checked)}
                  className="h-4 w-4"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="push-notifications">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Browser notifications for real-time updates
                  </p>
                </div>
                <input
                  type="checkbox"
                  id="push-notifications"
                  checked={notifications.push}
                  onChange={(e) => handleNotificationChange('push', e.target.checked)}
                  className="h-4 w-4"
                />
              </div>

              <div className="pt-4">
                <Button className="bg-jewelry-gold hover:bg-jewelry-bronze text-white">
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-jewelry-navy">
                <Shield className="h-5 w-5" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                disabled
              >
                Change Password
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                disabled
              >
                Two-Factor Auth
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-red-600 border-red-600 hover:bg-red-50"
                disabled
              >
                Delete Account
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Need help? Contact our support team at support@thangamalar.com
          </p>
        </div>
      </div>
    </div>
  );
};