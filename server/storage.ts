import {
  users,
  inventoryItems,
  customers,
  sales,
  saleItems,
  creditTransactions,
  expenses,
  customOrders,
  type User,
  type UpsertUser,
  type InventoryItem,
  type InsertInventoryItem,
  type Customer,
  type InsertCustomer,
  type Sale,
  type InsertSale,
  type SaleItem,
  type InsertSaleItem,
  type CreditTransaction,
  type InsertCreditTransaction,
  type Expense,
  type InsertExpense,
  type CustomOrder,
  type InsertCustomOrder,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, gte, lte, sql, sum, count } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Inventory operations
  getInventoryItems(): Promise<InventoryItem[]>;
  getInventoryItem(id: number): Promise<InventoryItem | undefined>;
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
  updateInventoryItem(id: number, item: Partial<InsertInventoryItem>): Promise<InventoryItem>;
  deleteInventoryItem(id: number): Promise<void>;
  getLowStockItems(): Promise<InventoryItem[]>;
  updateInventoryStock(id: number, quantity: number): Promise<void>;

  // Customer operations
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | undefined>;
  getCustomerByPhone(phone: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer>;
  updateCustomerTotals(customerId: number): Promise<void>;

  // Sales operations
  getSales(limit?: number): Promise<(Sale & { customer?: Customer; saleItems: SaleItem[] })[]>;
  getSale(id: number): Promise<(Sale & { customer?: Customer; saleItems: SaleItem[] }) | undefined>;
  createSale(saleData: InsertSale, saleItems: InsertSaleItem[]): Promise<Sale>;
  getDashboardMetrics(): Promise<{
    todaySales: string;
    inventoryValue: string;
    pendingCredits: string;
    lowStockCount: number;
    salesByType: {
      inventory: { amount: string; count: number };
      commission: { amount: string; count: number };
      custom_order: { amount: string; count: number };
    };
  }>;

  // Credit operations
  getCreditTransactions(customerId?: number): Promise<(CreditTransaction & { customer: Customer })[]>;
  createCreditTransaction(transaction: InsertCreditTransaction): Promise<CreditTransaction>;
  getOverdueCredits(): Promise<(CreditTransaction & { customer: Customer })[]>;

  // Expense operations
  getExpenses(): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  getExpensesByDateRange(startDate: Date, endDate: Date): Promise<Expense[]>;

  // Custom order operations
  getCustomOrders(): Promise<(CustomOrder & { customer: Customer })[]>;
  createCustomOrder(order: InsertCustomOrder): Promise<CustomOrder>;
  updateCustomOrder(id: number, order: Partial<InsertCustomOrder>): Promise<CustomOrder>;

  // Report operations
  getSalesReport(startDate: Date, endDate: Date): Promise<any>;
  getProfitLossReport(startDate: Date, endDate: Date): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Inventory operations
  async getInventoryItems(): Promise<InventoryItem[]> {
    return await db.select().from(inventoryItems).orderBy(asc(inventoryItems.name));
  }

  async getInventoryItem(id: number): Promise<InventoryItem | undefined> {
    const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id));
    return item;
  }

  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    const [newItem] = await db.insert(inventoryItems).values(item).returning();
    return newItem;
  }

  async updateInventoryItem(id: number, item: Partial<InsertInventoryItem>): Promise<InventoryItem> {
    const [updatedItem] = await db
      .update(inventoryItems)
      .set({ ...item, updatedAt: new Date() })
      .where(eq(inventoryItems.id, id))
      .returning();
    return updatedItem;
  }

  async deleteInventoryItem(id: number): Promise<void> {
    await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
  }

  async getLowStockItems(): Promise<InventoryItem[]> {
    return await db
      .select()
      .from(inventoryItems)
      .where(sql`${inventoryItems.currentStock} <= ${inventoryItems.minStockLevel}`)
      .orderBy(asc(inventoryItems.currentStock));
  }

  async updateInventoryStock(id: number, quantity: number): Promise<void> {
    await db
      .update(inventoryItems)
      .set({ currentStock: sql`${inventoryItems.currentStock} - ${quantity}` })
      .where(eq(inventoryItems.id, id));
  }

  // Customer operations
  async getCustomers(): Promise<Customer[]> {
    return await db.select().from(customers).orderBy(desc(customers.createdAt));
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }

  async getCustomerByPhone(phone: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.phone, phone));
    return customer;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [newCustomer] = await db.insert(customers).values(customer).returning();
    return newCustomer;
  }

  async updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer> {
    const [updatedCustomer] = await db
      .update(customers)
      .set({ ...customer, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    return updatedCustomer;
  }

  async updateCustomerTotals(customerId: number): Promise<void> {
    // Update total purchases
    const [purchaseTotal] = await db
      .select({ total: sum(sales.totalAmount) })
      .from(sales)
      .where(eq(sales.customerId, customerId));

    // Update total credit
    const [creditTotal] = await db
      .select({ total: sum(creditTransactions.amount) })
      .from(creditTransactions)
      .where(and(
        eq(creditTransactions.customerId, customerId),
        eq(creditTransactions.type, 'credit')
      ));

    const [paymentTotal] = await db
      .select({ total: sum(creditTransactions.amount) })
      .from(creditTransactions)
      .where(and(
        eq(creditTransactions.customerId, customerId),
        eq(creditTransactions.type, 'payment')
      ));

    const totalCredit = Number(creditTotal?.total || 0) - Number(paymentTotal?.total || 0);

    await db
      .update(customers)
      .set({
        totalPurchases: purchaseTotal?.total?.toString() || "0",
        totalCredit: totalCredit.toString(),
      })
      .where(eq(customers.id, customerId));
  }

  // Sales operations
  async getSales(limit = 50): Promise<(Sale & { customer?: Customer; saleItems: SaleItem[] })[]> {
    const salesData = await db
      .select()
      .from(sales)
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .orderBy(desc(sales.createdAt))
      .limit(limit);

    const salesWithItems = await Promise.all(
      salesData.map(async ({ sales: sale, customers: customer }) => {
        const items = await db
          .select()
          .from(saleItems)
          .where(eq(saleItems.saleId, sale.id));
        
        return {
          ...sale,
          customer: customer || undefined,
          saleItems: items,
        };
      })
    );

    return salesWithItems;
  }

  async getSale(id: number): Promise<(Sale & { customer?: Customer; saleItems: SaleItem[] }) | undefined> {
    const [saleData] = await db
      .select()
      .from(sales)
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .where(eq(sales.id, id));

    if (!saleData) return undefined;

    const items = await db
      .select()
      .from(saleItems)
      .where(eq(saleItems.saleId, id));

    return {
      ...saleData.sales,
      customer: saleData.customers || undefined,
      saleItems: items,
    };
  }

  async createSale(saleData: InsertSale, saleItemsData: InsertSaleItem[]): Promise<Sale> {
    return await db.transaction(async (tx) => {
      // Generate receipt number
      const receiptNumber = `RCP-${Date.now()}`;
      
      // Create sale
      const [sale] = await tx
        .insert(sales)
        .values({ ...saleData, receiptNumber })
        .returning();

      // Create sale items
      const itemsWithSaleId = saleItemsData.map(item => ({
        ...item,
        saleId: sale.id,
      }));
      
      await tx.insert(saleItems).values(itemsWithSaleId);

      // Update inventory for inventory sales
      if (saleData.saleType === 'inventory') {
        for (const item of saleItemsData) {
          if (item.itemId) {
            await tx
              .update(inventoryItems)
              .set({ currentStock: sql`${inventoryItems.currentStock} - ${item.quantity}` })
              .where(eq(inventoryItems.id, item.itemId));
          }
        }
      }

      // Create credit transaction if payment is credit or partial
      if (saleData.paymentStatus === 'pending' || saleData.paymentStatus === 'partial') {
        const creditAmount = Number(saleData.totalAmount) - Number(saleData.paidAmount || 0);
        if (creditAmount > 0 && saleData.customerId) {
          await tx.insert(creditTransactions).values({
            customerId: saleData.customerId,
            saleId: sale.id,
            type: 'credit',
            amount: creditAmount.toString(),
            balanceAfter: creditAmount.toString(), // Will be updated by updateCustomerTotals
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            createdBy: saleData.createdBy,
          });
        }
      }

      // Update customer totals
      if (saleData.customerId) {
        await this.updateCustomerTotals(saleData.customerId);
      }

      return sale;
    });
  }

  async getDashboardMetrics(): Promise<{
    todaySales: string;
    inventoryValue: string;
    pendingCredits: string;
    lowStockCount: number;
    salesByType: {
      inventory: { amount: string; count: number };
      commission: { amount: string; count: number };
      custom_order: { amount: string; count: number };
    };
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's sales
    const [todaySalesResult] = await db
      .select({ total: sum(sales.totalAmount) })
      .from(sales)
      .where(and(
        gte(sales.createdAt, today),
        lte(sales.createdAt, tomorrow)
      ));

    // Inventory value
    const [inventoryValueResult] = await db
      .select({
        total: sql<string>`SUM(${inventoryItems.sellingPrice} * ${inventoryItems.currentStock})`
      })
      .from(inventoryItems);

    // Pending credits
    const [pendingCreditsResult] = await db
      .select({ total: sum(customers.totalCredit) })
      .from(customers);

    // Low stock count
    const [lowStockResult] = await db
      .select({ count: count() })
      .from(inventoryItems)
      .where(sql`${inventoryItems.currentStock} <= ${inventoryItems.minStockLevel}`);

    // Sales by type (this month)
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const salesByType = await db
      .select({
        saleType: sales.saleType,
        total: sum(sales.totalAmount),
        count: count(),
      })
      .from(sales)
      .where(and(
        gte(sales.createdAt, startOfMonth),
        lte(sales.createdAt, endOfMonth)
      ))
      .groupBy(sales.saleType);

    const salesTypeMap = {
      inventory: { amount: "0", count: 0 },
      commission: { amount: "0", count: 0 },
      custom_order: { amount: "0", count: 0 },
    };

    salesByType.forEach(item => {
      if (item.saleType in salesTypeMap) {
        salesTypeMap[item.saleType] = {
          amount: item.total?.toString() || "0",
          count: item.count,
        };
      }
    });

    return {
      todaySales: todaySalesResult?.total?.toString() || "0",
      inventoryValue: inventoryValueResult?.total || "0",
      pendingCredits: pendingCreditsResult?.total?.toString() || "0",
      lowStockCount: lowStockResult?.count || 0,
      salesByType: salesTypeMap,
    };
  }

  // Credit operations
  async getCreditTransactions(customerId?: number): Promise<(CreditTransaction & { customer: Customer })[]> {
    const query = db
      .select()
      .from(creditTransactions)
      .innerJoin(customers, eq(creditTransactions.customerId, customers.id))
      .orderBy(desc(creditTransactions.createdAt));

    if (customerId) {
      query.where(eq(creditTransactions.customerId, customerId));
    }

    const results = await query;
    return results.map(({ credit_transactions, customers }) => ({
      ...credit_transactions,
      customer: customers,
    }));
  }

  async createCreditTransaction(transaction: InsertCreditTransaction): Promise<CreditTransaction> {
    const [newTransaction] = await db.insert(creditTransactions).values(transaction).returning();
    
    // Update customer totals
    await this.updateCustomerTotals(transaction.customerId);
    
    return newTransaction;
  }

  async getOverdueCredits(): Promise<(CreditTransaction & { customer: Customer })[]> {
    const today = new Date();
    const results = await db
      .select()
      .from(creditTransactions)
      .innerJoin(customers, eq(creditTransactions.customerId, customers.id))
      .where(and(
        eq(creditTransactions.type, 'credit'),
        lte(creditTransactions.dueDate, today)
      ))
      .orderBy(asc(creditTransactions.dueDate));

    return results.map(({ credit_transactions, customers }) => ({
      ...credit_transactions,
      customer: customers,
    }));
  }

  // Expense operations
  async getExpenses(): Promise<Expense[]> {
    return await db.select().from(expenses).orderBy(desc(expenses.expenseDate));
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [newExpense] = await db.insert(expenses).values(expense).returning();
    return newExpense;
  }

  async getExpensesByDateRange(startDate: Date, endDate: Date): Promise<Expense[]> {
    return await db
      .select()
      .from(expenses)
      .where(and(
        gte(expenses.expenseDate, startDate),
        lte(expenses.expenseDate, endDate)
      ))
      .orderBy(desc(expenses.expenseDate));
  }

  // Custom order operations
  async getCustomOrders(): Promise<(CustomOrder & { customer: Customer })[]> {
    const results = await db
      .select()
      .from(customOrders)
      .innerJoin(customers, eq(customOrders.customerId, customers.id))
      .orderBy(desc(customOrders.createdAt));

    return results.map(({ custom_orders, customers }) => ({
      ...custom_orders,
      customer: customers,
    }));
  }

  async createCustomOrder(order: InsertCustomOrder): Promise<CustomOrder> {
    const [newOrder] = await db.insert(customOrders).values(order).returning();
    return newOrder;
  }

  async updateCustomOrder(id: number, order: Partial<InsertCustomOrder>): Promise<CustomOrder> {
    const [updatedOrder] = await db
      .update(customOrders)
      .set({ ...order, updatedAt: new Date() })
      .where(eq(customOrders.id, id))
      .returning();
    return updatedOrder;
  }

  // Report operations
  async getSalesReport(startDate: Date, endDate: Date): Promise<any> {
    const salesData = await db
      .select({
        date: sql<string>`DATE(${sales.createdAt})`,
        totalSales: sum(sales.totalAmount),
        totalTransactions: count(),
        avgSaleAmount: sql<string>`AVG(${sales.totalAmount})`,
      })
      .from(sales)
      .where(and(
        gte(sales.createdAt, startDate),
        lte(sales.createdAt, endDate)
      ))
      .groupBy(sql`DATE(${sales.createdAt})`)
      .orderBy(sql`DATE(${sales.createdAt})`);

    return salesData;
  }

  async getProfitLossReport(startDate: Date, endDate: Date): Promise<any> {
    // Calculate revenue from sales
    const [revenueResult] = await db
      .select({ total: sum(sales.totalAmount) })
      .from(sales)
      .where(and(
        gte(sales.createdAt, startDate),
        lte(sales.createdAt, endDate)
      ));

    // Calculate expenses
    const [expenseResult] = await db
      .select({ total: sum(expenses.amount) })
      .from(expenses)
      .where(and(
        gte(expenses.expenseDate, startDate),
        lte(expenses.expenseDate, endDate)
      ));

    const revenue = Number(revenueResult?.total || 0);
    const totalExpenses = Number(expenseResult?.total || 0);
    const profit = revenue - totalExpenses;

    return {
      revenue: revenue.toString(),
      expenses: totalExpenses.toString(),
      profit: profit.toString(),
      profitMargin: revenue > 0 ? ((profit / revenue) * 100).toFixed(2) : "0",
    };
  }
}

export const storage = new DatabaseStorage();
