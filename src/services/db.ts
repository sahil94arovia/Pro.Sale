import {
  Invoice,
  Customer,
  Product,
  CustomerLedgerEntry,
  Quotation,
  DeliveryChallan,
  Expense,
  BusinessSettings,
} from "../types";
import { DEFAULT_BUSINESS_SETTINGS } from "../utils/constants";

// Clean storage keys (v2: zero demo data)
const DB_KEYS = {
  INVOICES: "prosale_invoices_v2",
  CUSTOMERS: "prosale_customers_v2",
  PRODUCTS: "prosale_products_v2",
  LEDGER: "prosale_ledger_v2",
  QUOTATIONS: "prosale_quotations_v2",
  CHALLANS: "prosale_challans_v2",
  EXPENSES: "prosale_expenses_v2",
  SETTINGS: "prosale_settings_v2",
};

// Automatic cleanup of legacy demo data from v1 storage keys
const PURGE_KEYS = [
  "prosale_invoices_v1",
  "prosale_customers_v1",
  "prosale_products_v1",
  "prosale_ledger_v1",
  "prosale_quotations_v1",
  "prosale_challans_v1",
  "prosale_expenses_v1",
];

try {
  if (typeof window !== "undefined" && window.localStorage) {
    PURGE_KEYS.forEach((k) => localStorage.removeItem(k));
    // Migrate existing custom settings if present
    const oldSettings = localStorage.getItem("prosale_settings_v1");
    if (oldSettings && !localStorage.getItem(DB_KEYS.SETTINGS)) {
      localStorage.setItem(DB_KEYS.SETTINGS, oldSettings);
    }
  }
} catch {
  // Ignore in environments where localStorage is unavailable
}

let notifyTimeout: any = null;
export function notifyDataChanged() {
  if (typeof window !== "undefined") {
    if (notifyTimeout) clearTimeout(notifyTimeout);
    notifyTimeout = setTimeout(() => {
      try {
        window.dispatchEvent(
          new CustomEvent("prosale_db_updated", {
            detail: { timestamp: Date.now() },
          })
        );
      } catch {
        // safe fallback
      }
    }, 16);
  }
}

