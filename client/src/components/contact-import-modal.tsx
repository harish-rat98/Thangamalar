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

// Simple CSV parser
const parseCSV = (csvText: string): any[] => {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const customers: any[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    if (values.length >= headers.length) {
      const customer: any = {};
      headers.forEach((header, index) => {
        customer[header] = values[index] || '';
      });
      
      // Ensure required fields
      if (customer.name && customer.phone) {
        customers.push({
          name: customer.name,
          phone: customer.phone,
          email: customer.email || '',
          address: customer.address || '',
          city: customer.city || '',
          creditLimit: customer.creditLimit || '0',
        });
      }
    }
  }
  
  return customers;
};

export default function ContactImportModal({ open, onOpenChange }: ContactImportModalProps) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const { toast } = useToast();

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();
      const customers = parseCSV(text);
      
      if (customers.length === 0) {
        throw new Error('No valid customers found in CSV file');
      }
      
      const importedCount = await importCustomers(customers);
      return importedCount;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({ 
        title: "Success", 
        description: `Successfully imported ${count} customers` 
      });
      onOpenChange(false);
      setCsvFile(null);
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleFileUpload = () => {
    if (csvFile) {
      importMutation.mutate(csvFile);
    }
  };

  const downloadTemplate = () => {
    const headers = ['name', 'phone', 'email', 'address', 'city', 'creditLimit'];
    const csvContent = headers.join(',') + '\n' + 
      'Rajesh Kumar,9876543210,rajesh@email.com,"123 MG Road",Chennai,50000\n' +
      'Priya Sharma,9876543211,priya@email.com,"456 Anna Nagar",Chennai,30000';
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customer_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-jewelry-navy">
            Import Customers
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
            <i className="fas fa-info-circle mr-2 text-blue-600"></i>
            Upload a CSV file with columns: name, phone, email, address, city, creditLimit
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
                disabled={!csvFile || importMutation.isPending}
                className="flex-1 bg-jewelry-gold text-white hover:bg-jewelry-bronze"
              >
                {importMutation.isPending ? (
                  <><i className="fas fa-spinner fa-spin mr-2"></i>Importing...</>
                ) : (
                  <><i className="fas fa-upload mr-2"></i>Import CSV</>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={importMutation.isPending}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}