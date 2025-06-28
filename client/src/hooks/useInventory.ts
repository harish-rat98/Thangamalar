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

export interface InventoryItem {
  id?: string;
  userId: string;
  name: string;
  category: string;
  weight: number;
  purity: string;
  description?: string;
  purchasePrice: number;
  sellingPrice: number;
  quantity: number;
  location?: string;
  supplier?: string;
  dateAdded: Date;
  lastUpdated: Date;
  status: 'available' | 'sold' | 'reserved';
  images?: string[];
  barcode?: string;
  tags?: string[];
}

export const useInventory = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadInventory();
    }
  }, [user]);

  const loadInventory = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const q = query(
        collection(db, 'inventoryItems'),
        where('userId', '==', user.uid),
        orderBy('dateAdded', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const inventoryData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dateAdded: doc.data().dateAdded?.toDate(),
        lastUpdated: doc.data().lastUpdated?.toDate(),
      })) as InventoryItem[];
      
      setItems(inventoryData);
      setError(null);
    } catch (err: any) {
      console.error('Error loading inventory:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addItem = async (itemData: Omit<InventoryItem, 'id' | 'userId' | 'dateAdded' | 'lastUpdated'>) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const newItem = {
        ...itemData,
        userId: user.uid,
        dateAdded: new Date(),
        lastUpdated: new Date(),
      };

      const docRef = await addDoc(collection(db, 'inventoryItems'), newItem);
      
      const createdItem = {
        id: docRef.id,
        ...newItem,
      };
      
      setItems(prev => [createdItem, ...prev]);
      return createdItem;
    } catch (err: any) {
      console.error('Error adding inventory item:', err);
      throw new Error(err.message);
    }
  };

  const updateItem = async (itemId: string, updates: Partial<InventoryItem>) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const itemRef = doc(db, 'inventoryItems', itemId);
      const updateData = {
        ...updates,
        lastUpdated: new Date(),
      };
      
      await updateDoc(itemRef, updateData);
      
      setItems(prev => prev.map(item => 
        item.id === itemId 
          ? { ...item, ...updateData }
          : item
      ));
    } catch (err: any) {
      console.error('Error updating inventory item:', err);
      throw new Error(err.message);
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      await deleteDoc(doc(db, 'inventoryItems', itemId));
      setItems(prev => prev.filter(item => item.id !== itemId));
    } catch (err: any) {
      console.error('Error deleting inventory item:', err);
      throw new Error(err.message);
    }
  };

  const getItemById = (itemId: string) => {
    return items.find(item => item.id === itemId);
  };

  const getItemsByCategory = (category: string) => {
    return items.filter(item => item.category === category);
  };

  const searchItems = (searchTerm: string) => {
    const term = searchTerm.toLowerCase();
    return items.filter(item => 
      item.name.toLowerCase().includes(term) ||
      item.category.toLowerCase().includes(term) ||
      item.description?.toLowerCase().includes(term) ||
      item.tags?.some(tag => tag.toLowerCase().includes(term))
    );
  };

  return {
    items,
    loading,
    error,
    addItem,
    updateItem,
    deleteItem,
    getItemById,
    getItemsByCategory,
    searchItems,
    refreshInventory: loadInventory,
  };
};