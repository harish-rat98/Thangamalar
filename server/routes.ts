import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  insertInventoryItemSchema,
  insertCustomerSchema,
  insertSaleSchema,
  insertSaleItemSchema,
  insertCreditTransactionSchema,
  insertExpenseSchema,
  insertCustomOrderSchema,
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
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

  app.get('/api/inventory/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.getInventoryItem(id);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error fetching inventory item:", error);
      res.status(500).json({ message: "Failed to fetch inventory item" });
    }
  });

  app.post('/api/inventory', isAuthenticated, async (req: any, res) => {
    try {
      const itemData = insertInventoryItemSchema.parse(req.body);
      const item = await storage.createInventoryItem(itemData);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating inventory item:", error);
      res.status(500).json({ message: "Failed to create inventory item" });
    }
  });

  app.put('/api/inventory/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const itemData = insertInventoryItemSchema.partial().parse(req.body);
      const item = await storage.updateInventoryItem(id, itemData);
      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating inventory item:", error);
      res.status(500).json({ message: "Failed to update inventory item" });
    }
  });

  app.delete('/api/inventory/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
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

  app.post('/api/customers/import', isAuthenticated, async (req: any, res) => {
    try {
      if (!req.files || !req.files.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const file = req.files.file;
      const type = req.body.type;
      const fileContent = file.data.toString();

      let customers: any[] = [];

      if (type === 'csv') {
        // Parse CSV
        const lines = fileContent.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          if (values.length >= 2) {
            customers.push({
              name: values[0] || '',
              phone: values[1] || '',
              email: values[2] || null,
              address: values[3] || null,
              city: values[4] || null,
              creditLimit: values[5] ? parseFloat(values[5]) : 0,
            });
          }
        }
      } else if (type === 'vcf') {
        // Parse vCard format
        const vcards = fileContent.split('BEGIN:VCARD');
        for (const vcard of vcards) {
          if (vcard.includes('END:VCARD')) {
            const nameMatch = vcard.match(/FN:(.*)/);
            const phoneMatch = vcard.match(/TEL[^:]*:(.*)/);
            const emailMatch = vcard.match(/EMAIL[^:]*:(.*)/);
            
            if (nameMatch && phoneMatch) {
              customers.push({
                name: nameMatch[1].trim(),
                phone: phoneMatch[1].replace(/\D/g, ''),
                email: emailMatch ? emailMatch[1].trim() : null,
                address: null,
                city: null,
                creditLimit: 0,
              });
            }
          }
        }
      } else if (type === 'whatsapp') {
        // Parse WhatsApp export (basic text format)
        const lines = fileContent.split('\n');
        for (const line of lines) {
          const contactMatch = line.match(/([^:]+):\s*(.*)/);
          if (contactMatch && contactMatch[1] !== 'You') {
            const name = contactMatch[1].trim();
            const phoneMatch = name.match(/\+?\d{10,}/);
            
            customers.push({
              name: name.replace(/\+?\d{10,}/, '').trim() || name,
              phone: phoneMatch ? phoneMatch[0] : '',
              email: null,
              address: null,
              city: null,
              creditLimit: 0,
            });
          }
        }
      }

      // Remove duplicates and invalid entries
      const validCustomers = customers.filter(c => c.name && c.phone)
        .filter((customer, index, self) => 
          index === self.findIndex(c => c.phone === customer.phone)
        );

      // Import customers
      const imported = [];
      for (const customerData of validCustomers) {
        try {
          const customer = await storage.createCustomer(customerData);
          imported.push(customer);
        } catch (error) {
          console.warn("Failed to import customer:", customerData.name, error);
        }
      }

      res.json({ 
        message: `Successfully imported ${imported.length} customers`,
        imported: imported.length,
        total: validCustomers.length 
      });
    } catch (error) {
      console.error("Error importing customers:", error);
      res.status(500).json({ message: "Failed to import customers" });
    }
  });

  app.get('/api/customers/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const customer = await storage.getCustomer(id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({ message: "Failed to fetch customer" });
    }
  });

  app.post('/api/customers', isAuthenticated, async (req: any, res) => {
    try {
      const customerData = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(customerData);
      res.status(201).json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating customer:", error);
      res.status(500).json({ message: "Failed to create customer" });
    }
  });

  app.put('/api/customers/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const customerData = insertCustomerSchema.partial().parse(req.body);
      const customer = await storage.updateCustomer(id, customerData);
      res.json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
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

  app.get('/api/sales/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const sale = await storage.getSale(id);
      if (!sale) {
        return res.status(404).json({ message: "Sale not found" });
      }
      res.json(sale);
    } catch (error) {
      console.error("Error fetching sale:", error);
      res.status(500).json({ message: "Failed to fetch sale" });
    }
  });

  const createSaleSchema = z.object({
    sale: insertSaleSchema,
    items: z.array(insertSaleItemSchema),
  });

  app.post('/api/sales', isAuthenticated, async (req: any, res) => {
    try {
      console.log("Received sale data:", JSON.stringify(req.body, null, 2));
      const { sale: saleData, items: saleItems } = createSaleSchema.parse(req.body);
      
      // Add creator to sale data
      saleData.createdBy = req.user.claims.sub;
      
      const sale = await storage.createSale(saleData, saleItems);
      res.status(201).json(sale);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating sale:", error);
      res.status(500).json({ message: "Failed to create sale" });
    }
  });

  // Credit routes
  app.get('/api/credits', isAuthenticated, async (req, res) => {
    try {
      const customerId = req.query.customerId ? parseInt(req.query.customerId as string) : undefined;
      const credits = await storage.getCreditTransactions(customerId);
      res.json(credits);
    } catch (error) {
      console.error("Error fetching credits:", error);
      res.status(500).json({ message: "Failed to fetch credits" });
    }
  });

  app.post('/api/credits', isAuthenticated, async (req: any, res) => {
    try {
      const creditData = insertCreditTransactionSchema.parse(req.body);
      creditData.createdBy = req.user.claims.sub;
      const credit = await storage.createCreditTransaction(creditData);
      res.status(201).json(credit);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating credit transaction:", error);
      res.status(500).json({ message: "Failed to create credit transaction" });
    }
  });

  // Expense routes
  app.get('/api/expenses', isAuthenticated, async (req, res) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      const expenses = startDate && endDate 
        ? await storage.getExpensesByDateRange(startDate, endDate)
        : await storage.getExpenses();
        
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.post('/api/expenses', isAuthenticated, async (req: any, res) => {
    try {
      const expenseData = insertExpenseSchema.parse(req.body);
      expenseData.createdBy = req.user.claims.sub;
      const expense = await storage.createExpense(expenseData);
      res.status(201).json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating expense:", error);
      res.status(500).json({ message: "Failed to create expense" });
    }
  });

  // Custom order routes
  app.get('/api/custom-orders', isAuthenticated, async (req, res) => {
    try {
      const orders = await storage.getCustomOrders();
      res.json(orders);
    } catch (error) {
      console.error("Error fetching custom orders:", error);
      res.status(500).json({ message: "Failed to fetch custom orders" });
    }
  });

  app.post('/api/custom-orders', isAuthenticated, async (req: any, res) => {
    try {
      const orderData = insertCustomOrderSchema.parse(req.body);
      orderData.createdBy = req.user.claims.sub;
      const order = await storage.createCustomOrder(orderData);
      res.status(201).json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating custom order:", error);
      res.status(500).json({ message: "Failed to create custom order" });
    }
  });

  app.put('/api/custom-orders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const orderData = insertCustomOrderSchema.partial().parse(req.body);
      const order = await storage.updateCustomOrder(id, orderData);
      res.json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating custom order:", error);
      res.status(500).json({ message: "Failed to update custom order" });
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

  const httpServer = createServer(app);
  return httpServer;
}
