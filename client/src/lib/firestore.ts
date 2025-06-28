import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  writeBatch,
  runTransaction,
  Timestamp,
  DocumentData,
  QuerySnapshot,
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from './firebase';

// Helper function to convert Firestore timestamps to dates
export const convertTimestamps = (data: any): any => {
  if (!data) return data;
  
  const converted = { ...data };
  Object.keys(converted).forEach(key => {
    if (converted[key] instanceof Timestamp) {
      converted[key] = converted[key].toDate().toISOString();
    }
  });
  return converted;
};

// Helper function to convert documents with timestamps
export const convertDocsWithTimestamps = (snapshot: QuerySnapshot<DocumentData>) => {
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...convertTimestamps(doc.data())
  }));
};

// Updated Inventory Item interface - Weight-based system
interface InventoryItemData {
  name: string;
  category: string;
  material: string;
  quantity: number;
  weightPerPiece: string; // grams per piece
  totalWeight: string; // auto-calculated: quantity * weightPerPiece
  minStockLevel: number;
  sku: string;
  barcode?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Updated Sale interface with flexible pricing
interface SaleData {
  customerId?: string;
  saleType: 'inventory' | 'commission' | 'custom_order';
  totalAmount: string;
  makingChargesPercentage: string;
  wastagePercentage: string;
  additionalCharges: string;
  taxPercentage: string;
  taxAmount: string;
  discountAmount: string;
  paymentMethod: string;
  paymentStatus: 'paid' | 'partial' | 'pending';
  cashReceived: string;
  cardUpiReceived: string;
  creditAmount: string;
  commissionPercentage?: string;
  commissionAmount?: string;
  notes?: string;
  receiptNumber?: string;
  createdAt: Date;
}

// Updated Sale Item interface
interface SaleItemData {
  itemId?: string; // null for custom items
  itemName: string;
  quantity: number;
  metalType: string;
  weightGrams: string;
  unitPrice: string; // calculated price per gram
  totalPrice: string;
  isCustomItem: boolean;
}

// Daily Prices interface
interface DailyPricesData {
  date: Date;
  goldPricePerGram: string;
  silverPricePerGram: string;
  platinumPricePerGram?: string;
  updatedBy?: string;
  createdAt: Date;
}

// Settings interface
interface SettingsData {
  businessInfo: {
    shopName: string;
    address: string;
    contactNumber: string;
    email: string;
    gstNumber: string;
    registrationNumber: string;
  };
  defaultValues: {
    makingChargesPercentage: string;
    wastagePercentage: string;
    taxPercentage: string;
  };
  priceSettings: {
    currentGoldPrice: string;
    currentSilverPrice: string;
    currentPlatinumPrice: string;
  };
  userPreferences: {
    dateFormat: string;
    currencyDisplay: string;
    notifications: boolean;
  };
  updatedAt: Date;
}

// Enhanced Expense interface
interface ExpenseData {
  category: string;
  description: string;
  amount: string;
  paymentMethod: string;
  receiptNumber?: string;
  vendorName?: string;
  expenseDate: Date;
  createdAt: Date;
}

// Enhanced Customer interface
interface CustomerData {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  totalPurchases: string;
  totalCredit: string;
  creditLimit: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Enhanced Credit Transaction interface
interface CreditTransactionData {
  customerId: string;
  saleId?: string;
  type: 'credit' | 'payment';
  amount: string;
  balanceAfter: string;
  dueDate?: Date;
  notes?: string;
  createdBy?: string;
  createdAt: Date;
}

// DAILY PRICE MANAGEMENT
export const getDailyPrices = async (date?: Date): Promise<DailyPricesData | null> => {
  const targetDate = date || new Date();
  const dateString = targetDate.toISOString().split('T')[0];
  
  const q = query(
    collection(db, 'dailyPrices'),
    where('date', '>=', new Date(dateString)),
    where('date', '<', new Date(new Date(dateString).getTime() + 24 * 60 * 60 * 1000)),
    limit(1)
  );
  
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    // Return default prices if no entry found
    return {
      date: targetDate,
      goldPricePerGram: "9200",
      silverPricePerGram: "110",
      platinumPricePerGram: "3500",
      createdAt: targetDate,
    };
  }
  
