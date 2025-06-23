import { useState } from "react";
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
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Customer {
  id: number;
  name: string;
  phone: string;
}

interface InventoryItem {
  id: number;
  name: string;
  sku: string;
  sellingPrice: string;
  weightGrams: string;
  material: string;
  currentStock: number;
}

interface SaleItem {
  itemId?: number;
  itemName: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  weightGrams?: string;
  material?: string;
}

interface QuickSaleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function QuickSaleModal({ open, onOpenChange }: QuickSaleModalProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [saleType, setSaleType] = useState<string>("inventory");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [paidAmount, setPaidAmount] = useState<string>("");
  const [showItemSelector, setShowItemSelector] = useState(false);
  const { toast } = useToast();

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
    enabled: open,
  });

  const { data: inventoryItems } = useQuery<InventoryItem[]>({
    queryKey: ['/api/inventory'],
    enabled: open,
  });

  const createSaleMutation = useMutation({
    mutationFn: async (saleData: any) => {
      await apiRequest('POST', '/api/sales', saleData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sales'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/recent-sales'] });
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

  const subtotal = saleItems.reduce((sum, item) => sum + parseFloat(item.totalPrice || "0"), 0);
  const taxRate = 0.03; // 3% tax
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;

  const addItem = (item: InventoryItem) => {
    const existingItemIndex = saleItems.findIndex(saleItem => saleItem.itemId === item.id);
    
    if (existingItemIndex >= 0) {
      const updatedItems = [...saleItems];
      const existingItem = updatedItems[existingItemIndex];
      const newQuantity = existingItem.quantity + 1;
      const newTotalPrice = (parseFloat(item.sellingPrice) * newQuantity).toString();
      
      updatedItems[existingItemIndex] = {
        ...existingItem,
        quantity: newQuantity,
        totalPrice: newTotalPrice,
      };
      setSaleItems(updatedItems);
    } else {
      const newItem: SaleItem = {
        itemId: item.id,
        itemName: item.name,
        quantity: 1,
        unitPrice: item.sellingPrice,
        totalPrice: item.sellingPrice,
        weightGrams: item.weightGrams,
        material: item.material,
      };
      setSaleItems([...saleItems, newItem]);
    }
    setShowItemSelector(false);
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
    const item = updatedItems[index];
    const newTotalPrice = (parseFloat(item.unitPrice) * quantity).toString();
    
    updatedItems[index] = {
      ...item,
      quantity,
      totalPrice: newTotalPrice,
    };
    setSaleItems(updatedItems);
  };

  const updateItemPrice = (index: number, newPrice: string) => {
    const updatedItems = [...saleItems];
    const item = updatedItems[index];
    const price = parseFloat(newPrice) || 0;
    const newTotalPrice = (price * item.quantity).toString();
    
    updatedItems[index] = {
      ...item,
      unitPrice: newPrice,
      totalPrice: newTotalPrice,
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

    const paidAmountNum = parseFloat(paidAmount) || 0;
    let paymentStatus = 'paid';
    
    if (paymentMethod === 'credit') {
      paymentStatus = 'pending';
    } else if (paidAmountNum < total && paidAmountNum > 0) {
      paymentStatus = 'partial';
    } else if (paidAmountNum === 0 && paymentMethod !== 'credit') {
      paymentStatus = 'pending';
    }

    const processedItems = saleItems.map(item => ({
      itemId: item.itemId || null,
      itemName: item.itemName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      weightGrams: item.weightGrams || null,
      material: item.material || null,
    }));

    const saleData = {
      sale: {
        customerId: selectedCustomer || null,
        saleType: saleType,
        totalAmount: total.toString(),
        taxAmount: taxAmount.toString(),
        discountAmount: "0",
        paymentMethod: paymentMethod,
        paymentStatus: paymentStatus,
        paidAmount: paidAmountNum.toString(),
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
    setPaidAmount("");
    setShowItemSelector(false);
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-jewelry-navy">
            Quick Sale
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Selection */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Customer
            </Label>
            <div className="flex space-x-2">
              <Select 
                value={selectedCustomer?.toString() || ""} 
                onValueChange={(value) => setSelectedCustomer(parseInt(value))}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select existing customer or leave empty for walk-in" />
                </SelectTrigger>
                <SelectContent>
                  {customers?.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
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
                      {item.weightGrams}g {item.material} • SKU: {item.itemId || 'Custom'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    {/* Price Input */}
                    <div className="flex flex-col items-center">
                      <Label className="text-xs text-gray-500 mb-1">Price</Label>
                      <div className="flex items-center">
                        <span className="text-sm text-gray-500 mr-1">₹</span>
                        <Input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateItemPrice(index, e.target.value)}
                          className="w-20 h-8 text-sm text-right"
                          step="0.01"
                        />
                      </div>
                    </div>
                    
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
                    
                    {/* Total */}
                    <span className="font-medium min-w-[80px] text-right">
                      {formatCurrency(parseFloat(item.totalPrice))}
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
              
              {showItemSelector ? (
                <div className="border rounded-lg p-3 bg-white max-h-60 overflow-y-auto">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Select Item</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowItemSelector(false)}
                    >
                      <i className="fas fa-times"></i>
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {inventoryItems?.filter(item => item.currentStock > 0).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
                        onClick={() => addItem(item)}
                      >
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-gray-600">
                            {item.weightGrams}g {item.material} • Stock: {item.currentStock}
                          </p>
                        </div>
                        <span className="font-medium">
                          {formatCurrency(parseFloat(item.sellingPrice))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full p-3 border-2 border-dashed border-gray-300 text-gray-600 hover:border-jewelry-gold hover:text-jewelry-gold"
                  onClick={() => setShowItemSelector(true)}
                >
                  <i className="fas fa-plus mr-2"></i>Add Item
                </Button>
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

          {/* Payment Method */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Payment Method
            </Label>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid grid-cols-4 gap-3">
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

          {/* Payment Amount - Enhanced with partial payment support */}
          {paymentMethod !== 'credit' && (
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Amount Paid
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                <Input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder={`Total: ${formatCurrency(total)}`}
                  className="pl-8"
                  step="0.01"
                />
              </div>
              <div className="mt-2 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="font-medium">{formatCurrency(total)}</span>
                </div>
                {paidAmount && parseFloat(paidAmount) < total && parseFloat(paidAmount) > 0 && (
                  <div className="flex justify-between text-orange-600">
                    <span>Credit Amount:</span>
                    <span className="font-medium">{formatCurrency(total - parseFloat(paidAmount))}</span>
                  </div>
                )}
                {paidAmount && parseFloat(paidAmount) > total && (
                  <div className="flex justify-between text-green-600">
                    <span>Change to Return:</span>
                    <span className="font-medium">{formatCurrency(parseFloat(paidAmount) - total)}</span>
                  </div>
                )}
              </div>
            </div>
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
                  <span className="text-gray-700">Tax (3%):</span>
                  <span className="font-medium">{formatCurrency(taxAmount)}</span>
                </div>
                <div className="flex justify-between items-center text-lg font-bold text-jewelry-navy border-t border-jewelry-gold pt-2">
                  <span>Total:</span>
                  <span>{formatCurrency(total)}</span>
                </div>
                {paymentMethod === 'credit' && (
                  <div className="flex justify-between items-center text-orange-600 font-medium">
                    <span>Payment Status:</span>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                      Full Credit
                    </Badge>
                  </div>
                )}
                {paidAmount && parseFloat(paidAmount) < total && parseFloat(paidAmount) > 0 && (
                  <div className="flex justify-between items-center text-orange-600 font-medium">
                    <span>Payment Status:</span>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                      Partial Payment
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createSaleMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={createSaleMutation.isPending || saleItems.length === 0}
              className="bg-jewelry-gold text-white hover:bg-jewelry-bronze px-8"
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
      </DialogContent>
    </Dialog>
  );
}