import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Filter,
  Calendar,
  Eye,
  Edit2,
  Trash2,
  Share2,
  Printer,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowUpDown,
  CreditCard,
  Banknote,
  DollarSign,
  TrendingUp,
  RotateCcw,
  X,
  FileText,
  Building2,
  ChevronDown,
} from 'lucide-react';
import { Invoice, BusinessSettings } from '../../types';
import { formatINR, formatDate, getLocalDateISO, getLocalMonthISO } from '../../utils/formatters';
import { AppleModal } from '../common/AppleModal';
import { openWhatsApp, generateInvoiceWhatsAppMessage } from '../../services/whatsapp';
import { downloadInvoicePDF } from '../../services/invoicePdf';

export type DateFilterPreset =
  | 'ALL'
  | 'TODAY'
  | 'YESTERDAY'
  | 'THIS_WEEK'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'CUSTOM_DAY'
  | 'CUSTOM_MONTH'
  | 'CUSTOM_RANGE';

export type PaymentFilterType =
  | 'ALL'
  | 'CASH'
  | 'CREDIT'
  | 'PAID'
  | 'UPI'
  | 'BANK';

export type SortField = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc' | 'invoice_asc' | 'invoice_desc';

interface SaleInvoicesViewProps {
  invoices: Invoice[];
  settings: BusinessSettings;
  onOpenNewSale: () => void;
  onEditInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (id: string) => void;
  onSelectInvoiceForPreview: (invoice: Invoice) => void;
}