export const dbService = {
  // Products
  getProducts(): Product[] {
    const raw = localStorage.getItem(DB_KEYS.PRODUCTS);
    if (!raw) {
      localStorage.setItem(DB_KEYS.PRODUCTS, JSON.stringify([]));
      return [];
    }
    return JSON.parse(raw);
  },

  saveProduct(product: Product): Product {
    const products = this.getProducts();
    const existingIndex = products.findIndex((p) => p.id === product.id);
    if (existingIndex >= 0) {
      products[existingIndex] = product;
    } else {
      products.unshift(product);
    }
    localStorage.setItem(DB_KEYS.PRODUCTS, JSON.stringify(products));
    notifyDataChanged();
    return product;
  },

  deleteProduct(id: string): void {
    const products = this.getProducts().filter((p) => p.id !== id);
    localStorage.setItem(DB_KEYS.PRODUCTS, JSON.stringify(products));
    notifyDataChanged();
  },

  updateStock(productId: string, deltaQty: number): void {
    const products = this.getProducts();
    const target = products.find((p) => p.id === productId);
    if (target) {
      target.stock = Math.max(0, target.stock + deltaQty);
      localStorage.setItem(DB_KEYS.PRODUCTS, JSON.stringify(products));
      notifyDataChanged();
    }
  },

  // Customers
  getCustomers(): Customer[] {
    const raw = localStorage.getItem(DB_KEYS.CUSTOMERS);
    if (!raw) {
      localStorage.setItem(DB_KEYS.CUSTOMERS, JSON.stringify([]));
      return [];
    }
    return JSON.parse(raw);
  },

  saveCustomer(customer: Customer): Customer {
    const customers = this.getCustomers();
    const existingIndex = customers.findIndex((c) => c.id === customer.id);
    if (existingIndex >= 0) {
      customers[existingIndex] = customer;
    } else {
      customers.unshift(customer);
    }
    localStorage.setItem(DB_KEYS.CUSTOMERS, JSON.stringify(customers));
    notifyDataChanged();
    return customer;
  },

  deleteCustomer(id: string): void {
    const customers = this.getCustomers().filter((c) => c.id !== id);
    localStorage.setItem(DB_KEYS.CUSTOMERS, JSON.stringify(customers));
    const ledger = this.getLedger().filter((l) => l.customerId !== id);
    localStorage.setItem(DB_KEYS.LEDGER, JSON.stringify(ledger));
    notifyDataChanged();
  },

  updateCustomerBalance(customerId: string, balanceDelta: number): void {
    const customers = this.getCustomers();
    const cust = customers.find((c) => c.id === customerId);
    if (cust) {
      cust.currentBalance = Number((cust.currentBalance + balanceDelta).toFixed(2));
      localStorage.setItem(DB_KEYS.CUSTOMERS, JSON.stringify(customers));
      notifyDataChanged();
    }
  },

  // Customer Ledger
  getLedger(customerId?: string): CustomerLedgerEntry[] {
    const raw = localStorage.getItem(DB_KEYS.LEDGER);
    const ledger: CustomerLedgerEntry[] = raw ? JSON.parse(raw) : [];
    if (customerId) {
      return ledger.filter((l) => l.customerId === customerId);
    }
    return ledger;
  },

  addLedgerEntry(entry: CustomerLedgerEntry): void {
    const ledger = this.getLedger();
    ledger.unshift(entry);
    localStorage.setItem(DB_KEYS.LEDGER, JSON.stringify(ledger));
    notifyDataChanged();
  },

  // Invoices
  getInvoices(): Invoice[] {
    const raw = localStorage.getItem(DB_KEYS.INVOICES);
    if (!raw) {
      localStorage.setItem(DB_KEYS.INVOICES, JSON.stringify([]));
      return [];
    }
    return JSON.parse(raw);
  },

  saveInvoice(invoice: Invoice): Invoice {
    const invoices = this.getInvoices();
    const existingIndex = invoices.findIndex((inv) => inv.id === invoice.id);
    if (existingIndex >= 0) {
      const oldInvoice = invoices[existingIndex];

      // 1. Revert previous stock deduction of old items
      oldInvoice.items.forEach((it) => {
        if (it.productId) {
          this.updateStock(it.productId, it.qty);
        }
      });

      // 2. Revert previous customer balance and ledger of old invoice
      if (oldInvoice.customer && oldInvoice.customer.id && oldInvoice.customer.id !== 'cust-walkin') {
        if (oldInvoice.balanceAmount > 0) {
          this.updateCustomerBalance(oldInvoice.customer.id, -oldInvoice.balanceAmount);
        }
        const ledger = this.getLedger().filter(
          (l) => l.referenceNumber !== oldInvoice.invoiceNumber
        );
        localStorage.setItem(DB_KEYS.LEDGER, JSON.stringify(ledger));
      }

      // 3. Apply new stock deduction of updated items
      invoice.items.forEach((it) => {
        if (it.productId) {
          this.updateStock(it.productId, -it.qty);
        }
      });

      // 4. Apply new customer balance and ledger
      if (invoice.customer && invoice.customer.id && invoice.customer.id !== 'cust-walkin') {
        if (invoice.balanceAmount > 0) {
          this.updateCustomerBalance(invoice.customer.id, invoice.balanceAmount);
        }

        this.addLedgerEntry({
          id: "ledg-" + Date.now() + Math.random().toString(36).slice(2, 6),
          customerId: invoice.customer.id,
          date: invoice.date,
          type: "INVOICE",
          referenceNumber: invoice.invoiceNumber,
          debit: invoice.grandTotal,
          credit: invoice.paidAmount,
          balance: invoice.balanceAmount,
          notes: `Bill edited: ${invoice.saleType} sale (${invoice.paymentMode || 'PAID'})`,
          paymentMode: invoice.paymentMode,
        });
      }

      invoices[existingIndex] = invoice;
    } else {
      invoices.unshift(invoice);

      // Deduct inventory stock
      invoice.items.forEach((it) => {
        if (it.productId) {
          this.updateStock(it.productId, -it.qty);
        }
      });

      // Update customer balance and transaction ledger for registered parties
      if (invoice.customer && invoice.customer.id && invoice.customer.id !== 'cust-walkin') {
        if (invoice.balanceAmount > 0) {
          this.updateCustomerBalance(invoice.customer.id, invoice.balanceAmount);
        }

        // Add to customer ledger statement
        this.addLedgerEntry({
          id: "ledg-" + Date.now() + Math.random().toString(36).slice(2, 6),
          customerId: invoice.customer.id,
          date: invoice.date,
          type: "INVOICE",
          referenceNumber: invoice.invoiceNumber,
          debit: invoice.grandTotal,
          credit: invoice.paidAmount,
          balance: invoice.balanceAmount,
          notes: `Bill created: ${invoice.saleType} sale (${invoice.paymentMode || 'PAID'})`,
          paymentMode: invoice.paymentMode,
        });
      }

      // Increment next invoice number in settings
      const settings = this.getSettings();
      settings.nextInvoiceNumber += 1;
      this.saveSettings(settings);
    }
    localStorage.setItem(DB_KEYS.INVOICES, JSON.stringify(invoices));
    notifyDataChanged();
    return invoice;
  },

  deleteInvoice(id: string): void {
    const invoices = this.getInvoices();
    const target = invoices.find((inv) => inv.id === id);
    if (target) {
      // Revert stock deduction
      target.items.forEach((it) => {
        if (it.productId) {
          this.updateStock(it.productId, it.qty);
        }
      });

      // Revert customer pending balance
      if (target.customer && target.customer.id && target.balanceAmount > 0) {
        this.updateCustomerBalance(target.customer.id, -target.balanceAmount);
      }

      // Remove invoice ledger entry
      const ledger = this.getLedger().filter(
        (l) => l.referenceNumber !== target.invoiceNumber
      );
      localStorage.setItem(DB_KEYS.LEDGER, JSON.stringify(ledger));
    }

    const filtered = invoices.filter((inv) => inv.id !== id);
    localStorage.setItem(DB_KEYS.INVOICES, JSON.stringify(filtered));
    notifyDataChanged();
  },

  // Quotations
  getQuotations(): Quotation[] {
    const raw = localStorage.getItem(DB_KEYS.QUOTATIONS);
    return raw ? JSON.parse(raw) : [];
  },

  saveQuotation(quote: Quotation): Quotation {
    const quotes = this.getQuotations();
    const idx = quotes.findIndex((q) => q.id === quote.id);
    if (idx >= 0) {
      quotes[idx] = quote;
    } else {
      quotes.unshift(quote);
    }
    localStorage.setItem(DB_KEYS.QUOTATIONS, JSON.stringify(quotes));
    notifyDataChanged();
    return quote;
  },

  deleteQuotation(id: string): void {
    const quotes = this.getQuotations().filter((q) => q.id !== id);
    localStorage.setItem(DB_KEYS.QUOTATIONS, JSON.stringify(quotes));
    notifyDataChanged();
  },

  // Challans
  getChallans(): DeliveryChallan[] {
    const raw = localStorage.getItem(DB_KEYS.CHALLANS);
    return raw ? JSON.parse(raw) : [];
  },

  saveChallan(challan: DeliveryChallan): DeliveryChallan {
    const challans = this.getChallans();
    const idx = challans.findIndex((c) => c.id === challan.id);
    if (idx >= 0) {
      challans[idx] = challan;
    } else {
      challans.unshift(challan);
    }
    localStorage.setItem(DB_KEYS.CHALLANS, JSON.stringify(challans));
    notifyDataChanged();
    return challan;
  },

  deleteChallan(id: string): void {
    const challans = this.getChallans().filter((c) => c.id !== id);
    localStorage.setItem(DB_KEYS.CHALLANS, JSON.stringify(challans));
    notifyDataChanged();
  },

  // Expenses
  getExpenses(): Expense[] {
    const raw = localStorage.getItem(DB_KEYS.EXPENSES);
    if (!raw) {
      localStorage.setItem(DB_KEYS.EXPENSES, JSON.stringify([]));
      return [];
    }
    return JSON.parse(raw);
  },

  saveExpense(expense: Expense): Expense {
    const expenses = this.getExpenses();
    const idx = expenses.findIndex((e) => e.id === expense.id);
    if (idx >= 0) {
      expenses[idx] = expense;
    } else {
      expenses.unshift(expense);
    }
    localStorage.setItem(DB_KEYS.EXPENSES, JSON.stringify(expenses));
    notifyDataChanged();
    return expense;
  },

  deleteExpense(id: string): void {
    const expenses = this.getExpenses().filter((e) => e.id !== id);
    localStorage.setItem(DB_KEYS.EXPENSES, JSON.stringify(expenses));
    notifyDataChanged();
  },

  // Settings
  getSettings(): BusinessSettings {
    const raw = localStorage.getItem(DB_KEYS.SETTINGS);
    if (!raw) {
      localStorage.setItem(DB_KEYS.SETTINGS, JSON.stringify(DEFAULT_BUSINESS_SETTINGS));
      return DEFAULT_BUSINESS_SETTINGS;
    }
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_BUSINESS_SETTINGS,
      ...parsed,
      invoiceCustomization: {
        ...DEFAULT_BUSINESS_SETTINGS.invoiceCustomization!,
        ...(parsed.invoiceCustomization || {}),
      },
      hardwareSettings: {
        ...DEFAULT_BUSINESS_SETTINGS.hardwareSettings,
        ...(parsed.hardwareSettings || {}),
      },
      generalSettings: {
        ...DEFAULT_BUSINESS_SETTINGS.generalSettings!,
        ...(parsed.generalSettings || {}),
      },
      transactionSettings: {
        ...DEFAULT_BUSINESS_SETTINGS.transactionSettings!,
        ...(parsed.transactionSettings || {}),
      },
      partySettings: {
        ...DEFAULT_BUSINESS_SETTINGS.partySettings!,
        ...(parsed.partySettings || {}),
      },
      itemSettings: {
        ...DEFAULT_BUSINESS_SETTINGS.itemSettings!,
        ...(parsed.itemSettings || {}),
      },
      taxesGstSettings: {
        ...DEFAULT_BUSINESS_SETTINGS.taxesGstSettings!,
        ...(parsed.taxesGstSettings || {}),
      },
      transactionMessages: {
        ...DEFAULT_BUSINESS_SETTINGS.transactionMessages!,
        ...(parsed.transactionMessages || {}),
      },
      serviceReminders: {
        ...DEFAULT_BUSINESS_SETTINGS.serviceReminders!,
        ...(parsed.serviceReminders || {}),
      },
      accountingSettings: {
        ...DEFAULT_BUSINESS_SETTINGS.accountingSettings!,
        ...(parsed.accountingSettings || {}),
      },
      multiCurrencySettings: {
        ...DEFAULT_BUSINESS_SETTINGS.multiCurrencySettings!,
        ...(parsed.multiCurrencySettings || {}),
      },
    };
  },

  saveSettings(settings: BusinessSettings): BusinessSettings {
    localStorage.setItem(DB_KEYS.SETTINGS, JSON.stringify(settings));
    notifyDataChanged();
    return settings;
  },

  // Reset / Clear all application data
  clearAllData(): void {
    const keysToReset = [
      DB_KEYS.INVOICES,
      DB_KEYS.CUSTOMERS,
      DB_KEYS.PRODUCTS,
      DB_KEYS.LEDGER,
      DB_KEYS.QUOTATIONS,
      DB_KEYS.CHALLANS,
      DB_KEYS.EXPENSES,
    ];
    keysToReset.forEach((k) => localStorage.setItem(k, JSON.stringify([])));
    notifyDataChanged();
  },

  // Full Database Backup & Restore
  exportDatabaseJSON(): string {
    const fullDump = {
      version: "2.0",
      exportedAt: new Date().toISOString(),
      invoices: this.getInvoices(),
      customers: this.getCustomers(),
      products: this.getProducts(),
      ledger: this.getLedger(),
      quotations: this.getQuotations(),
      challans: this.getChallans(),
      expenses: this.getExpenses(),
      settings: this.getSettings(),
    };
    return JSON.stringify(fullDump, null, 2);
  },

  importDatabaseJSON(jsonStr: string): boolean {
    try {
      const data = JSON.parse(jsonStr);
      if (data.invoices) localStorage.setItem(DB_KEYS.INVOICES, JSON.stringify(data.invoices));
      if (data.customers) localStorage.setItem(DB_KEYS.CUSTOMERS, JSON.stringify(data.customers));
      if (data.products) localStorage.setItem(DB_KEYS.PRODUCTS, JSON.stringify(data.products));
      if (data.ledger) localStorage.setItem(DB_KEYS.LEDGER, JSON.stringify(data.ledger));
      if (data.quotations) localStorage.setItem(DB_KEYS.QUOTATIONS, JSON.stringify(data.quotations));
      if (data.challans) localStorage.setItem(DB_KEYS.CHALLANS, JSON.stringify(data.challans));
      if (data.expenses) localStorage.setItem(DB_KEYS.EXPENSES, JSON.stringify(data.expenses));
      if (data.settings) localStorage.setItem(DB_KEYS.SETTINGS, JSON.stringify(data.settings));
      notifyDataChanged();
      return true;
    } catch (err) {
      console.error("Failed to import database:", err);
      return false;
    }
  },
};
