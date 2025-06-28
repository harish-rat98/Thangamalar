import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  getSalesReport, 
  getProfitLossReport, 
  getInventoryReport, 
  getCustomerReport,
  getSales,
  getInventoryItems,
  getCustomers,
  getExpenses
} from "@/lib/firestore";

interface SalesReportData {
  date: string;
  totalSales: string;
  totalTransactions: number;
  avgSaleAmount: string;
  goldWeightSold: string;
  silverWeightSold: string;
}

interface ProfitLossData {
  revenue: string;
  expenses: string;
  profit: string;
  profitMargin: string;
}

export default function Reports() {
  const [dateRange, setDateRange] = useState("month");
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const { toast } = useToast();

  const { data: salesReport, isLoading: salesLoading } = useQuery<SalesReportData[]>({
    queryKey: ['sales-report', startDate, endDate],
    queryFn: () => getSalesReport(new Date(startDate), new Date(endDate)),
  });

  const { data: profitLossReport, isLoading: profitLossLoading } = useQuery<ProfitLossData>({
    queryKey: ['profit-loss-report', startDate, endDate],
    queryFn: () => getProfitLossReport(new Date(startDate), new Date(endDate)),
  });

  const { data: inventoryReport, isLoading: inventoryLoading } = useQuery({
    queryKey: ['inventory-report'],
    queryFn: getInventoryReport,
  });

  const { data: customerReport, isLoading: customerLoading } = useQuery({
    queryKey: ['customer-report'],
    queryFn: getCustomerReport,
  });

  const { data: allSales } = useQuery({
    queryKey: ['all-sales-export'],
    queryFn: () => getSales(1000),
  });

  const { data: allInventory } = useQuery({
    queryKey: ['all-inventory-export'],
    queryFn: getInventoryItems,
  });

  const { data: allCustomers } = useQuery({
    queryKey: ['all-customers-export'],
    queryFn: getCustomers,
  });

  const { data: allExpenses } = useQuery({
    queryKey: ['all-expenses-export'],
    queryFn: getExpenses,
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

  const handleDateRangeChange = (range: string) => {
    setDateRange(range);
    const now = new Date();
    
    switch (range) {
      case "today":
        setStartDate(now.toISOString().split('T')[0]);
        setEndDate(now.toISOString().split('T')[0]);
        break;
      case "week":
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        setStartDate(weekStart.toISOString().split('T')[0]);
        setEndDate(new Date().toISOString().split('T')[0]);
        break;
      case "month":
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        setStartDate(monthStart.toISOString().split('T')[0]);
        setEndDate(new Date().toISOString().split('T')[0]);
        break;
      case "quarter":
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        setStartDate(quarterStart.toISOString().split('T')[0]);
        setEndDate(new Date().toISOString().split('T')[0]);
        break;
      case "year":
        const yearStart = new Date(now.getFullYear(), 0, 1);
        setStartDate(yearStart.toISOString().split('T')[0]);
        setEndDate(new Date().toISOString().split('T')[0]);
        break;
    }
  };

  // Export Functions
  const exportToCSV = (data: any[], filename: string, headers: string[]) => {
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header] || '';
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToExcel = (data: any[], filename: string) => {
    // Simple Excel export using HTML table format
    const table = document.createElement('table');
    
    if (data.length > 0) {
      // Create header row
      const headerRow = table.insertRow();
      Object.keys(data[0]).forEach(key => {
        const cell = headerRow.insertCell();
        cell.textContent = key;
        cell.style.fontWeight = 'bold';
        cell.style.backgroundColor = '#f0f0f0';
      });

      // Create data rows
      data.forEach(item => {
        const row = table.insertRow();
        Object.values(item).forEach(value => {
          const cell = row.insertCell();
          cell.textContent = String(value);
        });
      });
    }

    const html = `
      <html>
        <head>
          <meta charset="utf-8">
          <title>${filename}</title>
        </head>
        <body>
          ${table.outerHTML}
        </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.xls`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const printReport = (title: string, content: HTMLElement) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${title}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; font-weight: bold; }
              .header { text-align: center; margin-bottom: 30px; }
              .date-range { text-align: center; margin-bottom: 20px; color: #666; }
              @media print { 
                body { margin: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Thanga Malar Jewellery</h1>
              <h2>${title}</h2>
            </div>
            <div class="date-range">
              Report Period: ${new Date(startDate).toLocaleDateString('en-IN')} to ${new Date(endDate).toLocaleDateString('en-IN')}
            </div>
            ${content.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const exportSalesReport = (format: 'csv' | 'excel') => {
    if (!salesReport) return;
    
    const data = salesReport.map(item => ({
      Date: formatDate(item.date),
      'Total Sales': item.totalSales,
      'Transactions': item.totalTransactions,
      'Average Sale': item.avgSaleAmount,
      'Gold Weight (g)': item.goldWeightSold,
      'Silver Weight (g)': item.silverWeightSold
    }));

    if (format === 'csv') {
      exportToCSV(data, 'sales_report', Object.keys(data[0] || {}));
    } else {
      exportToExcel(data, 'sales_report');
    }
    
    toast({ title: "Success", description: `Sales report exported as ${format.toUpperCase()}` });
  };

  const exportInventoryReport = (format: 'csv' | 'excel') => {
    if (!inventoryReport) return;
    
    const data = inventoryReport.map(item => ({
      'Item Name': item.name,
      'SKU': item.sku,
      'Category': item.category,
      'Material': item.material,
      'Quantity': item.quantity,
      'Weight per Piece (g)': item.weightPerPiece,
      'Total Weight (g)': item.totalWeight,
      'Current Value': item.currentValue,
      'Min Stock Level': item.minStockLevel
    }));

    if (format === 'csv') {
      exportToCSV(data, 'inventory_report', Object.keys(data[0] || {}));
    } else {
      exportToExcel(data, 'inventory_report');
    }
    
    toast({ title: "Success", description: `Inventory report exported as ${format.toUpperCase()}` });
  };

  const exportCustomerReport = (format: 'csv' | 'excel') => {
    if (!customerReport) return;
    
    const data = customerReport.map(customer => ({
      'Customer Name': customer.name,
      'Phone': customer.phone,
      'Email': customer.email || '',
      'City': customer.city || '',
      'Total Purchases': customer.totalPurchases,
      'Total Credit': customer.totalCredit,
      'Credit Limit': customer.creditLimit,
      'Recent Transactions': customer.recentTransactions?.length || 0
    }));

    if (format === 'csv') {
      exportToCSV(data, 'customer_report', Object.keys(data[0] || {}));
    } else {
      exportToExcel(data, 'customer_report');
    }
    
    toast({ title: "Success", description: `Customer report exported as ${format.toUpperCase()}` });
  };

  const totalSales = salesReport?.reduce((sum, item) => sum + parseFloat(item.totalSales), 0) || 0;
  const totalTransactions = salesReport?.reduce((sum, item) => sum + item.totalTransactions, 0) || 0;
  const avgDailySales = salesReport?.length ? totalSales / salesReport.length : 0;

  return (
    <>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-jewelry-navy">Reports & Analytics</h1>
            <p className="text-gray-600 mt-1">Business insights and performance analysis</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline"
              onClick={() => {
                const content = document.getElementById('reports-content');
                if (content) printReport('Business Report', content);
              }}
            >
              <i className="fas fa-print mr-2"></i>Print Report
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6" id="reports-content">
        {/* Date Range Selector */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Quick Range:</label>
                <Select value={dateRange} onValueChange={handleDateRangeChange}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="quarter">This Quarter</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">From:</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-40"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">To:</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-40"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sales">Sales Report</TabsTrigger>
            <TabsTrigger value="inventory">Inventory Report</TabsTrigger>
            <TabsTrigger value="customers">Customer Report</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                      {profitLossLoading ? (
                        <Skeleton className="h-8 w-24 mt-2" />
                      ) : (
                        <p className="text-2xl font-bold text-jewelry-gold">
                          {formatCurrency(profitLossReport?.revenue || 0)}
                        </p>
                      )}
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
                      <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                      {profitLossLoading ? (
                        <Skeleton className="h-8 w-24 mt-2" />
                      ) : (
                        <p className="text-2xl font-bold text-jewelry-red">
                          {formatCurrency(profitLossReport?.expenses || 0)}
                        </p>
                      )}
                    </div>
                    <div className="bg-jewelry-red bg-opacity-10 p-3 rounded-lg">
                      <i className="fas fa-receipt text-jewelry-red text-xl"></i>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Net Profit</p>
                      {profitLossLoading ? (
                        <Skeleton className="h-8 w-24 mt-2" />
                      ) : (
                        <p className={`text-2xl font-bold ${
                          parseFloat(profitLossReport?.profit || "0") >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(profitLossReport?.profit || 0)}
                        </p>
                      )}
                    </div>
                    <div className="bg-green-100 p-3 rounded-lg">
                      <i className="fas fa-chart-line text-green-600 text-xl"></i>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Profit Margin</p>
                      {profitLossLoading ? (
                        <Skeleton className="h-8 w-16 mt-2" />
                      ) : (
                        <p className="text-2xl font-bold text-blue-600">
                          {profitLossReport?.profitMargin || 0}%
                        </p>
                      )}
                    </div>
                    <div className="bg-blue-100 p-3 rounded-lg">
                      <i className="fas fa-percentage text-blue-600 text-xl"></i>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Sales Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Sales:</span>
                      <span className="font-medium">{formatCurrency(totalSales)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Transactions:</span>
                      <span className="font-medium">{totalTransactions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg Daily Sales:</span>
                      <span className="font-medium">{formatCurrency(avgDailySales)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg Transaction:</span>
                      <span className="font-medium">
                        {formatCurrency(totalTransactions > 0 ? totalSales / totalTransactions : 0)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Metal Sales Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Gold Sold:</span>
                      <span className="font-medium text-yellow-600">
                        {salesReport?.reduce((sum, item) => sum + parseFloat(item.goldWeightSold || "0"), 0).toFixed(2)}g
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Silver Sold:</span>
                      <span className="font-medium text-gray-600">
                        {salesReport?.reduce((sum, item) => sum + parseFloat(item.silverWeightSold || "0"), 0).toFixed(2)}g
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total Weight:</span>
                      <span className="font-medium">
                        {(salesReport?.reduce((sum, item) => 
                          sum + parseFloat(item.goldWeightSold || "0") + parseFloat(item.silverWeightSold || "0"), 0
                        ) || 0).toFixed(2)}g
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => exportSalesReport('excel')}
                    >
                      <i className="fas fa-file-excel mr-2"></i>Export Sales to Excel
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => exportInventoryReport('excel')}
                    >
                      <i className="fas fa-gem mr-2"></i>Export Inventory to Excel
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => exportCustomerReport('excel')}
                    >
                      <i className="fas fa-users mr-2"></i>Export Customers to Excel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Sales Report Tab */}
          <TabsContent value="sales" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Daily Sales Report</CardTitle>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => exportSalesReport('csv')}
                    >
                      <i className="fas fa-file-csv mr-2"></i>CSV
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => exportSalesReport('excel')}
                    >
                      <i className="fas fa-file-excel mr-2"></i>Excel
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        const content = document.getElementById('sales-table');
                        if (content) printReport('Sales Report', content);
                      }}
                    >
                      <i className="fas fa-print mr-2"></i>Print
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div id="sales-table">
                  {salesLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : salesReport && salesReport.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left text-sm font-medium text-gray-600 border-b">
                            <th className="pb-3">Date</th>
                            <th className="pb-3">Total Sales</th>
                            <th className="pb-3">Transactions</th>
                            <th className="pb-3">Avg Sale</th>
                            <th className="pb-3">Gold Sold (g)</th>
                            <th className="pb-3">Silver Sold (g)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {salesReport.map((item, index) => (
                            <tr key={item.date} className="border-b hover:bg-gray-50">
                              <td className="py-3 font-medium">{formatDate(item.date)}</td>
                              <td className="py-3">{formatCurrency(item.totalSales)}</td>
                              <td className="py-3">{item.totalTransactions}</td>
                              <td className="py-3">{formatCurrency(item.avgSaleAmount)}</td>
                              <td className="py-3 text-yellow-600 font-medium">{item.goldWeightSold}g</td>
                              <td className="py-3 text-gray-600 font-medium">{item.silverWeightSold}g</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <i className="fas fa-chart-line text-gray-400 text-4xl mb-4"></i>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No sales data available</h3>
                      <p className="text-gray-600">No sales found for the selected date range</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory Report Tab */}
          <TabsContent value="inventory" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Inventory Report</CardTitle>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => exportInventoryReport('csv')}
                    >
                      <i className="fas fa-file-csv mr-2"></i>CSV
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => exportInventoryReport('excel')}
                    >
                      <i className="fas fa-file-excel mr-2"></i>Excel
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        const content = document.getElementById('inventory-table');
                        if (content) printReport('Inventory Report', content);
                      }}
                    >
                      <i className="fas fa-print mr-2"></i>Print
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div id="inventory-table">
                  {inventoryLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : inventoryReport && inventoryReport.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left text-sm font-medium text-gray-600 border-b">
                            <th className="pb-3">Item Name</th>
                            <th className="pb-3">SKU</th>
                            <th className="pb-3">Material</th>
                            <th className="pb-3">Quantity</th>
                            <th className="pb-3">Weight/Piece</th>
                            <th className="pb-3">Total Weight</th>
                            <th className="pb-3">Current Value</th>
                            <th className="pb-3">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inventoryReport.map((item) => (
                            <tr key={item.id} className="border-b hover:bg-gray-50">
                              <td className="py-3 font-medium">{item.name}</td>
                              <td className="py-3">{item.sku}</td>
                              <td className="py-3">
                                <Badge className={
                                  item.material === 'gold' ? 'bg-yellow-100 text-yellow-800' :
                                  item.material === 'silver' ? 'bg-gray-100 text-gray-800' :
                                  'bg-blue-100 text-blue-800'
                                }>
                                  {item.material}
                                </Badge>
                              </td>
                              <td className="py-3">{item.quantity}</td>
                              <td className="py-3">{item.weightPerPiece}g</td>
                              <td className="py-3 font-medium">{item.totalWeight}g</td>
                              <td className="py-3 font-medium">{formatCurrency(item.currentValue)}</td>
                              <td className="py-3">
                                <Badge className={
                                  item.quantity <= item.minStockLevel ? 'bg-red-100 text-red-800' :
                                  item.quantity <= item.minStockLevel * 2 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }>
                                  {item.quantity <= item.minStockLevel ? 'Low Stock' : 'In Stock'}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <i className="fas fa-gem text-gray-400 text-4xl mb-4"></i>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No inventory data available</h3>
                      <p className="text-gray-600">Add items to your inventory to see reports</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Customer Report Tab */}
          <TabsContent value="customers" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Customer Report</CardTitle>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => exportCustomerReport('csv')}
                    >
                      <i className="fas fa-file-csv mr-2"></i>CSV
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => exportCustomerReport('excel')}
                    >
                      <i className="fas fa-file-excel mr-2"></i>Excel
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        const content = document.getElementById('customer-table');
                        if (content) printReport('Customer Report', content);
                      }}
                    >
                      <i className="fas fa-print mr-2"></i>Print
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div id="customer-table">
                  {customerLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : customerReport && customerReport.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left text-sm font-medium text-gray-600 border-b">
                            <th className="pb-3">Customer Name</th>
                            <th className="pb-3">Phone</th>
                            <th className="pb-3">Total Purchases</th>
                            <th className="pb-3">Outstanding Credit</th>
                            <th className="pb-3">Credit Limit</th>
                            <th className="pb-3">Recent Transactions</th>
                            <th className="pb-3">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customerReport.map((customer) => (
                            <tr key={customer.id} className="border-b hover:bg-gray-50">
                              <td className="py-3 font-medium">{customer.name}</td>
                              <td className="py-3">{customer.phone}</td>
                              <td className="py-3">{formatCurrency(customer.totalPurchases)}</td>
                              <td className="py-3">
                                <span className={parseFloat(customer.totalCredit) > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                                  {formatCurrency(customer.totalCredit)}
                                </span>
                              </td>
                              <td className="py-3">{formatCurrency(customer.creditLimit)}</td>
                              <td className="py-3">{customer.recentTransactions?.length || 0}</td>
                              <td className="py-3">
                                <Badge className={
                                  parseFloat(customer.totalCredit) > parseFloat(customer.creditLimit) * 0.8 ? 'bg-red-100 text-red-800' :
                                  parseFloat(customer.totalCredit) > 0 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }>
                                  {parseFloat(customer.totalCredit) > parseFloat(customer.creditLimit) * 0.8 ? 'High Credit' :
                                   parseFloat(customer.totalCredit) > 0 ? 'Has Credit' : 'Good Standing'}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <i className="fas fa-users text-gray-400 text-4xl mb-4"></i>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No customer data available</h3>
                      <p className="text-gray-600">Add customers to see reports</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}