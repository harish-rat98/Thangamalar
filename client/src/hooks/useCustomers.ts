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
  orderBy 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './useAuth';

export interface Customer {
  id?: string;
  userId: string;
  name: string;
  email?: string;
  phone: string;
  address?: {
    street: string;
    city: string;
    state: string;
    pincode: string;
  };
  dateOfBirth?: Date;
  anniversary?: Date;
  preferences?: {
    goldType: string[];
    priceRange: { min: number; max: number };
    notifications: boolean;
  };
  totalPurchases: number;
  totalSpent: number;
  lastPurchase?: Date;
  loyaltyPoints: number;
  status: 'active' | 'inactive';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const useCustomers = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadCustomers();
    }
  }, [user]);

  const loadCustomers = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const q = query(
        collection(db, 'customers'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const customersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dateOfBirth: doc.data().dateOfBirth?.toDate(),
        anniversary: doc.data().anniversary?.toDate(),
        lastPurchase: doc.data().lastPurchase?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Customer[];
      
      setCustomers(customersData);
      setError(null);
    } catch (err: any) {
      console.error('Error loading customers:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addCustomer = async (customerData: Omit<Customer, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'totalPurchases' | 'totalSpent' | 'loyaltyPoints'>) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const newCustomer = {
        ...customerData,
        userId: user.uid,
        totalPurchases: 0,
        totalSpent: 0,
        loyaltyPoints: 0,
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const docRef = await addDoc(collection(db, 'customers'), newCustomer);
      
      const createdCustomer = {
        id: docRef.id,
        ...newCustomer,
      };
      
      setCustomers(prev => [createdCustomer, ...prev]);
      return createdCustomer;
    } catch (err: any) {
      console.error('Error adding customer:', err);
      throw new Error(err.message);
    }
  };

  const updateCustomer = async (customerId: string, updates: Partial<Customer>) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const customerRef = doc(db, 'customers', customerId);
      const updateData = {
        ...updates,
        updatedAt: new Date(),
      };
      
      await updateDoc(customerRef, updateData);
      
      setCustomers(prev => prev.map(customer => 
        customer.id === customerId 
          ? { ...customer, ...updateData }
          : customer
      ));
    } catch (err: any) {
      console.error('Error updating customer:', err);
      throw new Error(err.message);
    }
  };

  const deleteCustomer = async (customerId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      await deleteDoc(doc(db, 'customers', customerId));
      setCustomers(prev => prev.filter(customer => customer.id !== customerId));
    } catch (err: any) {
      console.error('Error deleting customer:', err);
      throw new Error(err.message);
    }
  };

  const getCustomerById = (customerId: string) => {
    return customers.find(customer => customer.id === customerId);
  };

  const searchCustomers = (searchTerm: string) => {
    const term = searchTerm.toLowerCase();
    return customers.filter(customer => 
      customer.name.toLowerCase().includes(term) ||
      customer.phone.includes(term) ||
      customer.email?.toLowerCase().includes(term)
    );
  };

  const getTopCustomers = (limit: number = 10) => {
    return [...customers]
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, limit);
  };

  return {
    customers,
    loading,
    error,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomerById,
    searchCustomers,
    getTopCustomers,
    refreshCustomers: loadCustomers,
  };
};