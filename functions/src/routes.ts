import type { Express } from "express";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { FirebaseStorage } from "./storage.js";
import { z } from "zod";

const db = getFirestore();
const auth = getAuth();
const storage = new FirebaseStorage(db);

// Auth middleware
const isAuthenticated = async (req: any, res: any, next: any) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Auth error:", error);
    res.status(401).json({ message: "Unauthorized" });
  }
};

export function registerRoutes(app: Express) {
  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.uid);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard routes
  app.get('/api/dashboard/metrics', isAuthenticated, async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  app.get('/api/dashboard/recent-sales', isAuthenticated, async (req, res) => {
    try {
      const sales = await storage.getSales(10);
      res.json(sales);
    } catch (error) {
      console.error("Error fetching recent sales:", error);
      res.status(500).json({ message: "Failed to fetch recent sales" });
    }
  });

  app.get('/api/dashboard/low-stock', isAuthenticated, async (req, res) => {
    try {
      const items = await storage.getLowStockItems();
      res.json(items);
    } catch (error) {
      console.error("Error fetching low stock items:", error);
      res.status(500).json({ message: "Failed to fetch low stock items" });
    }
  });

  app.get('/api/dashboard/overdue-credits', isAuthenticated, async (req, res) => {
    try {
      const credits = await storage.getOverdueCredits();
      res.json(credits);
    } catch (error) {
      console.error("Error fetching overdue credits:", error);
      res.status(500).json({ message: "Failed to fetch overdue credits" });
    }
  });

  // Inventory routes
  app.get('/api/inventory', isAuthenticated, async (req, res) => {
    try {
      const items = await storage.getInventoryItems();
      res.json(items);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      res.status(500).json({ message: "Failed to fetch inventory" });
    }
  });

  app.post('/api/inventory', isAuthenticated, async (req: any, res) => {
    try {
      const item = await storage.createInventoryItem(req.body);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating inventory item:", error);
      res.status(500).json({ message: "Failed to create inventory item" });
    }
  });

  app.put('/api/inventory/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = req.params.id;
      const item = await storage.updateInventoryItem(id, req.body);
      res.json(item);
    } catch (error) {
      console.error("Error updating inventory item:", error);
      res.status(500).json({ message: "Failed to update inventory item" });
    }
  });

  app.delete('/api/inventory/:id', isAuthenticated, async (req, res) => {
    try {
      const id = req.params.id;
      await storage.deleteInventoryItem(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting inventory item:", error);
      res.status(500).json({ message: "Failed to delete inventory item" });
    }
  });

  // Customer routes
  app.get('/api/customers', isAuthenticated, async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.post('/api/customers', isAuthenticated, async (req: any, res) => {
    try {
      const customer = await storage.createCustomer(req.body);
      res.status(201).json(customer);
    } catch (error) {
      console.error("Error creating customer:", error);
      res.status(500).json({ message: "Failed to create customer" });
    }
  });

  app.put('/api/customers/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = req.params.id;
      const customer = await storage.updateCustomer(id, req.body);
      res.json(customer);
    } catch (error) {
      console.error("Error updating customer:", error);
      res.status(500).json({ message: "Failed to update customer" });
    }
  });

  // Sales routes
  app.get('/api/sales', isAuthenticated, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const sales = await storage.getSales(limit);
      res.json(sales);
    } catch (error) {
      console.error("Error fetching sales:", error);
      res.status(500).json({ message: "Failed to fetch sales" });
    }
  });

  app.post('/api/sales', isAuthenticated, async (req: any, res) => {
    try {
      req.body.sale.createdBy = req.user.uid;
      const sale = await storage.createSale(req.body.sale, req.body.items);
      res.status(201).json(sale);
    } catch (error) {
      console.error("Error creating sale:", error);
      res.status(500).json({ message: "Failed to create sale" });
    }
  });

  // Credit routes
  app.get('/api/credits', isAuthenticated, async (req, res) => {
    try {
      const customerId = req.query.customerId as string;
      const credits = await storage.getCreditTransactions(customerId);
      res.json(credits);
    } catch (error) {
      console.error("Error fetching credits:", error);
      res.status(500).json({ message: "Failed to fetch credits" });
    }
  });

  app.post('/api/credits', isAuthenticated, async (req: any, res) => {
    try {
      req.body.createdBy = req.user.uid;
      const credit = await storage.createCreditTransaction(req.body);
      res.status(201).json(credit);
    } catch (error) {
      console.error("Error creating credit transaction:", error);
      res.status(500).json({ message: "Failed to create credit transaction" });
    }
  });

  // Expense routes
  app.get('/api/expenses', isAuthenticated, async (req, res) => {
    try {
      const expenses = await storage.getExpenses();
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.post('/api/expenses', isAuthenticated, async (req: any, res) => {
    try {
      req.body.createdBy = req.user.uid;
      const expense = await storage.createExpense(req.body);
      res.status(201).json(expense);
    } catch (error) {
      console.error("Error creating expense:", error);
      res.status(500).json({ message: "Failed to create expense" });
    }
  });

  // Report routes
  app.get('/api/reports/sales', isAuthenticated, async (req, res) => {
    try {
      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);
      const report = await storage.getSalesReport(startDate, endDate);
      res.json(report);
    } catch (error) {
      console.error("Error generating sales report:", error);
      res.status(500).json({ message: "Failed to generate sales report" });
    }
  });

  app.get('/api/reports/profit-loss', isAuthenticated, async (req, res) => {
    try {
      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);
      const report = await storage.getProfitLossReport(startDate, endDate);
      res.json(report);
    } catch (error) {
      console.error("Error generating profit/loss report:", error);
      res.status(500).json({ message: "Failed to generate profit/loss report" });
    }
  });
}