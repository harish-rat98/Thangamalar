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

interface CreditTransaction {
  id: number;
  type: 'credit' | 'payment';
  amount: string;
  balanceAfter: string;
  dueDate?: string;
  notes?: string;
  createdAt: string;
  customer: {
    id: number;
    name: string;
    phone: string;
    totalCredit: string;
  };
}

interface Customer {
  id: number;
  name: string;
  phone: string;
  totalCredit: string;
}

const creditTransactionSchema = z.object({
  customerId: z.number().min(1, "Customer is required"),
  type: z.enum(['credit', 'payment']),
  amount: z.string().min(1, "Amount is required"),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

type CreditTransactionForm = z.infer<typeof creditTransactionSchema>;

export default function CreditManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const { toast } = useToast();

  const { data: creditTransactions, isLoading } = useQuery<CreditTransaction[]>({
    queryKey: ['/api/credits'],
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
  });

  const form = useForm<CreditTransactionForm>({
    resolver: zodResolver(creditTransactionSchema),
    defaultValues: {
      customerId: 0,
      type: "payment",
      amount: "",
      dueDate: "",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreditTransactionForm) => {
      const payload = {
        ...data,
        balanceAfter: "0", // Will be calculated by backend
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
      };
      await apiRequest('POST', '/api/credits', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/credits'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      toast({ title: "Success", description: "Credit transaction recorded successfully" });
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

  const filteredTransactions = creditTransactions?.filter(transaction => {
    const matchesSearch = 
      transaction.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.customer.phone.includes(searchTerm) ||
      transaction.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === "all" || transaction.type === filterType;
    
    return matchesSearch && matchesFilter;
  }) || [];

  const handleSubmit = (data: CreditTransactionForm) => {
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

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'credit':
        return 'bg-red-100 text-red-800';
      case 'payment':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const totalCreditsOutstanding = customers?.reduce((sum, customer) => 
    sum + parseFloat(customer.totalCredit), 0) || 0;

  const overdueCredits = creditTransactions?.filter(t => 
    t.type === 'credit' && isOverdue(t.dueDate)) || [];

  return (
    <>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-jewelry-navy">Credit Management</h1>
            <p className="text-gray-600 mt-1">Track customer credits and payment follow-ups</p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-jewelry-gold text-white hover:bg-jewelry-bronze">
                <i className="fas fa-plus mr-2"></i>Record Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Record Credit Transaction</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="customerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value?.toString() || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select customer" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {customers?.map((customer) => (
                              <SelectItem key={customer.id} value={customer.id.toString()}>
                                {customer.name} ({customer.phone}) - Credit: {formatCurrency(customer.totalCredit)}
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
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Transaction Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="payment">Payment Received</SelectItem>
                            <SelectItem value="credit">Credit Given</SelectItem>
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

                  {form.watch('type') === 'credit' && (
                    <FormField
                      control={form.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Due Date (Optional)</FormLabel>
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
                  )}

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Additional notes about this transaction..." 
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
                      disabled={createMutation.isPending}
                    >
                      Record Transaction
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="p-6">
        {/* Credit Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Credit Outstanding</p>
                  <p className="text-2xl font-bold text-jewelry-red">
                    {formatCurrency(totalCreditsOutstanding.toString())}
                  </p>
                </div>
                <div className="bg-jewelry-red bg-opacity-10 p-3 rounded-lg">
                  <i className="fas fa-credit-card text-jewelry-red text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Credit Customers</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {customers?.filter(c => parseFloat(c.totalCredit) > 0).length || 0}
                  </p>
                </div>
                <div className="bg-orange-100 p-3 rounded-lg">
                  <i className="fas fa-users text-orange-600 text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Overdue Credits</p>
                  <p className="text-2xl font-bold text-red-600">
                    {overdueCredits.length}
                  </p>
                </div>
                <div className="bg-red-100 p-3 rounded-lg">
                  <i className="fas fa-exclamation-triangle text-red-600 text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {creditTransactions?.length || 0}
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <i className="fas fa-list text-blue-600 text-xl"></i>
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
                  placeholder="Search by customer name, phone, or notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Transactions</SelectItem>
                  <SelectItem value="credit">Credits Only</SelectItem>
                  <SelectItem value="payment">Payments Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Credit Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>
              Credit Transactions ({filteredTransactions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-8 w-24" />
                  </div>
                ))}
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <i className="fas fa-credit-card text-gray-400 text-4xl mb-4"></i>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No credit transactions found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm ? 'Try adjusting your search terms' : 'Start by recording your first credit transaction'}
                </p>
                <Button 
                  onClick={() => setShowAddDialog(true)}
                  className="bg-jewelry-gold hover:bg-jewelry-bronze"
                >
                  <i className="fas fa-plus mr-2"></i>Record Transaction
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTransactions.map((transaction) => (
                  <div key={transaction.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="w-10 h-10 bg-jewelry-gold bg-opacity-20 rounded-full flex items-center justify-center">
                            <i className={`fas ${transaction.type === 'credit' ? 'fa-arrow-up' : 'fa-arrow-down'} text-jewelry-gold`}></i>
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{transaction.customer.name}</h3>
                            <p className="text-sm text-gray-600">{transaction.customer.phone}</p>
                          </div>
                          <Badge className={getTransactionTypeColor(transaction.type)}>
                            {transaction.type === 'credit' ? 'Credit Given' : 'Payment Received'}
                          </Badge>
                          {transaction.type === 'credit' && transaction.dueDate && isOverdue(transaction.dueDate) && (
                            <Badge className="bg-red-100 text-red-800">
                              <i className="fas fa-exclamation-triangle mr-1"></i>Overdue
                            </Badge>
                          )}
                        </div>
                        
                        <div className="text-sm text-gray-600 mb-2">
                          <i className="fas fa-calendar mr-1"></i>
                          {formatDate(transaction.createdAt)}
                          {transaction.dueDate && transaction.type === 'credit' && (
                            <span className="ml-4">
                              <i className="fas fa-clock mr-1"></i>
                              Due: {formatDate(transaction.dueDate)}
                            </span>
                          )}
                        </div>

                        {transaction.notes && (
                          <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                            <i className="fas fa-sticky-note mr-1"></i>
                            {transaction.notes}
                          </div>
                        )}
                      </div>

                      <div className="text-right ml-4">
                        <p className={`text-2xl font-bold ${
                          transaction.type === 'credit' ? 'text-jewelry-red' : 'text-green-600'
                        }`}>
                          {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </p>
                        <p className="text-sm text-gray-500">
                          Current balance: {formatCurrency(transaction.customer.totalCredit)}
                        </p>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center justify-end space-x-2 mt-3 pt-3 border-t">
                      <Button variant="ghost" size="sm">
                        <i className="fas fa-phone mr-1"></i>Call Customer
                      </Button>
                      <Button variant="ghost" size="sm">
                        <i className="fas fa-sms mr-1"></i>Send Reminder
                      </Button>
                      {transaction.type === 'credit' && parseFloat(transaction.customer.totalCredit) > 0 && (
                        <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700">
                          <i className="fas fa-money-check mr-1"></i>Record Payment
                        </Button>
                      )}
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
