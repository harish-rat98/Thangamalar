import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import TamilLogo from "./tamil-logo";

export default function Sidebar() {
  const [location] = useLocation();

  const navigationItems = [
    {
      path: "/",
      label: "Dashboard",
      icon: "fas fa-chart-dashboard",
      active: location === "/"
    },
    {
      path: "/inventory",
      label: "Inventory",
      icon: "fas fa-gem",
      active: location === "/inventory"
    },
    {
      path: "/sales",
      label: "Sales & Billing",
      icon: "fas fa-shopping-cart",
      active: location === "/sales"
    },
    {
      path: "/customers",
      label: "Customers",
      icon: "fas fa-users",
      active: location === "/customers"
    },
    {
      path: "/credit",
      label: "Credit Management",
      icon: "fas fa-credit-card",
      active: location === "/credit"
    },
    {
      path: "/expenses",
      label: "Expenses",
      icon: "fas fa-receipt",
      active: location === "/expenses"
    },
    {
      path: "/reports",
      label: "Reports",
      icon: "fas fa-chart-bar",
      active: location === "/reports"
    }
  ];

  return (
    <aside className="w-64 bg-white shadow-lg border-r border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <TamilLogo />
      </div>
      
      <nav className="mt-6">
        <div className="px-4">
          {navigationItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <a
                className={`flex items-center px-4 py-3 rounded-lg mb-2 font-medium transition-colors ${
                  item.active
                    ? "text-jewelry-navy bg-jewelry-cream"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <i className={`${item.icon} w-5 mr-3 ${item.active ? "text-jewelry-gold" : "text-jewelry-gold"}`}></i>
                {item.label}
              </a>
            </Link>
          ))}
        </div>
        
        <div className="mt-8 px-4 pt-6 border-t border-gray-200">
          <Link href="/settings">
            <a className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg mb-2 transition-colors">
              <i className="fas fa-cog w-5 mr-3 text-gray-500"></i>
              Settings
            </a>
          </Link>
          <Button
            variant="ghost"
            className="w-full justify-start px-4 py-3 text-jewelry-red hover:bg-red-50 rounded-lg transition-colors"
            onClick={() => window.location.href = '/api/logout'}
          >
            <i className="fas fa-sign-out-alt w-5 mr-3"></i>
            Logout
          </Button>
        </div>
      </nav>
    </aside>
  );
}
