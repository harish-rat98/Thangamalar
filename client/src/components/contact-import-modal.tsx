import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ContactImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ContactImportModal({ open, onOpenChange }: ContactImportModalProps) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [vcfFile, setVcfFile] = useState<File | null>(null);
  const [whatsappFile, setWhatsappFile] = useState<File | null>(null);
  const { toast } = useToast();

  const importMutation = useMutation({
    mutationFn: async (data: FormData) => {
      await apiRequest('POST', '/api/customers/import', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      toast({ title: "Success", description: "Contacts imported successfully" });
      onOpenChange(false);
      setCsvFile(null);
      setVcfFile(null);
      setWhatsappFile(null);
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleFileUpload = (file: File, type: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    importMutation.mutate(formData);
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-jewelry-navy">
            Import Contacts
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="csv" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="csv">CSV File</TabsTrigger>
            <TabsTrigger value="vcf">vCard/VCF</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          </TabsList>

          <TabsContent value="csv" className="space-y-4">
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
                  onClick={() => csvFile && handleFileUpload(csvFile, 'csv')}
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
          </TabsContent>

          <TabsContent value="vcf" className="space-y-4">
            <div className="text-sm text-gray-600 bg-green-50 p-3 rounded-lg">
              <i className="fas fa-info-circle mr-2 text-green-600"></i>
              Import contacts from vCard (.vcf) files exported from your phone contacts
            </div>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="vcfFile">Select vCard/VCF File</Label>
                <Input
                  id="vcfFile"
                  type="file"
                  accept=".vcf,.vcard"
                  onChange={(e) => setVcfFile(e.target.files?.[0] || null)}
                  className="mt-1"
                />
              </div>
              
              <Button
                onClick={() => vcfFile && handleFileUpload(vcfFile, 'vcf')}
                disabled={!vcfFile || importMutation.isPending}
                className="w-full bg-jewelry-gold text-white hover:bg-jewelry-bronze"
              >
                {importMutation.isPending ? (
                  <><i className="fas fa-spinner fa-spin mr-2"></i>Importing...</>
                ) : (
                  <><i className="fas fa-upload mr-2"></i>Import vCard</>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="whatsapp" className="space-y-4">
            <div className="text-sm text-gray-600 bg-purple-50 p-3 rounded-lg">
              <i className="fas fa-info-circle mr-2 text-purple-600"></i>
              Export WhatsApp contacts and upload the file here
            </div>
            
            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-medium mb-2">How to export WhatsApp contacts:</h4>
              <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                <li>Open WhatsApp on your phone</li>
                <li>Go to Settings → Chats → Export Chat</li>
                <li>Select "Without Media" and choose a contact</li>
                <li>Save the exported file and upload it here</li>
              </ol>
            </div>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="whatsappFile">Select WhatsApp Export File</Label>
                <Input
                  id="whatsappFile"
                  type="file"
                  accept=".txt,.zip"
                  onChange={(e) => setWhatsappFile(e.target.files?.[0] || null)}
                  className="mt-1"
                />
              </div>
              
              <Button
                onClick={() => whatsappFile && handleFileUpload(whatsappFile, 'whatsapp')}
                disabled={!whatsappFile || importMutation.isPending}
                className="w-full bg-jewelry-gold text-white hover:bg-jewelry-bronze"
              >
                {importMutation.isPending ? (
                  <><i className="fas fa-spinner fa-spin mr-2"></i>Importing...</>
                ) : (
                  <><i className="fas fa-upload mr-2"></i>Import WhatsApp</>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

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