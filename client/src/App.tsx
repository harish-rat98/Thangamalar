import React from 'react';
import { Route, Switch, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AuthForm } from '@/components/AuthForm';
import { SubscriptionPage } from '@/pages/SubscriptionPage';
import { AdminDashboard } from '@/pages/AdminDashboard';
import { FeatureLimitModal } from '@/components/FeatureLimitModal';
import { AnalyticsTracker } from '@/components/AnalyticsTracker';
import { useAuth } from '@/hooks/useAuth';
import { useFeatureLimits } from '@/hooks/useFeatureLimits';
import { useAnalytics } from '@/hooks/useAnalytics';
import { LogOut, Crown, Settings, Users, Package, TrendingUp, CreditCard, BarChart3, Shield } from 'lucide-react';

function Dashboard() {
  const { user, userSubscription, logout } = useAuth();
  const { checkLimit, limitModal, closeLimitModal, showUpgradePrompt } = useFeatureLimits();
  const { trackFeatureUsage } = useAnalytics();
  const [, setLocation] = useLocation();

  const handleFeatureClick = (feature: 'inventory' | 'customers' | 'sales') => {
    // Track feature usage
    if (user) {
      trackFeatureUsage(user.uid, feature);
    }
    
    // Simulate current counts for demo
    const currentCounts = {
      inventory: 45, // Close to free limit of 50
      customers: 20,
      sales: 85, // Close to free limit of 100
    };

    const isLimited = checkLimit(feature, currentCounts[feature]);
    
    if (!isLimited) {
      // Navigate to feature page (would be implemented)
      alert(`Opening ${feature} management...`);
    }
  };

  const handleUpgrade = () => {
    showUpgradePrompt();
    closeLimitModal();
    setLocation('/subscription');
  };

  // Check if user is admin (you can implement proper admin role checking)
  const isAdmin = user?.email === 'admin@thangamalar.com';

  if (!user || !userSubscription) {
    return (
      <AnalyticsTracker>
        <AuthForm />
      </AnalyticsTracker>
    );
  }

  const isTrialExpiring = userSubscription.trialEndDate && 
    new Date(userSubscription.trialEndDate).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000; // 3 days

  return (
    <AnalyticsTracker>
      <div className="min-h-screen bg-background text-foreground">
        {/* Header */}
        <header className="border-b bg-white shadow-sm">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-jewelry-gold">
                தங்கமலர் நகைக்கடை
              </h1>
              <p className="text-sm text-jewelry-bronze">Thanga Malar Jewellery Management</p>
            </div>
            
            <div className="flex items-center gap-4">
              <Badge 
                variant="outline" 
                className={`${userSubscription.plan === 'free' ? 'border-orange-500 text-orange-600' : 'border-jewelry-gold text-jewelry-gold'}`}
              >
                {userSubscription.plan.charAt(0).toUpperCase() + userSubscription.plan.slice(1)} Plan
              </Badge>
              
              {isAdmin && (
                <Button
                  variant="outline"
                  onClick={() => setLocation('/admin')}
                  className="text-purple-600 border-purple-600 hover:bg-purple-600 hover:text-white"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Admin
                </Button>
              )}
              
              <Button
                variant="outline"
                onClick={() => setLocation('/subscription')}
                className="text-jewelry-bronze border-jewelry-bronze hover:bg-jewelry-gold hover:text-white"
              >
                <Crown className="h-4 w-4 mr-2" />
                Upgrade
              </Button>
              
              <Button
                variant="outline"
                onClick={logout}
                className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </header>

        {/* Trial Warning */}
        {isTrialExpiring && userSubscription.plan === 'free' && (
          <div className="bg-orange-50 border-l-4 border-orange-400 p-4">
            <div className="container mx-auto">
              <div className="flex justify-between items-center">
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm text-orange-700">
                      Your free trial expires in {Math.ceil((new Date(userSubscription.trialEndDate!).getTime() - Date.now()) / (24 * 60 * 60 * 1000))} days.
                      <Button 
                        variant="link" 
                        className="text-orange-700 underline p-0 ml-1"
                        onClick={() => setLocation('/subscription')}
                      >
                        Upgrade now to continue using all features.
                      </Button>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="container mx-auto p-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-jewelry-navy mb-2">
              Welcome back, {user.email}
            </h2>
            <p className="text-muted-foreground">
              Manage your jewelry business with ease
            </p>
          </div>

          {/* Usage Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Inventory Items</p>
                    <p className="text-2xl font-bold">45</p>
                    <p className="text-xs text-muted-foreground">
                      of {userSubscription.features.maxInventoryItems === -1 ? '∞' : userSubscription.features.maxInventoryItems}
                    </p>
                  </div>
                  <Package className="h-8 w-8 text-jewelry-bronze" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Customers</p>
                    <p className="text-2xl font-bold">20</p>
                    <p className="text-xs text-muted-foreground">
                      of {userSubscription.features.maxCustomers === -1 ? '∞' : userSubscription.features.maxCustomers}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-jewelry-bronze" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Sales This Month</p>
                    <p className="text-2xl font-bold">85</p>
                    <p className="text-xs text-muted-foreground">
                      of {userSubscription.features.maxSalesPerMonth === -1 ? '∞' : userSubscription.features.maxSalesPerMonth}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-jewelry-bronze" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleFeatureClick('inventory')}>
              <CardHeader>
                <CardTitle className="text-jewelry-bronze flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Inventory Management
                </CardTitle>
                <CardDescription>
                  Manage your jewelry stock, track items, and monitor inventory levels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-jewelry-gold hover:bg-jewelry-bronze text-white">
                  View Inventory
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleFeatureClick('sales')}>
              <CardHeader>
                <CardTitle className="text-jewelry-bronze flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Sales & Billing
                </CardTitle>
                <CardDescription>
                  Process sales, generate bills, and manage customer transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-jewelry-gold hover:bg-jewelry-bronze text-white">
                  New Sale
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleFeatureClick('customers')}>
              <CardHeader>
                <CardTitle className="text-jewelry-bronze flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Customer Management
                </CardTitle>
                <CardDescription>
                  Maintain customer records and track purchase history
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-jewelry-gold hover:bg-jewelry-bronze text-white">
                  Manage Customers
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-jewelry-bronze flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Credit Management
                </CardTitle>
                <CardDescription>
                  Track merchant credits in gold, silver, cash and other forms
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-jewelry-gold hover:bg-jewelry-bronze text-white">
                  View Credits
                </Button>
              </CardContent>
            </Card>

            <Card className={`hover:shadow-lg transition-shadow ${!userSubscription.features.hasAdvancedReports ? 'opacity-60' : ''}`}>
              <CardHeader>
                <CardTitle className="text-jewelry-bronze flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Reports & Analytics
                  {!userSubscription.features.hasAdvancedReports && (
                    <Crown className="h-4 w-4 text-jewelry-gold" />
                  )}
                </CardTitle>
                <CardDescription>
                  Generate business reports and analyze performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full bg-jewelry-gold hover:bg-jewelry-bronze text-white"
                  disabled={!userSubscription.features.hasAdvancedReports}
                  onClick={() => !userSubscription.features.hasAdvancedReports && setLocation('/subscription')}
                >
                  {userSubscription.features.hasAdvancedReports ? 'View Reports' : 'Upgrade Required'}
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-jewelry-bronze flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Settings
                </CardTitle>
                <CardDescription>
                  Configure system settings and business preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-jewelry-gold hover:bg-jewelry-bronze text-white">
                  Settings
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground">
              Built for modern jewelry businesses • Secure • Reliable • Easy to use
            </p>
          </div>
        </div>

        <FeatureLimitModal
          isOpen={limitModal.isOpen}
          onClose={closeLimitModal}
          onUpgrade={handleUpgrade}
          feature={limitModal.feature}
          currentLimit={limitModal.currentLimit}
          upgradeLimit={limitModal.upgradeLimit}
        />
      </div>
    </AnalyticsTracker>
  );
}

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-jewelry-gold mx-auto mb-4"></div>
          <p className="text-jewelry-bronze">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/subscription" component={SubscriptionPage} />
      <Route path="/admin" component={AdminDashboard} />
      <Route component={Dashboard} />
    </Switch>
  );
}

export default App;