import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  decimal,
  integer,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Enums
export const materialEnum = pgEnum("material", ["gold", "silver", "diamond", "platinum", "other"]);
export const categoryEnum = pgEnum("category", ["ring", "necklace", "bracelet", "earrings", "chain", "pendant", "bangles", "anklet", "other"]);
export const saleTypeEnum = pgEnum("sale_type", ["inventory", "commission", "custom_order"]);
export const paymentMethodEnum = pgEnum("payment_method", ["cash", "card", "upi", "credit"]);
export const paymentStatusEnum = pgEnum("payment_status", ["paid", "partial", "pending", "overdue"]);
export const creditTypeEnum = pgEnum("credit_type", ["credit", "payment"]);
export const orderStatusEnum = pgEnum("order_status", ["pending", "in_progress", "completed", "cancelled"]);

// Inventory Items
export const inventoryItems = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: categoryEnum("category").notNull(),
  material: materialEnum("material").notNull(),
  weightGrams: decimal("weight_grams", { precision: 10, scale: 3 }).notNull(),
  purchaseCost: decimal("purchase_cost", { precision: 15, scale: 2 }).notNull(),
  sellingPrice: decimal("selling_price", { precision: 15, scale: 2 }).notNull(),
  currentStock: integer("current_stock").notNull().default(0),
  minStockLevel: integer("min_stock_level").notNull().default(5),
  sku: varchar("sku", { length: 100 }).unique().notNull(),
  barcode: varchar("barcode", { length: 255 }),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customers
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }).unique().notNull(),
  email: varchar("email", { length: 255 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  totalPurchases: decimal("total_purchases", { precision: 15, scale: 2 }).default("0"),
  totalCredit: decimal("total_credit", { precision: 15, scale: 2 }).default("0"),
  creditLimit: decimal("credit_limit", { precision: 15, scale: 2 }).default("0"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sales
export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id),
  saleType: saleTypeEnum("sale_type").notNull(),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 15, scale: 2 }).default("0"),
  discountAmount: decimal("discount_amount", { precision: 15, scale: 2 }).default("0"),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  paymentStatus: paymentStatusEnum("payment_status").notNull(),
  paidAmount: decimal("paid_amount", { precision: 15, scale: 2 }).default("0"),
  commissionPercentage: decimal("commission_percentage", { precision: 5, scale: 2 }),
  commissionAmount: decimal("commission_amount", { precision: 15, scale: 2 }),
  notes: text("notes"),
  receiptNumber: varchar("receipt_number", { length: 100 }).unique(),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Sale Items
export const saleItems = pgTable("sale_items", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").references(() => sales.id).notNull(),
  itemId: integer("item_id").references(() => inventoryItems.id),
  itemName: varchar("item_name", { length: 255 }).notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 15, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 15, scale: 2 }).notNull(),
  weightGrams: decimal("weight_grams", { precision: 10, scale: 3 }),
  material: materialEnum("material"),
});

// Credit Transactions
export const creditTransactions = pgTable("credit_transactions", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  saleId: integer("sale_id").references(() => sales.id),
  type: creditTypeEnum("type").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  balanceAfter: decimal("balance_after", { precision: 15, scale: 2 }).notNull(),
  dueDate: timestamp("due_date"),
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Expenses
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  category: varchar("category", { length: 100 }).notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  material: materialEnum("material"),
  receiptNumber: varchar("receipt_number", { length: 100 }),
  vendorName: varchar("vendor_name", { length: 255 }),
  expenseDate: timestamp("expense_date").notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Custom Orders
export const customOrders = pgTable("custom_orders", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  orderDescription: text("order_description").notNull(),
  estimatedCost: decimal("estimated_cost", { precision: 15, scale: 2 }),
  finalCost: decimal("final_cost", { precision: 15, scale: 2 }),
  advanceAmount: decimal("advance_amount", { precision: 15, scale: 2 }).default("0"),
  status: orderStatusEnum("status").default("pending"),
  estimatedDelivery: timestamp("estimated_delivery"),
  actualDelivery: timestamp("actual_delivery"),
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const customersRelations = relations(customers, ({ many }) => ({
  sales: many(sales),
  creditTransactions: many(creditTransactions),
  customOrders: many(customOrders),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  customer: one(customers, {
    fields: [sales.customerId],
    references: [customers.id],
  }),
  saleItems: many(saleItems),
  creditTransaction: one(creditTransactions, {
    fields: [sales.id],
    references: [creditTransactions.saleId],
  }),
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, {
    fields: [saleItems.saleId],
    references: [sales.id],
  }),
  item: one(inventoryItems, {
    fields: [saleItems.itemId],
    references: [inventoryItems.id],
  }),
}));

export const creditTransactionsRelations = relations(creditTransactions, ({ one }) => ({
  customer: one(customers, {
    fields: [creditTransactions.customerId],
    references: [customers.id],
  }),
  sale: one(sales, {
    fields: [creditTransactions.saleId],
    references: [sales.id],
  }),
}));

export const customOrdersRelations = relations(customOrders, ({ one }) => ({
  customer: one(customers, {
    fields: [customOrders.customerId],
    references: [customers.id],
  }),
}));

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type InsertInventoryItem = typeof inventoryItems.$inferInsert;
export type InventoryItem = typeof inventoryItems.$inferSelect;

export type InsertCustomer = typeof customers.$inferInsert;
export type Customer = typeof customers.$inferSelect;

export type InsertSale = typeof sales.$inferInsert;
export type Sale = typeof sales.$inferSelect;

export type InsertSaleItem = typeof saleItems.$inferInsert;
export type SaleItem = typeof saleItems.$inferSelect;

export type InsertCreditTransaction = typeof creditTransactions.$inferInsert;
export type CreditTransaction = typeof creditTransactions.$inferSelect;

export type InsertExpense = typeof expenses.$inferInsert;
export type Expense = typeof expenses.$inferSelect;

export type InsertCustomOrder = typeof customOrders.$inferInsert;
export type CustomOrder = typeof customOrders.$inferSelect;

// Zod Schemas
export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  totalPurchases: true,
  totalCredit: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSaleSchema = createInsertSchema(sales).omit({
  id: true,
  receiptNumber: true,
  createdBy: true,
  createdAt: true,
});

export const insertSaleItemSchema = createInsertSchema(saleItems).omit({
  id: true,
  saleId: true,
});

export const insertCreditTransactionSchema = createInsertSchema(creditTransactions).omit({
  id: true,
  createdBy: true,
  createdAt: true,
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdBy: true,
  createdAt: true,
});

export const insertCustomOrderSchema = createInsertSchema(customOrders).omit({
  id: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
});
