import React, { useState, useMemo, useRef } from 'react';
import {
  TrendingUp,
  CreditCard,
  Building2,
  Package,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Share2,
  Printer,
  FileCheck2,
  AlertTriangle,
  Receipt,
  Users,
  Wallet,
  ArrowRight,
  Sparkles,
  BarChart3,
  Flame,
  CheckCircle2,
  Search,
  Filter,
  Percent,
} from 'lucide-react';
import { Invoice, Customer, Product, Expense, BusinessSettings } from '../../types';
import { formatINR, formatDate } from '../../utils/formatters';
import { openWhatsApp, generateInvoiceWhatsAppMessage } from '../../services/whatsapp';

interface VyaparDashboardHomeProps {
  invoices: Invoice[];
  customers: Customer[];
  products: Product[];
  expenses: Expense[];
  settings: BusinessSettings;
  activeSubTab?: string;
  onOpenAddSale: () => void;
  onOpenAddPurchase: () => void;
  onOpenAddPayment: () => void;
  onSelectInvoice: (inv: Invoice) => void;
  onNavigateTab: (tab: string) => void;
}

export const VyaparDashboardHome: React.FC<VyaparDashboardHomeProps> = ({
  invoices,
  customers,
  products,
  expenses,
  settings,
  activeSubTab,
  onOpenAddSale,
  onOpenAddPurchase,
  onOpenAddPayment,
  onSelectInvoice,
  onNavigateTab,
}) => {
  // Aggregate Metrics
  const totalSales = useMemo(
    () => invoices.reduce((sum, inv) => sum + inv.grandTotal, 0),
    [invoices]
  );

  const totalGrossProfit = useMemo(
    () => invoices.reduce((sum, inv) => sum + (inv.totalProfit || 0), 0),
    [invoices]
  );

  const totalExpenseAmount = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  );

  // Actual Net Profit = Gross Invoiced Margin - Operating Expenses
  const actualNetProfit = totalGrossProfit - totalExpenseAmount;

  // Credit Amount (Accounts Receivable)
  const totalCreditReceivable = useMemo(
    () => customers.reduce((sum, c) => sum + (c.currentBalance > 0 ? c.currentBalance : 0), 0),
    [customers]
  );
  const creditCustomerCount = useMemo(
    () => customers.filter((c) => c.currentBalance > 0).length,
    [customers]
  );

  // Most Selling Product
  const productSalesMap = useMemo(() => {
    const map: Record<string, { product: Product | null; name: string; qty: number; revenue: number }> = {};
    invoices.forEach((inv) => {
      inv.items.forEach((item) => {
        const key = item.productId || item.name;
        if (!map[key]) {
          const prod = products.find((p) => p.id === item.productId) || null;
          map[key] = { product: prod, name: item.name, qty: 0, revenue: 0 };
        }
        map[key].qty += item.qty;
        map[key].revenue += item.total;
      });
    });
    return Object.values(map).sort((a, b) => b.qty - a.qty);
  }, [invoices, products]);

  const mostSellingProduct = productSalesMap[0] || (products[0] ? {
    name: products[0].name,
    qty: 0,
    revenue: 0,
  } : {
    name: 'No Sales Yet',
    qty: 0,
    revenue: 0,
  });

  const totalStockUnits = useMemo(() => products.reduce((sum, p) => sum + p.stock, 0), [products]);
  const totalStockValue = useMemo(
    () => products.reduce((sum, p) => sum + p.purchasePrice * p.stock, 0),
    [products]
  );
  const lowStockCount = useMemo(
    () => products.filter((p) => p.stock <= p.minStockAlert).length,
    [products]
  );

  // Live GST Breakdown
  const totalCgstCollected = useMemo(
    () => invoices.reduce((sum, inv) => sum + inv.cgstTotal, 0),
    [invoices]
  );
  const totalSgstCollected = useMemo(
    () => invoices.reduce((sum, inv) => sum + inv.sgstTotal, 0),
    [invoices]
  );
  const totalIgstCollected = useMemo(
    () => invoices.reduce((sum, inv) => sum + inv.igstTotal, 0),
    [invoices]
  );

  // Interactive Cursor Move State for Total Business Turnover Card
  const turnoverCardRef = useRef<HTMLDivElement>(null);
  const [turnoverTilt, setTurnoverTilt] = useState({ rx: 0, ry: 0, px: 50, py: 50 });
  const [isHoveringTurnover, setIsHoveringTurnover] = useState(false);

  const handleTurnoverMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!turnoverCardRef.current) return;
    const rect = turnoverCardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const px = (x / rect.width) * 100;
    const py = (y / rect.height) * 100;

    // Subtle 3D tilt calculation (max +- 5 degrees)
    const rx = ((y - rect.height / 2) / (rect.height / 2)) * -5;
    const ry = ((x - rect.width / 2) / (rect.width / 2)) * 5;

    setTurnoverTilt({ rx, ry, px, py });
  };

  const handleTurnoverMouseLeave = () => {
    setIsHoveringTurnover(false);
    setTurnoverTilt({ rx: 0, ry: 0, px: 50, py: 50 });
  };

  const handleShareWhatsApp = (inv: Invoice) => {
    if (!inv.customer.phone) {
      alert('No phone number recorded for this customer.');
      return;
    }
    const msg = generateInvoiceWhatsAppMessage(inv, settings);
    openWhatsApp(inv.customer.phone, msg);
  };

  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerSaleType, setLedgerSaleType] = useState<'ALL' | 'CASH' | 'CREDIT'>('ALL');
  const [ledgerStatus, setLedgerStatus] = useState<'ALL' | 'PAID' | 'UNPAID' | 'PARTIAL'>('ALL');

  const filteredLedgerInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchSearch =
        inv.invoiceNumber.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
        inv.customer.name.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
        (inv.customer.phone && inv.customer.phone.includes(ledgerSearch));
      const matchType = ledgerSaleType === 'ALL' || inv.saleType === ledgerSaleType;
      const matchStatus = ledgerStatus === 'ALL' || inv.status === ledgerStatus;
      return matchSearch && matchType && matchStatus;
    });
  }, [invoices, ledgerSearch, ledgerSaleType, ledgerStatus]);

  // =========================================================================
  // SUBTAB 1: RECENT SALE LEDGER VIEW (When clicked from sidebar)
  // =========================================================================
  if (activeSubTab === 'recent_transactions') {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans text-xs text-neutral-900 animate-fade-in">
        <div className="p-6 bg-white rounded-3xl border border-neutral-200/80 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-100">
            <div>
              <h2 className="text-sm font-bold text-neutral-900">Recent Sale Ledger (All Transactions)</h2>
              <p className="text-[11px] text-neutral-500">
                Detailed chronological ledger of all Cash and Credit Tax Invoices
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={onOpenAddSale}
                className="px-4 py-2 bg-black hover:bg-neutral-800 text-white rounded-xl font-bold text-xs flex items-center space-x-1.5 shadow-2xs cursor-pointer transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Sale Bill (F2)</span>
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search invoice number, party name, or phone..."
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-neutral-200 bg-white text-neutral-900 text-xs placeholder-neutral-400 focus:outline-none focus:border-black"
              />
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={ledgerSaleType}
                onChange={(e) => setLedgerSaleType(e.target.value as any)}
                className="p-2 rounded-xl border border-neutral-200 bg-white text-neutral-800 font-semibold text-xs focus:outline-none focus:border-black"
              >
                <option value="ALL">All Sale Types</option>
                <option value="CASH">Cash Sales Only</option>
                <option value="CREDIT">Credit Sales Only</option>
              </select>

              <select
                value={ledgerStatus}
                onChange={(e) => setLedgerStatus(e.target.value as any)}
                className="p-2 rounded-xl border border-neutral-200 bg-white text-neutral-800 font-semibold text-xs focus:outline-none focus:border-black"
              >
                <option value="ALL">All Payment Status</option>
                <option value="PAID">Paid in Full</option>
                <option value="PARTIAL">Partially Paid</option>
                <option value="UNPAID">Unpaid (Due)</option>
              </select>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="overflow-x-auto rounded-2xl border border-neutral-200/80">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-neutral-50 text-neutral-600 font-bold border-b border-neutral-200/80 text-[11px]">
                  <th className="p-3">Date</th>
                  <th className="p-3">Invoice No</th>
                  <th className="p-3">Party / Customer</th>
                  <th className="p-3 text-center">Sale Type</th>
                  <th className="p-3 text-right">Bill Total (₹)</th>
                  <th className="p-3 text-right">Balance Due (₹)</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredLedgerInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-neutral-500">
                      No invoices match your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLedgerInvoices.map((inv) => (
                    <tr
                      key={inv.id}
                      onClick={() => onSelectInvoice(inv)}
                      className="hover:bg-neutral-50/80 cursor-pointer transition-colors"
                    >
                      <td className="p-3 font-mono text-neutral-500">{formatDate(inv.date)}</td>
                      <td className="p-3 font-bold text-neutral-900 font-mono">{inv.invoiceNumber}</td>
                      <td className="p-3 font-semibold text-neutral-800">{inv.customer.name}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            inv.saleType === 'CASH'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}
                        >
                          {inv.saleType}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-neutral-900">
                        {formatINR(inv.grandTotal)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-red-600">
                        {inv.balanceAmount > 0 ? formatINR(inv.balanceAmount) : '—'}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            inv.status === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => onSelectInvoice(inv)}
                            title="View & Print"
                            className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500 hover:text-black cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleShareWhatsApp(inv)}
                            title="WhatsApp Bill"
                            className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 cursor-pointer"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // SUBTAB 2: LIVE GST LIABILITIES VIEW (When clicked from sidebar)
  // =========================================================================
  if (activeSubTab === 'tax_liabilities') {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans text-xs text-neutral-900 animate-fade-in">
        <div className="p-6 bg-white rounded-3xl border border-neutral-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div>
              <h2 className="text-sm font-bold text-neutral-900">Live GST Tax Liabilities Breakdown</h2>
              <p className="text-[11px] text-neutral-500">
                Real-time tax collected across sales vs Input Tax Credit (ITC) on expenses
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('reports')}
              className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-200 rounded-xl font-bold text-xs cursor-pointer"
            >
              Open Full GSTR Reports &gt;
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-1">
            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/80">
              <span className="text-[10px] uppercase font-bold text-neutral-500 block">Central GST (CGST)</span>
              <span className="text-xl font-bold font-mono text-neutral-900 mt-1 block">
                {formatINR(totalCgstCollected)}
              </span>
            </div>

            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/80">
              <span className="text-[10px] uppercase font-bold text-neutral-500 block">State GST (SGST)</span>
              <span className="text-xl font-bold font-mono text-neutral-900 mt-1 block">
                {formatINR(totalSgstCollected)}
              </span>
            </div>

            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/80">
              <span className="text-[10px] uppercase font-bold text-neutral-500 block">Integrated GST (IGST)</span>
              <span className="text-xl font-bold font-mono text-neutral-900 mt-1 block">
                {formatINR(totalIgstCollected)}
              </span>
            </div>

            <div className="p-4 bg-black text-white rounded-2xl shadow-xs">
              <span className="text-[10px] uppercase font-bold text-neutral-300 block">Total Output GST Collected</span>
              <span className="text-xl font-bold font-mono text-white mt-1 block">
                {formatINR(totalCgstCollected + totalSgstCollected + totalIgstCollected)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans text-xs text-neutral-900">
      {/* ========================================================================= */}
      {/* 4 PRIMARY METRIC CARDS (Apple Minimalist Pure White Theme)                */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: ACTUAL NET PROFIT */}
        <div
          onClick={() => onNavigateTab('purchase')}
          className="p-5 bg-white rounded-2xl border border-neutral-200/80 shadow-xs hover:border-neutral-300 hover:shadow-sm cursor-pointer transition-all active:scale-[0.99] group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
              Actual Net Profit
            </span>
            <div className="w-8 h-8 rounded-xl bg-neutral-100 text-neutral-900 border border-neutral-200/80 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-sans text-neutral-900 tracking-tight block">
              {formatINR(actualNetProfit)}
            </span>
            <p className="text-[11px] text-neutral-500 mt-1 font-normal">
              Gross: {formatINR(totalGrossProfit)} • Exp: {formatINR(totalExpenseAmount)}
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-600 font-medium group-hover:text-black">
            <span>View Profit & Loss</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform text-neutral-400" />
          </div>
        </div>

        {/* CARD 2: CREDIT AMOUNT (ACCOUNTS RECEIVABLE) */}
        <div
          onClick={() => onNavigateTab('parties')}
          className="p-5 bg-white rounded-2xl border border-neutral-200/80 shadow-xs hover:border-neutral-300 hover:shadow-sm cursor-pointer transition-all active:scale-[0.99] group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
              Credit Amount (Receivables)
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-sans text-rose-600 tracking-tight block">
              {formatINR(totalCreditReceivable)}
            </span>
            <p className="text-[11px] text-neutral-500 mt-1 font-normal">
              To Collect from {creditCustomerCount} Parties
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-600 font-medium group-hover:text-black">
            <span>Customer Accounts Ledger</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform text-neutral-400" />
          </div>
        </div>

        {/* CARD 3: TOTAL INVOICES & TURNOVER (Interactive Cursor-Moving Apple Card) */}
        <div
          ref={turnoverCardRef}
          onMouseMove={handleTurnoverMouseMove}
          onMouseEnter={() => setIsHoveringTurnover(true)}
          onMouseLeave={handleTurnoverMouseLeave}
          onClick={() => onNavigateTab('reports')}
          style={{
            transform: isHoveringTurnover
              ? `perspective(800px) rotateX(${turnoverTilt.rx}deg) rotateY(${turnoverTilt.ry}deg) translateY(-2px)`
              : 'perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0px)',
            transition: isHoveringTurnover ? 'transform 0.08s ease-out' : 'transform 0.3s ease-in-out',
            background: isHoveringTurnover
              ? `radial-gradient(circle at ${turnoverTilt.px}% ${turnoverTilt.py}%, rgba(0, 0, 0, 0.03), #ffffff 75%)`
              : '#ffffff',
          }}
          className="p-5 rounded-2xl border border-neutral-200/80 shadow-xs hover:border-neutral-300 hover:shadow-sm cursor-pointer group relative overflow-hidden text-neutral-900"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
              Total Invoices ({invoices.length} Bills)
            </span>
            <div className="w-8 h-8 rounded-xl bg-neutral-100 text-neutral-900 border border-neutral-200/80 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-sans text-neutral-900 tracking-tight block">
              {formatINR(totalSales)}
            </span>
            <p className="text-[11px] text-neutral-500 mt-1 font-normal">
              Combined GST Sales Turnover
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-600 font-medium group-hover:text-black">
            <span>View GSTR Reports</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform text-neutral-400" />
          </div>
        </div>

        {/* CARD 4: MOST SELLING PRODUCT & STOCK */}
        <div
          onClick={() => onNavigateTab('items')}
          className="p-5 bg-white rounded-2xl border border-neutral-200/80 shadow-xs hover:border-neutral-300 hover:shadow-sm cursor-pointer transition-all active:scale-[0.99] group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
              Most Selling Product
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-sm font-semibold text-neutral-900 truncate block">
              {mostSellingProduct.name}
            </span>
            <p className="text-[11px] text-neutral-500 mt-1 font-normal">
              {mostSellingProduct.qty} Units Sold • {formatINR(totalStockValue)} Stock
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-600 font-medium group-hover:text-black">
            <span>Manage Inventory ({totalStockUnits} Units)</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform text-neutral-400" />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* QUICK LAUNCH ACTION BAR (Apple Minimalist Controls)                       */}
      {/* ========================================================================= */}
      <div className="p-4 bg-white rounded-2xl border border-neutral-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-neutral-900" />
          <span className="text-xs font-semibold text-neutral-900 uppercase tracking-wider">
            Quick Business Actions:
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Add Sale Invoice */}
          <button
            onClick={onOpenAddSale}
            className="flex items-center space-x-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-black hover:bg-neutral-800 text-white rounded-xl font-semibold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Sale (F2)</span>
          </button>

          {/* Add Purchase */}
          <button
            onClick={onOpenAddPurchase}
            className="flex items-center space-x-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-200 rounded-xl font-medium text-xs shadow-2xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Purchase (F3)</span>
          </button>

          {/* Receive Payment */}
          <button
            onClick={onOpenAddPayment}
            className="flex items-center space-x-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-200 rounded-xl font-medium text-xs shadow-2xs transition-all active:scale-95 cursor-pointer"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Receive Payment</span>
          </button>

          {/* View GSTR Reports */}
          <button
            onClick={() => onNavigateTab('reports')}
            className="flex items-center space-x-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-200 rounded-xl font-medium text-xs shadow-2xs transition-all active:scale-95 cursor-pointer"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>GSTR Reports</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TWO-COLUMN ANALYTICS: RECENT INVOICES & TOP PRODUCTS LEADERBOARD          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Sale Invoices Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">Recent Sale Invoices</h3>
              <p className="text-[11px] text-neutral-500">
                Click any row to open full A4 / 80mm bill preview & print
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => onNavigateTab('sale')}
                className="text-xs font-semibold text-[#0071e3] hover:underline transition-colors cursor-pointer"
              >
                View All Bills →
              </button>
              <button
                type="button"
                onClick={onOpenAddSale}
                className="text-xs font-medium text-neutral-900 hover:underline cursor-pointer"
              >
                + New Bill
              </button>
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200/80 text-[10px] tracking-wider uppercase">
                  <th className="py-2.5 px-4 font-semibold">Date</th>
                  <th className="py-2.5 px-4 font-semibold">Invoice No</th>
                  <th className="py-2.5 px-4 font-semibold">Party Name</th>
                  <th className="py-2.5 px-3 text-center font-semibold">Type</th>
                  <th className="py-2.5 px-4 text-right font-semibold">Amount (₹)</th>
                  <th className="py-2.5 px-3 text-center font-semibold">Status</th>
                  <th className="py-2.5 px-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-[11px]">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-neutral-500 font-sans">
                      No invoices found. Click "Add Sale" to generate bills.
                    </td>
                  </tr>
                ) : (
                  invoices.slice(0, 6).map((inv) => (
                    <tr
                      key={inv.id}
                      onClick={() => onSelectInvoice(inv)}
                      className="hover:bg-neutral-50/70 cursor-pointer transition-colors group"
                    >
                      <td className="py-2.5 px-4 text-neutral-500 font-sans">{formatDate(inv.date)}</td>
                      <td className="py-2.5 px-4 font-semibold text-neutral-900 group-hover:underline">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-neutral-800 truncate max-w-[150px]">
                        {inv.customer.name}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase ${
                            inv.saleType === 'CASH'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}
                        >
                          {inv.saleType}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold text-neutral-900 font-mono">
                        {formatINR(inv.grandTotal)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium uppercase ${
                            inv.status === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : inv.status === 'PARTIAL'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => onSelectInvoice(inv)}
                            title="Print / View Invoice"
                            className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-black transition-colors cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleShareWhatsApp(inv)}
                            title="WhatsApp Bill"
                            className="p-1 rounded-lg hover:bg-emerald-50 text-neutral-400 hover:text-emerald-600 transition-colors cursor-pointer"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Top Selling Items Leaderboard & Tax Liability Snapshot */}
        <div className="space-y-4">
          {/* Top Selling Products Card */}
          <div className="p-4 bg-white rounded-2xl border border-neutral-200/80 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center space-x-2">
                <Flame className="w-4 h-4 text-amber-500" />
                <h4 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider">
                  Top Selling Products
                </h4>
              </div>
              <button
                onClick={() => onNavigateTab('items')}
                className="text-[11px] font-medium text-neutral-500 hover:text-black transition-colors cursor-pointer"
              >
                All Items
              </button>
            </div>

            <div className="divide-y divide-neutral-100 mt-2">
              {productSalesMap.length === 0 ? (
                <div className="py-8 text-center text-[11px] text-neutral-500">
                  No sales recorded yet.
                </div>
              ) : (
                productSalesMap.slice(0, 4).map((p, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center space-x-2.5 truncate">
                      <span className="w-5 h-5 rounded-full bg-neutral-100 text-neutral-800 font-semibold text-[10px] flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <div className="truncate">
                        <p className="text-xs font-medium text-neutral-900 truncate max-w-[160px]">
                          {p.name}
                        </p>
                        <p className="text-[10px] text-neutral-500">
                          {p.qty} Units Sold
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold font-mono text-neutral-900 flex-shrink-0">
                      {formatINR(p.revenue)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* GST Tax Collected Snapshot */}
          <div className="p-4 bg-white rounded-2xl border border-neutral-200/80 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <div className="flex items-center space-x-2">
                <Receipt className="w-4 h-4 text-neutral-900" />
                <h4 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider">
                  GST Tax Collected
                </h4>
              </div>
              <button
                onClick={() => onNavigateTab('reports')}
                className="text-[11px] font-medium text-neutral-500 hover:text-black transition-colors cursor-pointer"
              >
                GSTR-1 Details
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3 text-center">
              <div className="p-2 bg-neutral-50 border border-neutral-200/80 rounded-xl">
                <span className="text-[10px] text-neutral-500 block font-medium">CGST</span>
                <span className="text-xs font-bold font-mono text-neutral-900 mt-0.5 block">
                  {formatINR(totalCgstCollected)}
                </span>
              </div>
              <div className="p-2 bg-neutral-50 border border-neutral-200/80 rounded-xl">
                <span className="text-[10px] text-neutral-500 block font-medium">SGST</span>
                <span className="text-xs font-bold font-mono text-neutral-900 mt-0.5 block">
                  {formatINR(totalSgstCollected)}
                </span>
              </div>
              <div className="p-2 bg-neutral-50 border border-neutral-200/80 rounded-xl">
                <span className="text-[10px] text-neutral-500 block font-medium">IGST</span>
                <span className="text-xs font-bold font-mono text-neutral-900 mt-0.5 block">
                  {formatINR(totalIgstCollected)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
