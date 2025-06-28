import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, ArrowRight } from 'lucide-react';

interface FeatureLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  feature: string;
  currentLimit: number;
  upgradeLimit: number | string;
}

export const FeatureLimitModal: React.FC<FeatureLimitModalProps> = ({
  isOpen,
  onClose,
  onUpgrade,
  feature,
  currentLimit,
  upgradeLimit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Crown className="h-8 w-8 text-jewelry-gold" />
          </div>
          <CardTitle className="text-xl text-jewelry-navy">
            Upgrade Required
          </CardTitle>
          <CardDescription>
            You've reached your {feature} limit
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-jewelry-cream p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-jewelry-bronze">Current Plan</span>
              <Badge variant="outline">Free</Badge>
            </div>
            <div className="text-lg font-semibold text-jewelry-navy">
              {currentLimit.toLocaleString()} {feature}
            </div>
          </div>

          <div className="flex items-center justify-center">
            <ArrowRight className="h-5 w-5 text-jewelry-bronze" />
          </div>

          <div className="bg-jewelry-gold/10 p-4 rounded-lg border border-jewelry-gold">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-jewelry-bronze">Professional Plan</span>
              <Badge className="bg-jewelry-gold text-white">Recommended</Badge>
            </div>
            <div className="text-lg font-semibold text-jewelry-navy">
              {typeof upgradeLimit === 'string' ? upgradeLimit : upgradeLimit.toLocaleString()} {feature}
            </div>
            <div className="text-sm text-jewelry-bronze mt-1">
              Starting at ₹2,999/month
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
            >
              Maybe Later
            </Button>
            <Button 
              onClick={onUpgrade}
              className="flex-1 bg-jewelry-gold hover:bg-jewelry-bronze"
            >
              Upgrade Now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};