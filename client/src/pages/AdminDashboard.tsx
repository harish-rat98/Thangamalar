import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserAnalytics, SystemAnalytics, EmailNotification } from '@/types/analytics';
import { Users, TrendingUp, DollarSign, Activity, Mail, Search, Filter } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<SystemAnalytics | null>(null);
  const [notifications, setNotifications] = useState<EmailNotification[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        trialEndDate: doc.data().trialEndDate?.toDate(),
        subscriptionStartDate: doc.data().subscriptionStartDate?.toDate(),
      }));
      setUsers(usersData);

      // Calculate analytics
      const totalUsers = usersData.length;
      const activeUsers = usersData.filter(u => u.isActive).length;
      const trialUsers = usersData.filter(u => u.plan === 'free').length;
      const paidUsers = usersData.filter(u => u.plan !== 'free').length;
      const conversionRate = totalUsers > 0 ? (paidUsers / totalUsers) * 100 : 0;

      const planPrices = { professional: 2999, enterprise: 7999 };
      const monthlyRevenue = usersData.reduce((sum, user) => {
        return sum + (planPrices[user.plan as keyof typeof planPrices] || 0);
      }, 0);

      setAnalytics({
        totalUsers,
        activeUsers,
        trialUsers,
        paidUsers,
        conversionRate,
        churnRate: 5.2, // Mock data
        monthlyRecurringRevenue: monthlyRevenue,
        averageRevenuePerUser: paidUsers > 0 ? monthlyRevenue / paidUsers : 0,
        popularFeatures: [
          { feature: 'Inventory Management', usage: 89 },
          { feature: 'Sales Tracking', usage: 76 },
          { feature: 'Customer Management', usage: 65 },
          { feature: 'Reports', usage: 34 },
        ],
        userGrowth: [], // Would be calculated from historical data
      });

      // Load notifications
      const notificationsSnapshot = await getDocs(
        query(collection(db, 'email_notifications'), orderBy('createdAt', 'desc'), limit(50))
      );
      const notificationsData = notificationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        scheduledFor: doc.data().scheduledFor?.toDate(),
        sentAt: doc.data().sentAt?.toDate(),
      })) as EmailNotification[];
      setNotifications(notificationsData);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = filterPlan === 'all' || user.plan === filterPlan;
    return matchesSearch && matchesPlan;
  });

  const getTrialStatus = (user: any) => {
    if (user.plan !== 'free') return 'Paid';
    if (!user.trialEndDate) return 'No Trial';
    
    const daysLeft = Math.ceil((user.trialEndDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    if (daysLeft <= 0) return 'Expired';
    if (daysLeft <= 3) return `${daysLeft} days left`;
    return `${daysLeft} days left`;
  };

  const getStatusColor = (user: any) => {
    if (user.plan !== 'free') return 'bg-green-100 text-green-800';
    if (!user.trialEndDate) return 'bg-gray-100 text-gray-800';
    
    const daysLeft = Math.ceil((user.trialEndDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    if (daysLeft <= 0) return 'bg-red-100 text-red-800';
    if (daysLeft <= 3) return 'bg-orange-100 text-orange-800';
    return 'bg-blue-100 text-blue-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-jewelry-gold mx-auto mb-4"></div>
          <p className="text-jewelry-bronze">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-jewelry-cream p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-jewelry-navy mb-2">Admin Dashboard</h1>
          <p className="text-jewelry-bronze">Manage users, subscriptions, and system analytics</p>
        </div>

        {/* Analytics Overview */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-jewelry-bronze" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-jewelry-navy">{analytics.totalUsers}</div>
                <p className="text-xs text-muted-foreground">
                  {analytics.activeUsers} active users
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-jewelry-bronze" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-jewelry-navy">
                  {analytics.conversionRate.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {analytics.paidUsers} paid users
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-jewelry-bronze" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-jewelry-navy">
                  ₹{analytics.monthlyRecurringRevenue.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  ₹{Math.round(analytics.averageRevenuePerUser)} ARPU
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Trial Users</CardTitle>
                <Activity className="h-4 w-4 text-jewelry-bronze" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-jewelry-navy">{analytics.trialUsers}</div>
                <p className="text-xs text-muted-foreground">
                  {analytics.churnRate}% churn rate
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* User Management */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-jewelry-navy">User Management</CardTitle>
            <CardDescription>Manage user accounts and subscriptions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-6">
              <div className="flex-1">
                <Label htmlFor="search">Search Users</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="filter">Filter by Plan</Label>
                <select
                  id="filter"
                  value={filterPlan}
                  onChange={(e) => setFilterPlan(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="all">All Plans</option>
                  <option value="free">Free</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Email</th>
                    <th className="text-left p-2">Plan</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Trial Status</th>
                    <th className="text-left p-2">Signup Date</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">{user.email}</td>
                      <td className="p-2">
                        <Badge variant="outline" className="capitalize">
                          {user.plan}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <Badge variant={user.isActive ? "default" : "secondary"}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <Badge className={getStatusColor(user)}>
                          {getTrialStatus(user)}
                        </Badge>
                      </td>
                      <td className="p-2">
                        {user.subscriptionStartDate?.toLocaleDateString()}
                      </td>
                      <td className="p-2">
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Email Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-jewelry-navy flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Notifications
            </CardTitle>
            <CardDescription>Recent email notifications sent to users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {notifications.slice(0, 10).map((notification) => (
                <div key={notification.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{notification.subject}</p>
                    <p className="text-sm text-muted-foreground">{notification.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {notification.scheduledFor?.toLocaleDateString()}
                    </p>
                  </div>
                  <Badge 
                    variant={notification.status === 'sent' ? 'default' : 
                            notification.status === 'failed' ? 'destructive' : 'secondary'}
                  >
                    {notification.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};