import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-jewelry-gold mb-2">
            தங்கமலர் நகைக்கடை
          </h1>
          <h2 className="text-2xl font-semibold text-jewelry-navy mb-4">
            Thanga Malar Jewellery Management System
          </h2>
          <p className="text-muted-foreground">
            Complete jewelry business management solution
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-jewelry-bronze">Inventory Management</CardTitle>
              <CardDescription>
                Manage your jewelry stock, track items, and monitor inventory levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-jewelry-gold hover:bg-jewelry-bronze text-white">
                View Inventory
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-jewelry-bronze">Sales & Billing</CardTitle>
              <CardDescription>
                Process sales, generate bills, and manage customer transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-jewelry-gold hover:bg-jewelry-bronze text-white">
                New Sale
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-jewelry-bronze">Customer Management</CardTitle>
              <CardDescription>
                Maintain customer records and track purchase history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-jewelry-gold hover:bg-jewelry-bronze text-white">
                Manage Customers
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-jewelry-bronze">Credit Management</CardTitle>
              <CardDescription>
                Track merchant credits in gold, silver, cash and other forms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-jewelry-gold hover:bg-jewelry-bronze text-white">
                View Credits
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-jewelry-bronze">Reports & Analytics</CardTitle>
              <CardDescription>
                Generate business reports and analyze performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-jewelry-gold hover:bg-jewelry-bronze text-white">
                View Reports
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-jewelry-bronze">Settings</CardTitle>
              <CardDescription>
                Configure system settings and business preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-jewelry-gold hover:bg-jewelry-bronze text-white">
                Settings
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            Built for modern jewelry businesses • Secure • Reliable • Easy to use
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;