export const SaleInvoicesView: React.FC<SaleInvoicesViewProps> = ({
  invoices,
  settings,
  onOpenNewSale,
  onEditInvoice,
  onDeleteInvoice,
  onSelectInvoiceForPreview,
}) => {
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [datePreset, setDatePreset] = useState<DateFilterPreset>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilterType>('ALL');
  const [sortField, setSortField] = useState<SortField>('date_desc');

  // Custom Date Filters
  const todayStr = useMemo(() => getLocalDateISO(), []);
  const currentMonthStr = useMemo(() => getLocalMonthISO(), []);

  const [selectedSingleDay, setSelectedSingleDay] = useState(todayStr);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [customStartDate, setCustomStartDate] = useState(todayStr);
  const [customEndDate, setCustomEndDate] = useState(todayStr);

  // Delete Confirmation Modal State
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Filter Logic
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // 1. Text Search (Invoice Number, Party Name, Phone, GSTIN)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesInvNo = inv.invoiceNumber?.toLowerCase().includes(q);
        const matchesParty = inv.customer?.name?.toLowerCase().includes(q);
        const matchesPhone = inv.customer?.phone?.includes(q);
        const matchesGstin = inv.customer?.gstin?.toLowerCase().includes(q);
        const matchesCompany = inv.customer?.companyName?.toLowerCase().includes(q);

        if (!matchesInvNo && !matchesParty && !matchesPhone && !matchesGstin && !matchesCompany) {
          return false;
        }
      }

      // 2. Payment Type / Credit vs Cash Filter
      if (paymentFilter === 'CASH') {
        const isCash = inv.saleType === 'CASH' || inv.paymentMode === 'CASH';
        if (!isCash) return false;
      } else if (paymentFilter === 'CREDIT') {
        const isCredit = inv.saleType === 'CREDIT' || inv.balanceAmount > 0 || inv.status === 'UNPAID' || inv.status === 'PARTIAL';
        if (!isCredit) return false;
      } else if (paymentFilter === 'PAID') {
        if (inv.balanceAmount > 0 || inv.status !== 'PAID') return false;
      } else if (paymentFilter === 'UPI') {
        if (inv.paymentMode !== 'UPI') return false;
      } else if (paymentFilter === 'BANK') {
        if (inv.paymentMode !== 'BANK_TRANSFER' && inv.paymentMode !== 'CHEQUE') return false;
      }

      // 3. Date Filter
      const invDateStr = inv.date?.slice(0, 10);
      if (!invDateStr) return true;

      if (datePreset === 'TODAY') {
        return invDateStr === todayStr;
      }

      if (datePreset === 'YESTERDAY') {
        const yest = new Date();
        yest.setDate(yest.getDate() - 1);
        const yestStr = getLocalDateISO(yest);
        return invDateStr === yestStr;
      }

      if (datePreset === 'THIS_WEEK') {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        const startOfWeekStr = getLocalDateISO(startOfWeek);
        return invDateStr >= startOfWeekStr && invDateStr <= todayStr;
      }

      if (datePreset === 'THIS_MONTH') {
        return invDateStr.slice(0, 7) === currentMonthStr;
      }

      if (datePreset === 'LAST_MONTH') {
        const lastMonthDate = new Date();
        lastMonthDate.setDate(1);
        lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
        const lastMonthStr = getLocalMonthISO(lastMonthDate);
        return invDateStr.slice(0, 7) === lastMonthStr;
      }

      if (datePreset === 'CUSTOM_DAY') {
        return invDateStr === selectedSingleDay;
      }

      if (datePreset === 'CUSTOM_MONTH') {
        return invDateStr.slice(0, 7) === selectedMonth;
      }

      if (datePreset === 'CUSTOM_RANGE') {
        if (customStartDate && invDateStr < customStartDate) return false;
        if (customEndDate && invDateStr > customEndDate) return false;
        return true;
      }

      return true;
    });
  }, [
    invoices,
    searchQuery,
    paymentFilter,
    datePreset,
    todayStr,
    selectedSingleDay,
    selectedMonth,
    customStartDate,
    customEndDate,
  ]);

  // Sorting
  const sortedInvoices = useMemo(() => {
    return [...filteredInvoices].sort((a, b) => {
      if (sortField === 'date_desc') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      if (sortField === 'date_asc') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      if (sortField === 'amount_desc') {
        return b.grandTotal - a.grandTotal;
      }
      if (sortField === 'amount_asc') {
        return a.grandTotal - b.grandTotal;
      }
      if (sortField === 'invoice_desc') {
        return (b.invoiceNumber || '').localeCompare(a.invoiceNumber || '');
      }
      if (sortField === 'invoice_asc') {
        return (a.invoiceNumber || '').localeCompare(b.invoiceNumber || '');
      }
      return 0;
    });
  }, [filteredInvoices, sortField]);

  // Calculated Metrics for the filtered view
  const metrics = useMemo(() => {
    const totalSales = filteredInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
    const totalReceived = filteredInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    const totalBalance = filteredInvoices.reduce((sum, inv) => sum + (inv.balanceAmount || 0), 0);
    const totalProfit = filteredInvoices.reduce((sum, inv) => sum + (inv.totalProfit || 0), 0);
    const totalTaxable = filteredInvoices.reduce((sum, inv) => sum + (inv.taxableTotal || 0), 0);
    const totalGst = filteredInvoices.reduce(
      (sum, inv) => sum + ((inv.cgstTotal || 0) + (inv.sgstTotal || 0) + (inv.igstTotal || 0)),
      0
    );

    const cashBills = filteredInvoices.filter(
      (inv) => inv.saleType === 'CASH' || inv.paymentMode === 'CASH'
    ).length;
    const creditBills = filteredInvoices.filter(
      (inv) => inv.saleType === 'CREDIT' || inv.balanceAmount > 0
    ).length;

    return {
      count: filteredInvoices.length,
      totalSales,
      totalReceived,
      totalBalance,
      totalProfit,
      totalTaxable,
      totalGst,
      cashBills,
      creditBills,
    };
  }, [filteredInvoices]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setDatePreset('ALL');
    setPaymentFilter('ALL');
    setSortField('date_desc');
    setSelectedSingleDay(todayStr);
    setSelectedMonth(currentMonthStr);
    setCustomStartDate(todayStr);
    setCustomEndDate(todayStr);
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    datePreset !== 'ALL' ||
    paymentFilter !== 'ALL' ||
    sortField !== 'date_desc';

  // WhatsApp share
  const handleWhatsAppShare = (inv: Invoice) => {
    if (!inv.customer?.phone) {
      alert('No phone number recorded for this party.');
      return;
    }
    const msg = generateInvoiceWhatsAppMessage(inv, settings);
    openWhatsApp(inv.customer.phone, msg);
  };

  // Confirm delete
  const handleConfirmDelete = () => {
    if (deletingInvoice) {
      onDeleteInvoice(deletingInvoice.id);
      setDeletingInvoice(null);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (sortedInvoices.length === 0) {
      alert('No invoices to export.');
      return;
    }

    const headers = [
      'Invoice Number',
      'Date',
      'Party Name',
      'Phone',
      'GSTIN',
      'Sale Type',
      'Payment Mode',
      'Status',
      'Taxable Value',
      'CGST',
      'SGST',
      'IGST',
      'Grand Total',
      'Paid Amount',
      'Balance Due',
      'Profit',
    ];

    const rows = sortedInvoices.map((inv) => [
      inv.invoiceNumber,
      formatDate(inv.date),
      `"${(inv.customer?.name || '').replace(/"/g, '""')}"`,
      inv.customer?.phone || '',
      inv.customer?.gstin || '',
      inv.saleType,
      inv.paymentMode,
      inv.status,
      (inv.taxableTotal || 0).toFixed(2),
      (inv.cgstTotal || 0).toFixed(2),
      (inv.sgstTotal || 0).toFixed(2),
      (inv.igstTotal || 0).toFixed(2),
      (inv.grandTotal || 0).toFixed(2),
      (inv.paidAmount || 0).toFixed(2),
      (inv.balanceAmount || 0).toFixed(2),
      (inv.totalProfit || 0).toFixed(2),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Sale_Register_${datePreset}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-[1550px] mx-auto pb-16 font-sans text-xs text-neutral-900">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & PRIMARY ACTIONS                                           */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-neutral-900" />
            <h1 className="text-lg font-bold text-neutral-900 tracking-tight">Sale Invoices Register</h1>
            <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200 text-[11px] font-semibold tabular-nums">
              {metrics.count} Bills
            </span>
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">
            Browse, filter, edit, print, and track all GST sales, cash memos and credit notes
          </p>
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="h-8 px-2.5 sm:px-3 rounded-lg border border-neutral-200 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-medium text-xs shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
            title="Download CSV"
          >
            <Download className="w-3.5 h-3.5 text-neutral-500" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="h-8 px-2.5 sm:px-3 rounded-lg border border-neutral-200 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-medium text-xs shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
            title="Print Current View"
          >
            <Printer className="w-3.5 h-3.5 text-neutral-500" />
            <span className="hidden sm:inline">Print Register</span>
          </button>

          <button
            type="button"
            onClick={onOpenNewSale}
            className="h-8 px-3.5 sm:px-4 rounded-lg bg-black hover:bg-neutral-800 text-white font-semibold text-xs shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-white" />
            <span>+ Create Sale Bill</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SUMMARY KPI CARDS (APPLE METRIC CARDS)                                 */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Total Sales */}
        <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
              Total Sales
            </span>
            <DollarSign className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold tabular-nums text-neutral-900 tracking-tight">
              {formatINR(metrics.totalSales)}
            </span>
            <div className="text-[10px] text-neutral-500 mt-1 flex items-center space-x-1">
              <span>{metrics.cashBills} Cash</span>
              <span>•</span>
              <span>{metrics.creditBills} Credit</span>
            </div>
          </div>
        </div>

        {/* Received Amount */}
        <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
              Received (Paid)
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold tabular-nums text-emerald-700 tracking-tight">
              {formatINR(metrics.totalReceived)}
            </span>
            <div className="text-[10px] text-emerald-600 mt-1">
              {metrics.totalSales > 0
                ? `${Math.round((metrics.totalReceived / metrics.totalSales) * 100)}% settled`
                : '100% settled'}
            </div>
          </div>
        </div>

        {/* Credit / Balance Due */}
        <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-700">
              Credit (Due)
            </span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold tabular-nums text-rose-700 tracking-tight">
              {formatINR(metrics.totalBalance)}
            </span>
            <div className="text-[10px] text-rose-600 mt-1">
              Receivable from parties
            </div>
          </div>
        </div>

        {/* Invoiced Gross Profit */}
        <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-700">
              Gross Profit
            </span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold tabular-nums text-indigo-700 tracking-tight">
              {formatINR(metrics.totalProfit)}
            </span>
            <div className="text-[10px] text-indigo-600 mt-1">
              {metrics.totalSales > 0
                ? `${((metrics.totalProfit / metrics.totalSales) * 100).toFixed(1)}% margin`
                : 'Profit tracking'}
            </div>
          </div>
        </div>

        {/* Total GST Collected */}
        <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
              Output GST
            </span>
            <FileText className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold tabular-nums text-neutral-900 tracking-tight">
              {formatINR(metrics.totalGst)}
            </span>
            <div className="text-[10px] text-neutral-500 mt-1">
              Taxable: {formatINR(metrics.totalTaxable)}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. ADVANCED FILTER CONTROLS BAR (DAY, MONTH, CASH, CREDIT, SEARCH)        */}
      {/* ========================================================================= */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs space-y-3.5">
        {/* Row 1: Search, Sort & Payment Mode Filters */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by invoice number, party name, phone, or GSTIN..."
              className="w-full h-8 pl-8 pr-7 bg-white rounded-lg border border-neutral-200 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-800"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Payment Type Selector Pills */}
          <div className="flex items-center space-x-1 overflow-x-auto py-0.5 no-scrollbar max-w-full">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mr-1 shrink-0">
              Type:
            </span>
            {[
              { id: 'ALL', label: 'All Bills' },
              { id: 'CASH', label: 'Cash Sales' },
              { id: 'CREDIT', label: 'Credit (Due)' },
              { id: 'PAID', label: 'Fully Paid' },
              { id: 'UPI', label: 'UPI' },
              { id: 'BANK', label: 'Bank' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPaymentFilter(tab.id as PaymentFilterType)}
                className={`h-7 px-2.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  paymentFilter === tab.id
                    ? 'bg-black text-white shadow-xs'
                    : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center space-x-1.5 shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400" />
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="h-7 px-2.5 bg-white rounded-md border border-neutral-200 text-xs font-medium text-neutral-800 focus:outline-none focus:border-black cursor-pointer"
            >
              <option value="date_desc">Date: Newest First</option>
              <option value="date_asc">Date: Oldest First</option>
              <option value="amount_desc">Amount: High to Low</option>
              <option value="amount_asc">Amount: Low to High</option>
              <option value="invoice_desc">Invoice No: Z to A</option>
              <option value="invoice_asc">Invoice No: A to Z</option>
            </select>
          </div>
        </div>

        {/* Row 2: Date Filters (Month-wise, Day-wise & Presets) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-100">
          {/* Quick Date Presets */}
          <div className="flex items-center space-x-1 overflow-x-auto py-0.5 no-scrollbar max-w-full">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mr-1 shrink-0 flex items-center space-x-1">
              <Calendar className="w-3 h-3" />
              <span>Period:</span>
            </span>
            {[
              { id: 'ALL', label: 'All Time' },
              { id: 'TODAY', label: 'Today' },
              { id: 'YESTERDAY', label: 'Yesterday' },
              { id: 'THIS_WEEK', label: 'This Week' },
              { id: 'THIS_MONTH', label: 'This Month' },
              { id: 'LAST_MONTH', label: 'Last Month' },
              { id: 'CUSTOM_DAY', label: 'Single Day' },
              { id: 'CUSTOM_MONTH', label: 'Select Month' },
              { id: 'CUSTOM_RANGE', label: 'Date Range' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setDatePreset(p.id as DateFilterPreset)}
                className={`h-6 px-2 rounded text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  datePreset === p.id
                    ? 'bg-black text-white shadow-xs font-semibold'
                    : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Conditional Custom Date Controls */}
          <div className="flex items-center space-x-2 flex-wrap">
            {/* Single Day Picker */}
            {datePreset === 'CUSTOM_DAY' && (
              <div className="flex items-center space-x-1.5 animate-in fade-in duration-150">
                <span className="text-[11px] text-neutral-500 font-medium">Day:</span>
                <input
                  type="date"
                  value={selectedSingleDay}
                  onChange={(e) => setSelectedSingleDay(e.target.value)}
                  className="h-7 px-2 bg-white rounded-md border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:border-black"
                />
              </div>
            )}

            {/* Specific Month Picker */}
            {datePreset === 'CUSTOM_MONTH' && (
              <div className="flex items-center space-x-1.5 animate-in fade-in duration-150">
                <span className="text-[11px] text-neutral-500 font-medium">Month:</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="h-7 px-2 bg-white rounded-md border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:border-black"
                />
              </div>
            )}

            {/* Custom Date Range Pickers */}
            {datePreset === 'CUSTOM_RANGE' && (
              <div className="flex items-center space-x-2 animate-in fade-in duration-150">
                <div className="flex items-center space-x-1">
                  <span className="text-[11px] text-neutral-500 font-medium">From:</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="h-7 px-2 bg-white rounded-md border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:border-black"
                  />
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-[11px] text-neutral-500 font-medium">To:</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="h-7 px-2 bg-white rounded-md border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:border-black"
                  />
                </div>
              </div>
            )}

            {/* Reset Filters Link */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="h-7 px-2 text-[11px] text-neutral-500 hover:text-black font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. SALE INVOICES DATA TABLE & MOBILE CARDS                                */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl border border-neutral-200/80 shadow-sm overflow-hidden flex flex-col">
        {/* Mobile View: Clean Apple Cards (< md) */}
        <div className="md:hidden divide-y divide-neutral-100">
          {sortedInvoices.length === 0 ? (
            <div className="py-12 px-4 text-center text-neutral-500 font-sans">
              <FileText className="w-8 h-8 mx-auto mb-2 text-neutral-400" />
              <p className="text-sm font-semibold text-neutral-900">No sale bills found</p>
              <p className="text-xs text-neutral-500 mt-1">
                {hasActiveFilters
                  ? 'No invoices match your selected search or date filters.'
                  : 'You have not created any sale invoices yet.'}
              </p>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-3 px-3.5 py-1.5 rounded-lg border border-neutral-200 bg-neutral-100 text-neutral-800 font-medium text-xs hover:bg-neutral-200 cursor-pointer"
                >
                  Clear Filters
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenNewSale}
                  className="mt-3 px-4 py-1.5 rounded-lg bg-black text-white font-semibold text-xs hover:bg-neutral-800 cursor-pointer shadow-xs"
                >
                  + Create First Sale Bill
                </button>
              )}
            </div>
          ) : (
            sortedInvoices.map((inv) => {
              const isPaid = inv.balanceAmount === 0 || inv.status === 'PAID';
              const isOverdue =
                !isPaid &&
                inv.dueDate &&
                new Date(inv.dueDate).getTime() < new Date().setHours(0, 0, 0, 0);

              return (
                <div key={inv.id} className="p-3.5 space-y-2.5 hover:bg-neutral-50/70 transition-colors">
                  {/* Row 1: Invoice No, Date & Status Pills */}
                  <div className="flex items-start justify-between">
                    <div>
                      <button
                        type="button"
                        onClick={() => onSelectInvoiceForPreview(inv)}
                        className="font-bold text-neutral-900 hover:text-[#0071e3] text-sm flex items-center space-x-1 cursor-pointer text-left"
                        title="View & Print"
                      >
                        <span>{inv.invoiceNumber}</span>
                      </button>
                      <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
                        {formatDate(inv.date)}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          inv.saleType === 'CASH'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}
                      >
                        {inv.saleType || 'CASH'}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          isPaid
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : inv.paidAmount > 0
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {isPaid ? 'PAID' : inv.paidAmount > 0 ? 'PARTIAL' : 'UNPAID'}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: Customer Name, Phone, and Grand Total */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="truncate pr-2">
                      <span className="font-semibold text-neutral-800 block truncate">
                        {inv.customer?.name || 'Cash Customer'}
                      </span>
                      {inv.customer?.phone && (
                        <span className="text-[11px] text-neutral-500 font-mono">{inv.customer.phone}</span>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-neutral-900 tabular-nums block">
                        {formatINR(inv.grandTotal)}
                      </span>
                      {inv.balanceAmount > 0 ? (
                        <span className="text-[11px] font-semibold text-rose-600 block">
                          Due: {formatINR(inv.balanceAmount)}
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-emerald-600 block">All Settled</span>
                      )}
                    </div>
                  </div>

                  {/* Row 3: Item count & Quick Action Icons */}
                  <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-xs">
                    <div className="text-[11px] text-neutral-500">
                      {inv.items?.length || 0} {inv.items?.length === 1 ? 'item' : 'items'}
                      {isOverdue && <span className="ml-1.5 text-rose-600 font-semibold">• Overdue</span>}
                    </div>
                    <div className="flex items-center space-x-1">
                      {/* View */}
                      <button
                        type="button"
                        onClick={() => onSelectInvoiceForPreview(inv)}
                        className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 active:scale-95 transition-colors cursor-pointer"
                        title="View / Print"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* Download PDF */}
                      <button
                        type="button"
                        disabled={downloadingId === inv.id}
                        onClick={async () => {
                          setDownloadingId(inv.id);
                          try {
                            await downloadInvoicePDF(inv, settings);
                          } catch (err) {
                            console.error('Failed to download invoice PDF:', err);
                            alert('Failed to download invoice PDF.');
                          } finally {
                            setDownloadingId(null);
                          }
                        }}
                        className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-500 hover:text-[#0071e3] active:scale-95 transition-colors cursor-pointer disabled:opacity-50"
                        title="Download PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      {/* WhatsApp Share */}
                      <button
                        type="button"
                        onClick={() => handleWhatsAppShare(inv)}
                        className="p-1.5 rounded-md hover:bg-emerald-50 text-neutral-500 hover:text-emerald-600 active:scale-95 transition-colors cursor-pointer"
                        title="WhatsApp"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => onEditInvoice(inv)}
                        className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 active:scale-95 transition-colors cursor-pointer"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => setDeletingInvoice(inv)}
                        className="p-1.5 rounded-md hover:bg-rose-50 text-neutral-500 hover:text-rose-600 active:scale-95 transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop & Tablet View: 10-Column Data Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50 text-neutral-600 font-medium border-b border-neutral-200/80 text-[10px] tracking-wider uppercase">
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-3 font-semibold">Invoice No</th>
                <th className="py-3 px-4 font-semibold">Party / Customer</th>
                <th className="py-3 px-3 text-center font-semibold">Type</th>
                <th className="py-3 px-3 text-center font-semibold">Status</th>
                <th className="py-3 px-3 font-semibold">Due Date</th>
                <th className="py-3 px-4 text-right font-semibold">Bill Total</th>
                <th className="py-3 px-3 text-right font-semibold">Paid</th>
                <th className="py-3 px-4 text-right font-semibold">Balance Due</th>
                <th className="py-3 px-4 text-center font-semibold no-print">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-xs">
              {sortedInvoices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-14 text-center text-neutral-500 font-sans">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-500 border border-neutral-200">
                        <FileText className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-semibold text-neutral-900">No sale bills found</p>
                      <p className="text-xs text-neutral-500">
                        {hasActiveFilters
                          ? 'No invoices match your selected search or date filters. Try resetting filters.'
                          : 'You have not created any sale invoices yet. Click "+ Create Sale Bill" to start.'}
                      </p>
                      {hasActiveFilters ? (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="px-3.5 py-1.5 rounded-lg border border-neutral-200 bg-neutral-100 text-neutral-800 font-medium text-xs hover:bg-neutral-200 cursor-pointer"
                        >
                          Clear Filters
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={onOpenNewSale}
                          className="px-4 py-1.5 rounded-lg bg-black text-white font-semibold text-xs hover:bg-neutral-800 cursor-pointer shadow-xs"
                        >
                          + Create First Sale Bill
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                sortedInvoices.map((inv) => {
                  const isPaid = inv.balanceAmount === 0 || inv.status === 'PAID';
                  const isOverdue =
                    !isPaid &&
                    inv.dueDate &&
                    new Date(inv.dueDate).getTime() < new Date().setHours(0, 0, 0, 0);

                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-neutral-50/70 transition-colors group cursor-default"
                    >
                      {/* Date */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-medium text-neutral-800 block">
                          {formatDate(inv.date)}
                        </span>
                        <span className="text-[10px] text-neutral-400 block font-mono">
                          {inv.createdAt ? new Date(inv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </td>

                      {/* Invoice No (Clickable preview) */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onSelectInvoiceForPreview(inv)}
                          className="font-bold text-neutral-900 hover:text-[#0071e3] transition-colors text-left flex items-center space-x-1 cursor-pointer"
                          title="Click to view & print invoice"
                        >
                          <span>{inv.invoiceNumber}</span>
                        </button>
                        {inv.items && (
                          <span className="text-[10px] text-neutral-400 block">
                            {inv.items.length} {inv.items.length === 1 ? 'item' : 'items'}
                          </span>
                        )}
                      </td>

                      {/* Party / Customer */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-neutral-800 truncate max-w-[220px]">
                          {inv.customer?.name || 'Cash Customer'}
                        </div>
                        <div className="text-[11px] text-neutral-500 flex items-center space-x-2 mt-0.5">
                          {inv.customer?.phone && (
                            <span className="tabular-nums font-mono text-[10px]">{inv.customer.phone}</span>
                          )}
                          {inv.customer?.gstin && (
                            <span className="px-1.5 py-0.2 rounded bg-neutral-100 text-[9px] text-neutral-600 font-mono border border-neutral-200">
                              GSTIN: {inv.customer.gstin}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Sale Type Pill */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            inv.saleType === 'CASH'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}
                        >
                          {inv.saleType || 'CASH'}
                        </span>
                        {inv.paymentMode && inv.paymentMode !== 'CREDIT' && (
                          <span className="text-[9px] text-neutral-400 block mt-0.5 uppercase">
                            {inv.paymentMode}
                          </span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            isPaid
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : inv.paidAmount > 0
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isPaid ? 'PAID' : inv.paidAmount > 0 ? 'PARTIAL' : 'UNPAID'}
                        </span>
                      </td>

                      {/* Due Date */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {inv.dueDate ? (
                          <span
                            className={`tabular-nums ${
                              isOverdue ? 'text-rose-600 font-bold' : 'text-neutral-700'
                            }`}
                          >
                            {formatDate(inv.dueDate)}
                            {isOverdue && <span className="block text-[9px] text-rose-600">Overdue</span>}
                          </span>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>

                      {/* Bill Total */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className="font-bold text-neutral-900 tabular-nums text-xs">
                          {formatINR(inv.grandTotal)}
                        </span>
                      </td>

                      {/* Paid Amount */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <span className="tabular-nums text-neutral-700 text-xs">
                          {formatINR(inv.paidAmount)}
                        </span>
                      </td>

                      {/* Balance Due */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span
                          className={`tabular-nums font-bold text-xs ${
                            inv.balanceAmount > 0 ? 'text-rose-600' : 'text-neutral-400'
                          }`}
                        >
                          {inv.balanceAmount > 0 ? formatINR(inv.balanceAmount) : '₹0.00'}
                        </span>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-4 text-center whitespace-nowrap no-print">
                        <div className="flex items-center justify-center space-x-1">
                          {/* View & Print Modal */}
                          <button
                            type="button"
                            onClick={() => onSelectInvoiceForPreview(inv)}
                            className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
                            title="Print / View Invoice"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Direct PDF Download to Local Device */}
                          <button
                            type="button"
                            disabled={downloadingId === inv.id}
                            onClick={async () => {
                              setDownloadingId(inv.id);
                              try {
                                await downloadInvoicePDF(inv, settings);
                              } catch (err) {
                                console.error('Failed to download invoice PDF:', err);
                                alert('Failed to download invoice PDF.');
                              } finally {
                                setDownloadingId(null);
                              }
                            }}
                            className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-500 hover:text-[#0071e3] transition-colors cursor-pointer disabled:opacity-50"
                            title="Download Invoice PDF to Device Storage"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Invoice */}
                          <button
                            type="button"
                            onClick={() => onEditInvoice(inv)}
                            className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
                            title="Edit Invoice"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* WhatsApp Share */}
                          <button
                            type="button"
                            onClick={() => handleWhatsAppShare(inv)}
                            className="p-1.5 rounded-md hover:bg-emerald-50 text-neutral-500 hover:text-emerald-600 transition-colors cursor-pointer"
                            title="Share on WhatsApp"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Invoice */}
                          <button
                            type="button"
                            onClick={() => setDeletingInvoice(inv)}
                            className="p-1.5 rounded-md hover:bg-rose-50 text-neutral-500 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Delete Invoice"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Record Count & Totals */}
        {sortedInvoices.length > 0 && (
          <div className="bg-neutral-50 border-t border-neutral-200/80 px-5 py-3 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-600 gap-2">
            <div>
              Showing <strong className="font-semibold text-neutral-900">{sortedInvoices.length}</strong> of{' '}
              <strong className="font-semibold text-neutral-900">{invoices.length}</strong> total sale bills
              {hasActiveFilters && ' (filtered)'}
            </div>
            <div className="flex items-center space-x-5 text-right font-medium">
              <div>
                Total Amount:{' '}
                <span className="font-bold text-neutral-900 tabular-nums">
                  {formatINR(metrics.totalSales)}
                </span>
              </div>
              <div>
                Total Paid:{' '}
                <span className="font-bold text-emerald-700 tabular-nums">
                  {formatINR(metrics.totalReceived)}
                </span>
              </div>
              <div>
                Balance Due:{' '}
                <span className="font-bold text-rose-700 tabular-nums">
                  {formatINR(metrics.totalBalance)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. DELETE CONFIRMATION MODAL                                              */}
      {/* ========================================================================= */}
      {deletingInvoice && (
        <AppleModal
          isOpen={true}
          onClose={() => setDeletingInvoice(null)}
          title="Delete Sale Invoice"
          subtitle={`Are you sure you want to delete invoice ${deletingInvoice.invoiceNumber}?`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs leading-relaxed space-y-1">
              <div className="font-bold flex items-center space-x-1 text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Automatic Inventory & Balance Reversal</span>
              </div>
              <p>
                Deleting this invoice will <strong>restore product stock quantities</strong> back to your inventory and{' '}
                <strong>reverse any pending credit balance</strong> from {deletingInvoice.customer?.name || 'the party'}'s ledger.
              </p>
            </div>

            {/* Bill Details Snapshot */}
            <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200 space-y-1.5 text-xs text-neutral-700">
              <div className="flex justify-between">
                <span className="text-neutral-500">Invoice Number:</span>
                <span className="font-semibold text-neutral-900">{deletingInvoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Party Name:</span>
                <span className="font-semibold text-neutral-900">{deletingInvoice.customer?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Invoice Date:</span>
                <span className="font-semibold text-neutral-900">{formatDate(deletingInvoice.date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Total Bill Amount:</span>
                <span className="font-bold text-neutral-900 tabular-nums">{formatINR(deletingInvoice.grandTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Items Count:</span>
                <span className="font-medium text-neutral-900">{deletingInvoice.items?.length || 0} Products</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setDeletingInvoice(null)}
                className="px-4 py-2 rounded-lg border border-neutral-200 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete & Restore Stock</span>
              </button>
            </div>
          </div>
        </AppleModal>
      )}
    </div>
  );
};
