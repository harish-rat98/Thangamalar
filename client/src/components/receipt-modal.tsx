import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { getSettings } from "@/lib/firestore";

interface ReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleData: {
    receiptNumber: string;
    totalAmount: string;
    createdAt: string;
    customer?: {
      name: string;
      phone: string;
    };
    saleItems: Array<{
      itemName: string;
      quantity: number;
      weightGrams: string;
      metalType: string;
      unitPrice: string;
      totalPrice: string;
    }>;
    makingChargesPercentage: string;
    wastagePercentage: string;
    additionalCharges: string;
    taxPercentage: string;
    taxAmount: string;
    paymentMethod: string;
    cashReceived: string;
    cardUpiReceived: string;
    creditAmount: string;
  };
}

export default function ReceiptModal({ open, onOpenChange, saleData }: ReceiptModalProps) {
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
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
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const printReceipt = () => {
    const receiptContent = document.getElementById('receipt-content');
    if (!receiptContent) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt - ${saleData.receiptNumber}</title>
            <style>
              body { 
                font-family: 'Courier New', monospace; 
                margin: 0; 
                padding: 20px; 
                font-size: 12px;
                line-height: 1.4;
              }
              .receipt { 
                max-width: 300px; 
                margin: 0 auto; 
                border: 1px solid #000;
                padding: 10px;
              }
              .header { 
                text-align: center; 
                border-bottom: 1px dashed #000; 
                padding-bottom: 10px; 
                margin-bottom: 10px; 
              }
              .shop-name { 
                font-size: 16px; 
                font-weight: bold; 
                margin-bottom: 5px; 
              }
              .contact-info { 
                font-size: 10px; 
                margin-bottom: 2px; 
              }
              .receipt-info { 
                margin-bottom: 10px; 
                padding-bottom: 10px; 
                border-bottom: 1px dashed #000; 
              }
              .customer-info { 
                margin-bottom: 10px; 
                padding-bottom: 10px; 
                border-bottom: 1px dashed #000; 
              }
              .items-table { 
                width: 100%; 
                margin-bottom: 10px; 
              }
              .items-table th, .items-table td { 
                text-align: left; 
                padding: 2px; 
                font-size: 10px; 
              }
              .items-table th { 
                border-bottom: 1px solid #000; 
              }
              .totals { 
                border-top: 1px dashed #000; 
                padding-top: 10px; 
              }
              .total-line { 
                display: flex; 
                justify-content: space-between; 
                margin-bottom: 3px; 
              }
              .grand-total { 
                font-weight: bold; 
                font-size: 14px; 
                border-top: 1px solid #000; 
                padding-top: 5px; 
                margin-top: 5px; 
              }
              .footer { 
                text-align: center; 
                margin-top: 15px; 
                padding-top: 10px; 
                border-top: 1px dashed #000; 
                font-size: 10px; 
              }
              @media print { 
                body { margin: 0; padding: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="receipt">
              <div class="header">
                <div class="shop-name">${settings?.businessInfo?.shopName || 'Thanga Malar Jewellery'}</div>
                <div class="contact-info">${settings?.businessInfo?.address || ''}</div>
                <div class="contact-info">Ph: ${settings?.businessInfo?.contactNumber || ''}</div>
                ${settings?.businessInfo?.gstNumber ? `<div class="contact-info">GST: ${settings.businessInfo.gstNumber}</div>` : ''}
              </div>

              <div class="receipt-info">
                <div><strong>Receipt No:</strong> ${saleData.receiptNumber}</div>
                <div><strong>Date:</strong> ${formatDate(saleData.createdAt)}</div>
              </div>

              ${saleData.customer ? `
                <div class="customer-info">
                  <div><strong>Customer:</strong> ${saleData.customer.name}</div>
                  <div><strong>Phone:</strong> ${saleData.customer.phone}</div>
                </div>
              ` : ''}

              <table class="items-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Wt(g)</th>
                    <th>Rate</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${saleData.saleItems.map(item => `
                    <tr>
                      <td>${item.itemName}</td>
                      <td>${item.quantity}</td>
                      <td>${item.weightGrams}</td>
                      <td>${formatCurrency(item.unitPrice)}</td>
                      <td>${formatCurrency(item.totalPrice)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <div class="totals">
                <div class="total-line">
                  <span>Subtotal:</span>
                  <span>${formatCurrency(
                    saleData.saleItems.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0)
                  )}</span>
                </div>
                
                ${parseFloat(saleData.makingChargesPercentage) > 0 ? `
                  <div class="total-line">
                    <span>Making Charges (${saleData.makingChargesPercentage}%):</span>
                    <span>${formatCurrency(
                      saleData.saleItems.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0) * 
                      parseFloat(saleData.makingChargesPercentage) / 100
                    )}</span>
                  </div>
                ` : ''}
                
                ${parseFloat(saleData.wastagePercentage) > 0 ? `
                  <div class="total-line">
                    <span>Wastage (${saleData.wastagePercentage}%):</span>
                    <span>${formatCurrency(
                      saleData.saleItems.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0) * 
                      parseFloat(saleData.wastagePercentage) / 100
                    )}</span>
                  </div>
                ` : ''}
                
                ${parseFloat(saleData.additionalCharges) > 0 ? `
                  <div class="total-line">
                    <span>Additional Charges:</span>
                    <span>${formatCurrency(saleData.additionalCharges)}</span>
                  </div>
                ` : ''}
                
                <div class="total-line">
                  <span>Tax (${saleData.taxPercentage}%):</span>
                  <span>${formatCurrency(saleData.taxAmount)}</span>
                </div>
                
                <div class="total-line grand-total">
                  <span>TOTAL:</span>
                  <span>${formatCurrency(saleData.totalAmount)}</span>
                </div>
              </div>

              <div class="totals" style="margin-top: 10px;">
                ${parseFloat(saleData.cashReceived) > 0 ? `
                  <div class="total-line">
                    <span>Cash Received:</span>
                    <span>${formatCurrency(saleData.cashReceived)}</span>
                  </div>
                ` : ''}
                
                ${parseFloat(saleData.cardUpiReceived) > 0 ? `
                  <div class="total-line">
                    <span>Card/UPI:</span>
                    <span>${formatCurrency(saleData.cardUpiReceived)}</span>
                  </div>
                ` : ''}
                
                ${parseFloat(saleData.creditAmount) > 0 ? `
                  <div class="total-line">
                    <span>Credit:</span>
                    <span>${formatCurrency(saleData.creditAmount)}</span>
                  </div>
                ` : ''}
                
                ${(parseFloat(saleData.cashReceived) + parseFloat(saleData.cardUpiReceived)) > parseFloat(saleData.totalAmount) ? `
                  <div class="total-line">
                    <span>Change:</span>
                    <span>${formatCurrency(
                      (parseFloat(saleData.cashReceived) + parseFloat(saleData.cardUpiReceived)) - parseFloat(saleData.totalAmount)
                    )}</span>
                  </div>
                ` : ''}
              </div>

              <div class="footer">
                <div>Thank you for your business!</div>
                <div>Visit us again</div>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Receipt Preview</DialogTitle>
        </DialogHeader>

        <div id="receipt-content" className="bg-white p-4 border rounded-lg font-mono text-sm">
          {/* Receipt Header */}
          <div className="text-center border-b border-dashed border-gray-400 pb-3 mb-3">
            <h2 className="font-bold text-lg">{settings?.businessInfo?.shopName || 'Thanga Malar Jewellery'}</h2>
            {settings?.businessInfo?.address && (
              <p className="text-xs">{settings.businessInfo.address}</p>
            )}
            {settings?.businessInfo?.contactNumber && (
              <p className="text-xs">Ph: {settings.businessInfo.contactNumber}</p>
            )}
            {settings?.businessInfo?.gstNumber && (
              <p className="text-xs">GST: {settings.businessInfo.gstNumber}</p>
            )}
          </div>

          {/* Receipt Info */}
          <div className="mb-3 pb-3 border-b border-dashed border-gray-400">
            <div className="flex justify-between">
              <span>Receipt No:</span>
              <span className="font-bold">{saleData.receiptNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{formatDate(saleData.createdAt)}</span>
            </div>
          </div>

          {/* Customer Info */}
          {saleData.customer && (
            <div className="mb-3 pb-3 border-b border-dashed border-gray-400">
              <div className="flex justify-between">
                <span>Customer:</span>
                <span>{saleData.customer.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Phone:</span>
                <span>{saleData.customer.phone}</span>
              </div>
            </div>
          )}

          {/* Items */}
          <div className="mb-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-400">
                  <th className="text-left py-1">Item</th>
                  <th className="text-center py-1">Qty</th>
                  <th className="text-center py-1">Wt(g)</th>
                  <th className="text-right py-1">Amount</th>
                </tr>
              </thead>
              <tbody>
                {saleData.saleItems.map((item, index) => (
                  <tr key={index}>
                    <td className="py-1">{item.itemName}</td>
                    <td className="text-center py-1">{item.quantity}</td>
                    <td className="text-center py-1">{item.weightGrams}</td>
                    <td className="text-right py-1">{formatCurrency(item.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="border-t border-dashed border-gray-400 pt-3">
            <div className="flex justify-between mb-1">
              <span>Subtotal:</span>
              <span>{formatCurrency(
                saleData.saleItems.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0)
              )}</span>
            </div>
            
            {parseFloat(saleData.makingChargesPercentage) > 0 && (
              <div className="flex justify-between mb-1">
                <span>Making ({saleData.makingChargesPercentage}%):</span>
                <span>{formatCurrency(
                  saleData.saleItems.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0) * 
                  parseFloat(saleData.makingChargesPercentage) / 100
                )}</span>
              </div>
            )}
            
            {parseFloat(saleData.wastagePercentage) > 0 && (
              <div className="flex justify-between mb-1">
                <span>Wastage ({saleData.wastagePercentage}%):</span>
                <span>{formatCurrency(
                  saleData.saleItems.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0) * 
                  parseFloat(saleData.wastagePercentage) / 100
                )}</span>
              </div>
            )}
            
            {parseFloat(saleData.additionalCharges) > 0 && (
              <div className="flex justify-between mb-1">
                <span>Additional:</span>
                <span>{formatCurrency(saleData.additionalCharges)}</span>
              </div>
            )}
            
            <div className="flex justify-between mb-1">
              <span>Tax ({saleData.taxPercentage}%):</span>
              <span>{formatCurrency(saleData.taxAmount)}</span>
            </div>
            
            <div className="flex justify-between font-bold text-lg border-t border-gray-400 pt-2">
              <span>TOTAL:</span>
              <span>{formatCurrency(saleData.totalAmount)}</span>
            </div>
          </div>

          {/* Payment Details */}
          <div className="mt-3 pt-3 border-t border-dashed border-gray-400">
            {parseFloat(saleData.cashReceived) > 0 && (
              <div className="flex justify-between">
                <span>Cash:</span>
                <span>{formatCurrency(saleData.cashReceived)}</span>
              </div>
            )}
            {parseFloat(saleData.cardUpiReceived) > 0 && (
              <div className="flex justify-between">
                <span>Card/UPI:</span>
                <span>{formatCurrency(saleData.cardUpiReceived)}</span>
              </div>
            )}
            {parseFloat(saleData.creditAmount) > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Credit:</span>
                <span>{formatCurrency(saleData.creditAmount)}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center mt-4 pt-3 border-t border-dashed border-gray-400 text-xs">
            <p>Thank you for your business!</p>
            <p>Visit us again</p>
          </div>
        </div>

        <div className="flex space-x-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Close
          </Button>
          <Button onClick={printReceipt} className="flex-1 bg-jewelry-gold hover:bg-jewelry-bronze">
            <i className="fas fa-print mr-2"></i>Print Receipt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}