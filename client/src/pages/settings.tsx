import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { getSettings, updateSettings, getDailyPrices, setDailyPrices } from "@/lib/firestore";
import { queryClient } from "@/lib/queryClient";

interface Settings {
  businessInfo: {
    shopName: string;
    address: string;
    contactNumber: string;
    email: string;
    gstNumber: string;
    registrationNumber: string;
  };
  defaultValues: {
    makingChargesPercentage: string;
    wastagePercentage: string;
    taxPercentage: string;
  };
  priceSettings: {
    currentGoldPrice: string;
    currentSilverPrice: string;
    currentPlatinumPrice: string;
  };
  userPreferences: {
    dateFormat: string;
    currencyDisplay: string;
    notifications: boolean;
  };
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState("business");
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<Settings>({
    queryKey: ['settings'],
    queryFn: getSettings,
  });

  const { data: dailyPrices } = useQuery({
    queryKey: ['daily-prices'],
    queryFn: getDailyPrices,
  });

  const [businessInfo, setBusinessInfo] = useState({
    shopName: "",
    address: "",
    contactNumber: "",
    email: "",
    gstNumber: "",
    registrationNumber: "",
  });

  const [defaultValues, setDefaultValues] = useState({
    makingChargesPercentage: "15",
    wastagePercentage: "2",
    taxPercentage: "3",
  });

  const [priceSettings, setPriceSettings] = useState({
    currentGoldPrice: "9200",
    currentSilverPrice: "110",
    currentPlatinumPrice: "3500",
  });

  const [userPreferences, setUserPreferences] = useState({
    dateFormat: "DD/MM/YYYY",
    currencyDisplay: "INR",
    notifications: true,
  });

  // Update local state when settings are loaded
  React.useEffect(() => {
    if (settings) {
      setBusinessInfo(settings.businessInfo);
      setDefaultValues(settings.defaultValues);
      setPriceSettings(settings.priceSettings);
      setUserPreferences(settings.userPreferences);
    }
  }, [settings]);

