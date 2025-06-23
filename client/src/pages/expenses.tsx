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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Expense {
  id: number;
  category: string;
  description: string;
  amount: string;
  material?: string;
  receiptNumber?: string;
  vendorName?: string;
  expenseDate: string;
  createdAt: string;
}

const expenseSchema = z.object({
  category: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required"),
  amount: z.string().min(1, "Amount is required"),
  material: z.enum(["gold", "silver", "diamond", "platinum", "other"]).optional(),
  receiptNumber: z.string().optional(),
  vendorName: z.string().optional(),
  expenseDate: z.string().min(1, "Expense date is required"),
});

type ExpenseForm = z.infer<typeof expenseSchema>;

const expenseCategories = [
  "Rent",
  "Utilities",
  "Supplies",
  "Raw Materials",
  "Labor",
  "Marketing",
  "Insurance",
  "Maintenance",
  "Transportation",
  "Professional Services",
  "Other"
];

export default function Expenses() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");
  const { toast } = useToast();

  const { data: expenses, isLoading } = useQuery<Expense[]>({
    queryKey: ['/api/expenses'],
  });

  const form = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      category: "",
      description: "",
      amount: "",
      material: undefined,
      receiptNumber: "",
      vendorName: "",
      expenseDate: new Date().toISOString().split('T')[0],
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ExpenseForm) => {
      const payload = {
        ...data,
        expenseDate: new Date(data.expenseDate).toISOString(),
      };
      await apiRequest('POST', '/api/expenses', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      toast({ title: "Success", description: "Expense recorded successfully" });
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

  const getDateFilter = (expense: Expense) => {
    const expenseDate = new Date(expense.expenseDate);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    
    switch (dateRange) {
      case "today":
        return expenseDate.toDateString() === new Date().toDateString();
      case "week":
        return expenseDate >= startOfWeek;
      case "month":
        return expenseDate >= startOfMonth;
      default:
        return true;
    }
  };

  const filteredExpenses = expenses?.filter(expense => {
    const matchesSearch = 
      expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.vendorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.receiptNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = filterCategory === "all" || expense.category === filterCategory;
    const matchesDate = getDateFilter(expense);
    
    return matchesSearch && matchesCategory && matchesDate;
  }) || [];

  const handleSubmit = (data: ExpenseForm) => {
    createMutation.mutate(data);
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(parseFloat(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      "Rent": "bg-blue-100 text-blue-800",
      "Utilities": "bg-green-100 text-green-800",
      "Supplies": "bg-yellow-100 text-yellow-800",
      "Raw Materials": "bg-purple-100 text-purple-800",
      "Labor": "bg-orange-100 text-orange-800",
      "Marketing": "bg-pink-100 text-pink-800",
      "Insurance": "bg-indigo-100 text-indigo-800",
      "Maintenance": "bg-red-100 text-red-800",
      "Transportation": "bg-cyan-100 text-cyan-800",
      "Professional Services": "bg-emerald-100 text-emerald-800",
    };
    return colors[category as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getMaterialColor = (material?: string) => {
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

  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
  const thisMonthExpenses = expenses?.filter(expense => {
    const expenseDate = new Date(expense.expenseDate);
    const now = new Date();
    return expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear();
  }).reduce((sum, expense) => sum + parseFloat(expense.amount), 0) || 0;

  return (
    <>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-jewelry-navy">Expense Management</h1>
            <p className="text-gray-600 mt-1">Track business expenses and categorize spending</p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-jewelry-gold text-white hover:bg-jewelry-bronze">
                <i className="fas fa-plus mr-2"></i>Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Record New Expense</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {expenseCategories.map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="5000" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Detailed description of the expense..." 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="material"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Related Material (Optional)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select if material-related" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">None</SelectItem>
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
                    <FormField
                      control={form.control}
                      name="expenseDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expense Date</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field} 
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
                      name="vendorName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vendor Name (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Vendor or supplier name" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="receiptNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Receipt Number (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Receipt or invoice number" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

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
                      disabled={createMutation.isPending}
                    >
                      Record Expense
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="p-6">
        {/* Expense Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">This Month</p>
                  <p className="text-2xl font-bold text-jewelry-red">
                    {formatCurrency(thisMonthExpenses.toString())}
                  </p>
                </div>
                <div className="bg-jewelry-red bg-opacity-10 p-3 rounded-lg">
                  <i className="fas fa-calendar-month text-jewelry-red text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Filtered</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {formatCurrency(totalExpenses.toString())}
                  </p>
                </div>
                <div className="bg-orange-100 p-3 rounded-lg">
                  <i className="fas fa-receipt text-orange-600 text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {expenses?.length || 0}
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <i className="fas fa-list text-blue-600 text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Categories</p>
                  <p className="text-2xl font-bold text-green-600">
                    {new Set(expenses?.map(e => e.category)).size || 0}
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <i className="fas fa-tags text-green-600 text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by description, category, vendor, or receipt number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {expenseCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Expenses List */}
        <Card>
          <CardHeader>
            <CardTitle>
              Expenses ({filteredExpenses.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <Skeleton className="h-12 w-12 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-8 w-24" />
                  </div>
                ))}
              </div>
            ) : filteredExpenses.length === 0 ? (
              <div className="text-center py-12">
                <i className="fas fa-receipt text-gray-400 text-4xl mb-4"></i>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No expenses found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm ? 'Try adjusting your search terms' : 'Start by recording your first expense'}
                </p>
                <Button 
                  onClick={() => setShowAddDialog(true)}
                  className="bg-jewelry-gold hover:bg-jewelry-bronze"
                >
                  <i className="fas fa-plus mr-2"></i>Add Expense
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredExpenses.map((expense) => (
                  <div key={expense.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="w-10 h-10 bg-jewelry-red bg-opacity-20 rounded-full flex items-center justify-center">
                            <i className="fas fa-receipt text-jewelry-red"></i>
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{expense.description}</h3>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge className={getCategoryColor(expense.category)}>
                                {expense.category}
                              </Badge>
                              {expense.material && (
                                <Badge className={getMaterialColor(expense.material)}>
                                  {expense.material}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>
                            <i className="fas fa-calendar mr-1"></i>
                            {formatDate(expense.expenseDate)}
                          </div>
                          {expense.vendorName && (
                            <div>
                              <i className="fas fa-store mr-1"></i>
                              {expense.vendorName}
                            </div>
                          )}
                          {expense.receiptNumber && (
                            <div>
                              <i className="fas fa-file-invoice mr-1"></i>
                              Receipt: {expense.receiptNumber}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right ml-4">
                        <p className="text-2xl font-bold text-jewelry-red">
                          {formatCurrency(expense.amount)}
                        </p>
                        <p className="text-sm text-gray-500">
                          Recorded: {formatDate(expense.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center justify-end space-x-2 mt-3 pt-3 border-t">
                      <Button variant="ghost" size="sm">
                        <i className="fas fa-edit mr-1"></i>Edit
                      </Button>
                      <Button variant="ghost" size="sm">
                        <i className="fas fa-eye mr-1"></i>View Details
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                        <i className="fas fa-trash mr-1"></i>Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