  const doc = snapshot.docs[0];
  return { id: doc.id, ...convertTimestamps(doc.data()) } as DailyPricesData;
};

export const setDailyPrices = async (prices: Partial<DailyPricesData>): Promise<string> => {
  const today = new Date();
  const dateString = today.toISOString().split('T')[0];
  
  // Check if prices already exist for today
  const existingPrices = await getDailyPrices(today);
  
  const priceData = {
    date: today,
    goldPricePerGram: prices.goldPricePerGram || "9200",
    silverPricePerGram: prices.silverPricePerGram || "110",
    platinumPricePerGram: prices.platinumPricePerGram || "3500",
    updatedBy: prices.updatedBy || "system",
    createdAt: new Date(),
  };
  
  if (existingPrices && existingPrices.id) {
    // Update existing entry
    const docRef = doc(db, 'dailyPrices', existingPrices.id);
    await updateDoc(docRef, { ...priceData, updatedAt: new Date() });
    return existingPrices.id;
  } else {
    // Create new entry
    const docRef = await addDoc(collection(db, 'dailyPrices'), priceData);
    return docRef.id;
  }
};

export const getPriceHistory = async (days: number = 30): Promise<DailyPricesData[]> => {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));
  
  const q = query(
    collection(db, 'dailyPrices'),
    where('date', '>=', startDate),
    where('date', '<=', endDate),
    orderBy('date', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return convertDocsWithTimestamps(snapshot);
};

// INVENTORY OPERATIONS - Updated for weight-based system
export const getInventoryItems = async () => {
  const q = query(collection(db, 'inventoryItems'), orderBy('name'));
  const snapshot = await getDocs(q);
  return convertDocsWithTimestamps(snapshot);
};

export const createInventoryItem = async (item: Partial<InventoryItemData>) => {
  // Calculate total weight
  const quantity = item.quantity || 0;
  const weightPerPiece = parseFloat(item.weightPerPiece || "0");
  const totalWeight = (quantity * weightPerPiece).toString();
  
  const docRef = await addDoc(collection(db, 'inventoryItems'), {
    ...item,
    totalWeight,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  
  const doc = await getDoc(docRef);
  return { id: doc.id, ...convertTimestamps(doc.data()) };
};

export const updateInventoryItem = async (id: string, item: Partial<InventoryItemData>) => {
  // Recalculate total weight if quantity or weightPerPiece changed
  if (item.quantity !== undefined || item.weightPerPiece !== undefined) {
    const currentDoc = await getDoc(doc(db, 'inventoryItems', id));
    const currentData = currentDoc.data();
    
    const quantity = item.quantity !== undefined ? item.quantity : currentData?.quantity || 0;
    const weightPerPiece = item.weightPerPiece !== undefined ? 
      parseFloat(item.weightPerPiece) : parseFloat(currentData?.weightPerPiece || "0");
    
    item.totalWeight = (quantity * weightPerPiece).toString();
  }
  
  const docRef = doc(db, 'inventoryItems', id);
  await updateDoc(docRef, {
    ...item,
    updatedAt: new Date(),
  });
  
  const updatedDoc = await getDoc(docRef);
  return { id: updatedDoc.id, ...convertTimestamps(updatedDoc.data()) };
};

export const deleteInventoryItem = async (id: string) => {
  await deleteDoc(doc(db, 'inventoryItems', id));
};

export const getLowStockItems = async () => {
  const q = query(
    collection(db, 'inventoryItems'),
    where('quantity', '<=', 5),
    orderBy('quantity')
  );
  const snapshot = await getDocs(q);
  return convertDocsWithTimestamps(snapshot);
};

// CUSTOMER OPERATIONS - Enhanced
export const getCustomers = async () => {
  const q = query(collection(db, 'customers'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return convertDocsWithTimestamps(snapshot);
};

export const createCustomer = async (customer: Partial<CustomerData>) => {
  const docRef = await addDoc(collection(db, 'customers'), {
    ...customer,
    totalPurchases: customer.totalPurchases || "0",
    totalCredit: customer.totalCredit || "0",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  
  const doc = await getDoc(docRef);
  return { id: doc.id, ...convertTimestamps(doc.data()) };
};

export const updateCustomer = async (id: string, customer: Partial<CustomerData>) => {
  const docRef = doc(db, 'customers', id);
  await updateDoc(docRef, {
    ...customer,
    updatedAt: new Date(),
  });
  
  const updatedDoc = await getDoc(docRef);
  return { id: updatedDoc.id, ...convertTimestamps(updatedDoc.data()) };
};

export const deleteCustomer = async (id: string) => {
  return await runTransaction(db, async (transaction) => {
    // Delete customer
    const customerRef = doc(db, 'customers', id);
    transaction.delete(customerRef);
    
    // Delete all credit transactions for this customer
    const creditTransactionsQuery = query(
      collection(db, 'creditTransactions'),
      where('customerId', '==', id)
    );
    const creditTransactionsSnapshot = await getDocs(creditTransactionsQuery);
    
    creditTransactionsSnapshot.docs.forEach(creditDoc => {
      transaction.delete(creditDoc.ref);
    });
    
    // Note: We don't delete sales records as they are important for business records
    // Instead, we could mark them as having a deleted customer
    const salesQuery = query(
      collection(db, 'sales'),
      where('customerId', '==', id)
    );
    const salesSnapshot = await getDocs(salesQuery);
    
    salesSnapshot.docs.forEach(saleDoc => {
      transaction.update(saleDoc.ref, {
        customerId: null,
        customerDeleted: true,
        deletedAt: new Date()
      });
    });
  });
};

export const importCustomers = async (customers: Partial<CustomerData>[]): Promise<number> => {
  const batch = writeBatch(db);
  const customerRefs: any[] = [];

  for (const customer of customers) {
    const customerRef = doc(collection(db, 'customers'));
    batch.set(customerRef, {
      ...customer,
      totalPurchases: customer.totalPurchases || "0",
      totalCredit: customer.totalCredit || "0",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    customerRefs.push(customerRef);
    
    // If customer has initial credit, create a credit transaction
    if (customer.totalCredit && parseFloat(customer.totalCredit) > 0) {
      const creditRef = doc(collection(db, 'creditTransactions'));
      batch.set(creditRef, {
        customerId: customerRef.id,
        type: 'credit',
        amount: customer.totalCredit,
        balanceAfter: customer.totalCredit,
        notes: 'Initial credit from import',
        createdAt: new Date(),
      });
    }
  }

  await batch.commit();
  return customerRefs.length;
};

// SALES OPERATIONS - Enhanced with flexible pricing and FIXED TRANSACTION BUG
export const getSales = async (limitCount = 50) => {
  const q = query(
    collection(db, 'sales'),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  
  const sales = await Promise.all(
    snapshot.docs.map(async (saleDoc) => {
      const saleData = { id: saleDoc.id, ...convertTimestamps(saleDoc.data()) };
      
      // Get customer if exists
      let customer = null;
      if (saleData.customerId) {
        const customerDoc = await getDoc(doc(db, 'customers', saleData.customerId));
        if (customerDoc.exists()) {
          customer = { id: customerDoc.id, ...convertTimestamps(customerDoc.data()) };
        }
      }

      // Get sale items
      const itemsQuery = query(
        collection(db, 'saleItems'),
        where('saleId', '==', saleDoc.id)
      );
      const itemsSnapshot = await getDocs(itemsQuery);
      const saleItems = convertDocsWithTimestamps(itemsSnapshot);

      return {
        ...saleData,
        customer,
        saleItems,
      };
    })
  );

  return sales;
};

// FIXED: createSale function with proper transaction structure
export const createSale = async (saleData: Partial<SaleData>, saleItems: Partial<SaleItemData>[]) => {
  return await runTransaction(db, async (transaction) => {
    // ===== PHASE 1: ALL READS FIRST =====
    
    // 1. Get current daily prices for calculations
    const dailyPricesQuery = query(
      collection(db, 'dailyPrices'),
      orderBy('date', 'desc'),
      limit(1)
    );
    const dailyPricesSnapshot = await getDocs(dailyPricesQuery);
    
    let dailyPrices = {
      goldPricePerGram: "9200",
      silverPricePerGram: "110",
      platinumPricePerGram: "3500"
    };
    
    if (!dailyPricesSnapshot.empty) {
      const priceData = dailyPricesSnapshot.docs[0].data();
      dailyPrices = {
        goldPricePerGram: priceData.goldPricePerGram || "9200",
        silverPricePerGram: priceData.silverPricePerGram || "110",
        platinumPricePerGram: priceData.platinumPricePerGram || "3500"
      };
    }

    // 2. Read all inventory items that will be updated (for inventory sales)
    const inventoryUpdates: Array<{
      ref: any;
      currentData: any;
      newQuantity: number;
      newTotalWeight: string;
    }> = [];

    if (saleData.saleType === 'inventory') {
      for (const item of saleItems) {
        if (item.itemId && !item.isCustomItem) {
          const inventoryRef = doc(db, 'inventoryItems', item.itemId);
          const inventoryDoc = await transaction.get(inventoryRef);
          
          if (inventoryDoc.exists()) {
            const currentData = inventoryDoc.data();
            const currentQuantity = currentData?.quantity || 0;
            const newQuantity = currentQuantity - (item.quantity || 0);
            
            // Recalculate total weight
            const weightPerPiece = parseFloat(currentData?.weightPerPiece || "0");
            const newTotalWeight = (newQuantity * weightPerPiece).toString();
            
            inventoryUpdates.push({
              ref: inventoryRef,
              currentData,
              newQuantity,
              newTotalWeight
            });
          }
        }
      }
    }

    // 3. Read customer data if needed for credit updates
    let customerData = null;
    if (saleData.customerId) {
      const customerRef = doc(db, 'customers', saleData.customerId);
      const customerDoc = await transaction.get(customerRef);
      if (customerDoc.exists()) {
        customerData = {
          ref: customerRef,
          data: customerDoc.data()
        };
      }
    }

    // ===== PHASE 2: CALCULATIONS (NO DATABASE OPERATIONS) =====
    
    // Generate receipt number
    const receiptNumber = `RCP-${Date.now()}`;
    
    // Calculate total amount based on items and pricing
    let calculatedTotal = 0;
    const processedItems: any[] = [];
    
    for (const item of saleItems) {
      let itemTotal = 0;
      
      if (item.isCustomItem) {
        // Custom item calculation
        const weight = parseFloat(item.weightGrams || "0");
        const pricePerGram = item.metalType === 'gold' ? 
          parseFloat(dailyPrices.goldPricePerGram) :
          parseFloat(dailyPrices.silverPricePerGram);
        
        itemTotal = weight * pricePerGram;
      } else {
        // Inventory item calculation
        const weight = parseFloat(item.weightGrams || "0");
        const pricePerGram = item.metalType === 'gold' ? 
          parseFloat(dailyPrices.goldPricePerGram) :
          parseFloat(dailyPrices.silverPricePerGram);
        
        itemTotal = weight * pricePerGram * (item.quantity || 1);
      }
      
      // Apply making charges and wastage
      const makingCharges = itemTotal * (parseFloat(saleData.makingChargesPercentage || "0") / 100);
      const wastage = itemTotal * (parseFloat(saleData.wastagePercentage || "0") / 100);
      
      itemTotal += makingCharges + wastage;
      calculatedTotal += itemTotal;
      
      processedItems.push({
        ...item,
        unitPrice: (itemTotal / (item.quantity || 1)).toString(),
        totalPrice: itemTotal.toString(),
        saleId: '', // Will be set after sale creation
      });
    }
    
    // Add additional charges
    calculatedTotal += parseFloat(saleData.additionalCharges || "0");
    
    // Calculate tax
    const taxAmount = calculatedTotal * (parseFloat(saleData.taxPercentage || "0") / 100);
    calculatedTotal += taxAmount;
    
    // Determine payment status
    const cashReceived = parseFloat(saleData.cashReceived || "0");
    const cardUpiReceived = parseFloat(saleData.cardUpiReceived || "0");
    const totalReceived = cashReceived + cardUpiReceived;
    const creditAmount = Math.max(0, calculatedTotal - totalReceived);
    
    let paymentStatus: 'paid' | 'partial' | 'pending' = 'paid';
    if (creditAmount > 0) {
      paymentStatus = totalReceived > 0 ? 'partial' : 'pending';
    }

    // ===== PHASE 3: ALL WRITES =====
    
    // 1. Create sale
    const saleRef = doc(collection(db, 'sales'));
    transaction.set(saleRef, {
      ...saleData,
      receiptNumber,
      totalAmount: calculatedTotal.toString(),
      taxAmount: taxAmount.toString(),
      creditAmount: creditAmount.toString(),
      paymentStatus,
      createdAt: new Date(),
    });

    // 2. Create sale items
    processedItems.forEach(item => {
      const itemRef = doc(collection(db, 'saleItems'));
      transaction.set(itemRef, {
        ...item,
        saleId: saleRef.id,
      });
    });

    // 3. Update inventory for inventory sales
    inventoryUpdates.forEach(update => {
      transaction.update(update.ref, {
        quantity: update.newQuantity,
        totalWeight: update.newTotalWeight,
        updatedAt: new Date(),
      });
    });

    // 4. Create credit transaction if needed
    if (creditAmount > 0 && saleData.customerId) {
      const creditRef = doc(collection(db, 'creditTransactions'));
      transaction.set(creditRef, {
        customerId: saleData.customerId,
        saleId: saleRef.id,
        type: 'credit',
        amount: creditAmount.toString(),
        balanceAfter: creditAmount.toString(), // Will be recalculated in updateCustomerTotals
        notes: `Credit from sale ${receiptNumber}`,
        createdAt: new Date(),
      });
    }

    // 5. Update customer totals if customer exists
    if (customerData) {
      const currentTotalPurchases = parseFloat(customerData.data.totalPurchases || "0");
      const currentTotalCredit = parseFloat(customerData.data.totalCredit || "0");
      
      transaction.update(customerData.ref, {
        totalPurchases: (currentTotalPurchases + calculatedTotal).toString(),
        totalCredit: (currentTotalCredit + creditAmount).toString(),
        updatedAt: new Date(),
      });
    }

    return saleRef.id;
  });
};

// Update customer totals after sales/credit changes
export const updateCustomerTotals = async (customerId: string) => {
  return await runTransaction(db, async (transaction) => {
    // Get all sales for customer
    const salesQuery = query(
      collection(db, 'sales'),
      where('customerId', '==', customerId)
    );
    const salesSnapshot = await getDocs(salesQuery);
    
    const totalPurchases = salesSnapshot.docs.reduce((sum, doc) => {
      return sum + parseFloat(doc.data().totalAmount || "0");
    }, 0);

    // Get credit transactions
    const creditsQuery = query(
      collection(db, 'creditTransactions'),
      where('customerId', '==', customerId),
      orderBy('createdAt')
    );
    const creditsSnapshot = await getDocs(creditsQuery);
    
    let totalCredit = 0;
    creditsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.type === 'credit') {
        totalCredit += parseFloat(data.amount || "0");
      } else if (data.type === 'payment') {
        totalCredit -= parseFloat(data.amount || "0");
      }
    });

    // Update customer
    const customerRef = doc(db, 'customers', customerId);
    transaction.update(customerRef, {
      totalPurchases: totalPurchases.toString(),
      totalCredit: Math.max(0, totalCredit).toString(),
      updatedAt: new Date(),
    });
  });
};

// CREDIT OPERATIONS - Enhanced
export const getCreditTransactions = async (customerId?: string) => {
  let q = query(collection(db, 'creditTransactions'), orderBy('createdAt', 'desc'));
  
  if (customerId) {
    q = query(
      collection(db, 'creditTransactions'),
      where('customerId', '==', customerId),
      orderBy('createdAt', 'desc')
    );
  }

  const snapshot = await getDocs(q);
  
  const transactions = await Promise.all(
    snapshot.docs.map(async (transactionDoc) => {
      const data = { id: transactionDoc.id, ...convertTimestamps(transactionDoc.data()) };
      const customerDoc = await getDoc(doc(db, 'customers', data.customerId));
      const customer = customerDoc.exists() ? 
        { id: customerDoc.id, ...convertTimestamps(customerDoc.data()) } : null;
      
      return {
        ...data,
        customer,
      };
    })
  );

  return transactions;
};

export const createCreditTransaction = async (transaction: Partial<CreditTransactionData>) => {
  const docRef = await addDoc(collection(db, 'creditTransactions'), {
    ...transaction,
    createdAt: new Date(),
  });
  
  // Update customer totals
  if (transaction.customerId) {
    await updateCustomerTotals(transaction.customerId);
  }
  
  const doc = await getDoc(docRef);
  return { id: doc.id, ...convertTimestamps(doc.data()) };
};

export const getOverdueCredits = async () => {
  const today = new Date();
  const q = query(
    collection(db, 'creditTransactions'),
    where('type', '==', 'credit'),
    where('dueDate', '<=', today),
    orderBy('dueDate')
  );
  const snapshot = await getDocs(q);

  const credits = await Promise.all(
    snapshot.docs.map(async (creditDoc) => {
      const data = { id: creditDoc.id, ...convertTimestamps(creditDoc.data()) };
      const customerDoc = await getDoc(doc(db, 'customers', data.customerId));
      const customer = customerDoc.exists() ? 
        { id: customerDoc.id, ...convertTimestamps(customerDoc.data()) } : null;
      
      return {
        ...data,
        customer,
      };
    })
  );

  return credits;
};

// EXPENSE OPERATIONS - Enhanced and Fixed
export const getExpenses = async () => {
  const q = query(collection(db, 'expenses'), orderBy('expenseDate', 'desc'));
  const snapshot = await getDocs(q);
  return convertDocsWithTimestamps(snapshot);
};

export const createExpense = async (expense: Partial<ExpenseData>) => {
  const docRef = await addDoc(collection(db, 'expenses'), {
    ...expense,
    expenseDate: expense.expenseDate || new Date(),
    createdAt: new Date(),
  });
  
  const doc = await getDoc(docRef);
  return { id: doc.id, ...convertTimestamps(doc.data()) };
};

export const updateExpense = async (id: string, expense: Partial<ExpenseData>) => {
  const docRef = doc(db, 'expenses', id);
  await updateDoc(docRef, {
    ...expense,
    updatedAt: new Date(),
  });
  
  const updatedDoc = await getDoc(docRef);
  return { id: updatedDoc.id, ...convertTimestamps(updatedDoc.data()) };
};

export const deleteExpense = async (id: string) => {
  await deleteDoc(doc(db, 'expenses', id));
};

// SETTINGS OPERATIONS - New
export const getSettings = async (): Promise<SettingsData | null> => {
  const q = query(collection(db, 'settings'), limit(1));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    // Return default settings
    return {
      businessInfo: {
        shopName: "Thanga Malar Jewellery",
        address: "",
        contactNumber: "",
        email: "",
        gstNumber: "",
        registrationNumber: "",
      },
      defaultValues: {
        makingChargesPercentage: "15",
        wastagePercentage: "2",
        taxPercentage: "3",
      },
      priceSettings: {
        currentGoldPrice: "9200",
        currentSilverPrice: "110",
        currentPlatinumPrice: "3500",
      },
      userPreferences: {
        dateFormat: "DD/MM/YYYY",
        currencyDisplay: "INR",
        notifications: true,
      },
      updatedAt: new Date(),
    };
  }
  
  const doc = snapshot.docs[0];
  return { id: doc.id, ...convertTimestamps(doc.data()) } as SettingsData;
};

export const updateSettings = async (settings: Partial<SettingsData>): Promise<string> => {
  const existingSettings = await getSettings();
  
  const settingsData = {
    ...settings,
    updatedAt: new Date(),
  };
  
  if (existingSettings && existingSettings.id) {
    // Update existing settings
    const docRef = doc(db, 'settings', existingSettings.id);
    await updateDoc(docRef, settingsData);
    return existingSettings.id;
  } else {
    // Create new settings
    const docRef = await addDoc(collection(db, 'settings'), settingsData);
    return docRef.id;
  }
};

// DASHBOARD METRICS - Enhanced
export const getDashboardMetrics = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Today's sales
  const todaySalesQuery = query(
    collection(db, 'sales'),
    where('createdAt', '>=', today),
    where('createdAt', '<', tomorrow)
  );
  const todaySalesSnapshot = await getDocs(todaySalesQuery);
  
  const todaySales = todaySalesSnapshot.docs.reduce((sum, doc) => {
    return sum + parseFloat(doc.data().totalAmount || "0");
  }, 0);

  // Inventory value (based on current prices and total weight)
  const dailyPrices = await getDailyPrices();
  const inventorySnapshot = await getDocs(collection(db, 'inventoryItems'));
  
  const inventoryValue = inventorySnapshot.docs.reduce((sum, doc) => {
    const data = doc.data();
    const totalWeight = parseFloat(data.totalWeight || "0");
    const pricePerGram = data.material === 'gold' ? 
      parseFloat(dailyPrices?.goldPricePerGram || "9200") :
      parseFloat(dailyPrices?.silverPricePerGram || "110");
    
    return sum + (totalWeight * pricePerGram);
  }, 0);

  // Pending credits
  const customersSnapshot = await getDocs(collection(db, 'customers'));
  const pendingCredits = customersSnapshot.docs.reduce((sum, doc) => {
    return sum + parseFloat(doc.data().totalCredit || "0");
  }, 0);

  // Low stock count (by quantity)
  const lowStockQuery = query(
    collection(db, 'inventoryItems'),
    where('quantity', '<=', 5)
  );
  const lowStockSnapshot = await getDocs(lowStockQuery);

  // Sales by type
  const salesByType = {
    inventory: { amount: "0", count: 0 },
    commission: { amount: "0", count: 0 },
    custom_order: { amount: "0", count: 0 },
  };

  todaySalesSnapshot.docs.forEach(doc => {
    const data = doc.data();
    const saleType = data.saleType as keyof typeof salesByType;
    if (salesByType[saleType]) {
      salesByType[saleType].amount = (
        parseFloat(salesByType[saleType].amount) + parseFloat(data.totalAmount || "0")
      ).toString();
      salesByType[saleType].count += 1;
    }
  });

  return {
    todaySales: todaySales.toString(),
    inventoryValue: inventoryValue.toString(),
    pendingCredits: pendingCredits.toString(),
    lowStockCount: lowStockSnapshot.size,
    salesByType,
    currentPrices: {
      gold: dailyPrices?.goldPricePerGram || "9200",
      silver: dailyPrices?.silverPricePerGram || "110",
      platinum: dailyPrices?.platinumPricePerGram || "3500",
    },
  };
};

// REPORT OPERATIONS - Enhanced
export const getSalesReport = async (startDate: Date, endDate: Date) => {
  const q = query(
    collection(db, 'sales'),
    where('createdAt', '>=', startDate),
    where('createdAt', '<=', endDate),
    orderBy('createdAt')
  );
  const snapshot = await getDocs(q);

  // Group by date
  const salesByDate: { [key: string]: { totalSales: number; count: number; goldWeight: number; silverWeight: number } } = {};
  
  for (const saleDoc of snapshot.docs) {
    const data = saleDoc.data();
    const date = data.createdAt.toDate().toISOString().split('T')[0];
    
    if (!salesByDate[date]) {
      salesByDate[date] = { totalSales: 0, count: 0, goldWeight: 0, silverWeight: 0 };
    }
    
    salesByDate[date].totalSales += parseFloat(data.totalAmount || "0");
    salesByDate[date].count += 1;
    
    // Get sale items to calculate metal weights
    const itemsQuery = query(
      collection(db, 'saleItems'),
      where('saleId', '==', saleDoc.id)
    );
    const itemsSnapshot = await getDocs(itemsQuery);
    
    itemsSnapshot.docs.forEach(itemDoc => {
      const itemData = itemDoc.data();
      const weight = parseFloat(itemData.weightGrams || "0") * (itemData.quantity || 1);
      
      if (itemData.metalType === 'gold') {
        salesByDate[date].goldWeight += weight;
      } else if (itemData.metalType === 'silver') {
        salesByDate[date].silverWeight += weight;
      }
    });
  }

  return Object.entries(salesByDate).map(([date, data]) => ({
    date,
    totalSales: data.totalSales.toString(),
    totalTransactions: data.count,
    avgSaleAmount: (data.totalSales / data.count).toString(),
    goldWeightSold: data.goldWeight.toString(),
    silverWeightSold: data.silverWeight.toString(),
  }));
};

export const getProfitLossReport = async (startDate: Date, endDate: Date) => {
  // Get sales revenue
  const salesQuery = query(
    collection(db, 'sales'),
    where('createdAt', '>=', startDate),
    where('createdAt', '<=', endDate)
  );
  const salesSnapshot = await getDocs(salesQuery);
  
  const revenue = salesSnapshot.docs.reduce((sum, doc) => {
    return sum + parseFloat(doc.data().totalAmount || "0");
  }, 0);

  // Get expenses
  const expensesQuery = query(
    collection(db, 'expenses'),
    where('expenseDate', '>=', startDate),
    where('expenseDate', '<=', endDate)
  );
  const expensesSnapshot = await getDocs(expensesQuery);
  
  const expenses = expensesSnapshot.docs.reduce((sum, doc) => {
    return sum + parseFloat(doc.data().amount || "0");
  }, 0);

  const profit = revenue - expenses;

  return {
    revenue: revenue.toString(),
    expenses: expenses.toString(),
    profit: profit.toString(),
    profitMargin: revenue > 0 ? ((profit / revenue) * 100).toFixed(2) : "0",
  };
};

// New report functions
export const getInventoryReport = async () => {
  const inventorySnapshot = await getDocs(collection(db, 'inventoryItems'));
  const dailyPrices = await getDailyPrices();
  
  const inventoryData = inventorySnapshot.docs.map(doc => {
    const data = doc.data();
    const totalWeight = parseFloat(data.totalWeight || "0");
    const pricePerGram = data.material === 'gold' ? 
      parseFloat(dailyPrices?.goldPricePerGram || "9200") :
      parseFloat(dailyPrices?.silverPricePerGram || "110");
    
    return {
      id: doc.id,
      ...convertTimestamps(data),
      currentValue: (totalWeight * pricePerGram).toString(),
    };
  });
  
  return inventoryData;
};

export const getCustomerReport = async () => {
  const customersSnapshot = await getDocs(collection(db, 'customers'));
  
  const customerData = await Promise.all(
    customersSnapshot.docs.map(async (customerDoc) => {
      const data = { id: customerDoc.id, ...convertTimestamps(customerDoc.data()) };
      
      // Get recent transactions
      const transactionsQuery = query(
        collection(db, 'sales'),
        where('customerId', '==', customerDoc.id),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const transactionsSnapshot = await getDocs(transactionsQuery);
      const recentTransactions = convertDocsWithTimestamps(transactionsSnapshot);
      
      return {
        ...data,
        recentTransactions,
      };
    })
  );
  
  return customerData;
};