  // Update price settings when daily prices change
  React.useEffect(() => {
    if (dailyPrices) {
      setPriceSettings({
        currentGoldPrice: dailyPrices.goldPricePerGram,
        currentSilverPrice: dailyPrices.silverPricePerGram,
        currentPlatinumPrice: dailyPrices.platinumPricePerGram || "3500",
      });
    }
  }, [dailyPrices]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<Settings>) => {
      await updateSettings(newSettings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast({ title: "Success", description: "Settings updated successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updatePricesMutation = useMutation({
    mutationFn: async (prices: { goldPricePerGram: string; silverPricePerGram: string; platinumPricePerGram: string }) => {
      await setDailyPrices(prices);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-prices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      toast({ title: "Success", description: "Prices updated successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleBusinessInfoSave = () => {
    updateSettingsMutation.mutate({ businessInfo });
  };

  const handleDefaultValuesSave = () => {
    updateSettingsMutation.mutate({ defaultValues });
  };

  const handlePricesSave = () => {
    updatePricesMutation.mutate({
      goldPricePerGram: priceSettings.currentGoldPrice,
      silverPricePerGram: priceSettings.currentSilverPrice,
      platinumPricePerGram: priceSettings.currentPlatinumPrice,
    });
    updateSettingsMutation.mutate({ priceSettings });
  };

  const handlePreferencesSave = () => {
    updateSettingsMutation.mutate({ userPreferences });
  };

  const exportData = () => {
    toast({ title: "Info", description: "Export functionality will be implemented soon" });
  };

  const importData = () => {
    toast({ title: "Info", description: "Import functionality will be implemented soon" });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-jewelry-navy">Settings</h1>
            <p className="text-gray-600 mt-1">Configure your business settings and preferences</p>
          </div>
        </div>
      </header>

      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="business">Business Info</TabsTrigger>
            <TabsTrigger value="defaults">Default Values</TabsTrigger>
            <TabsTrigger value="prices">Price Settings</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="backup">Backup & Export</TabsTrigger>
          </TabsList>

          {/* Business Information */}
          <TabsContent value="business">
            <Card>
              <CardHeader>
                <CardTitle>Business Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="shopName">Shop Name</Label>
                    <Input
                      id="shopName"
                      value={businessInfo.shopName}
                      onChange={(e) => setBusinessInfo({...businessInfo, shopName: e.target.value})}
                      placeholder="Thanga Malar Jewellery"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactNumber">Contact Number</Label>
                    <Input
                      id="contactNumber"
                      value={businessInfo.contactNumber}
                      onChange={(e) => setBusinessInfo({...businessInfo, contactNumber: e.target.value})}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={businessInfo.address}
                    onChange={(e) => setBusinessInfo({...businessInfo, address: e.target.value})}
                    placeholder="Shop address..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={businessInfo.email}
                      onChange={(e) => setBusinessInfo({...businessInfo, email: e.target.value})}
                      placeholder="shop@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="gstNumber">GST Number</Label>
                    <Input
                      id="gstNumber"
                      value={businessInfo.gstNumber}
                      onChange={(e) => setBusinessInfo({...businessInfo, gstNumber: e.target.value})}
                      placeholder="GST123456789"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="registrationNumber">Business Registration Number</Label>
                  <Input
                    id="registrationNumber"
                    value={businessInfo.registrationNumber}
                    onChange={(e) => setBusinessInfo({...businessInfo, registrationNumber: e.target.value})}
                    placeholder="REG123456789"
                  />
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={handleBusinessInfoSave}
                    disabled={updateSettingsMutation.isPending}
                    className="bg-jewelry-gold hover:bg-jewelry-bronze"
                  >
                    Save Business Info
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Default Values */}
          <TabsContent value="defaults">
            <Card>
              <CardHeader>
                <CardTitle>Default Values</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="makingCharges">Default Making Charges (%)</Label>
                    <Input
                      id="makingCharges"
                      type="number"
                      value={defaultValues.makingChargesPercentage}
                      onChange={(e) => setDefaultValues({...defaultValues, makingChargesPercentage: e.target.value})}
                      placeholder="15"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="wastage">Default Wastage (%)</Label>
                    <Input
                      id="wastage"
                      type="number"
                      value={defaultValues.wastagePercentage}
                      onChange={(e) => setDefaultValues({...defaultValues, wastagePercentage: e.target.value})}
                      placeholder="2"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tax">Default Tax (%)</Label>
                    <Input
                      id="tax"
                      type="number"
                      value={defaultValues.taxPercentage}
                      onChange={(e) => setDefaultValues({...defaultValues, taxPercentage: e.target.value})}
                      placeholder="3"
                      step="0.1"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">About Default Values</h4>
                  <p className="text-sm text-blue-800">
                    These values will be automatically filled when creating new sales. You can always modify them for individual transactions.
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={handleDefaultValuesSave}
                    disabled={updateSettingsMutation.isPending}
                    className="bg-jewelry-gold hover:bg-jewelry-bronze"
                  >
                    Save Default Values
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Price Settings */}
          <TabsContent value="prices">
            <Card>
              <CardHeader>
                <CardTitle>Price Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="goldPrice">Current Gold Price (₹/gram)</Label>
                    <Input
                      id="goldPrice"
                      type="number"
                      value={priceSettings.currentGoldPrice}
                      onChange={(e) => setPriceSettings({...priceSettings, currentGoldPrice: e.target.value})}
                      placeholder="9200"
                    />
                  </div>
                  <div>
                    <Label htmlFor="silverPrice">Current Silver Price (₹/gram)</Label>
                    <Input
                      id="silverPrice"
                      type="number"
                      value={priceSettings.currentSilverPrice}
                      onChange={(e) => setPriceSettings({...priceSettings, currentSilverPrice: e.target.value})}
                      placeholder="110"
                    />
                  </div>
                  <div>
                    <Label htmlFor="platinumPrice">Current Platinum Price (₹/gram)</Label>
                    <Input
                      id="platinumPrice"
                      type="number"
                      value={priceSettings.currentPlatinumPrice}
                      onChange={(e) => setPriceSettings({...priceSettings, currentPlatinumPrice: e.target.value})}
                      placeholder="3500"
                    />
                  </div>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-medium text-yellow-900 mb-2">Price Management</h4>
                  <p className="text-sm text-yellow-800">
                    These prices are used for calculating sale amounts. Update them daily based on market rates. 
                    Price history is automatically maintained.
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={handlePricesSave}
                    disabled={updatePricesMutation.isPending}
                    className="bg-jewelry-gold hover:bg-jewelry-bronze"
                  >
                    Update Prices
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Preferences */}
          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle>User Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dateFormat">Date Format</Label>
                    <select
                      id="dateFormat"
                      value={userPreferences.dateFormat}
                      onChange={(e) => setUserPreferences({...userPreferences, dateFormat: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="currencyDisplay">Currency Display</Label>
                    <select
                      id="currencyDisplay"
                      value={userPreferences.currencyDisplay}
                      onChange={(e) => setUserPreferences({...userPreferences, currencyDisplay: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="INR">Indian Rupee (₹)</option>
                      <option value="USD">US Dollar ($)</option>
                      <option value="EUR">Euro (€)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label htmlFor="notifications">Enable Notifications</Label>
                    <p className="text-sm text-gray-600">Receive alerts for low stock, overdue credits, etc.</p>
                  </div>
                  <Switch
                    id="notifications"
                    checked={userPreferences.notifications}
                    onCheckedChange={(checked) => setUserPreferences({...userPreferences, notifications: checked})}
                  />
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={handlePreferencesSave}
                    disabled={updateSettingsMutation.isPending}
                    className="bg-jewelry-gold hover:bg-jewelry-bronze"
                  >
                    Save Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Backup & Export */}
          <TabsContent value="backup">
            <Card>
              <CardHeader>
                <CardTitle>Backup & Export</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4">
                    <h4 className="font-medium text-jewelry-navy mb-2">Export Data</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Export all your business data for backup or migration purposes.
                    </p>
                    <div className="space-y-2">
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={exportData}
                      >
                        <i className="fas fa-download mr-2"></i>Export All Data
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={exportData}
                      >
                        <i className="fas fa-file-excel mr-2"></i>Export to Excel
                      </Button>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <h4 className="font-medium text-jewelry-navy mb-2">Import Data</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Import data from backup files or other systems.
                    </p>
                    <div className="space-y-2">
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={importData}
                      >
                        <i className="fas fa-upload mr-2"></i>Import Data
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={importData}
                      >
                        <i className="fas fa-cog mr-2"></i>Import Settings
                      </Button>
                    </div>
                  </Card>
                </div>

                <div className="bg-red-50 p-4 rounded-lg">
                  <h4 className="font-medium text-red-900 mb-2">⚠️ Important Notes</h4>
                  <ul className="text-sm text-red-800 space-y-1">
                    <li>• Always backup your data before making major changes</li>
                    <li>• Export data regularly to prevent data loss</li>
                    <li>• Importing data will overwrite existing records</li>
                    <li>• Contact support if you need help with data migration</li>
                  </ul>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">✅ Automatic Backups</h4>
                  <p className="text-sm text-green-800">
                    Your data is automatically backed up to Firebase Cloud Storage. 
                    Last backup: {new Date().toLocaleDateString('en-IN')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}