import React, { useState, useEffect, useRef, useCallback } from 'react';
import { dbService } from './services/db';
import {
  Invoice,
  Customer,
  Product,
  Expense,
  CustomerLedgerEntry,
  Quotation,
  DeliveryChallan,
  BusinessSettings,
  PaymentMode,
} from './types';
import { VyaparLayout, MainNavTab, GstrReportTab } from './components/vyapar/VyaparLayout';
import { VyaparDashboardHome } from './components/vyapar/VyaparDashboardHome';
import { GstrReportsView } from './components/vyapar/GstrReportsView';
import { CustomerLedgerView } from './components/customers/CustomerLedgerView';
import { InventoryView } from './components/inventory/InventoryView';
import { ExpenseView } from './components/expenses/ExpenseView';
import { SettingsView } from './components/settings/SettingsView';
import { BillingPOS } from './components/billing/BillingPOS';
import { SaleInvoicesView } from './components/billing/SaleInvoicesView';
import { InvoicePreviewModal } from './components/billing/InvoicePreviewModal';
import { QuotationView } from './components/quotations/QuotationView';
import { DeliveryChallanView } from './components/challans/DeliveryChallanView';
import { EwayEinvoiceView } from './components/einvoice/EwayEinvoiceView';
import { CashBankView } from './components/cashbank/CashBankView';
import { UtilitiesView } from './components/utilities/UtilitiesView';
import { AppleModal } from './components/common/AppleModal';
import { AppInfoModal } from './components/common/AppInfoModal';
import { calculateInvoiceTotals } from './services/gstCalculator';
import { formatINR, formatDate } from './utils/formatters';
import { Plus, ArrowDownLeft, CheckCircle2, ShoppingBag, Receipt, ArrowRight } from 'lucide-react';

