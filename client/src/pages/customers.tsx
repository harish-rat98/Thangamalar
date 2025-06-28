import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from "@/lib/firestore";
import { queryClient } from "@/lib/queryClient";
import ContactImportModal from "@/components/contact-import-modal";

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  totalPurchases: string;
  totalCredit: string;
  creditLimit: string;
  isActive: boolean;
  createdAt: string;
}

const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
  creditLimit: z.string().optional(),
});

type CustomerForm = z.infer<typeof customerSchema>;

export default function Customers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const { toast } = useToast();

  const { data: customers, isLoading } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: getCustomers,
  });

  const form = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
      city: "",
      creditLimit: "0",
    },
  });

  const createMutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      toast({ title: "Success", description: "Customer added successfully" });
      handleCloseDialog();
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
    mutationFn: ({ id, data }: { id: string; data: Partial<CustomerForm> }) => 
      updateCustomer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      toast({ title: "Success", description: "Customer updated successfully" });
      handleCloseDialog();
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
      await deleteCustomer(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      toast({ title: "Success", description: "Customer deleted successfully" });
      setDeletingCustomer(null);
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const filteredCustomers = customers?.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.city?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleSubmit = (data: CustomerForm) => {
    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    form.reset({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || "",
      address: customer.address || "",
      city: customer.city || "",
      creditLimit: customer.creditLimit,
    });
    setShowAddDialog(true);
  };

  const handleDelete = (customer: Customer) => {
    setDeletingCustomer(customer);
  };

  const confirmDelete = () => {
    if (deletingCustomer) {
      deleteMutation.mutate(deletingCustomer.id);
    }
  };

  const handleCloseDialog = () => {
    setShowAddDialog(false);
    setEditingCustomer(null);
    form.reset();
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(parseFloat(amount));
  };

  const getCreditStatusColor = (credit: string, limit: string) => {
    const creditAmount = parseFloat(credit);
    const limitAmount = parseFloat(limit);
    
    if (creditAmount <= 0) return 'bg-green-100 text-green-800';
    if (creditAmount >= limitAmount * 0.8) return 'bg-red-100 text-red-800';
    if (creditAmount >= limitAmount * 0.5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-blue-100 text-blue-800';
  };

  return (
    <>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-jewelry-navy">Customer Management</h1>
            <p className="text-gray-600 mt-1">Manage customer information and relationships</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowImportDialog(true)}
              className="border-jewelry-gold text-jewelry-gold hover:bg-jewelry-gold hover:text-white"
            >
              <i className="fas fa-upload mr-2"></i>Import Customers
            </Button>
            <Dialog open={showAddDialog} onOpenChange={(open) => {
              if (!open) handleCloseDialog();
              else setShowAddDialog(true);
            }}>
              <DialogTrigger asChild>
                <Button className="bg-jewelry-gold text-white hover:bg-jewelry-bronze">
                  <i className="fas fa-plus mr-2"></i>Add New Customer
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
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
                            <FormLabel>Customer Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Priya Sharma" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input placeholder="+91 98765 43210" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="customer@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Chennai" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Customer's full address..." 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="creditLimit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Credit Limit</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="50000" 
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
                        onClick={handleCloseDialog}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        className="bg-jewelry-gold hover:bg-jewelry-bronze"
                        disabled={createMutation.isPending || updateMutation.isPending}
                      >
                        {editingCustomer ? 'Update Customer' : 'Add Customer'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Customer Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Customers</p>
                  <p className="text-2xl font-bold text-jewelry-navy">{customers?.length || 0}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <i className="fas fa-users text-blue-600 text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Customers</p>
                  <p className="text-2xl font-bold text-green-600">
                    {customers?.filter(c => c.isActive).length || 0}
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <i className="fas fa-user-check text-green-600 text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Credit Customers</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {customers?.filter(c => parseFloat(c.totalCredit) > 0).length || 0}
                  </p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-lg">
                  <i className="fas fa-credit-card text-yellow-600 text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Credit Outstanding</p>
                  <p className="text-2xl font-bold text-jewelry-red">
                    {formatCurrency(
                      customers?.reduce((sum, c) => sum + parseFloat(c.totalCredit), 0).toString() || "0"
                    )}
                  </p>
                </div>
                <div className="bg-jewelry-red bg-opacity-10 p-3 rounded-lg">
                  <i className="fas fa-exclamation-triangle text-jewelry-red text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by name, phone, email, or city..."
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

        {/* Customers List */}
        <Card>
          <CardHeader>
            <CardTitle>
              Customers ({filteredCustomers.length})
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
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-12">
                <i className="fas fa-users text-gray-400 text-4xl mb-4"></i>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm ? 'Try adjusting your search terms' : 'Start by adding your first customer'}
                </p>
                <Button 
                  onClick={() => setShowAddDialog(true)}
                  className="bg-jewelry-gold hover:bg-jewelry-bronze"
                >
                  <i className="fas fa-plus mr-2"></i>Add Customer
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm font-medium text-gray-600 border-b">
                      <th className="pb-3">Customer Details</th>
                      <th className="pb-3">Contact Info</th>
                      <th className="pb-3">Purchase History</th>
                      <th className="pb-3">Credit Status</th>
                      <th className="pb-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map((customer) => (
                      <tr key={customer.id} className="border-b hover:bg-gray-50">
                        <td className="py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-jewelry-gold bg-opacity-20 rounded-full flex items-center justify-center">
                              <i className="fas fa-user text-jewelry-gold"></i>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{customer.name}</p>
                              <p className="text-sm text-gray-500">
                                Customer since {new Date(customer.createdAt).toLocaleDateString('en-IN')}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4">
                          <div>
                            <p className="font-medium text-gray-900">{customer.phone}</p>
                            {customer.email && (
                              <p className="text-sm text-gray-600">{customer.email}</p>
                            )}
                            {customer.city && (
                              <p className="text-sm text-gray-500">{customer.city}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-4">
                          <div>
                            <p className="font-medium text-gray-900">
                              {formatCurrency(customer.totalPurchases)}
                            </p>
                            <p className="text-sm text-gray-500">Total purchases</p>
                          </div>
                        </td>
                        <td className="py-4">
                          <div className="space-y-1">
                            <Badge className={getCreditStatusColor(customer.totalCredit, customer.creditLimit)}>
                              {parseFloat(customer.totalCredit) > 0 
                                ? `₹${parseFloat(customer.totalCredit).toLocaleString()} credit`
                                : 'No credit'
                              }
                            </Badge>
                            {parseFloat(customer.creditLimit) > 0 && (
                              <p className="text-xs text-gray-500">
                                Limit: {formatCurrency(customer.creditLimit)}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-4">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(customer)}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <i className="fas fa-edit"></i>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600 hover:text-green-700"
                            >
                              <i className="fas fa-eye"></i>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(customer)}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingCustomer} onOpenChange={() => setDeletingCustomer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the customer "{deletingCustomer?.name}" 
              and all associated data including purchase history and credit records.
              {parseFloat(deletingCustomer?.totalCredit || "0") > 0 && (
                <span className="block mt-2 text-red-600 font-medium">
                  Warning: This customer has an outstanding credit of {formatCurrency(deletingCustomer?.totalCredit || "0")}.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Customer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ContactImportModal open={showImportDialog} onOpenChange={setShowImportDialog} />
    </>
  );
}