import { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  writeBatch,
  getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './useAuth';

export interface SaleItem {
  id?: string;
  inventoryItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  weight?: number;
  purity?: string;
}

export interface Payment {
  id?: string;
  amount: number;
  method: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'gold' | 'silver';
  reference?: string;
  date: Date;
  notes?: string;
}

export interface Sale {
  id?: string;
  userId: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  payments: Payment[];
  status: 'completed' | 'partial' | 'pending' | 'cancelled';
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  saleDate: Date;
  dueDate?: Date;
  notes?: string;
  billNumber: string;
  createdAt: Date;
  updatedAt: Date;
}

export const useSales = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadSales();
    }
  }, [user]);

  const loadSales = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const q = query(
        collection(db, 'sales'),
        where('userId', '==', user.uid),
        orderBy('saleDate', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const salesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        saleDate: doc.data().saleDate?.toDate(),
        dueDate: doc.data().dueDate?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        payments: doc.data().payments?.map((payment: any) => ({
          ...payment,
          date: payment.date?.toDate(),
        })) || [],
      })) as Sale[];
      
      setSales(salesData);
      setError(null);
    } catch (err: any) {
      console.error('Error loading sales:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateBillNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const time = Date.now().toString().slice(-4);
    return `TM${year}${month}${day}${time}`;
  };

  const addSale = async (saleData: Omit<Sale, 'id' | 'userId' | 'billNumber' | 'createdAt' | 'updatedAt'>) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const billNumber = generateBillNumber();
      const newSale = {
        ...saleData,
        userId: user.uid,
        billNumber,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const docRef = await addDoc(collection(db, 'sales'), newSale);
      
      const createdSale = {
        id: docRef.id,
        ...newSale,
      };
      
      setSales(prev => [createdSale, ...prev]);
      return createdSale;
    } catch (err: any) {
      console.error('Error adding sale:', err);
      throw new Error(err.message);
    }
  };

  const updateSale = async (saleId: string, updates: Partial<Sale>) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const saleRef = doc(db, 'sales', saleId);
      const updateData = {
        ...updates,
        updatedAt: new Date(),
      };
      
      await updateDoc(saleRef, updateData);
      
      setSales(prev => prev.map(sale => 
        sale.id === saleId 
          ? { ...sale, ...updateData }
          : sale
      ));
    } catch (err: any) {
      console.error('Error updating sale:', err);
      throw new Error(err.message);
    }
  };

  const deleteSale = async (saleId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      await deleteDoc(doc(db, 'sales', saleId));
      setSales(prev => prev.filter(sale => sale.id !== saleId));
    } catch (err: any) {
      console.error('Error deleting sale:', err);
      throw new Error(err.message);
    }
  };

  const addPayment = async (saleId: string, payment: Omit<Payment, 'id' | 'date'>) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const sale = sales.find(s => s.id === saleId);
      if (!sale) throw new Error('Sale not found');

      const newPayment: Payment = {
        ...payment,
        date: new Date(),
      };

      const updatedPayments = [...sale.payments, newPayment];
      const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
      const amountDue = sale.total - totalPaid;
      
      const paymentStatus: Sale['paymentStatus'] = 
        amountDue <= 0 ? 'paid' : 
        totalPaid > 0 ? 'partial' : 'unpaid';

      const updates = {
        payments: updatedPayments,
        amountPaid: totalPaid,
        amountDue: Math.max(0, amountDue),
        paymentStatus,
        status: paymentStatus === 'paid' ? 'completed' as const : sale.status,
      };

      await updateSale(saleId, updates);
      return newPayment;
    } catch (err: any) {
      console.error('Error adding payment:', err);
      throw new Error(err.message);
    }
  };

  const getSaleById = (saleId: string) => {
    return sales.find(sale => sale.id === saleId);
  };

  const getSalesByCustomer = (customerId: string) => {
    return sales.filter(sale => sale.customerId === customerId);
  };

  const getSalesByDateRange = (startDate: Date, endDate: Date) => {
    return sales.filter(sale => 
      sale.saleDate >= startDate && sale.saleDate <= endDate
    );
  };

  const getTotalSales = (period: 'today' | 'week' | 'month' | 'year' = 'month') => {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }

    const periodSales = sales.filter(sale => sale.saleDate >= startDate);
    return {
      count: periodSales.length,
      total: periodSales.reduce((sum, sale) => sum + sale.total, 0),
      paid: periodSales.reduce((sum, sale) => sum + sale.amountPaid, 0),
      due: periodSales.reduce((sum, sale) => sum + sale.amountDue, 0),
    };
  };

  const getPendingPayments = () => {
    return sales.filter(sale => sale.paymentStatus !== 'paid' && sale.status !== 'cancelled');
  };

  return {
    sales,
    loading,
    error,
    addSale,
    updateSale,
    deleteSale,
    addPayment,
    getSaleById,
    getSalesByCustomer,
    getSalesByDateRange,
    getTotalSales,
    getPendingPayments,
    refreshSales: loadSales,
  };
};