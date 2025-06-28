import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { getCustomers, getInventoryItems, createSale, getDailyPrices, getSettings } from "@/lib/firestore";

interface Customer {
  id: string;
  name: string;
  phone: string;
}

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  weightPerPiece: string;
  totalWeight: string;
  material: string;
}

interface SaleItem {
  itemId?: string;
  itemName: string;
  quantity: number;
  metalType: string;
  weightGrams: string;
  unitPrice: string;
  totalPrice: string;
  isCustomItem: boolean;
}

interface QuickSaleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function QuickSaleModal({ open, onOpenChange }: QuickSaleModalProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [saleType, setSaleType] = useState<string>("inventory");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [showItemSelector, setShowItemSelector] = useState(false);
  const [showCustomItemForm, setShowCustomItemForm] = useState(false);
  
  // Pricing fields
  const [makingCharges, setMakingCharges] = useState<string>("15");
  const [wastage, setWastage] = useState<string>("2");
  const [additionalCharges, setAdditionalCharges] = useState<string>("0");
  const [taxPercentage, setTaxPercentage] = useState<string>("3");
  
  // Payment fields
  const [cashReceived, setCashReceived] = useState<string>("");
  const [cardUpiReceived, setCardUpiReceived] = useState<string>("");
  
  // Custom item fields
  const [customItemName, setCustomItemName] = useState<string>("");
  const [customMetalType, setCustomMetalType] = useState<string>("gold");
  const [customWeight, setCustomWeight] = useState<string>("");
  const [customQuantity, setCustomQuantity] = useState<number>(1);
  
  const { toast } = useToast();

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: getCustomers,
    enabled: open,
  });

  const { data: inventoryItems } = useQuery<InventoryItem[]>({
    queryKey: ['inventory'],
    queryFn: getInventoryItems,
    enabled: open,
  });

  const { data: dailyPrices } = useQuery({
    queryKey: ['daily-prices'],
    queryFn: getDailyPrices,
    enabled: open,
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
    enabled: open,
  });

  // Load default values from settings
  useEffect(() => {
    if (settings) {
      setMakingCharges(settings.defaultValues.makingChargesPercentage);
      setWastage(settings.defaultValues.wastagePercentage);
      setTaxPercentage(settings.defaultValues.taxPercentage);
    }
  }, [settings]);

  const createSaleMutation = useMutation({
    mutationFn: async (saleData: any) => {
      await createSale(saleData.sale, saleData.items);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({ title: "Success", description: "Sale completed successfully" });
      handleClose();
    },
    onError: (error) => {
      console.error("Sale creation error:", error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create sale",
        variant: "destructive" 
      });
    },
  });

  const calculateItemPrice = (item: SaleItem) => {
    const weight = parseFloat(item.weightGrams);
    const quantity = item.quantity;
    const totalWeight = weight * quantity;
    
    const pricePerGram = item.metalType === 'gold' ? 
      parseFloat(dailyPrices?.goldPricePerGram || "9200") :
      parseFloat(dailyPrices?.silverPricePerGram || "110");
    
    const basePrice = totalWeight * pricePerGram;
    const makingChargesAmount = basePrice * (parseFloat(makingCharges) / 100);
    const wastageAmount = basePrice * (parseFloat(wastage) / 100);
    
    return basePrice + makingChargesAmount + wastageAmount;
  };

  const subtotal = saleItems.reduce((sum, item) => sum + calculateItemPrice(item), 0);
  const additionalChargesAmount = parseFloat(additionalCharges) || 0;
  const subtotalWithCharges = subtotal + additionalChargesAmount;
  const taxAmount = subtotalWithCharges * (parseFloat(taxPercentage) / 100);
  const total = subtotalWithCharges + taxAmount;

  const addInventoryItem = (item: InventoryItem) => {
    const existingItemIndex = saleItems.findIndex(saleItem => saleItem.itemId === item.id);
    
    if (existingItemIndex >= 0) {
      const updatedItems = [...saleItems];
      const existingItem = updatedItems[existingItemIndex];
      const newQuantity = existingItem.quantity + 1;
      
      updatedItems[existingItemIndex] = {
        ...existingItem,
        quantity: newQuantity,
      };
      setSaleItems(updatedItems);
    } else {
      const newItem: SaleItem = {
        itemId: item.id,
        itemName: item.name,
        quantity: 1,
        metalType: item.material,
        weightGrams: item.weightPerPiece,
        unitPrice: "0", // Will be calculated
        totalPrice: "0", // Will be calculated
        isCustomItem: false,
      };
      setSaleItems([...saleItems, newItem]);
    }
    setShowItemSelector(false);
  };

  const addCustomItem = () => {
    if (!customItemName || !customWeight) {
      toast({ 
        title: "Error", 
        description: "Please fill in all custom item details",
        variant: "destructive" 
      });
      return;
    }

    const newItem: SaleItem = {
      itemName: customItemName,
      quantity: customQuantity,
      metalType: customMetalType,
      weightGrams: customWeight,
      unitPrice: "0", // Will be calculated
      totalPrice: "0", // Will be calculated
      isCustomItem: true,
    };

    setSaleItems([...saleItems, newItem]);
    setShowCustomItemForm(false);
    setCustomItemName("");
    setCustomWeight("");
    setCustomQuantity(1);
  };

  const removeItem = (index: number) => {
    setSaleItems(saleItems.filter((_, i) => i !== index));
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(index);
      return;
    }

    const updatedItems = [...saleItems];
    updatedItems[index] = {
      ...updatedItems[index],
      quantity,
    };
    setSaleItems(updatedItems);
  };

  const handleSubmit = () => {
    if (saleItems.length === 0) {
      toast({ 
        title: "Error", 
        description: "Please add at least one item",
        variant: "destructive" 
      });
      return;
    }

    const cashAmount = parseFloat(cashReceived) || 0;
    const cardUpiAmount = parseFloat(cardUpiReceived) || 0;
    const totalReceived = cashAmount + cardUpiAmount;
    const creditAmount = Math.max(0, total - totalReceived);

    let paymentStatus: 'paid' | 'partial' | 'pending' = 'paid';
    if (paymentMethod === 'credit') {
      paymentStatus = 'pending';
    } else if (creditAmount > 0) {
      paymentStatus = totalReceived > 0 ? 'partial' : 'pending';
    }

    const processedItems = saleItems.map(item => ({
      itemId: item.itemId || null,
      itemName: item.itemName,
      quantity: item.quantity,
      metalType: item.metalType,
      weightGrams: item.weightGrams,
      unitPrice: (calculateItemPrice(item) / item.quantity).toString(),
      totalPrice: calculateItemPrice(item).toString(),
      isCustomItem: item.isCustomItem,
    }));

    const saleData = {
      sale: {
        customerId: selectedCustomer || null,
        saleType: saleType,
        totalAmount: total.toString(),
        makingChargesPercentage: makingCharges,
        wastagePercentage: wastage,
        additionalCharges: additionalCharges,
        taxPercentage: taxPercentage,
        taxAmount: taxAmount.toString(),
        discountAmount: "0",
        paymentMethod: paymentMethod,
        paymentStatus: paymentStatus,
        cashReceived: cashAmount.toString(),
        cardUpiReceived: cardUpiAmount.toString(),
        creditAmount: creditAmount.toString(),
        commissionPercentage: saleType === 'commission' ? "10" : null,
        commissionAmount: saleType === 'commission' ? (total * 0.1).toString() : null,
        notes: null,
      },
      items: processedItems,
    };

    console.log("Submitting sale data:", saleData);
    createSaleMutation.mutate(saleData);
  };

  const handleClose = () => {
    setSelectedCustomer(null);
    setSaleItems([]);
    setSaleType("inventory");
    setPaymentMethod("cash");
    setCashReceived("");
    setCardUpiReceived("");
    setShowItemSelector(false);
    setShowCustomItemForm(false);
    onOpenChange(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-jewelry-navy">
            Quick Sale - Weight Based Pricing
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Sale Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Selection */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Customer
              </Label>
              <div className="flex space-x-2">
                <Select 
                  value={selectedCustomer || ""} 
                  onValueChange={(value) => setSelectedCustomer(value)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select existing customer or leave empty for walk-in" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers?.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} ({customer.phone})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  className="px-4 bg-jewelry-gold text-white hover:bg-jewelry-bronze"
                >
                  <i className="fas fa-plus"></i>
                </Button>
              </div>
            </div>

            {/* Current Prices Display */}
            {dailyPrices && (
              <Card className="bg-blue-50">
                <CardContent className="p-4">
                  <h4 className="font-medium text-jewelry-navy mb-2">Today's Metal Prices</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-600">Gold:</span>
                      <span className="ml-2 font-bold text-yellow-600">₹{dailyPrices.goldPricePerGram}/g</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Silver:</span>
                      <span className="ml-2 font-bold text-gray-600">₹{dailyPrices.silverPricePerGram}/g</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Items Section */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Items
              </Label>
              <div className="border border-gray-300 rounded-lg p-4 space-y-3">
                {saleItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{item.itemName}</p>
                      <p className="text-sm text-gray-600">
                        {item.weightGrams}g {item.metalType} • Qty: {item.quantity}
                        {item.isCustomItem && <Badge className="ml-2 bg-purple-100 text-purple-800">Custom</Badge>}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      {/* Quantity Controls */}
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateItemQuantity(index, item.quantity - 1)}
                        >
                          -
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateItemQuantity(index, item.quantity + 1)}
                        >
                          +
                        </Button>
                      </div>
                      
                      {/* Price */}
                      <span className="font-medium min-w-[80px] text-right">
                        {formatCurrency(calculateItemPrice(item))}
                      </span>
                      
                      {/* Remove Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <i className="fas fa-trash"></i>
                      </Button>
                    </div>
                  </div>
                ))}
                
                {/* Add Item Buttons */}
                <div className="flex space-x-2">
                  {!showItemSelector && !showCustomItemForm && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 p-3 border-2 border-dashed border-gray-300 text-gray-600 hover:border-jewelry-gold hover:text-jewelry-gold"
                        onClick={() => setShowItemSelector(true)}
                      >
                        <i className="fas fa-plus mr-2"></i>Add from Inventory
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 p-3 border-2 border-dashed border-purple-300 text-purple-600 hover:border-purple-500 hover:text-purple-700"
                        onClick={() => setShowCustomItemForm(true)}
                      >
                        <i className="fas fa-hammer mr-2"></i>Add Custom Item
                      </Button>
                    </>
                  )}
                </div>

                {/* Inventory Item Selector */}
                {showItemSelector && (
                  <div className="border rounded-lg p-3 bg-white max-h-60 overflow-y-auto">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">Select from Inventory</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowItemSelector(false)}
                      >
                        <i className="fas fa-times"></i>
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {inventoryItems?.filter(item => item.quantity > 0).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
                          onClick={() => addInventoryItem(item)}
                        >
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-gray-600">
                              {item.weightPerPiece}g {item.material} • Stock: {item.quantity}
                            </p>
                          </div>
                          <Badge className="bg-green-100 text-green-800">
                            Add
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom Item Form */}
                {showCustomItemForm && (
                  <div className="border rounded-lg p-4 bg-white">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">Add Custom Item</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCustomItemForm(false)}
                      >
                        <i className="fas fa-times"></i>
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm">Item Name</Label>
                        <Input
                          value={customItemName}
                          onChange={(e) => setCustomItemName(e.target.value)}
                          placeholder="Custom Ring"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Metal Type</Label>
                        <Select value={customMetalType} onValueChange={setCustomMetalType}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gold">Gold</SelectItem>
                            <SelectItem value="silver">Silver</SelectItem>
                            <SelectItem value="platinum">Platinum</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm">Weight (grams)</Label>
                        <Input
                          type="number"
                          value={customWeight}
                          onChange={(e) => setCustomWeight(e.target.value)}
                          placeholder="4.5"
                          step="0.1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Quantity</Label>
                        <Input
                          type="number"
                          value={customQuantity}
                          onChange={(e) => setCustomQuantity(parseInt(e.target.value) || 1)}
                          min="1"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={addCustomItem}
                      className="w-full mt-3 bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      Add Custom Item
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Sale Type */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Sale Type
              </Label>
              <RadioGroup value={saleType} onValueChange={setSaleType} className="grid grid-cols-3 gap-3">
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="inventory" id="inventory" />
                  <Label htmlFor="inventory" className="flex-1 cursor-pointer">
                    <div>
                      <p className="font-medium">Inventory</p>
                      <p className="text-xs text-gray-600">From existing stock</p>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="commission" id="commission" />
                  <Label htmlFor="commission" className="flex-1 cursor-pointer">
                    <div>
                      <p className="font-medium">Commission</p>
                      <p className="text-xs text-gray-600">From nearby shop</p>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="custom_order" id="custom_order" />
                  <Label htmlFor="custom_order" className="flex-1 cursor-pointer">
                    <div>
                      <p className="font-medium">Custom Order</p>
                      <p className="text-xs text-gray-600">Made to order</p>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* Right Column - Pricing & Payment */}
          <div className="space-y-6">
            {/* Pricing Configuration */}
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium text-jewelry-navy mb-3">Pricing Configuration</h4>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm">Making Charges (%)</Label>
                    <Input
                      type="number"
                      value={makingCharges}
                      onChange={(e) => setMakingCharges(e.target.value)}
                      step="0.1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Wastage (%)</Label>
                    <Input
                      type="number"
                      value={wastage}
                      onChange={(e) => setWastage(e.target.value)}
                      step="0.1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Additional Charges (₹)</Label>
                    <Input
                      type="number"
                      value={additionalCharges}
                      onChange={(e) => setAdditionalCharges(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Tax (%)</Label>
                    <Input
                      type="number"
                      value={taxPercentage}
                      onChange={(e) => setTaxPercentage(e.target.value)}
                      step="0.1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Payment Method
              </Label>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid grid-cols-2 gap-3">
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="cash" id="cash" />
                  <Label htmlFor="cash" className="flex-1 cursor-pointer font-medium">Cash</Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="card" id="card" />
                  <Label htmlFor="card" className="flex-1 cursor-pointer font-medium">Card</Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="upi" id="upi" />
                  <Label htmlFor="upi" className="flex-1 cursor-pointer font-medium">UPI</Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="credit" id="credit" />
                  <Label htmlFor="credit" className="flex-1 cursor-pointer font-medium">Credit</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Payment Details */}
            {paymentMethod !== 'credit' && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium text-jewelry-navy mb-3">Payment Details</h4>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm">Cash Received (₹)</Label>
                      <Input
                        type="number"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Card/UPI Received (₹)</Label>
                      <Input
                        type="number"
                        value={cardUpiReceived}
                        onChange={(e) => setCardUpiReceived(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Total Summary */}
            <Card className="bg-jewelry-cream">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Subtotal:</span>
                    <span className="font-medium">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Making Charges ({makingCharges}%):</span>
                    <span className="font-medium">{formatCurrency(subtotal * (parseFloat(makingCharges) / 100))}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Wastage ({wastage}%):</span>
                    <span className="font-medium">{formatCurrency(subtotal * (parseFloat(wastage) / 100))}</span>
                  </div>
                  {additionalChargesAmount > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Additional Charges:</span>
                      <span className="font-medium">{formatCurrency(additionalChargesAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Tax ({taxPercentage}%):</span>
                    <span className="font-medium">{formatCurrency(taxAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center text-lg font-bold text-jewelry-navy border-t border-jewelry-gold pt-2">
                    <span>Total:</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                  
                  {/* Payment Status */}
                  {paymentMethod !== 'credit' && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex justify-between text-sm">
                        <span>Total Received:</span>
                        <span>{formatCurrency((parseFloat(cashReceived) || 0) + (parseFloat(cardUpiReceived) || 0))}</span>
                      </div>
                      {total - ((parseFloat(cashReceived) || 0) + (parseFloat(cardUpiReceived) || 0)) > 0 && (
                        <div className="flex justify-between text-sm text-orange-600">
                          <span>Credit Amount:</span>
                          <span>{formatCurrency(total - ((parseFloat(cashReceived) || 0) + (parseFloat(cardUpiReceived) || 0)))}</span>
                        </div>
                      )}
                      {((parseFloat(cashReceived) || 0) + (parseFloat(cardUpiReceived) || 0)) > total && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Change to Return:</span>
                          <span>{formatCurrency(((parseFloat(cashReceived) || 0) + (parseFloat(cardUpiReceived) || 0)) - total)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={createSaleMutation.isPending}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={createSaleMutation.isPending || saleItems.length === 0}
                className="bg-jewelry-gold text-white hover:bg-jewelry-bronze flex-1"
              >
                {createSaleMutation.isPending ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Processing...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check mr-2"></i>
                    Complete Sale
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}