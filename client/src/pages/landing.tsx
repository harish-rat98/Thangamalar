import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function Landing() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password);
        toast({ title: "Success", description: "Account created successfully!" });
      } else {
        await signIn(email, password);
        toast({ title: "Success", description: "Signed in successfully!" });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
                {isSignUp ? "Create Account" : "Sign In"}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-jewelry-gold hover:bg-jewelry-bronze text-white"
                >
                  {isLoading ? (
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                  ) : (
                    <i className="fas fa-sign-in-alt mr-2"></i>
                  )}
                  {isSignUp ? "Create Account" : "Sign In"}
                </Button>
              </form>
              <div className="mt-4">
                <Button
                  variant="ghost"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-jewelry-gold hover:text-jewelry-bronze"
                >
                  {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
                </Button>
              </div>
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