export const App: React.FC = () => {
  // 1. Core Data States from local database
  const [invoices, setInvoices] = useState<Invoice[]>(() => dbService.getInvoices());
  const [customers, setCustomers] = useState<Customer[]>(() => dbService.getCustomers());
  const [products, setProducts] = useState<Product[]>(() => dbService.getProducts());
  const [expenses, setExpenses] = useState<Expense[]>(() => dbService.getExpenses());
  const [ledgerEntries, setLedgerEntries] = useState<CustomerLedgerEntry[]>(() => dbService.getLedger());
  const [quotations, setQuotations] = useState<Quotation[]>(() => dbService.getQuotations());
  const [challans, setChallans] = useState<DeliveryChallan[]>(() => dbService.getChallans());
  const [settings, setSettings] = useState<BusinessSettings>(() => dbService.getSettings());

  // Real-time live sync indicators (internal)
  const [isSyncing, setIsSyncing] = useState(false);
  const lastFingerprintRef = useRef<string>('');

  // 2. Navigation State (Defaults to Home Dashboard)
  const [currentTab, setCurrentTab] = useState<MainNavTab>('home');
  const [activeReport, setActiveReport] = useState<GstrReportTab>('GSTR 1');
  const [activeSubTab, setActiveSubTab] = useState<string>('dashboard_overview');

  // 3. Modal / Overlay States
  const [isAddSaleOpen, setIsAddSaleOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [isAddPurchaseOpen, setIsAddPurchaseOpen] = useState(false);
  const [isReceivePaymentOpen, setIsReceivePaymentOpen] = useState(false);
  const [selectedInvoiceForPreview, setSelectedInvoiceForPreview] = useState<Invoice | null>(null);
  const [isAppInfoOpen, setIsAppInfoOpen] = useState(false);

  // Quick Purchase Voucher Form State
  const [purchaseForm, setPurchaseForm] = useState({
    paidTo: '',
    category: 'Raw Material & Inventory Purchases',
    amount: '',
    paymentMode: 'BANK' as 'CASH' | 'UPI' | 'BANK',
    receiptNo: '',
    description: '',
    selectedProductId: '',
    qty: 1,
    isStockPurchase: true,
  });

  // Quick Payment Receipt Form State
  const [paymentForm, setPaymentForm] = useState({
    customerId: customers[0]?.id || '',
    amount: '',
    paymentMode: 'UPI',
    notes: 'Payment received against outstanding bills',
  });

  // Keep payment customer ID in sync when customers are added
  useEffect(() => {
    if (!paymentForm.customerId && customers.length > 0) {
      setPaymentForm((prev) => ({ ...prev, customerId: customers[0].id }));
    }
  }, [customers, paymentForm.customerId]);

  // Reload data helper
  const reloadData = useCallback(() => {
    setIsSyncing(true);
    setInvoices(dbService.getInvoices());
    setCustomers(dbService.getCustomers());
    setProducts(dbService.getProducts());
    setExpenses(dbService.getExpenses());
    setLedgerEntries(dbService.getLedger());
    setQuotations(dbService.getQuotations());
    setChallans(dbService.getChallans());
    setSettings(dbService.getSettings());
    setTimeout(() => setIsSyncing(false), 250);
  }, []);

  // Real-time automatic data sync without requiring manual Cmd+R
  useEffect(() => {
    // 1. Listen for local internal database mutations
    const handleDbUpdated = () => {
      reloadData();
    };
    window.addEventListener('prosale_db_updated', handleDbUpdated);

    // 2. Listen for cross-tab storage events
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('prosale_')) {
        reloadData();
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    // 3. Sync immediately when tab is focused or becomes visible
    const handleFocus = () => reloadData();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        reloadData();
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 4. Lightweight 1.5-second heartbeat poller to guarantee continuous live state
    const computeFingerprint = () => {
      try {
        return [
          localStorage.getItem('prosale_invoices_v2') || '',
          localStorage.getItem('prosale_customers_v2') || '',
          localStorage.getItem('prosale_products_v2') || '',
          localStorage.getItem('prosale_expenses_v2') || '',
          localStorage.getItem('prosale_ledger_v2') || '',
          localStorage.getItem('prosale_quotations_v2') || '',
          localStorage.getItem('prosale_challans_v2') || '',
          localStorage.getItem('prosale_settings_v2') || '',
        ]
          .map((s) => `${s.length}_${s.slice(0, 15)}_${s.slice(-15)}`)
          .join('|');
      } catch {
        return '';
      }
    };

    lastFingerprintRef.current = computeFingerprint();

    const intervalId = setInterval(() => {
      const currentFingerprint = computeFingerprint();
      if (lastFingerprintRef.current && currentFingerprint !== lastFingerprintRef.current) {
        lastFingerprintRef.current = currentFingerprint;
        reloadData();
      }
    }, 1500);

    return () => {
      window.removeEventListener('prosale_db_updated', handleDbUpdated);
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [reloadData]);

  // Keyboard Shortcuts (F2: New Sale, F3: New Purchase, F4: Payment)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setIsAppInfoOpen(true);
      } else if (e.key === 'F2') {
        e.preventDefault();
        setEditingInvoice(null);
        setCurrentTab('sale');
        setActiveSubTab('new_sale');
      } else if (e.key === 'F3') {
        e.preventDefault();
        setIsAddPurchaseOpen(true);
      } else if (e.key === 'F4') {
        e.preventDefault();
        setIsReceivePaymentOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Invoice Handlers
  const handleSaveInvoice = (invoice: Invoice) => {
    dbService.saveInvoice(invoice);
    reloadData();
    setIsAddSaleOpen(false);
    setEditingInvoice(null);
    if (currentTab === 'sale' && activeSubTab === 'new_sale') {
      setActiveSubTab('invoices');
    }
    setSelectedInvoiceForPreview(invoice);
  };

  const handleDeleteInvoice = (id: string) => {
    dbService.deleteInvoice(id);
    reloadData();
  };

  const handleEditInvoice = (inv: Invoice) => {
    setEditingInvoice(inv);
    setCurrentTab('sale');
    setActiveSubTab('new_sale');
  };

  const handleOpenNewSale = () => {
    setEditingInvoice(null);
    setCurrentTab('sale');
    setActiveSubTab('new_sale');
  };

  // Customer Handlers
  const handleSaveCustomer = (customer: Customer) => {
    dbService.saveCustomer(customer);
    reloadData();
  };

  const handleRecordPayment = (customerId: string, amount: number, mode: string, note: string) => {
    dbService.addLedgerEntry({
      id: 'ledg-' + Date.now(),
      customerId,
      date: new Date().toISOString(),
      type: 'PAYMENT_RECEIVED',
      referenceNumber: 'RCT-' + Math.floor(1000 + Math.random() * 9000),
      debit: 0,
      credit: amount,
      balance: 0,
      notes: note || 'Payment received',
      paymentMode: mode,
    });
    dbService.updateCustomerBalance(customerId, -amount);
    reloadData();
  };

  // Product Handlers
  const handleSaveProduct = (product: Product) => {
    dbService.saveProduct(product);
    reloadData();
  };

  const handleDeleteProduct = (id: string) => {
    dbService.deleteProduct(id);
    reloadData();
  };

  const handleAdjustStock = (id: string, delta: number) => {
    dbService.updateStock(id, delta);
    reloadData();
  };

  // Expense Handlers
  const handleSaveExpense = (expense: Expense) => {
    dbService.saveExpense(expense);
    reloadData();
  };

  const handleDeleteExpense = (id: string) => {
    dbService.deleteExpense(id);
    reloadData();
  };

  // Quick Purchase Submit
  const handleQuickPurchaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseForm.amount) return;
    const newExp: Expense = {
      id: 'exp-' + Date.now(),
      date: new Date().toISOString(),
      category: purchaseForm.category as any,
      amount: parseFloat(purchaseForm.amount),
      paymentMode: purchaseForm.paymentMode,
      paidTo: purchaseForm.paidTo || (purchaseForm.isStockPurchase ? 'Stock Supplier / Vendor' : 'Vendor'),
      receiptNo: purchaseForm.receiptNo,
      productId: purchaseForm.isStockPurchase && purchaseForm.selectedProductId ? purchaseForm.selectedProductId : undefined,
      qty: purchaseForm.isStockPurchase && purchaseForm.qty ? purchaseForm.qty : undefined,
      description: purchaseForm.description || (purchaseForm.isStockPurchase ? 'Inventory inward purchase bill' : 'Operational expense voucher'),
      createdAt: new Date().toISOString(),
    };
    dbService.saveExpense(newExp);

    // If stock purchase linked to product, adjust inventory stock
    if (purchaseForm.isStockPurchase && purchaseForm.selectedProductId && purchaseForm.qty > 0) {
      dbService.updateStock(purchaseForm.selectedProductId, purchaseForm.qty);
    }

    reloadData();
    setIsAddPurchaseOpen(false);
    setPurchaseForm({
      paidTo: '',
      category: 'Raw Material & Inventory Purchases',
      amount: '',
      paymentMode: 'BANK',
      receiptNo: '',
      description: '',
      selectedProductId: '',
      qty: 1,
      isStockPurchase: true,
    });
  };

  // Quick Payment Receive Submit
  const handleQuickPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.amount || !paymentForm.customerId) return;
    handleRecordPayment(
      paymentForm.customerId,
      parseFloat(paymentForm.amount),
      paymentForm.paymentMode,
      paymentForm.notes
    );
    setIsReceivePaymentOpen(false);
    setPaymentForm({
      customerId: customers[0]?.id || '',
      amount: '',
      paymentMode: 'UPI',
      notes: 'Payment received against outstanding bills',
    });
  };

  // Settings Handlers
  const handleSaveSettings = (newSettings: BusinessSettings) => {
    dbService.saveSettings(newSettings);
    setSettings(newSettings);
  };

  const handleExportBackup = () => {
    const jsonStr = dbService.exportDatabaseJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ProSale_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (jsonStr: string): boolean => {
    const success = dbService.importDatabaseJSON(jsonStr);
    if (success) {
      reloadData();
    }
    return success;
  };

  const handleClearAllData = () => {
    dbService.clearAllData();
    reloadData();
  };

  // Quotation Handlers
  const handleSaveQuotation = (q: Quotation) => {
    dbService.saveQuotation(q);
    reloadData();
  };

  const handleConvertQuoteToInvoice = (q: Quotation) => {
    const isInterState = q.customer.stateCode !== settings.stateCode;
    const totals = calculateInvoiceTotals(q.items, isInterState, 0);

    const newInvoice: Invoice = {
      id: 'inv-' + Date.now(),
      invoiceNumber: `${settings.invoicePrefix}${String(settings.nextInvoiceNumber).padStart(4, '0')}`,
      date: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
      type: 'TAX_INVOICE',
      saleType: 'CREDIT',
      customer: q.customer,
      items: totals.items,
      subtotal: totals.subtotal,
      itemDiscountTotal: totals.itemDiscountTotal,
      billDiscount: 0,
      taxableTotal: totals.taxableTotal,
      cgstTotal: totals.cgstTotal,
      sgstTotal: totals.sgstTotal,
      igstTotal: totals.igstTotal,
      roundOff: totals.roundOff,
      grandTotal: totals.grandTotal,
      paidAmount: 0,
      balanceAmount: totals.grandTotal,
      paymentMode: 'CREDIT',
      splitPayments: [],
      notes: `Converted from Quotation #${q.quoteNumber}`,
      terms: settings.termsAndConditions,
      status: 'UNPAID',
      totalProfit: totals.totalProfit,
      isInterState,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    dbService.saveInvoice(newInvoice);
    dbService.saveQuotation({ ...q, status: 'CONVERTED', convertedInvoiceId: newInvoice.id });
    reloadData();
    setSelectedInvoiceForPreview(newInvoice);
  };

  // Challan Handlers
  const handleSaveChallan = (c: DeliveryChallan) => {
    dbService.saveChallan(c);
    reloadData();
  };

  const handleConvertChallanToInvoice = (c: DeliveryChallan) => {
    const isInterState = c.customer.stateCode !== settings.stateCode;
    const totals = calculateInvoiceTotals(c.items, isInterState, 0);

    const newInvoice: Invoice = {
      id: 'inv-' + Date.now(),
      invoiceNumber: `${settings.invoicePrefix}${String(settings.nextInvoiceNumber).padStart(4, '0')}`,
      date: new Date().toISOString().slice(0, 10),
      dueDate: new Date().toISOString().slice(0, 10),
      type: 'TAX_INVOICE',
      saleType: 'CREDIT',
      customer: c.customer,
      items: totals.items,
      subtotal: totals.subtotal,
      itemDiscountTotal: totals.itemDiscountTotal,
      billDiscount: 0,
      taxableTotal: totals.taxableTotal,
      cgstTotal: totals.cgstTotal,
      sgstTotal: totals.sgstTotal,
      igstTotal: totals.igstTotal,
      roundOff: totals.roundOff,
      grandTotal: totals.grandTotal,
      paidAmount: 0,
      balanceAmount: totals.grandTotal,
      paymentMode: 'CREDIT',
      splitPayments: [],
      notes: `Generated against Delivery Challan #${c.challanNumber}`,
      terms: settings.termsAndConditions,
      status: 'UNPAID',
      totalProfit: totals.totalProfit,
      isInterState,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    dbService.saveInvoice(newInvoice);
    dbService.saveChallan({ ...c, status: 'CONVERTED', convertedInvoiceId: newInvoice.id });
    reloadData();
    setSelectedInvoiceForPreview(newInvoice);
  };

  // Invoiced Gross Profit for net profit tracking
  const invoicedGrossProfit = invoices.reduce((sum, inv) => sum + (inv.totalProfit || 0), 0);

  return (
    <VyaparLayout
      currentTab={currentTab}
      setCurrentTab={setCurrentTab}
      activeReport={activeReport}
      setActiveReport={setActiveReport}
      activeSubTab={activeSubTab}
      setActiveSubTab={setActiveSubTab}
      settings={settings}
      onOpenAddSale={handleOpenNewSale}
      onOpenAddPurchase={() => setIsAddPurchaseOpen(true)}
      onOpenAppInfo={() => setIsAppInfoOpen(true)}
    >
      {/* Dynamic View Switcher */}
      {currentTab === 'reports' ? (
        <GstrReportsView
          invoices={invoices}
          products={products}
          customers={customers}
          expenses={expenses}
          settings={settings}
          activeReportType={activeReport}
          onSelectInvoice={(inv) => setSelectedInvoiceForPreview(inv)}
        />
      ) : currentTab === 'home' ? (
        <VyaparDashboardHome
          invoices={invoices}
          customers={customers}
          products={products}
          expenses={expenses}
          settings={settings}
          activeSubTab={activeSubTab}
          onOpenAddSale={handleOpenNewSale}
          onOpenAddPurchase={() => setIsAddPurchaseOpen(true)}
          onOpenAddPayment={() => setIsReceivePaymentOpen(true)}
          onSelectInvoice={(inv) => setSelectedInvoiceForPreview(inv)}
          onNavigateTab={(tab) => setCurrentTab(tab as MainNavTab)}
        />
      ) : currentTab === 'parties' ? (
        <CustomerLedgerView
          customers={customers}
          ledgerEntries={ledgerEntries}
          settings={settings}
          activeSubTab={activeSubTab}
          onSaveCustomer={handleSaveCustomer}
          onRecordPayment={handleRecordPayment}
        />
      ) : currentTab === 'items' ? (
        <InventoryView
          products={products}
          settings={settings}
          onSaveProduct={handleSaveProduct}
          onDeleteProduct={handleDeleteProduct}
          onAdjustStock={handleAdjustStock}
          activeSubTab={activeSubTab}
        />
      ) : currentTab === 'sale' ? (
        activeSubTab === 'quotations' ? (
          <QuotationView
            quotations={quotations}
            products={products}
            customers={customers}
            settings={settings}
            onSaveQuotation={handleSaveQuotation}
            onConvertToInvoice={handleConvertQuoteToInvoice}
            onDeleteQuotation={(id) => {
              dbService.deleteQuotation(id);
              reloadData();
            }}
          />
        ) : activeSubTab === 'challans' ? (
          <DeliveryChallanView
            challans={challans}
            products={products}
            customers={customers}
            settings={settings}
            onSaveChallan={handleSaveChallan}
            onConvertToInvoice={handleConvertChallanToInvoice}
            onDeleteChallan={(id) => {
              dbService.deleteChallan(id);
              reloadData();
            }}
          />
        ) : activeSubTab === 'new_sale' ? (
          <BillingPOS
            products={products}
            customers={customers}
            settings={settings}
            initialInvoice={editingInvoice}
            onSaveInvoice={handleSaveInvoice}
            onAddNewCustomer={handleSaveCustomer}
            onAddNewProduct={handleSaveProduct}
            onCancelEdit={() => {
              setEditingInvoice(null);
              setActiveSubTab('invoices');
            }}
          />
        ) : (
          <SaleInvoicesView
            invoices={invoices}
            settings={settings}
            onOpenNewSale={handleOpenNewSale}
            onEditInvoice={handleEditInvoice}
            onDeleteInvoice={handleDeleteInvoice}
            onSelectInvoiceForPreview={(inv) => setSelectedInvoiceForPreview(inv)}
          />
        )
      ) : currentTab === 'purchase' ? (
        <ExpenseView
          expenses={expenses}
          invoicedGrossProfit={invoicedGrossProfit}
          settings={settings}
          activeSubTab={activeSubTab}
          products={products}
          onSaveExpense={handleSaveExpense}
          onDeleteExpense={handleDeleteExpense}
          onAdjustStock={handleAdjustStock}
        />
      ) : currentTab === 'grow' ? (
        <EwayEinvoiceView
          invoices={invoices}
          settings={settings}
          onUpdateInvoice={(inv) => {
            dbService.saveInvoice(inv);
            reloadData();
          }}
        />
      ) : currentTab === 'cash_bank' ? (
        <CashBankView
          invoices={invoices}
          expenses={expenses}
          settings={settings}
          ledgerEntries={ledgerEntries}
          activeSubTab={activeSubTab}
          onOpenAddExpense={() => setIsAddPurchaseOpen(true)}
          onOpenAddSale={handleOpenNewSale}
        />
      ) : currentTab === 'utilities' ? (
        <UtilitiesView
          products={products}
          customers={customers}
          settings={settings}
          activeSubTab={activeSubTab}
          onSaveProduct={handleSaveProduct}
          onSaveCustomer={handleSaveCustomer}
        />
      ) : currentTab === 'backup' || currentTab === 'settings' ? (
        <SettingsView
          settings={settings}
          activeSubTab={currentTab === 'backup' ? 'backup' : activeSubTab}
          onSelectSubTab={setActiveSubTab}
          onSaveSettings={handleSaveSettings}
          onExportBackup={handleExportBackup}
          onImportBackup={handleImportBackup}
          onClearAllData={handleClearAllData}
          onOpenAppInfo={() => setIsAppInfoOpen(true)}
        />
      ) : (
        /* Dedicated Plans & Pricing / System Status View */
        <div className="max-w-4xl mx-auto p-8 space-y-6">
          <div className="bg-white rounded-3xl border border-gray-200/80 p-8 shadow-apple-subtle text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold uppercase tracking-wider">
                Enterprise License Active
              </span>
              <h2 className="text-2xl font-bold text-gray-900 mt-3">Pro.Sale Full Desktop Edition</h2>
              <p className="text-xs text-gray-500 max-w-lg mx-auto mt-1">
                Your installation is completely unlocked with full lifetime access. No subscription fees, no internet connection required for billing, and 100% offline data privacy.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-left max-w-2xl mx-auto">
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <p className="text-[11px] text-gray-500 font-medium">License Status</p>
                <p className="text-sm font-bold text-emerald-600 mt-1">Lifetime Valid</p>
              </div>
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <p className="text-[11px] text-gray-500 font-medium">GST & Compliance</p>
                <p className="text-sm font-bold text-gray-800 mt-1">All 11 Reports</p>
              </div>
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <p className="text-[11px] text-gray-500 font-medium">Local Database</p>
                <p className="text-sm font-bold text-gray-800 mt-1">IndexedDB / Local</p>
              </div>
            </div>

            <div className="pt-4 flex justify-center space-x-3">
              <button
                onClick={() => setCurrentTab('home')}
                className="px-5 py-2.5 rounded-xl bg-gray-900 text-white font-semibold text-xs cursor-pointer shadow-apple-subtle hover:bg-black transition-all"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => {
                  setCurrentTab('settings');
                  setActiveSubTab('backup');
                }}
                className="px-5 py-2.5 rounded-xl bg-blue-50 text-[#0284c7] font-semibold text-xs cursor-pointer hover:bg-blue-100 transition-all"
              >
                Backup & Security
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODALS & POPUPS                                                        */}
      {/* ========================================================================= */}

      {/* + Add Sale Full POS Overlay */}
      {isAddSaleOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto no-print">
          <div className="w-full max-w-[1550px] max-h-[96vh] overflow-y-auto bg-[#f4f5f7] rounded-2xl shadow-2xl border border-black/20 animate-in fade-in zoom-in-95 duration-200">
            <BillingPOS
              products={products}
              customers={customers}
              settings={settings}
              initialInvoice={editingInvoice}
              onSaveInvoice={handleSaveInvoice}
              onAddNewCustomer={handleSaveCustomer}
              onAddNewProduct={handleSaveProduct}
              onClose={() => {
                setIsAddSaleOpen(false);
                setEditingInvoice(null);
              }}
              onCancelEdit={() => {
                setIsAddSaleOpen(false);
                setEditingInvoice(null);
              }}
            />
          </div>
        </div>
      )}
      {/* Add Purchase / Expense Modal */}
      <AppleModal
        isOpen={isAddPurchaseOpen}
        onClose={() => setIsAddPurchaseOpen(false)}
        title={purchaseForm.isStockPurchase ? 'Add Stock Purchase Invoice' : 'Add Operational Expense Voucher'}
        subtitle={
          purchaseForm.isStockPurchase
            ? 'Log supplier purchase bill & automatically increase item stock'
            : 'Log operational business overheads'
        }
        maxWidth="max-w-md"
      >
        <form onSubmit={handleQuickPurchaseSubmit} className="space-y-4 text-xs">
          {/* Quick Toggle */}
          <div className="flex items-center space-x-1 p-1 bg-gray-100 rounded-xl">
            <button
              type="button"
              onClick={() =>
                setPurchaseForm((prev) => ({
                  ...prev,
                  isStockPurchase: true,
                  category: 'Raw Material & Inventory Purchases',
                }))
              }
              className={`flex-1 py-1.5 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                purchaseForm.isStockPurchase
                  ? 'bg-white text-[#0071e3] shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Stock Purchase (Inward)
            </button>
            <button
              type="button"
              onClick={() =>
                setPurchaseForm((prev) => ({
                  ...prev,
                  isStockPurchase: false,
                  category: 'Rent',
                }))
              }
              className={`flex-1 py-1.5 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                !purchaseForm.isStockPurchase
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Operating Expense
            </button>
          </div>

          {purchaseForm.isStockPurchase && products.length > 0 && (
            <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-100 space-y-2">
              <label className="block font-semibold text-blue-900 mb-1">
                Select Product to Inward Stock (Optional)
              </label>
              <select
                value={purchaseForm.selectedProductId}
                onChange={(e) => {
                  const pId = e.target.value;
                  const prod = products.find((p) => p.id === pId);
                  const rate = prod ? prod.purchasePrice || prod.salePrice || 0 : 0;
                  setPurchaseForm((prev) => ({
                    ...prev,
                    selectedProductId: pId,
                    amount: rate > 0 ? String(rate * prev.qty) : prev.amount,
                    description: prod ? `Stock inward: ${prod.name} (${prev.qty} ${prod.unit || 'pcs'})` : prev.description,
                  }));
                }}
                className="w-full p-2.5 rounded-xl border border-blue-200 bg-white text-xs focus:ring-2 focus:ring-[#0071e3] focus:outline-none"
              >
                <option value="">-- General Stock / Raw Material --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Stock: {p.stock} {p.unit || 'pcs'})
                  </option>
                ))}
              </select>

              {purchaseForm.selectedProductId && (
                <div className="flex items-center space-x-2 pt-1">
                  <div className="w-1/2">
                    <label className="block text-[11px] font-semibold text-blue-900 mb-0.5">Inward Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={purchaseForm.qty}
                      onChange={(e) => {
                        const q = Math.max(1, parseInt(e.target.value) || 1);
                        const prod = products.find((p) => p.id === purchaseForm.selectedProductId);
                        const rate = prod ? prod.purchasePrice || prod.salePrice || 0 : 0;
                        setPurchaseForm((prev) => ({
                          ...prev,
                          qty: q,
                          amount: rate > 0 ? String(rate * q) : prev.amount,
                          description: prod ? `Stock inward: ${prod.name} (${q} ${prod.unit || 'pcs'})` : prev.description,
                        }));
                      }}
                      className="w-full p-2 rounded-xl border border-blue-200 bg-white font-mono font-bold"
                    />
                  </div>
                  <div className="w-1/2">
                    <span className="text-[11px] text-blue-700 block mt-4 font-medium">
                      Auto-updates stock on save
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              {purchaseForm.isStockPurchase ? 'Supplier / Vendor Name *' : 'Paid To / Vendor *'}
            </label>
            <input
              type="text"
              required
              placeholder={purchaseForm.isStockPurchase ? 'e.g. M/s Agarwal Packaging' : 'e.g. Landlord / Shop Rent'}
              value={purchaseForm.paidTo}
              onChange={(e) => setPurchaseForm({ ...purchaseForm, paidTo: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#0071e3] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {!purchaseForm.isStockPurchase && (
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Category</label>
                <select
                  value={purchaseForm.category}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, category: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-gray-300 bg-gray-50 focus:outline-none"
                >
                  <option value="Rent">Showroom Rent</option>
                  <option value="Salaries">Staff Salaries</option>
                  <option value="Electricity & Water">Utility Bills</option>
                  <option value="Logistics & Transport">Logistics & Transport</option>
                  <option value="Office & Tea">Petty Cash & Snacks</option>
                  <option value="Maintenance">Store Maintenance</option>
                  <option value="Marketing">Advertising</option>
                  <option value="Tax & Compliance">Tax & Compliance</option>
                  <option value="Others">Others</option>
                </select>
              </div>
            )}

            <div className={purchaseForm.isStockPurchase ? 'col-span-2' : ''}>
              <label className="block font-semibold text-gray-700 mb-1">Total Amount (₹) *</label>
              <input
                type="number"
                required
                min="1"
                value={purchaseForm.amount}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, amount: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-gray-300 font-mono font-bold text-gray-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Payment Mode</label>
              <select
                value={purchaseForm.paymentMode}
                onChange={(e) =>
                  setPurchaseForm({ ...purchaseForm, paymentMode: e.target.value as 'CASH' | 'UPI' | 'BANK' })
                }
                className="w-full p-2.5 rounded-xl border border-gray-300 bg-gray-50 focus:outline-none"
              >
                <option value="BANK">Bank Transfer / NEFT</option>
                <option value="UPI">UPI / QR</option>
                <option value="CASH">Cash</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Invoice / Bill Ref No</label>
              <input
                type="text"
                placeholder="PUR-2026-01"
                value={purchaseForm.receiptNo}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, receiptNo: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-gray-300 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Description / Notes</label>
            <input
              type="text"
              placeholder="Goods inward / payment details"
              value={purchaseForm.description}
              onChange={(e) => setPurchaseForm({ ...purchaseForm, description: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-gray-300 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setIsAddPurchaseOpen(false)}
              className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-black hover:bg-neutral-900 text-white font-medium shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              {purchaseForm.isStockPurchase ? 'Save Inward Bill & Restock' : 'Record Expense'}
            </button>
          </div>
        </form>
      </AppleModal>

      {/* Receive Customer Payment Modal */}
      <AppleModal
        isOpen={isReceivePaymentOpen}
        onClose={() => setIsReceivePaymentOpen(false)}
        title="Receive Customer Payment (Voucher In)"
        subtitle="Settle outstanding customer credit and update client ledger"
        maxWidth="max-w-md"
      >
        {customers.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-500 space-y-3">
            <p className="text-gray-600 font-medium">No customers registered yet.</p>
            <p className="text-gray-400">Please add a customer under the Parties tab before recording incoming payments.</p>
            <button
              type="button"
              onClick={() => {
                setIsReceivePaymentOpen(false);
                setCurrentTab('parties');
              }}
              className="px-4 py-2 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-apple-subtle"
            >
              Go to Parties & Add Client
            </button>
          </div>
        ) : (
          <form onSubmit={handleQuickPaymentSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Select Customer *</label>
              <select
                value={paymentForm.customerId}
                onChange={(e) => setPaymentForm({ ...paymentForm, customerId: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-gray-300 bg-gray-50 focus:outline-none"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.currentBalance > 0 ? `(Pending Balance: ₹${c.currentBalance.toLocaleString('en-IN')})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Amount Received (₹) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-gray-300 font-mono font-bold text-gray-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Payment Mode</label>
                <select
                  value={paymentForm.paymentMode}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMode: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-gray-300 bg-gray-50 focus:outline-none"
                >
                  <option value="UPI">UPI / QR Code</option>
                  <option value="CASH">Cash</option>
                  <option value="BANK">Bank Transfer / NEFT</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Notes / Remarks</label>
              <input
                type="text"
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-gray-300 focus:outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsReceivePaymentOpen(false)}
                className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-black hover:bg-neutral-900 text-white font-medium shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                Confirm Payment Voucher
              </button>
            </div>
          </form>
        )}
      </AppleModal>

      {/* Invoice Preview, Thermal & A4 Printing, WhatsApp Share Modal */}
      <InvoicePreviewModal
        isOpen={!!selectedInvoiceForPreview}
        onClose={() => setSelectedInvoiceForPreview(null)}
        invoice={selectedInvoiceForPreview}
        settings={settings}
      />

      {/* App Info & Mandatory Statutory Specifications Modal */}
      <AppInfoModal
        isOpen={isAppInfoOpen}
        onClose={() => setIsAppInfoOpen(false)}
        settings={settings}
        invoices={invoices}
        customers={customers}
        products={products}
        expenses={expenses}
        quotations={quotations}
        challans={challans}
      />
    </VyaparLayout>
  );
};

export default App;
