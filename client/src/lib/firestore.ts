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

// Inventory operations
export const getInventoryItems = async () => {
  const q = query(collection(db, 'inventoryItems'), orderBy('name'));
  const snapshot = await getDocs(q);
  return convertDocsWithTimestamps(snapshot);
};

export const createInventoryItem = async (item: any) => {
  const docRef = await addDoc(collection(db, 'inventoryItems'), {
    ...item,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const doc = await getDoc(docRef);
  return { id: doc.id, ...convertTimestamps(doc.data()) };
};

export const updateInventoryItem = async (id: string, item: any) => {
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
    where('currentStock', '<=', 5),
    orderBy('currentStock')
  );
  const snapshot = await getDocs(q);
  return convertDocsWithTimestamps(snapshot);
};

// Customer operations
export const getCustomers = async () => {
  const q = query(collection(db, 'customers'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return convertDocsWithTimestamps(snapshot);
};

export const createCustomer = async (customer: any) => {
  const docRef = await addDoc(collection(db, 'customers'), {
    ...customer,
    totalPurchases: "0",
    totalCredit: "0",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const doc = await getDoc(docRef);
  return { id: doc.id, ...convertTimestamps(doc.data()) };
};

export const updateCustomer = async (id: string, customer: any) => {
  const docRef = doc(db, 'customers', id);
  await updateDoc(docRef, {
    ...customer,
    updatedAt: new Date(),
  });
  const updatedDoc = await getDoc(docRef);
  return { id: updatedDoc.id, ...convertTimestamps(updatedDoc.data()) };
};

export const importCustomers = async (customers: any[]) => {
  const batch = writeBatch(db);
  const customerRefs: any[] = [];

  customers.forEach(customer => {
    const customerRef = doc(collection(db, 'customers'));
    batch.set(customerRef, {
      ...customer,
      totalPurchases: "0",
      totalCredit: "0",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    customerRefs.push(customerRef);
  });

  await batch.commit();
  return customerRefs.length;
};

// Sales operations
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

export const createSale = async (saleData: any, saleItems: any[]) => {
  return await runTransaction(db, async (transaction) => {
    // Generate receipt number
    const receiptNumber = `RCP-${Date.now()}`;
    
    // Create sale
    const saleRef = doc(collection(db, 'sales'));
    transaction.set(saleRef, {
      ...saleData,
      receiptNumber,
      createdAt: new Date(),
    });

    // Create sale items
    saleItems.forEach(item => {
      const itemRef = doc(collection(db, 'saleItems'));
      transaction.set(itemRef, {
        ...item,
        saleId: saleRef.id,
      });
    });

    // Update inventory for inventory sales
    if (saleData.saleType === 'inventory') {
      for (const item of saleItems) {
        if (item.itemId) {
          const inventoryRef = doc(db, 'inventoryItems', item.itemId);
          const inventoryDoc = await transaction.get(inventoryRef);
          if (inventoryDoc.exists()) {
            const currentStock = inventoryDoc.data()?.currentStock || 0;
            transaction.update(inventoryRef, {
              currentStock: currentStock - item.quantity,
            });
          }
        }
      }
    }

    // Create credit transaction if needed
    if ((saleData.paymentStatus === 'pending' || saleData.paymentStatus === 'partial') && saleData.customerId) {
      const creditAmount = Number(saleData.totalAmount) - Number(saleData.paidAmount || 0);
      if (creditAmount > 0) {
        const creditRef = doc(collection(db, 'creditTransactions'));
        transaction.set(creditRef, {
          customerId: saleData.customerId,
          saleId: saleRef.id,
          type: 'credit',
          amount: creditAmount.toString(),
          balanceAfter: creditAmount.toString(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          createdBy: saleData.createdBy,
          createdAt: new Date(),
        });
      }
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
      return sum + Number(doc.data().totalAmount || 0);
    }, 0);

    // Get credit transactions
    const creditsQuery = query(
      collection(db, 'creditTransactions'),
      where('customerId', '==', customerId)
    );
    const creditsSnapshot = await getDocs(creditsQuery);
    
    let totalCredit = 0;
    creditsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.type === 'credit') {
        totalCredit += Number(data.amount || 0);
      } else if (data.type === 'payment') {
        totalCredit -= Number(data.amount || 0);
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

// Credit operations
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

export const createCreditTransaction = async (transaction: any) => {
  const docRef = await addDoc(collection(db, 'creditTransactions'), {
    ...transaction,
    createdAt: new Date(),
  });
  
  // Update customer totals
  await updateCustomerTotals(transaction.customerId);
  
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

// Expense operations
export const getExpenses = async () => {
  const q = query(collection(db, 'expenses'), orderBy('expenseDate', 'desc'));
  const snapshot = await getDocs(q);
  return convertDocsWithTimestamps(snapshot);
};

export const createExpense = async (expense: any) => {
  const docRef = await addDoc(collection(db, 'expenses'), {
    ...expense,
    createdAt: new Date(),
  });
  const doc = await getDoc(docRef);
  return { id: doc.id, ...convertTimestamps(doc.data()) };
};

// Dashboard metrics
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
    return sum + Number(doc.data().totalAmount || 0);
  }, 0);

  // Inventory value
  const inventorySnapshot = await getDocs(collection(db, 'inventoryItems'));
  const inventoryValue = inventorySnapshot.docs.reduce((sum, doc) => {
    const data = doc.data();
    return sum + (Number(data.sellingPrice || 0) * Number(data.currentStock || 0));
  }, 0);

  // Pending credits
  const customersSnapshot = await getDocs(collection(db, 'customers'));
  const pendingCredits = customersSnapshot.docs.reduce((sum, doc) => {
    return sum + Number(doc.data().totalCredit || 0);
  }, 0);

  // Low stock count
  const lowStockQuery = query(
    collection(db, 'inventoryItems'),
    where('currentStock', '<=', 5)
  );
  const lowStockSnapshot = await getDocs(lowStockQuery);

  return {
    todaySales: todaySales.toString(),
    inventoryValue: inventoryValue.toString(),
    pendingCredits: pendingCredits.toString(),
    lowStockCount: lowStockSnapshot.size,
    salesByType: {
      inventory: { amount: "0", count: 0 },
      commission: { amount: "0", count: 0 },
      custom_order: { amount: "0", count: 0 },
    },
  };
};

// Report operations
export const getSalesReport = async (startDate: Date, endDate: Date) => {
  const q = query(
    collection(db, 'sales'),
    where('createdAt', '>=', startDate),
    where('createdAt', '<=', endDate),
    orderBy('createdAt')
  );
  const snapshot = await getDocs(q);

  // Group by date
  const salesByDate: { [key: string]: { totalSales: number; count: number } } = {};
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const date = data.createdAt.toDate().toISOString().split('T')[0];
    
    if (!salesByDate[date]) {
      salesByDate[date] = { totalSales: 0, count: 0 };
    }
    
    salesByDate[date].totalSales += Number(data.totalAmount || 0);
    salesByDate[date].count += 1;
  });

  return Object.entries(salesByDate).map(([date, data]) => ({
    date,
    totalSales: data.totalSales.toString(),
    totalTransactions: data.count,
    avgSaleAmount: (data.totalSales / data.count).toString(),
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
    return sum + Number(doc.data().totalAmount || 0);
  }, 0);

  // Get expenses
  const expensesQuery = query(
    collection(db, 'expenses'),
    where('expenseDate', '>=', startDate),
    where('expenseDate', '<=', endDate)
  );
  const expensesSnapshot = await getDocs(expensesQuery);
  
  const expenses = expensesSnapshot.docs.reduce((sum, doc) => {
    return sum + Number(doc.data().amount || 0);
  }, 0);

  const profit = revenue - expenses;

  return {
    revenue: revenue.toString(),
    expenses: expenses.toString(),
    profit: profit.toString(),
    profitMargin: revenue > 0 ? ((profit / revenue) * 100).toFixed(2) : "0",
  };
};