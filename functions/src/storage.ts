import { Firestore } from "firebase-admin/firestore";

export class FirebaseStorage {
  constructor(private db: Firestore) {}

  // User operations
  async getUser(id: string) {
    const doc = await this.db.collection('users').doc(id).get();
    if (!doc.exists) {
      // Create user if doesn't exist
      const userData = {
        id,
        email: '',
        firstName: '',
        lastName: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await this.db.collection('users').doc(id).set(userData);
      return userData;
    }
    return { id: doc.id, ...doc.data() };
  }

  // Inventory operations
  async getInventoryItems() {
    const snapshot = await this.db.collection('inventoryItems').orderBy('name').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async createInventoryItem(item: any) {
    const docRef = await this.db.collection('inventoryItems').add({
      ...item,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() };
  }

  async updateInventoryItem(id: string, item: any) {
    await this.db.collection('inventoryItems').doc(id).update({
      ...item,
      updatedAt: new Date(),
    });
    const doc = await this.db.collection('inventoryItems').doc(id).get();
    return { id: doc.id, ...doc.data() };
  }

  async deleteInventoryItem(id: string) {
    await this.db.collection('inventoryItems').doc(id).delete();
  }

  async getLowStockItems() {
    const snapshot = await this.db.collection('inventoryItems')
      .where('currentStock', '<=', 5)
      .orderBy('currentStock')
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  // Customer operations
  async getCustomers() {
    const snapshot = await this.db.collection('customers').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async createCustomer(customer: any) {
    const docRef = await this.db.collection('customers').add({
      ...customer,
      totalPurchases: "0",
      totalCredit: "0",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() };
  }

  async updateCustomer(id: string, customer: any) {
    await this.db.collection('customers').doc(id).update({
      ...customer,
      updatedAt: new Date(),
    });
    const doc = await this.db.collection('customers').doc(id).get();
    return { id: doc.id, ...doc.data() };
  }

  // Sales operations
  async getSales(limit = 50) {
    const snapshot = await this.db.collection('sales')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const sales = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const saleData = { id: doc.id, ...doc.data() };
        
        // Get customer if exists
        let customer = null;
        if (saleData.customerId) {
          const customerDoc = await this.db.collection('customers').doc(saleData.customerId).get();
          if (customerDoc.exists) {
            customer = { id: customerDoc.id, ...customerDoc.data() };
          }
        }

        // Get sale items
        const itemsSnapshot = await this.db.collection('saleItems')
          .where('saleId', '==', doc.id)
          .get();
        const saleItems = itemsSnapshot.docs.map(itemDoc => ({ id: itemDoc.id, ...itemDoc.data() }));

        return {
          ...saleData,
          customer,
          saleItems,
        };
      })
    );

    return sales;
  }

  async createSale(saleData: any, saleItems: any[]) {
    const batch = this.db.batch();

    // Generate receipt number
    const receiptNumber = `RCP-${Date.now()}`;
    
    // Create sale
    const saleRef = this.db.collection('sales').doc();
    batch.set(saleRef, {
      ...saleData,
      receiptNumber,
      createdAt: new Date(),
    });

    // Create sale items
    saleItems.forEach(item => {
      const itemRef = this.db.collection('saleItems').doc();
      batch.set(itemRef, {
        ...item,
        saleId: saleRef.id,
      });
    });

    // Update inventory for inventory sales
    if (saleData.saleType === 'inventory') {
      for (const item of saleItems) {
        if (item.itemId) {
          const inventoryRef = this.db.collection('inventoryItems').doc(item.itemId);
          const inventoryDoc = await inventoryRef.get();
          if (inventoryDoc.exists) {
            const currentStock = inventoryDoc.data()?.currentStock || 0;
            batch.update(inventoryRef, {
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
        const creditRef = this.db.collection('creditTransactions').doc();
        batch.set(creditRef, {
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

    await batch.commit();

    // Update customer totals
    if (saleData.customerId) {
      await this.updateCustomerTotals(saleData.customerId);
    }

    const doc = await saleRef.get();
    return { id: doc.id, ...doc.data() };
  }

  async updateCustomerTotals(customerId: string) {
    // Get all sales for customer
    const salesSnapshot = await this.db.collection('sales')
      .where('customerId', '==', customerId)
      .get();
    
    const totalPurchases = salesSnapshot.docs.reduce((sum, doc) => {
      return sum + Number(doc.data().totalAmount || 0);
    }, 0);

    // Get credit transactions
    const creditsSnapshot = await this.db.collection('creditTransactions')
      .where('customerId', '==', customerId)
      .get();
    
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
    await this.db.collection('customers').doc(customerId).update({
      totalPurchases: totalPurchases.toString(),
      totalCredit: Math.max(0, totalCredit).toString(),
      updatedAt: new Date(),
    });
  }

  // Credit operations
  async getCreditTransactions(customerId?: string) {
    let query = this.db.collection('creditTransactions').orderBy('createdAt', 'desc');
    
    if (customerId) {
      query = query.where('customerId', '==', customerId);
    }

    const snapshot = await query.get();
    
    const transactions = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = { id: doc.id, ...doc.data() };
        const customerDoc = await this.db.collection('customers').doc(data.customerId).get();
        const customer = customerDoc.exists ? { id: customerDoc.id, ...customerDoc.data() } : null;
        
        return {
          ...data,
          customer,
        };
      })
    );

    return transactions;
  }

  async createCreditTransaction(transaction: any) {
    const docRef = await this.db.collection('creditTransactions').add({
      ...transaction,
      createdAt: new Date(),
    });
    
    await this.updateCustomerTotals(transaction.customerId);
    
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() };
  }

  async getOverdueCredits() {
    const today = new Date();
    const snapshot = await this.db.collection('creditTransactions')
      .where('type', '==', 'credit')
      .where('dueDate', '<=', today)
      .orderBy('dueDate')
      .get();

    const credits = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = { id: doc.id, ...doc.data() };
        const customerDoc = await this.db.collection('customers').doc(data.customerId).get();
        const customer = customerDoc.exists ? { id: customerDoc.id, ...customerDoc.data() } : null;
        
        return {
          ...data,
          customer,
        };
      })
    );

    return credits;
  }

  // Expense operations
  async getExpenses() {
    const snapshot = await this.db.collection('expenses').orderBy('expenseDate', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async createExpense(expense: any) {
    const docRef = await this.db.collection('expenses').add({
      ...expense,
      createdAt: new Date(),
    });
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() };
  }

  // Dashboard metrics
  async getDashboardMetrics() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's sales
    const todaySalesSnapshot = await this.db.collection('sales')
      .where('createdAt', '>=', today)
      .where('createdAt', '<', tomorrow)
      .get();
    
    const todaySales = todaySalesSnapshot.docs.reduce((sum, doc) => {
      return sum + Number(doc.data().totalAmount || 0);
    }, 0);

    // Inventory value
    const inventorySnapshot = await this.db.collection('inventoryItems').get();
    const inventoryValue = inventorySnapshot.docs.reduce((sum, doc) => {
      const data = doc.data();
      return sum + (Number(data.sellingPrice || 0) * Number(data.currentStock || 0));
    }, 0);

    // Pending credits
    const customersSnapshot = await this.db.collection('customers').get();
    const pendingCredits = customersSnapshot.docs.reduce((sum, doc) => {
      return sum + Number(doc.data().totalCredit || 0);
    }, 0);

    // Low stock count
    const lowStockSnapshot = await this.db.collection('inventoryItems')
      .where('currentStock', '<=', 5)
      .get();

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
  }

  // Report operations
  async getSalesReport(startDate: Date, endDate: Date) {
    const snapshot = await this.db.collection('sales')
      .where('createdAt', '>=', startDate)
      .where('createdAt', '<=', endDate)
      .orderBy('createdAt')
      .get();

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
  }

  async getProfitLossReport(startDate: Date, endDate: Date) {
    // Get sales revenue
    const salesSnapshot = await this.db.collection('sales')
      .where('createdAt', '>=', startDate)
      .where('createdAt', '<=', endDate)
      .get();
    
    const revenue = salesSnapshot.docs.reduce((sum, doc) => {
      return sum + Number(doc.data().totalAmount || 0);
    }, 0);

    // Get expenses
    const expensesSnapshot = await this.db.collection('expenses')
      .where('expenseDate', '>=', startDate)
      .where('expenseDate', '<=', endDate)
      .get();
    
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
  }
}