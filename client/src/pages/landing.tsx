import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-jewelry-cream to-white">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="font-tamil font-bold text-4xl text-jewelry-gold mb-4">
            தங்க மலர் நகைகள்
          </h1>
          <h2 className="font-bold text-3xl text-jewelry-navy mb-2">
            Thanga Malar Jewellery
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Professional Jewelry Shop Management System
          </p>
          <div className="max-w-2xl mx-auto">
            <p className="text-gray-700 text-lg leading-relaxed mb-8">
              Streamline your jewelry business operations with our comprehensive management system. 
              Handle inventory, sales, customer relationships, and financial tracking all in one place.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="border-jewelry-gold/20 hover:shadow-lg transition-shadow">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-jewelry-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-gem text-jewelry-gold text-2xl"></i>
              </div>
              <h3 className="font-semibold text-jewelry-navy mb-2">Inventory Management</h3>
              <p className="text-gray-600 text-sm">
                Track gold, silver, and precious jewelry items with detailed categorization and stock alerts.
              </p>
            </CardContent>
          </Card>

          <Card className="border-jewelry-gold/20 hover:shadow-lg transition-shadow">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-jewelry-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-users text-jewelry-gold text-2xl"></i>
              </div>
              <h3 className="font-semibold text-jewelry-navy mb-2">Customer Management</h3>
              <p className="text-gray-600 text-sm">
                Maintain detailed customer records with purchase history and credit management.
              </p>
            </CardContent>
          </Card>

          <Card className="border-jewelry-gold/20 hover:shadow-lg transition-shadow">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-jewelry-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-chart-bar text-jewelry-gold text-2xl"></i>
              </div>
              <h3 className="font-semibold text-jewelry-navy mb-2">Business Analytics</h3>
              <p className="text-gray-600 text-sm">
                Generate comprehensive reports and insights to make informed business decisions.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <Card className="max-w-md mx-auto border-jewelry-gold/20">
            <CardContent className="p-8">
              <h3 className="font-semibold text-jewelry-navy text-xl mb-4">
                Ready to Get Started?
              </h3>
              <p className="text-gray-600 mb-6">
                Access your jewelry management dashboard and start managing your business more efficiently.
              </p>
              <Button 
                onClick={() => window.location.href = '/api/login'}
                className="bg-jewelry-gold hover:bg-jewelry-bronze text-white px-8 py-3 text-lg"
              >
                <i className="fas fa-sign-in-alt mr-2"></i>
                Sign In
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-16 text-center text-gray-500 text-sm">
          <p>© 2024 Thanga Malar Jewellery Management System</p>
        </div>
      </div>
    </div>
  );
}
