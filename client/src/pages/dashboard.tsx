import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import QuickSaleModal from "@/components/quick-sale-modal";
import { useState } from "react";

interface DashboardMetrics {
  todaySales: string;
  inventoryValue: string;
  pendingCredits: string;
  lowStockCount: number;
  salesByType: {
    inventory: { amount: string; count: number };
    commission: { amount: string; count: number };
    custom_order: { amount: string; count: number };
  };
}

interface Sale {
  id: number;
  totalAmount: string;
  paymentStatus: string;
  saleType: string;
  createdAt: string;
  customer?: {
    name: string;
    phone: string;
  };
  saleItems: Array<{
    itemName: string;
    quantity: number;
    weightGrams?: string;
    material?: string;
  }>;
}

interface LowStockItem {
  id: number;
  name: string;
  sku: string;
  currentStock: number;
  minStockLevel: number;
}

interface OverdueCredit {
  id: number;
  amount: string;
  dueDate: string;
  customer: {
    name: string;
  };
}

export default function Dashboard() {
  const [showQuickSale, setShowQuickSale] = useState(false);

  const { data: metrics, isLoading: metricsLoading } = useQuery<DashboardMetrics>({
    queryKey: ['/api/dashboard/metrics'],
  });

  const { data: recentSales, isLoading: salesLoading } = useQuery<Sale[]>({
    queryKey: ['/api/dashboard/recent-sales'],
  });

  const { data: lowStockItems, isLoading: lowStockLoading } = useQuery<LowStockItem[]>({
    queryKey: ['/api/dashboard/low-stock'],
  });

  const { data: overdueCredits, isLoading: creditsLoading } = useQuery<OverdueCredit[]>({
    queryKey: ['/api/dashboard/overdue-credits'],
  });

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
    return new Date(dateString).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
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
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-jewelry-navy">Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome back! Here's your business overview</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              onClick={() => setShowQuickSale(true)}
              className="bg-jewelry-gold text-white hover:bg-jewelry-bronze"
            >
              <i className="fas fa-plus mr-2"></i>Quick Sale
            </Button>
            <Button variant="outline" className="border-gray-300">
              <i className="fas fa-barcode mr-2"></i>Scan Item
            </Button>
            <div className="flex items-center text-sm text-gray-600">
              <i className="fas fa-calendar mr-2"></i>
              <span>{new Date().toLocaleDateString('en-IN')}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Today's Sales</p>
                  {metricsLoading ? (
                    <Skeleton className="h-8 w-24 mt-2" />
                  ) : (
                    <p className="text-2xl font-bold text-jewelry-navy">
                      {formatCurrency(metrics?.todaySales || 0)}
                    </p>
                  )}
                  <p className="text-sm text-green-600 mt-1">
                    <i className="fas fa-arrow-up mr-1"></i>+12.5%
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
                  <p className="text-sm font-medium text-gray-600">Inventory Value</p>
                  {metricsLoading ? (
                    <Skeleton className="h-8 w-32 mt-2" />
                  ) : (
                    <p className="text-2xl font-bold text-jewelry-navy">
                      {formatCurrency(metrics?.inventoryValue || 0)}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">Total stock value</p>
                </div>
                <div className="bg-jewelry-gold bg-opacity-10 p-3 rounded-lg">
                  <i className="fas fa-gem text-jewelry-gold text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Credits</p>
                  {metricsLoading ? (
                    <Skeleton className="h-8 w-24 mt-2" />
                  ) : (
                    <p className="text-2xl font-bold text-jewelry-red">
                      {formatCurrency(metrics?.pendingCredits || 0)}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">{overdueCredits?.length || 0} customers</p>
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
                  <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                  {metricsLoading ? (
                    <Skeleton className="h-8 w-16 mt-2" />
                  ) : (
                    <p className="text-2xl font-bold text-orange-600">
                      {metrics?.lowStockCount || 0}
                    </p>
                  )}
                  <p className="text-sm text-orange-600 mt-1">Needs attention</p>
                </div>
                <div className="bg-orange-100 p-3 rounded-lg">
                  <i className="fas fa-exclamation-triangle text-orange-600 text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Sales */}
          <Card className="lg:col-span-2">
            <CardHeader className="border-b border-gray-200">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-jewelry-navy">Recent Sales</CardTitle>
                <Button variant="ghost" className="text-jewelry-gold hover:text-jewelry-bronze">
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {salesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm font-medium text-gray-600">
                        <th className="pb-3">Customer</th>
                        <th className="pb-3">Items</th>
                        <th className="pb-3">Type</th>
                        <th className="pb-3">Amount</th>
                        <th className="pb-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {recentSales?.map((sale) => (
                        <tr key={sale.id} className="border-t border-gray-100">
                          <td className="py-3">
                            <div>
                              <p className="font-medium text-gray-900">
                                {sale.customer?.name || 'Walk-in Customer'}
                              </p>
                              {sale.customer?.phone && (
                                <p className="text-gray-500">{sale.customer.phone}</p>
                              )}
                            </div>
                          </td>
                          <td className="py-3">
                            <div>
                              <p className="text-gray-900">
                                {sale.saleItems.map(item => item.itemName).join(', ')}
                              </p>
                              {sale.saleItems[0]?.weightGrams && (
                                <p className="text-gray-500">
                                  {sale.saleItems[0].weightGrams}g {sale.saleItems[0].material}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="py-3">
                            <Badge className={getSaleTypeColor(sale.saleType)}>
                              {sale.saleType.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="py-3 font-medium text-gray-900">
                            {formatCurrency(sale.totalAmount)}
                          </td>
                          <td className="py-3">
                            <Badge className={getPaymentStatusColor(sale.paymentStatus)}>
                              {sale.paymentStatus}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions & Alerts */}
          <div className="space-y-6">
            {/* Quick Actions Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-jewelry-navy">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-between p-3 bg-jewelry-gold bg-opacity-10 hover:bg-opacity-20"
                  >
                    <div className="flex items-center">
                      <i className="fas fa-plus text-jewelry-gold mr-3"></i>
                      <span className="font-medium text-jewelry-navy">Add New Item</span>
                    </div>
                    <i className="fas fa-chevron-right text-gray-400"></i>
                  </Button>
                  <Button variant="ghost" className="w-full justify-between p-3 hover:bg-gray-100">
                    <div className="flex items-center">
                      <i className="fas fa-receipt text-jewelry-gold mr-3"></i>
                      <span className="font-medium text-jewelry-navy">Generate Receipt</span>
                    </div>
                    <i className="fas fa-chevron-right text-gray-400"></i>
                  </Button>
                  <Button variant="ghost" className="w-full justify-between p-3 hover:bg-gray-100">
                    <div className="flex items-center">
                      <i className="fas fa-user-plus text-jewelry-gold mr-3"></i>
                      <span className="font-medium text-jewelry-navy">Add Customer</span>
                    </div>
                    <i className="fas fa-chevron-right text-gray-400"></i>
                  </Button>
                  <Button variant="ghost" className="w-full justify-between p-3 hover:bg-gray-100">
                    <div className="flex items-center">
                      <i className="fas fa-chart-line text-jewelry-gold mr-3"></i>
                      <span className="font-medium text-jewelry-navy">View Reports</span>
                    </div>
                    <i className="fas fa-chevron-right text-gray-400"></i>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Low Stock Alerts */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-jewelry-navy">Low Stock Alerts</CardTitle>
                  <Badge className="bg-orange-100 text-orange-800">
                    {lowStockItems?.length || 0} items
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {lowStockLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {lowStockItems?.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{item.name}</p>
                          <p className="text-sm text-gray-600">SKU: {item.sku}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-orange-600">{item.currentStock} left</p>
                          <p className="text-xs text-gray-500">Min: {item.minStockLevel}</p>
                        </div>
                      </div>
                    ))}
                    {lowStockItems && lowStockItems.length > 3 && (
                      <Button variant="ghost" className="w-full text-orange-600 hover:text-orange-700">
                        View All Low Stock Items
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Credit Follow-ups */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-jewelry-navy">Credit Follow-ups</CardTitle>
                  <Badge className="bg-jewelry-red bg-opacity-10 text-jewelry-red">
                    Due Today
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {creditsLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {overdueCredits?.slice(0, 2).map((credit) => (
                      <div key={credit.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{credit.customer.name}</p>
                          <p className="text-sm text-gray-600">Credit Transaction</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-jewelry-red">{formatCurrency(credit.amount)}</p>
                          <p className="text-xs text-gray-500">Due: {formatDate(credit.dueDate)}</p>
                        </div>
                      </div>
                    ))}
                    {overdueCredits && overdueCredits.length > 0 && (
                      <Button variant="ghost" className="w-full text-jewelry-red hover:text-red-700">
                        Manage All Credits
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sales Types Overview */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-jewelry-navy">Sales by Type - This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-store text-green-600 text-xl"></i>
                </div>
                <h4 className="font-medium text-jewelry-navy mb-1">Inventory Sales</h4>
                <p className="text-2xl font-bold text-jewelry-navy">
                  {formatCurrency(metrics?.salesByType?.inventory?.amount || 0)}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {metrics?.salesByType?.inventory?.count || 0} transactions
                </p>
              </div>

              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-handshake text-orange-600 text-xl"></i>
                </div>
                <h4 className="font-medium text-jewelry-navy mb-1">Commission Sales</h4>
                <p className="text-2xl font-bold text-jewelry-navy">
                  {formatCurrency(metrics?.salesByType?.commission?.amount || 0)}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {metrics?.salesByType?.commission?.count || 0} transactions
                </p>
              </div>

              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-hammer text-purple-600 text-xl"></i>
                </div>
                <h4 className="font-medium text-jewelry-navy mb-1">Custom Orders</h4>
                <p className="text-2xl font-bold text-jewelry-navy">
                  {formatCurrency(metrics?.salesByType?.custom_order?.amount || 0)}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {metrics?.salesByType?.custom_order?.count || 0} orders
                </p>
              </div>

              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-credit-card text-yellow-600 text-xl"></i>
                </div>
                <h4 className="font-medium text-jewelry-navy mb-1">Credit Sales</h4>
                <p className="text-2xl font-bold text-jewelry-navy">
                  {formatCurrency(metrics?.pendingCredits || 0)}
                </p>
                <p className="text-sm text-gray-600 mt-1">{overdueCredits?.length || 0} customers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <QuickSaleModal open={showQuickSale} onOpenChange={setShowQuickSale} />
    </>
  );
}
