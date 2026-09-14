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
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { PlansPricingView } from './components/pricing/PlansPricingView';
import { TrialExpiredModal } from './components/common/TrialExpiredModal';
import { licenseService } from './services/license';
import { calculateInvoiceTotals } from './services/gstCalculator';
import { formatINR, formatDate, getLocalDateISO } from './utils/formatters';
import { Plus, ArrowDownLeft, CheckCircle2, ShoppingBag, Receipt, ArrowRight } from 'lucide-react';
import { UserProfile } from './types';

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
  const [isOnboarded, setIsOnboarded] = useState<boolean>(() => dbService.isOnboardingCompleted());
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => dbService.getUserProfile());
  const [isTrialExpired, setIsTrialExpired] = useState<boolean>(() => licenseService.isTrialExpired());

  // Listen for license updates and trial expiration
  useEffect(() => {
    const handleLicenseUpdate = () => {
      setIsTrialExpired(licenseService.isTrialExpired());
    };
    window.addEventListener('prosale_license_updated', handleLicenseUpdate);
    return () => window.removeEventListener('prosale_license_updated', handleLicenseUpdate);
  }, []);

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
    setInvoices(dbService.getInvoices());
    setCustomers(dbService.getCustomers());
    setProducts(dbService.getProducts());
    setExpenses(dbService.getExpenses());
    setLedgerEntries(dbService.getLedger());
    setQuotations(dbService.getQuotations());
    setChallans(dbService.getChallans());
    setSettings(dbService.getSettings());
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
    link.download = `ProSale_Backup_${getLocalDateISO()}.json`;
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
    if (window.confirm('Are you sure you want to completely wipe all application data and restart setup from scratch?')) {
      dbService.resetAllDataAndOnboarding();
      setIsOnboarded(false);
      reloadData();
    }
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
      date: getLocalDateISO(),
      dueDate: getLocalDateISO(new Date(Date.now() + 15 * 86400000)),
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
      date: getLocalDateISO(),
      dueDate: getLocalDateISO(),
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

  // If initial setup / onboarding has not been completed, present Apple Onboarding Flow
  if (!isOnboarded) {
    return (
      <OnboardingFlow
        onComplete={(user, bizSettings) => {
          setUserProfile(user);
          setSettings(bizSettings);
          setIsOnboarded(true);
          reloadData();
        }}
      />
    );
  }

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
        /* Dedicated Plans & Pricing View */
        <PlansPricingView
          onRestartOnboarding={() => {
            if (window.confirm('Restart initial setup and onboarding tour? Your existing invoices and items will remain intact.')) {
              dbService.setOnboardingCompleted(false);
              setIsOnboarded(false);
            }
          }}
          onGoToBackup={() => {
            setCurrentTab('settings');
            setActiveSubTab('backup');
          }}
          onGoToDashboard={() => setCurrentTab('home')}
        />
      )}

      {/* ========================================================================= */}
      {/* 4. MODALS & POPUPS                                                        */}
      {/* ========================================================================= */}

      {/* + Add Sale Full POS Overlay */}
      {isAddSaleOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-900/40 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 overflow-y-auto no-print">
          <div className="w-full max-w-[1550px] h-full sm:h-auto sm:max-h-[96vh] overflow-y-auto bg-[#f5f5f7] rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border border-neutral-200/80 animate-in fade-in zoom-in-95 duration-200">
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
        <form onSubmit={handleQuickPurchaseSubmit} className="space-y-4 text-xs text-neutral-900">
          {/* Quick Toggle */}
          <div className="flex items-center space-x-1 p-1 bg-neutral-100 border border-neutral-200 rounded-xl">
            <button
              type="button"
              onClick={() =>
                setPurchaseForm((prev) => ({
                  ...prev,
                  isStockPurchase: true,
                  category: 'Raw Material & Inventory Purchases',
                }))
              }
              className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                purchaseForm.isStockPurchase
                  ? 'bg-white text-black shadow-xs border border-neutral-200/60'
                  : 'text-neutral-500 hover:text-neutral-900'
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
              className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                !purchaseForm.isStockPurchase
                  ? 'bg-white text-black shadow-xs border border-neutral-200/60'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Operating Expense
            </button>
          </div>

          {purchaseForm.isStockPurchase && products.length > 0 && (
            <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2">
              <label className="block font-semibold text-neutral-700 mb-1">
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
                className="w-full p-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-900 text-xs focus:outline-none focus:border-black"
              >
                <option value="" className="bg-white text-neutral-900">-- General Stock / Raw Material --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id} className="bg-white text-neutral-900">
                    {p.name} (Stock: {p.stock} {p.unit || 'pcs'})
                  </option>
                ))}
              </select>

              {purchaseForm.selectedProductId && (
                <div className="flex items-center space-x-2 pt-1">
                  <div className="w-1/2">
                    <label className="block text-[11px] font-semibold text-neutral-600 mb-0.5">Inward Qty</label>
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
                      className="w-full p-2 rounded-xl border border-neutral-200 bg-white text-neutral-900 font-mono font-bold focus:outline-none focus:border-black"
                    />
                  </div>
                  <div className="w-1/2">
                    <span className="text-[11px] text-emerald-600 block mt-4 font-semibold">
                      Auto-updates stock on save
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block font-semibold text-neutral-700 mb-1">
              {purchaseForm.isStockPurchase ? 'Supplier / Vendor Name *' : 'Paid To / Vendor *'}
            </label>
            <input
              type="text"
              required
              placeholder={purchaseForm.isStockPurchase ? 'e.g. M/s Agarwal Packaging' : 'e.g. Landlord / Shop Rent'}
              value={purchaseForm.paidTo}
              onChange={(e) => setPurchaseForm({ ...purchaseForm, paidTo: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {!purchaseForm.isStockPurchase && (
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Category</label>
                <select
                  value={purchaseForm.category}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, category: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 focus:outline-none focus:border-black focus:bg-white"
                >
                  <option value="Rent" className="bg-white text-neutral-900">Showroom Rent</option>
                  <option value="Salaries" className="bg-white text-neutral-900">Staff Salaries</option>
                  <option value="Electricity & Water" className="bg-white text-neutral-900">Utility Bills</option>
                  <option value="Logistics & Transport" className="bg-white text-neutral-900">Logistics & Transport</option>
                  <option value="Office & Tea" className="bg-white text-neutral-900">Petty Cash & Snacks</option>
                  <option value="Maintenance" className="bg-white text-neutral-900">Store Maintenance</option>
                  <option value="Marketing" className="bg-white text-neutral-900">Advertising</option>
                  <option value="Tax & Compliance" className="bg-white text-neutral-900">Tax & Compliance</option>
                  <option value="Others" className="bg-white text-neutral-900">Others</option>
                </select>
              </div>
            )}

            <div className={purchaseForm.isStockPurchase ? 'col-span-2' : ''}>
              <label className="block font-semibold text-neutral-700 mb-1">Total Amount (₹) *</label>
              <input
                type="number"
                required
                min="1"
                value={purchaseForm.amount}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, amount: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 font-mono font-bold text-neutral-900 focus:outline-none focus:border-black focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Payment Mode</label>
              <select
                value={purchaseForm.paymentMode}
                onChange={(e) =>
                  setPurchaseForm({ ...purchaseForm, paymentMode: e.target.value as 'CASH' | 'UPI' | 'BANK' })
                }
                className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 focus:outline-none focus:border-black focus:bg-white"
              >
                <option value="BANK" className="bg-white text-neutral-900">Bank Transfer / NEFT</option>
                <option value="UPI" className="bg-white text-neutral-900">UPI / QR</option>
                <option value="CASH" className="bg-white text-neutral-900">Cash</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Invoice / Bill Ref No</label>
              <input
                type="text"
                placeholder="PUR-2026-01"
                value={purchaseForm.receiptNo}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, receiptNo: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black focus:bg-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-neutral-700 mb-1">Description / Notes</label>
            <input
              type="text"
              placeholder="Goods inward / payment details"
              value={purchaseForm.description}
              onChange={(e) => setPurchaseForm({ ...purchaseForm, description: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black focus:bg-white"
            />
          </div>

          <div className="pt-2 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setIsAddPurchaseOpen(false)}
              className="px-4 py-2 rounded-xl text-neutral-500 hover:text-neutral-900 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
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
          <div className="p-6 text-center text-xs text-neutral-500 space-y-3">
            <p className="text-neutral-900 font-semibold">No customers registered yet.</p>
            <p className="text-neutral-500">Please add a customer under the Parties tab before recording incoming payments.</p>
            <button
              type="button"
              onClick={() => {
                setIsReceivePaymentOpen(false);
                setCurrentTab('parties');
              }}
              className="px-4 py-2 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
            >
              Go to Parties & Add Client
            </button>
          </div>
        ) : (
          <form onSubmit={handleQuickPaymentSubmit} className="space-y-4 text-xs text-neutral-900">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Select Customer *</label>
              <select
                value={paymentForm.customerId}
                onChange={(e) => setPaymentForm({ ...paymentForm, customerId: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 focus:outline-none focus:border-black focus:bg-white"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id} className="bg-white text-neutral-900">
                    {c.name} {c.currentBalance > 0 ? `(Pending Balance: ₹${c.currentBalance.toLocaleString('en-IN')})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Amount Received (₹) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 font-mono font-bold text-neutral-900 focus:outline-none focus:border-black focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Payment Mode</label>
                <select
                  value={paymentForm.paymentMode}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMode: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 focus:outline-none focus:border-black focus:bg-white"
                >
                  <option value="UPI" className="bg-white text-neutral-900">UPI / QR Code</option>
                  <option value="CASH" className="bg-white text-neutral-900">Cash</option>
                  <option value="BANK" className="bg-white text-neutral-900">Bank Transfer / NEFT</option>
                  <option value="CHEQUE" className="bg-white text-neutral-900">Cheque</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Notes / Remarks</label>
              <input
                type="text"
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black focus:bg-white"
              />
            </div>

            <div className="pt-2 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsReceivePaymentOpen(false)}
                className="px-4 py-2 rounded-xl text-neutral-500 hover:text-neutral-900 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
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

      {/* Strict 6-Day Trial Expiration Modal */}
      <TrialExpiredModal
        isOpen={isTrialExpired}
        onSuccess={() => {
          setIsTrialExpired(false);
          reloadData();
        }}
      />
    </VyaparLayout>
  );
};

export default App;
