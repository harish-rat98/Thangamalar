import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { subscriptionPlans } from '@/lib/subscriptionPlans';
import { SubscriptionPlan } from '@/types/subscription';
import { Check, Crown, Zap, Star } from 'lucide-react';

export const SubscriptionPage: React.FC = () => {
  const { userSubscription, updateSubscription } = useAuth();

  const handleUpgrade = async (planId: SubscriptionPlan) => {
    // Simulate payment process
    const confirmed = window.confirm(
      `Upgrade to ${planId} plan? This is a demo - no actual payment will be processed.`
    );
    
    if (confirmed) {
      await updateSubscription(planId);
      alert('Subscription updated successfully!');
    }
  };

  const getPlanIcon = (planId: SubscriptionPlan) => {
    switch (planId) {
      case 'free': return <Zap className="h-6 w-6" />;
      case 'professional': return <Star className="h-6 w-6" />;
      case 'enterprise': return <Crown className="h-6 w-6" />;
    }
  };

  const formatFeatureValue = (value: number) => {
    return value === -1 ? 'Unlimited' : value.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-jewelry-cream p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-jewelry-navy mb-2">
            Choose Your Plan
          </h1>
          <p className="text-jewelry-bronze">
            Select the perfect plan for your jewelry business
          </p>
          {userSubscription && (
            <div className="mt-4">
              <Badge variant="outline" className="text-jewelry-gold border-jewelry-gold">
                Current Plan: {userSubscription.plan.charAt(0).toUpperCase() + userSubscription.plan.slice(1)}
              </Badge>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {subscriptionPlans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`relative ${plan.popular ? 'border-jewelry-gold border-2' : ''} ${
                userSubscription?.plan === plan.id ? 'bg-jewelry-gold/10' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-jewelry-gold text-white">Most Popular</Badge>
                </div>
              )}
              
              <CardHeader className="text-center">
                <div className="flex justify-center mb-2 text-jewelry-bronze">
                  {getPlanIcon(plan.id)}
                </div>
                <CardTitle className="text-xl text-jewelry-navy">{plan.name}</CardTitle>
                <div className="text-3xl font-bold text-jewelry-bronze">
                  ₹{plan.price.toLocaleString()}
                  <span className="text-sm font-normal">/{plan.interval}</span>
                </div>
                <CardDescription>
                  {plan.id === 'free' && 'Perfect for getting started'}
                  {plan.id === 'professional' && 'Best for growing businesses'}
                  {plan.id === 'enterprise' && 'For large-scale operations'}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">
                      {formatFeatureValue(plan.features.maxInventoryItems)} inventory items
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">
                      {formatFeatureValue(plan.features.maxCustomers)} customers
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">
                      {formatFeatureValue(plan.features.maxSalesPerMonth)} sales/month
                    </span>
                  </div>
                  {plan.features.hasAdvancedReports && (
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Advanced reports & analytics</span>
                    </div>
                  )}
                  {plan.features.hasMultiLocation && (
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Multi-location support</span>
                    </div>
                  )}
                  {plan.features.hasAPIAccess && (
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">API access</span>
                    </div>
                  )}
                </div>

                <Button
                  className={`w-full ${
                    userSubscription?.plan === plan.id
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-jewelry-gold hover:bg-jewelry-bronze'
                  }`}
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={userSubscription?.plan === plan.id}
                >
                  {userSubscription?.plan === plan.id ? 'Current Plan' : 
                   plan.id === 'free' ? 'Start Free Trial' : 'Upgrade Now'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-jewelry-bronze">
            All plans include 24/7 support • 99.9% uptime guarantee • Secure data encryption
          </p>
        </div>
      </div>
    </div>
  );
};