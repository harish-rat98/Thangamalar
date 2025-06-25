import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import QuickSaleModal from "@/components/quick-sale-modal";
import { getSales } from "@/lib/firestore";

interface Sale {
  id: string;
  totalAmount: string;
  paymentStatus: string;
  saleType: string;
  paymentMethod: string;
  receiptNumber: string;
  createdAt: string;
  customer?: {
    name: string;
    phone: string;
  };
  saleItems: Array<{
    itemName: string;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
    weightGrams?: string;
    material?: string;
  }>;
}

export default function Sales() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showQuickSale, setShowQuickSale] = useState(false);

  const { data: sales, isLoading } = useQuery<Sale[]>({
    queryKey: ['sales'],
    queryFn: () => getSales(),
  });

  const filteredSales = sales?.filter(sale =>
    sale.receiptNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.customer?.phone?.includes(searchTerm) ||
    sale.saleItems.some(item => 
      item.itemName.toLowerCase().includes(searchTerm.toLowerCase())
    )
  ) || [];

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSaleTypeColor = (type: string) => {
    switch (type) {
      case 'inventory':
        return 'bg-green-100 text-green-800';
      case 'commission':
        return 'bg-orange-100 text-orange-800';
      case 'custom_order':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-blue-100 text-blue-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-red-100 text-red-800';
      case 'overdue':
        return 'bg-red-200 text-red-900';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return 'fas fa-money-bill-wave';
      case 'card':
        return 'fas fa-credit-card';
      case 'upi':
        return 'fas fa-mobile-alt';
      case 'credit':
        return 'fas fa-clock';
      default:
        return 'fas fa-question-circle';
    }
  };

  const totalSales = filteredSales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0);

  return (
    <>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-jewelry-navy">Sales & Billing</h1>
            <p className="text-gray-600 mt-1">Manage sales transactions and generate receipts</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              onClick={() => setShowQuickSale(true)}
              className="bg-jewelry-gold text-white hover:bg-jewelry-bronze"
            >
              <i className="fas fa-plus mr-2"></i>New Sale
            </Button>
            <Button variant="outline">
              <i className="fas fa-receipt mr-2"></i>Generate Receipt
            </Button>
            <Button variant="outline">
              <i className="fas fa-barcode mr-2"></i>Scan Item
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Sales Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Sales</p>
                  <p className="text-2xl font-bold text-jewelry-navy">
                    {filteredSales.length}
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <i className="fas fa-shopping-cart text-blue-600 text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-jewelry-navy">
                    {formatCurrency(totalSales)}
                  </p>
                </div>
                <div className="bg-jewelry-gold bg-opacity-10 p-3 rounded-lg">
                  <i className="fas fa-rupee-sign text-jewelry-gold text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Paid Sales</p>
                  <p className="text-2xl font-bold text-green-600">
                    {filteredSales.filter(s => s.paymentStatus === 'paid').length}
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <i className="fas fa-check-circle text-green-600 text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Payments</p>
                  <p className="text-2xl font-bold text-red-600">
                    {filteredSales.filter(s => s.paymentStatus === 'pending' || s.paymentStatus === 'partial').length}
                  </p>
                </div>
                <div className="bg-red-100 p-3 rounded-lg">
                  <i className="fas fa-clock text-red-600 text-xl"></i>
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
                  placeholder="Search by receipt number, customer name, phone, or item..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <Button variant="outline">
                <i className="fas fa-filter mr-2"></i>Filters
              </Button>
              <Button variant="outline">
                <i className="fas fa-calendar mr-2"></i>Date Range
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sales List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Recent Sales ({filteredSales.length})</span>
              <div className="text-sm text-gray-600">
                Total Value: {formatCurrency(totalSales)}
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
            ) : filteredSales.length === 0 ? (
              <div className="text-center py-12">
                <i className="fas fa-shopping-cart text-gray-400 text-4xl mb-4"></i>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No sales found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm ? 'Try adjusting your search terms' : 'Start by creating your first sale'}
                </p>
                <Button 
                  onClick={() => setShowQuickSale(true)}
                  className="bg-jewelry-gold hover:bg-jewelry-bronze"
                >
                  <i className="fas fa-plus mr-2"></i>Create Sale
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSales.map((sale) => (
                  <div key={sale.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-medium text-gray-900">
                            Receipt #{sale.receiptNumber}
                          </h3>
                          <Badge className={getSaleTypeColor(sale.saleType)}>
                            {sale.saleType.replace('_', ' ')}
                          </Badge>
                          <Badge className={getPaymentStatusColor(sale.paymentStatus)}>
                            {sale.paymentStatus}
                          </Badge>
                        </div>
                        
                        {sale.customer && (
                          <div className="text-sm text-gray-600 mb-2">
                            <i className="fas fa-user mr-1"></i>
                            {sale.customer.name} • {sale.customer.phone}
                          </div>
                        )}

                        <div className="text-sm text-gray-600">
                          <i className="fas fa-clock mr-1"></i>
                          {formatDate(sale.createdAt)}
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-2xl font-bold text-jewelry-navy">
                          {formatCurrency(sale.totalAmount)}
                        </p>
                        <div className="flex items-center justify-end mt-1 text-sm text-gray-600">
                          <i className={`${getPaymentMethodIcon(sale.paymentMethod)} mr-1`}></i>
                          {sale.paymentMethod.toUpperCase()}
                        </div>
                      </div>
                    </div>

                    {/* Sale Items */}
                    <div className="border-t pt-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {sale.saleItems.map((item, index) => (
                          <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{item.itemName}</p>
                              <p className="text-xs text-gray-600">
                                Qty: {item.quantity}
                                {item.weightGrams && ` • ${item.weightGrams}g`}
                                {item.material && ` • ${item.material}`}
                              </p>
                            </div>
                            <p className="font-medium text-sm">{formatCurrency(item.totalPrice)}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end space-x-2 mt-3 pt-3 border-t">
                      <Button variant="ghost" size="sm">
                        <i className="fas fa-eye mr-1"></i>View
                      </Button>
                      <Button variant="ghost" size="sm">
                        <i className="fas fa-print mr-1"></i>Print Receipt
                      </Button>
                      <Button variant="ghost" size="sm">
                        <i className="fas fa-edit mr-1"></i>Edit
                      </Button>
                      {sale.paymentStatus !== 'paid' && (
                        <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700">
                          <i className="fas fa-money-check mr-1"></i>Update Payment
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

      <QuickSaleModal open={showQuickSale} onOpenChange={setShowQuickSale} />
    </>
  );
}