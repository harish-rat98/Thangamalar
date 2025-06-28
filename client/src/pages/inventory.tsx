import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getInventoryItems, createInventoryItem, updateInventoryItem, deleteInventoryItem, getDailyPrices } from "@/lib/firestore";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  material: string;
  quantity: number;
  weightPerPiece: string;
  totalWeight: string;
  minStockLevel: number;
  sku: string;
  barcode?: string;
  description?: string;
  createdAt: string;
}

const inventoryItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.enum(["ring", "necklace", "bracelet", "earrings", "chain", "pendant", "bangles", "anklet", "other"]),
  material: z.enum(["gold", "silver", "diamond", "platinum", "other"]),
  quantity: z.number().min(0, "Quantity cannot be negative"),
  weightPerPiece: z.string().min(1, "Weight per piece is required"),
  minStockLevel: z.number().min(1, "Minimum stock level must be at least 1"),
  sku: z.string().min(1, "SKU is required"),
  barcode: z.string().optional(),
  description: z.string().optional(),
});

type InventoryItemForm = z.infer<typeof inventoryItemSchema>;

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const { toast } = useToast();

  const { data: items, isLoading } = useQuery<InventoryItem[]>({
    queryKey: ['inventory'],
    queryFn: getInventoryItems,
  });

  const { data: dailyPrices } = useQuery({
    queryKey: ['daily-prices'],
    queryFn: () => getDailyPrices(),
  });

  const form = useForm<InventoryItemForm>({
    resolver: zodResolver(inventoryItemSchema),
    defaultValues: {
      name: "",
      category: "ring",
      material: "gold",
      quantity: 0,
      weightPerPiece: "",
      minStockLevel: 5,
      sku: "",
      barcode: "",
      description: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InventoryItemForm) => {
      await createInventoryItem(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast({ title: "Success", description: "Item added successfully" });
      setShowAddDialog(false);
      form.reset();
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InventoryItemForm> }) => {
      await updateInventoryItem(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast({ title: "Success", description: "Item updated successfully" });
      setEditingItem(null);
      form.reset();
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteInventoryItem(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast({ title: "Success", description: "Item deleted successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const filteredItems = items?.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.material.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleSubmit = (data: InventoryItemForm) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    form.reset({
      name: item.name,
      category: item.category as any,
      material: item.material as any,
      quantity: item.quantity,
      weightPerPiece: item.weightPerPiece,
      minStockLevel: item.minStockLevel,
      sku: item.sku,
      barcode: item.barcode || "",
      description: item.description || "",
    });
    setShowAddDialog(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this item?")) {
      deleteMutation.mutate(id);
    }
  };

  const calculateCurrentValue = (item: InventoryItem) => {
    const totalWeight = parseFloat(item.totalWeight);
    const pricePerGram = item.material === 'gold' ? 
      parseFloat(dailyPrices?.goldPricePerGram || "9200") :
      parseFloat(dailyPrices?.silverPricePerGram || "110");
    
    return totalWeight * pricePerGram;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getMaterialColor = (material: string) => {
    switch (material) {
      case 'gold':
        return 'bg-yellow-100 text-yellow-800';
      case 'silver':
        return 'bg-gray-100 text-gray-800';
      case 'diamond':
        return 'bg-blue-100 text-blue-800';
      case 'platinum':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStockStatusColor = (current: number, min: number) => {
    if (current <= min) return 'bg-red-100 text-red-800';
    if (current <= min * 2) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const totalInventoryValue = filteredItems.reduce((sum, item) => 
    sum + calculateCurrentValue(item), 0
  );

  const totalWeight = filteredItems.reduce((sum, item) => 
    sum + parseFloat(item.totalWeight), 0
  );

  return (
    <>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-jewelry-navy">Inventory Management</h1>
            <p className="text-gray-600 mt-1">Weight-based jewelry inventory tracking</p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={(open) => {
            setShowAddDialog(open);
            if (!open) {
              setEditingItem(null);
              form.reset();
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-jewelry-gold text-white hover:bg-jewelry-bronze">
                <i className="fas fa-plus mr-2"></i>Add New Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? 'Edit Item' : 'Add New Inventory Item'}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Item Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Gold Ring" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="sku"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SKU</FormLabel>
                          <FormControl>
                            <Input placeholder="GR001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="ring">Ring</SelectItem>
                              <SelectItem value="necklace">Necklace</SelectItem>
                              <SelectItem value="bracelet">Bracelet</SelectItem>
                              <SelectItem value="earrings">Earrings</SelectItem>
                              <SelectItem value="chain">Chain</SelectItem>
                              <SelectItem value="pendant">Pendant</SelectItem>
                              <SelectItem value="bangles">Bangles</SelectItem>
                              <SelectItem value="anklet">Anklet</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="material"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Material</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select material" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="gold">Gold</SelectItem>
                              <SelectItem value="silver">Silver</SelectItem>
                              <SelectItem value="diamond">Diamond</SelectItem>
                              <SelectItem value="platinum">Platinum</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity (pieces)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="10" 
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="weightPerPiece"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weight per piece (grams)</FormLabel>
                          <FormControl>
                            <Input placeholder="4.5" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="minStockLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Min Stock Level</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="5" 
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="barcode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Barcode (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="123456789" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex items-end">
                      <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg w-full">
                        <strong>Total Weight:</strong> {
                          form.watch('quantity') && form.watch('weightPerPiece') ? 
                          (form.watch('quantity') * parseFloat(form.watch('weightPerPiece') || "0")).toFixed(2) + " grams" :
                          "0 grams"
                        }
                      </div>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Additional details about the item..." 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowAddDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      className="bg-jewelry-gold hover:bg-jewelry-bronze"
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      {editingItem ? 'Update Item' : 'Add Item'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="p-6">
        {/* Inventory Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Items</p>
                  <p className="text-2xl font-bold text-jewelry-navy">{filteredItems.length}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <i className="fas fa-gem text-blue-600 text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Weight</p>
                  <p className="text-2xl font-bold text-jewelry-gold">{totalWeight.toFixed(2)}g</p>
                </div>
                <div className="bg-jewelry-gold bg-opacity-10 p-3 rounded-lg">
                  <i className="fas fa-weight text-jewelry-gold text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Current Value</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(totalInventoryValue)}
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <i className="fas fa-rupee-sign text-green-600 text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                  <p className="text-2xl font-bold text-red-600">
                    {filteredItems.filter(item => item.quantity <= item.minStockLevel).length}
                  </p>
                </div>
                <div className="bg-red-100 p-3 rounded-lg">
                  <i className="fas fa-exclamation-triangle text-red-600 text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current Prices Display */}
        {dailyPrices && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-jewelry-navy">Current Metal Prices</h3>
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Gold</p>
                    <p className="font-bold text-yellow-600">₹{dailyPrices.goldPricePerGram}/g</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Silver</p>
                    <p className="font-bold text-gray-600">₹{dailyPrices.silverPricePerGram}/g</p>
                  </div>
                  {dailyPrices.platinumPricePerGram && (
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Platinum</p>
                      <p className="font-bold text-purple-600">₹{dailyPrices.platinumPricePerGram}/g</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by name, SKU, category, or material..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <Button variant="outline">
                <i className="fas fa-filter mr-2"></i>Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Inventory Items ({filteredItems.length})</span>
              <div className="text-sm text-gray-600">
                Total Value: {formatCurrency(totalInventoryValue)}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <Skeleton className="h-16 w-16 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-8 w-24" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm font-medium text-gray-600 border-b">
                      <th className="pb-3">Item Details</th>
                      <th className="pb-3">Material & Weight</th>
                      <th className="pb-3">Stock Info</th>
                      <th className="pb-3">Current Value</th>
                      <th className="pb-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => (
                      <tr key={item.id} className="border-b hover:bg-gray-50">
                        <td className="py-4">
                          <div>
                            <p className="font-medium text-gray-900">{item.name}</p>
                            <p className="text-sm text-gray-500">
                              {item.category} • SKU: {item.sku}
                            </p>
                            {item.barcode && (
                              <p className="text-xs text-gray-400">Barcode: {item.barcode}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-4">
                          <div className="space-y-1">
                            <Badge className={getMaterialColor(item.material)}>
                              {item.material}
                            </Badge>
                            <p className="text-sm text-gray-600">
                              {item.weightPerPiece}g per piece
                            </p>
                            <p className="text-sm font-medium text-jewelry-gold">
                              Total: {item.totalWeight}g
                            </p>
                          </div>
                        </td>
                        <td className="py-4">
                          <div className="space-y-1">
                            <Badge className={getStockStatusColor(item.quantity, item.minStockLevel)}>
                              {item.quantity} pieces
                            </Badge>
                            <p className="text-xs text-gray-500">
                              Min: {item.minStockLevel}
                            </p>
                            {item.quantity <= item.minStockLevel && (
                              <p className="text-xs text-red-600 font-medium">
                                <i className="fas fa-exclamation-triangle mr-1"></i>Low Stock
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-4">
                          <div>
                            <p className="font-medium text-gray-900">
                              {formatCurrency(calculateCurrentValue(item))}
                            </p>
                            <p className="text-xs text-gray-500">
                              @ ₹{item.material === 'gold' ? dailyPrices?.goldPricePerGram : dailyPrices?.silverPricePerGram}/g
                            </p>
                          </div>
                        </td>
                        <td className="py-4">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(item)}
                            >
                              <i className="fas fa-edit"></i>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(item.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <i className="fas fa-trash"></i>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}