import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SalesReportData {
  date: string;
  totalSales: string;
  totalTransactions: number;
  avgSaleAmount: string;
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

  const { data: salesReport, isLoading: salesLoading } = useQuery<SalesReportData[]>({
    queryKey: ['/api/reports/sales', startDate, endDate],
    queryParams: { startDate, endDate },
  });

  const { data: profitLossReport, isLoading: profitLossLoading } = useQuery<ProfitLossData>({
    queryKey: ['/api/reports/profit-loss', startDate, endDate],
    queryParams: { startDate, endDate },
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
            <Button variant="outline">
              <i className="fas fa-download mr-2"></i>Export PDF
            </Button>
            <Button variant="outline">
              <i className="fas fa-file-excel mr-2"></i>Export Excel
            </Button>
            <Button className="bg-jewelry-gold text-white hover:bg-jewelry-bronze">
              <i className="fas fa-print mr-2"></i>Print Report
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6">
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
              
              <Button variant="outline">
                <i className="fas fa-refresh mr-2"></i>Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sales">Sales Report</TabsTrigger>
            <TabsTrigger value="profit-loss">Profit & Loss</TabsTrigger>
            <TabsTrigger value="inventory">Inventory Report</TabsTrigger>
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
                  <CardTitle className="text-lg">Performance Indicators</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Revenue Growth:</span>
                      <Badge className="bg-green-100 text-green-800">
                        <i className="fas fa-arrow-up mr-1"></i>+12.5%
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Customer Retention:</span>
                      <Badge className="bg-blue-100 text-blue-800">85%</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Inventory Turnover:</span>
                      <Badge className="bg-orange-100 text-orange-800">4.2x</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Credit Recovery:</span>
                      <Badge className="bg-yellow-100 text-yellow-800">78%</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Gold Jewelry:</span>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(125000)}</p>
                        <p className="text-xs text-gray-500">45% of sales</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Silver Items:</span>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(68000)}</p>
                        <p className="text-xs text-gray-500">24% of sales</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Diamond Jewelry:</span>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(87000)}</p>
                        <p className="text-xs text-gray-500">31% of sales</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Sales Report Tab */}
          <TabsContent value="sales" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Daily Sales Report</CardTitle>
              </CardHeader>
              <CardContent>
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
                          <th className="pb-3">Growth</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesReport.map((item, index) => {
                          const prevDaySales = index > 0 ? parseFloat(salesReport[index - 1].totalSales) : 0;
                          const currentSales = parseFloat(item.totalSales);
                          const growth = prevDaySales > 0 ? ((currentSales - prevDaySales) / prevDaySales) * 100 : 0;
                          
                          return (
                            <tr key={item.date} className="border-b hover:bg-gray-50">
                              <td className="py-3 font-medium">{formatDate(item.date)}</td>
                              <td className="py-3">{formatCurrency(item.totalSales)}</td>
                              <td className="py-3">{item.totalTransactions}</td>
                              <td className="py-3">{formatCurrency(item.avgSaleAmount)}</td>
                              <td className="py-3">
                                {index > 0 && (
                                  <Badge className={growth >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                    <i className={`fas ${growth >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'} mr-1`}></i>
                                    {Math.abs(growth).toFixed(1)}%
                                  </Badge>
                                )}
                              </td>
                            </tr>
                          );
                        })}
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profit & Loss Tab */}
          <TabsContent value="profit-loss" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profit & Loss Statement</CardTitle>
                </CardHeader>
                <CardContent>
                  {profitLossLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex justify-between">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                      ))}
                    </div>
                  ) : profitLossReport ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="font-medium text-gray-900">Revenue</span>
                        <span className="font-bold text-green-600">
                          {formatCurrency(profitLossReport.revenue)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="font-medium text-gray-900">Total Expenses</span>
                        <span className="font-bold text-red-600">
                          {formatCurrency(profitLossReport.expenses)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-300">
                        <span className="font-bold text-gray-900 text-lg">Net Profit</span>
                        <span className={`font-bold text-lg ${
                          parseFloat(profitLossReport.profit) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(profitLossReport.profit)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="font-medium text-gray-900">Profit Margin</span>
                        <span className="font-bold text-blue-600">
                          {profitLossReport.profitMargin}%
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-600">No profit/loss data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Financial Health Indicators</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-green-800">Cash Flow</span>
                        <Badge className="bg-green-100 text-green-800">Positive</Badge>
                      </div>
                      <p className="text-xs text-green-700 mt-1">Strong cash position</p>
                    </div>
                    
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-yellow-800">Credit Recovery</span>
                        <Badge className="bg-yellow-100 text-yellow-800">78%</Badge>
                      </div>
                      <p className="text-xs text-yellow-700 mt-1">Room for improvement</p>
                    </div>
                    
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-blue-800">Expense Ratio</span>
                        <Badge className="bg-blue-100 text-blue-800">32%</Badge>
                      </div>
                      <p className="text-xs text-blue-700 mt-1">Within healthy range</p>
                    </div>
                    
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-purple-800">ROI</span>
                        <Badge className="bg-purple-100 text-purple-800">24%</Badge>
                      </div>
                      <p className="text-xs text-purple-700 mt-1">Excellent returns</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Inventory Report Tab */}
          <TabsContent value="inventory" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Inventory Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <i className="fas fa-chart-pie text-gray-400 text-4xl mb-4"></i>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Inventory Report</h3>
                  <p className="text-gray-600 mb-4">Detailed inventory analysis and stock movement reports</p>
                  <Button className="bg-jewelry-gold hover:bg-jewelry-bronze">
                    <i className="fas fa-chart-bar mr-2"></i>Generate Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
