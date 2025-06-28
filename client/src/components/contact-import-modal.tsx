import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { importCustomers } from "@/lib/firestore";
import { queryClient } from "@/lib/queryClient";

interface ContactImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Enhanced CSV parser with credit support
const parseCSV = (csvText: string): any[] => {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
  const customers: any[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    if (values.length >= headers.length) {
      const customer: any = {};
      headers.forEach((header, index) => {
        customer[header] = values[index] || '';
      });
      
      // Map common header variations
      const mappedCustomer = {
        name: customer.name || customer['customer name'] || customer['full name'] || '',
        phone: customer.phone || customer['phone number'] || customer.mobile || customer.contact || '',
        email: customer.email || customer['email address'] || '',
        address: customer.address || customer['full address'] || '',
        city: customer.city || customer.location || '',
        creditLimit: customer.creditlimit || customer['credit limit'] || customer['credit_limit'] || '0',
        totalCredit: customer.totalcredit || customer['total credit'] || customer['credit given'] || customer['existing credit'] || customer.credit || '0',
      };
      
      // Ensure required fields and validate data
      if (mappedCustomer.name && mappedCustomer.phone) {
        // Clean and validate credit amounts
        mappedCustomer.creditLimit = parseFloat(mappedCustomer.creditLimit.toString().replace(/[^\d.]/g, '')) || 0;
        mappedCustomer.totalCredit = parseFloat(mappedCustomer.totalCredit.toString().replace(/[^\d.]/g, '')) || 0;
        
        customers.push({
          name: mappedCustomer.name,
          phone: mappedCustomer.phone,
          email: mappedCustomer.email,
          address: mappedCustomer.address,
          city: mappedCustomer.city,
          creditLimit: mappedCustomer.creditLimit.toString(),
          totalCredit: mappedCustomer.totalCredit.toString(),
        });
      }
    }
  }
  
  return customers;
};

export default function ContactImportModal({ open, onOpenChange }: ContactImportModalProps) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  const importMutation = useMutation({
    mutationFn: async (customers: any[]) => {
      const importedCount = await importCustomers(customers);
      return importedCount;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      toast({ 
        title: "Success", 
        description: `Successfully imported ${count} customers with credit data` 
      });
      onOpenChange(false);
      setCsvFile(null);
      setImportPreview([]);
      setShowPreview(false);
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleFileUpload = async () => {
    if (!csvFile) return;

    try {
      const text = await csvFile.text();
      const customers = parseCSV(text);
      
      if (customers.length === 0) {
        toast({
          title: "Error",
          description: "No valid customers found in CSV file. Please check the format.",
          variant: "destructive"
        });
        return;
      }

      setImportPreview(customers);
      setShowPreview(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to parse CSV file. Please check the format.",
        variant: "destructive"
      });
    }
  };

  const confirmImport = () => {
    importMutation.mutate(importPreview);
  };

  const downloadTemplate = () => {
    const headers = ['name', 'phone', 'email', 'address', 'city', 'creditLimit', 'totalCredit'];
    const csvContent = headers.join(',') + '\n' + 
      'Rajesh Kumar,9876543210,rajesh@email.com,"123 MG Road",Chennai,50000,5000\n' +
      'Priya Sharma,9876543211,priya@email.com,"456 Anna Nagar",Chennai,30000,0\n' +
      'Suresh Patel,9876543212,suresh@email.com,"789 T Nagar",Chennai,75000,12000';
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customer_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-jewelry-navy">
            Import Customers with Credit Data
          </DialogTitle>
        </DialogHeader>

        {!showPreview ? (
          <div className="space-y-4">
            <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">
                <i className="fas fa-info-circle mr-2"></i>Enhanced Import Features
              </h4>
              <ul className="space-y-1 text-blue-700">
                <li>• Import customer details with existing credit amounts</li>
                <li>• Automatic credit transaction creation for existing credits</li>
                <li>• Support for multiple column name formats</li>
                <li>• Data validation and error checking</li>
                <li>• Preview before final import</li>
              </ul>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">Required Columns:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm text-yellow-700">
                <div><strong>name</strong> - Customer name (required)</div>
                <div><strong>phone</strong> - Phone number (required)</div>
                <div><strong>email</strong> - Email address (optional)</div>
                <div><strong>address</strong> - Full address (optional)</div>
                <div><strong>city</strong> - City name (optional)</div>
                <div><strong>creditLimit</strong> - Credit limit amount</div>
                <div><strong>totalCredit</strong> - Existing credit amount</div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="csvFile">Select CSV File</Label>
                <Input
                  id="csvFile"
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  className="mt-1"
                />
              </div>
              
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={downloadTemplate}
                  className="flex-1"
                >
                  <i className="fas fa-download mr-2"></i>
                  Download Template
                </Button>
                <Button
                  onClick={handleFileUpload}
                  disabled={!csvFile}
                  className="flex-1 bg-jewelry-gold text-white hover:bg-jewelry-bronze"
                >
                  <i className="fas fa-eye mr-2"></i>Preview Import
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">
                <i className="fas fa-check-circle mr-2"></i>Import Preview
              </h4>
              <p className="text-sm text-green-700">
                Found {importPreview.length} valid customers. 
                {importPreview.filter(c => parseFloat(c.totalCredit) > 0).length} customers have existing credit.
              </p>
            </div>

            <div className="max-h-96 overflow-y-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">Phone</th>
                    <th className="p-2 text-left">Email</th>
                    <th className="p-2 text-left">City</th>
                    <th className="p-2 text-left">Credit Limit</th>
                    <th className="p-2 text-left">Existing Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {importPreview.map((customer, index) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="p-2 font-medium">{customer.name}</td>
                      <td className="p-2">{customer.phone}</td>
                      <td className="p-2">{customer.email || '-'}</td>
                      <td className="p-2">{customer.city || '-'}</td>
                      <td className="p-2">{formatCurrency(customer.creditLimit)}</td>
                      <td className="p-2">
                        <span className={parseFloat(customer.totalCredit) > 0 ? 'text-red-600 font-medium' : 'text-gray-500'}>
                          {formatCurrency(customer.totalCredit)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg">
              <h4 className="font-medium text-orange-800 mb-2">Import Summary:</h4>
              <ul className="text-sm text-orange-700 space-y-1">
                <li>• {importPreview.length} customers will be imported</li>
                <li>• {importPreview.filter(c => parseFloat(c.totalCredit) > 0).length} credit transactions will be created</li>
                <li>• Total credit amount: {formatCurrency(
                  importPreview.reduce((sum, c) => sum + parseFloat(c.totalCredit), 0)
                )}</li>
                <li>• Existing customers with same phone numbers will be updated</li>
              </ul>
            </div>

            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowPreview(false)}
                className="flex-1"
              >
                <i className="fas fa-arrow-left mr-2"></i>Back to Upload
              </Button>
              <Button
                onClick={confirmImport}
                disabled={importMutation.isPending}
                className="flex-1 bg-jewelry-gold text-white hover:bg-jewelry-bronze"
              >
                {importMutation.isPending ? (
                  <><i className="fas fa-spinner fa-spin mr-2"></i>Importing...</>
                ) : (
                  <><i className="fas fa-upload mr-2"></i>Confirm Import</>
                )}
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setShowPreview(false);
              setImportPreview([]);
              setCsvFile(null);
            }}
            disabled={importMutation.isPending}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}