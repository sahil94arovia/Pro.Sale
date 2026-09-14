import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  FileSpreadsheet,
  Printer,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  Download,
  Share2,
  Receipt,
  CheckCircle2,
  Package,
  TrendingUp,
  AlertTriangle,
  Landmark,
  FileText,
  Users,
  Building2,
  Percent,
  Search,
  Eye,
  ArrowRight,
} from 'lucide-react';
import { Invoice, BusinessSettings, Product, Customer, Expense } from '../../types';
import { formatINR, formatDate, getLocalDateISO } from '../../utils/formatters';

interface GstrReportsViewProps {
  invoices: Invoice[];
  products?: Product[];
  customers?: Customer[];
  expenses?: Expense[];
  settings: BusinessSettings;
  activeReportType: string;
  onSelectInvoice: (inv: Invoice) => void;
}

export const GstrReportsView: React.FC<GstrReportsViewProps> = ({
  invoices,
  products = [],
  customers = [],
  expenses = [],
  settings,
  activeReportType,
  onSelectInvoice,
}) => {
  const [saleTab, setSaleTab] = useState<'SALE' | 'SALE_RETURN'>('SALE');
  const todayStr = useMemo(() => getLocalDateISO(), []);
  const startOfMonthStr = useMemo(() => {
    const d = new Date();
    return getLocalDateISO(new Date(d.getFullYear(), d.getMonth(), 1));
  }, []);

  const [fromDate, setFromDate] = useState(startOfMonthStr);
  const [toDate, setToDate] = useState(todayStr);

  // Profit & Loss Report SubTab state
  const [profitTab, setProfitTab] = useState<'CLIENT' | 'ITEM' | 'BILL'>(() => {
    if (activeReportType === 'Client Wise Profit And Loss') return 'CLIENT';
    if (activeReportType === 'Bill Wise Profit And Loss') return 'BILL';
    return 'ITEM';
  });

  useEffect(() => {
    if (activeReportType === 'Client Wise Profit And Loss') {
      setProfitTab('CLIENT');
    } else if (activeReportType === 'Bill Wise Profit And Loss') {
      setProfitTab('BILL');
    } else if (activeReportType === 'Item Wise Profit And Loss') {
      setProfitTab('ITEM');
    }
  }, [activeReportType]);

  const [profitSearch, setProfitSearch] = useState('');
  const [profitSort, setProfitSort] = useState<'PROFIT_DESC' | 'PROFIT_ASC' | 'MARGIN_DESC' | 'SALES_DESC'>('PROFIT_DESC');
  const [expandedProfitRowId, setExpandedProfitRowId] = useState<string | null>(null);

  // Filter invoices based on date range
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (fromDate && inv.date < fromDate) return false;
      if (toDate && inv.date > toDate) return false;
      return true;
    });
  }, [invoices, fromDate, toDate]);

  // Filter expenses based on date range
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      if (fromDate && exp.date < fromDate) return false;
      if (toDate && exp.date > toDate) return false;
      return true;
    });
  }, [expenses, fromDate, toDate]);

  // Aggregate GST Outward Supplies
  const totalTaxableValue = useMemo(
    () => filteredInvoices.reduce((sum, inv) => sum + inv.taxableTotal, 0),
    [filteredInvoices]
  );
  const totalCgst = useMemo(
    () => filteredInvoices.reduce((sum, inv) => sum + inv.cgstTotal, 0),
    [filteredInvoices]
  );
  const totalSgst = useMemo(
    () => filteredInvoices.reduce((sum, inv) => sum + inv.sgstTotal, 0),
    [filteredInvoices]
  );
  const totalIgst = useMemo(
    () => filteredInvoices.reduce((sum, inv) => sum + inv.igstTotal, 0),
    [filteredInvoices]
  );
  const totalInvoiceValue = useMemo(
    () => filteredInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0),
    [filteredInvoices]
  );

  // Inward (Expenses / Purchases) ITC Estimates (Standard 18% GST on business expense vouchers)
  const totalInwardAmount = useMemo(
    () => filteredExpenses.reduce((sum, e) => sum + e.amount, 0),
    [filteredExpenses]
  );
  const estimatedInwardTaxable = totalInwardAmount / 1.18;
  const estimatedInwardCgst = (totalInwardAmount - estimatedInwardTaxable) / 2;
  const estimatedInwardSgst = estimatedInwardCgst;

  // HSN-wise sales summary
  const hsnSummary = useMemo(() => {
    const map: Record<
      string,
      {
        hsn: string;
        description: string;
        unit: string;
        qty: number;
        taxable: number;
        igst: number;
        cgst: number;
        sgst: number;
        total: number;
      }
    > = {};
    filteredInvoices.forEach((inv) => {
      inv.items.forEach((item) => {
        const code = item.hsn || '210690';
        if (!map[code]) {
          map[code] = {
            hsn: code,
            description: item.name,
            unit: item.unit || 'Pcs',
            qty: 0,
            taxable: 0,
            igst: 0,
            cgst: 0,
            sgst: 0,
            total: 0,
          };
        }
        map[code].qty += item.qty;
        map[code].taxable += item.taxableAmount;
        map[code].igst += item.igst;
        map[code].cgst += item.cgst;
        map[code].sgst += item.sgst;
        map[code].total += item.total;
      });
    });
    return Object.values(map);
  }, [filteredInvoices]);

  // 1. Item-wise Profit & Loss
  const itemProfitLoss = useMemo(() => {
    const map: Record<
      string,
      {
        id: string;
        name: string;
        hsn: string;
        qty: number;
        revenue: number;
        cost: number;
        profit: number;
        margin: number;
        avgSalePrice: number;
        avgCostPrice: number;
      }
    > = {};

    filteredInvoices.forEach((inv) => {
      inv.items.forEach((item) => {
        const key = item.productId || item.name;
        const purchaseCost = item.purchasePrice || (item.salePrice * 0.7);
        const costTotal = purchaseCost * item.qty;
        const profit = item.total - costTotal;

        if (!map[key]) {
          map[key] = {
            id: key,
            name: item.name,
            hsn: item.hsn || '210690',
            qty: 0,
            revenue: 0,
            cost: 0,
            profit: 0,
            margin: 0,
            avgSalePrice: 0,
            avgCostPrice: 0,
          };
        }
        map[key].qty += item.qty;
        map[key].revenue += item.total;
        map[key].cost += costTotal;
        map[key].profit += profit;
      });
    });

    return Object.values(map).map((item) => ({
      ...item,
      avgSalePrice: item.qty > 0 ? item.revenue / item.qty : 0,
      avgCostPrice: item.qty > 0 ? item.cost / item.qty : 0,
      margin: item.revenue > 0 ? (item.profit / item.revenue) * 100 : 0,
    }));
  }, [filteredInvoices]);

  // 2. Bill-wise Profit & Loss
  const billProfitLoss = useMemo(() => {
    return filteredInvoices.map((inv) => {
      const billCost = inv.items.reduce((sum, it) => {
        const unitCost = it.purchasePrice || (it.salePrice * 0.7);
        return sum + (unitCost * it.qty);
      }, 0);
      const billProfit = (inv.totalProfit !== undefined && inv.totalProfit !== null)
        ? inv.totalProfit
        : (inv.grandTotal - billCost);
      const margin = inv.grandTotal > 0 ? (billProfit / inv.grandTotal) * 100 : 0;

      return {
        invoice: inv,
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        date: inv.date,
        customerName: inv.customer.name,
        customerPhone: inv.customer.phone || '—',
        saleType: inv.saleType,
        grandTotal: inv.grandTotal,
        billCost,
        billProfit,
        margin,
        items: inv.items,
        status: inv.status,
      };
    });
  }, [filteredInvoices]);

  // 3. Client-wise Profit & Loss
  const clientProfitLoss = useMemo(() => {
    const map: Record<
      string,
      {
        id: string;
        name: string;
        phone: string;
        gstin: string;
        invoicesCount: number;
        totalRevenue: number;
        totalCost: number;
        totalProfit: number;
        margin: number;
        invoices: Invoice[];
      }
    > = {};

    filteredInvoices.forEach((inv) => {
      const key = inv.customer.id || inv.customer.name;
      const invCost = inv.items.reduce((sum, it) => {
        const unitCost = it.purchasePrice || (it.salePrice * 0.7);
        return sum + (unitCost * it.qty);
      }, 0);
      const invProfit = (inv.totalProfit !== undefined && inv.totalProfit !== null)
        ? inv.totalProfit
        : (inv.grandTotal - invCost);

      if (!map[key]) {
        map[key] = {
          id: key,
          name: inv.customer.name,
          phone: inv.customer.phone || '—',
          gstin: inv.customer.gstin || 'Unregistered',
          invoicesCount: 0,
          totalRevenue: 0,
          totalCost: 0,
          totalProfit: 0,
          margin: 0,
          invoices: [],
        };
      }
      map[key].invoicesCount += 1;
      map[key].totalRevenue += inv.grandTotal;
      map[key].totalCost += invCost;
      map[key].totalProfit += invProfit;
      map[key].invoices.push(inv);
    });

    return Object.values(map).map((c) => ({
      ...c,
      margin: c.totalRevenue > 0 ? (c.totalProfit / c.totalRevenue) * 100 : 0,
    }));
  }, [filteredInvoices]);

  const totalInvoicedProfit = useMemo(() => {
    return billProfitLoss.reduce((sum, b) => sum + b.billProfit, 0);
  }, [billProfitLoss]);

  const totalInvoicedRevenue = useMemo(() => {
    return billProfitLoss.reduce((sum, b) => sum + b.grandTotal, 0);
  }, [billProfitLoss]);

  const overallProfitMargin = totalInvoicedRevenue > 0
    ? (totalInvoicedProfit / totalInvoicedRevenue) * 100
    : 0;

  const topProfitableProduct = useMemo(() => {
    if (itemProfitLoss.length === 0) return null;
    return [...itemProfitLoss].sort((a, b) => b.profit - a.profit)[0];
  }, [itemProfitLoss]);

  const topProfitableClient = useMemo(() => {
    if (clientProfitLoss.length === 0) return null;
    return [...clientProfitLoss].sort((a, b) => b.totalProfit - a.totalProfit)[0];
  }, [clientProfitLoss]);

  // Filtered & sorted profit items
  const filteredSortedItemProfit = useMemo(() => {
    let list = itemProfitLoss.filter((it) =>
      it.name.toLowerCase().includes(profitSearch.toLowerCase()) ||
      it.hsn.includes(profitSearch)
    );
    if (profitSort === 'PROFIT_DESC') list.sort((a, b) => b.profit - a.profit);
    else if (profitSort === 'PROFIT_ASC') list.sort((a, b) => a.profit - b.profit);
    else if (profitSort === 'MARGIN_DESC') list.sort((a, b) => b.margin - a.margin);
    else if (profitSort === 'SALES_DESC') list.sort((a, b) => b.revenue - a.revenue);
    return list;
  }, [itemProfitLoss, profitSearch, profitSort]);

  const filteredSortedBillProfit = useMemo(() => {
    let list = billProfitLoss.filter((b) =>
      b.invoiceNumber.toLowerCase().includes(profitSearch.toLowerCase()) ||
      b.customerName.toLowerCase().includes(profitSearch.toLowerCase()) ||
      b.customerPhone.includes(profitSearch)
    );
    if (profitSort === 'PROFIT_DESC') list.sort((a, b) => b.billProfit - a.billProfit);
    else if (profitSort === 'PROFIT_ASC') list.sort((a, b) => a.billProfit - b.billProfit);
    else if (profitSort === 'MARGIN_DESC') list.sort((a, b) => b.margin - a.margin);
    else if (profitSort === 'SALES_DESC') list.sort((a, b) => b.grandTotal - a.grandTotal);
    return list;
  }, [billProfitLoss, profitSearch, profitSort]);

  const filteredSortedClientProfit = useMemo(() => {
    let list = clientProfitLoss.filter((c) =>
      c.name.toLowerCase().includes(profitSearch.toLowerCase()) ||
      c.phone.includes(profitSearch) ||
      c.gstin.toLowerCase().includes(profitSearch.toLowerCase())
    );
    if (profitSort === 'PROFIT_DESC') list.sort((a, b) => b.totalProfit - a.totalProfit);
    else if (profitSort === 'PROFIT_ASC') list.sort((a, b) => a.totalProfit - b.totalProfit);
    else if (profitSort === 'MARGIN_DESC') list.sort((a, b) => b.margin - a.margin);
    else if (profitSort === 'SALES_DESC') list.sort((a, b) => b.totalRevenue - a.totalRevenue);
    return list;
  }, [clientProfitLoss, profitSearch, profitSort]);

  // Party-wise item purchases
  const partyItemReport = useMemo(() => {
    const list: Array<{
      partyName: string;
      phone: string;
      gstin: string;
      itemName: string;
      qty: number;
      unit: string;
      totalAmount: number;
      lastDate: string;
    }> = [];

    filteredInvoices.forEach((inv) => {
      inv.items.forEach((item) => {
        list.push({
          partyName: inv.customer.name,
          phone: inv.customer.phone || '—',
          gstin: inv.customer.gstin || 'Unregistered',
          itemName: item.name,
          qty: item.qty,
          unit: item.unit || 'Pcs',
          totalAmount: item.total,
          lastDate: inv.date,
        });
      });
    });

    return list;
  }, [filteredInvoices]);

  // Bank Statement
  const bankStatementEntries = useMemo(() => {
    const entries: Array<{
      id: string;
      date: string;
      particulars: string;
      ref: string;
      mode: string;
      debit: number;
      credit: number;
    }> = [];

    filteredInvoices.forEach((inv) => {
      if (inv.paymentMode === 'UPI' || inv.paymentMode === 'BANK_TRANSFER') {
        if (inv.paidAmount > 0) {
          entries.push({
            id: `inv-${inv.id}`,
            date: inv.date,
            particulars: `Customer Receipt: ${inv.customer.name}`,
            ref: inv.invoiceNumber,
            mode: inv.paymentMode,
            debit: 0,
            credit: inv.paidAmount,
          });
        }
      }
    });

    filteredExpenses.forEach((exp) => {
      if (exp.paymentMode === 'BANK' || exp.paymentMode === 'UPI') {
        entries.push({
          id: `exp-${exp.id}`,
          date: exp.date,
          particulars: `${exp.category}: ${exp.paidTo || exp.description}`,
          ref: exp.receiptNo || 'Voucher',
          mode: exp.paymentMode,
          debit: exp.amount,
          credit: 0,
        });
      }
    });

    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredInvoices, filteredExpenses]);

  // CSV Exporter
  const handleExportExcel = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += `Report: ${activeReportType}\n`;
    csvContent += `Generated: ${new Date().toLocaleDateString('en-IN')}\n\n`;

    if (['Item Wise Profit And Loss', 'Bill Wise Profit And Loss', 'Client Wise Profit And Loss'].includes(activeReportType)) {
      if (profitTab === 'CLIENT') {
        csvContent += 'Client Name,Phone,GSTIN,Bills Count,Total Revenue,Cost of Goods,Gross Profit,Margin %\n';
        clientProfitLoss.forEach((c) => {
          csvContent += `"${c.name}","${c.phone}","${c.gstin}",${c.invoicesCount},${c.totalRevenue},${c.totalCost},${c.totalProfit},${c.margin.toFixed(2)}%\n`;
        });
      } else if (profitTab === 'ITEM') {
        csvContent += 'Product Name,HSN,Units Sold,Avg Sale Rate,Avg Cost Rate,Sales Revenue,Cost of Goods,Gross Profit,Margin %\n';
        itemProfitLoss.forEach((it) => {
          csvContent += `"${it.name}","${it.hsn}",${it.qty},${it.avgSalePrice.toFixed(2)},${it.avgCostPrice.toFixed(2)},${it.revenue},${it.cost},${it.profit},${it.margin.toFixed(2)}%\n`;
        });
      } else {
        csvContent += 'Invoice Number,Date,Party Name,Phone,Grand Total,Bill Cost,Net Profit,Margin %\n';
        billProfitLoss.forEach((b) => {
          csvContent += `"${b.invoiceNumber}","${b.date}","${b.customerName}","${b.customerPhone}",${b.grandTotal},${b.billCost},${b.billProfit},${b.margin.toFixed(2)}%\n`;
        });
      }
    } else if (activeReportType === 'Stock summary' || activeReportType === 'Low Stock Summary') {
      csvContent += 'Item Name,HSN,Category,Purchase Price,Sale Price,Current Stock,Stock Valuation\n';
      products.forEach((p) => {
        csvContent += `"${p.name}","${p.hsn}","${p.category}",${p.purchasePrice},${p.salePrice},${p.stock},${p.purchasePrice * p.stock}\n`;
      });
    } else {
      csvContent += 'Invoice No,Date,Party Name,GSTIN,Taxable Value,CGST,SGST,IGST,Total Value\n';
      filteredInvoices.forEach((inv) => {
        csvContent += `"${inv.invoiceNumber}","${inv.date}","${inv.customer.name}","${inv.customer.gstin || ''}",${inv.taxableTotal},${inv.cgstTotal},${inv.sgstTotal},${inv.igstTotal},${inv.grandTotal}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `${activeReportType.replace(/\s+/g, '_')}_${getLocalDateISO()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans text-xs text-neutral-900">
      {/* Top Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-neutral-200">
        <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-xl border border-neutral-200 shadow-2xs">
          <span className="text-neutral-500 font-medium text-[11px]">From</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="text-xs font-medium text-neutral-900 focus:outline-none bg-transparent"
          />
          <span className="text-neutral-300 px-1">|</span>
          <span className="text-neutral-500 font-medium text-[11px]">To</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="text-xs font-medium text-neutral-900 focus:outline-none bg-transparent"
          />
        </div>

        {/* Action Export Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportExcel}
            title="Export to Excel / CSV"
            className="w-8 h-8 rounded-full border border-neutral-200 bg-neutral-100 text-neutral-700 hover:bg-neutral-200 hover:text-black flex items-center justify-center transition-all active:scale-95 shadow-2xs cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => window.print()}
            title="Print Report"
            className="w-8 h-8 rounded-full border border-neutral-200 bg-neutral-100 text-neutral-700 hover:bg-neutral-200 hover:text-black flex items-center justify-center transition-all active:scale-95 shadow-2xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. HSN / SAC WISE SALES REPORT                                            */}
      {/* ========================================================================= */}
      {(activeReportType === 'Sale Summary By HSN' || activeReportType === 'SAC Report') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold tracking-tight text-neutral-900 uppercase">
              HSN / SAC Wise Sale Summary Report
            </h2>
            <span className="text-[11px] text-neutral-500">
              GSTIN: <span className="font-mono font-medium text-neutral-900">{settings.gstin}</span>
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200/80 text-[10px] tracking-wider uppercase">
                    <th className="py-2.5 px-4 border-r border-neutral-200/60">HSN/SAC</th>
                    <th className="py-2.5 px-4 border-r border-neutral-200/60">Description</th>
                    <th className="py-2.5 px-3 text-center border-r border-neutral-200/60">Unit</th>
                    <th className="py-2.5 px-3 text-right border-r border-neutral-200/60">Total Qty</th>
                    <th className="py-2.5 px-4 text-right border-r border-neutral-200/60">Taxable Value (₹)</th>
                    <th className="py-2.5 px-3 text-right border-r border-neutral-200/60">IGST (₹)</th>
                    <th className="py-2.5 px-3 text-right border-r border-neutral-200/60">CGST (₹)</th>
                    <th className="py-2.5 px-3 text-right border-r border-neutral-200/60">SGST (₹)</th>
                    <th className="py-2.5 px-4 text-right">Total Value (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-mono text-[11px]">
                  {hsnSummary.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-neutral-500 font-sans">
                        No HSN summary data found for the selected period.
                      </td>
                    </tr>
                  ) : (
                    hsnSummary.map((h, i) => (
                      <tr key={i} className="hover:bg-neutral-50/70">
                        <td className="py-2 px-4 border-r border-neutral-200/60 font-semibold text-neutral-900">{h.hsn}</td>
                        <td className="py-2 px-4 border-r border-neutral-200/60 font-sans font-medium text-neutral-800 truncate max-w-xs">{h.description}</td>
                        <td className="py-2 px-3 text-center border-r border-neutral-200/60 text-neutral-500 font-sans">{h.unit}</td>
                        <td className="py-2 px-3 text-right border-r border-neutral-200/60 font-semibold text-neutral-900">{h.qty}</td>
                        <td className="py-2 px-4 text-right border-r border-neutral-200/60 text-neutral-900">{formatINR(h.taxable)}</td>
                        <td className="py-2 px-3 text-right border-r border-neutral-200/60 text-neutral-500">{formatINR(h.igst)}</td>
                        <td className="py-2 px-3 text-right border-r border-neutral-200/60 text-neutral-500">{formatINR(h.cgst)}</td>
                        <td className="py-2 px-3 text-right border-r border-neutral-200/60 text-neutral-500">{formatINR(h.sgst)}</td>
                        <td className="py-2 px-4 text-right font-semibold text-neutral-900">{formatINR(h.total)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. STOCK SUMMARY / LOW STOCK REPORT                                       */}
      {/* ========================================================================= */}
      {(activeReportType === 'Stock summary' || activeReportType === 'Low Stock Summary') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold tracking-tight text-neutral-900 uppercase">
              {activeReportType === 'Low Stock Summary' ? 'Low Stock Reorder Report' : 'Stock Summary Report'}
            </h2>
            <span className="text-[11px] text-neutral-500">
              Total Products: <span className="font-semibold text-neutral-900">{products.length}</span>
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200/80 text-[10px] tracking-wider uppercase">
                    <th className="py-2.5 px-4 border-r border-neutral-200/60">Item Name</th>
                    <th className="py-2.5 px-3 border-r border-neutral-200/60">HSN</th>
                    <th className="py-2.5 px-3 border-r border-neutral-200/60">Category</th>
                    <th className="py-2.5 px-3 text-right border-r border-neutral-200/60">Purchase Price</th>
                    <th className="py-2.5 px-3 text-right border-r border-neutral-200/60">Sale Price</th>
                    <th className="py-2.5 px-3 text-center border-r border-neutral-200/60">Current Stock</th>
                    <th className="py-2.5 px-4 text-right">Stock Valuation (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-mono text-[11px]">
                  {products
                    .filter((p) => (activeReportType === 'Low Stock Summary' ? p.stock <= p.minStockAlert : true))
                    .map((p) => (
                      <tr key={p.id} className="hover:bg-neutral-50/70">
                        <td className="py-2 px-4 border-r border-neutral-200/60 font-sans font-medium text-neutral-900">{p.name}</td>
                        <td className="py-2 px-3 border-r border-neutral-200/60 text-neutral-500">{p.hsn}</td>
                        <td className="py-2 px-3 border-r border-neutral-200/60 font-sans text-neutral-500">{p.category}</td>
                        <td className="py-2 px-3 text-right border-r border-neutral-200/60 text-neutral-600">{formatINR(p.purchasePrice)}</td>
                        <td className="py-2 px-3 text-right border-r border-neutral-200/60 font-semibold text-neutral-900">{formatINR(p.salePrice)}</td>
                        <td className="py-2 px-3 text-center border-r border-neutral-200/60 font-sans">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${p.stock <= p.minStockAlert ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-neutral-100 text-neutral-700 border border-neutral-200'}`}>
                            {p.stock} {p.unit}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-right font-semibold text-neutral-900">{formatINR(p.purchasePrice * p.stock)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. GSTR 2 (INWARD SUPPLIES & INPUT TAX CREDIT)                            */}
      {/* ========================================================================= */}
      {activeReportType === 'GSTR 2' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-neutral-900 uppercase">
                GSTR-2 Inward Supplies (Input Tax Credit / Purchases)
              </h2>
              <p className="text-[11px] text-neutral-500">
                Summary of operational expenses and vendor purchases eligible for GST ITC claim
              </p>
            </div>
            <div className="p-3 bg-white rounded-2xl border border-neutral-200/80 shadow-xs text-right">
              <span className="text-[10px] text-neutral-500 uppercase font-bold block">Total Inward ITC</span>
              <span className="text-base font-bold font-mono text-emerald-700">
                {formatINR(estimatedInwardCgst + estimatedInwardSgst)}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200/80 text-[10px] tracking-wider uppercase">
                  <th className="py-2.5 px-4 border-r border-neutral-200/60">Date</th>
                  <th className="py-2.5 px-4 border-r border-neutral-200/60">Supplier / Payee</th>
                  <th className="py-2.5 px-3 border-r border-neutral-200/60">Category</th>
                  <th className="py-2.5 px-3 border-r border-neutral-200/60">Voucher Ref</th>
                  <th className="py-2.5 px-3 text-right border-r border-neutral-200/60">Taxable Amount</th>
                  <th className="py-2.5 px-3 text-right border-r border-neutral-200/60">Eligible ITC (CGST+SGST)</th>
                  <th className="py-2.5 px-4 text-right">Invoice Gross (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-mono text-[11px]">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-neutral-500 font-sans">
                      No inward purchase or expense vouchers recorded in this period.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp) => {
                    const taxable = exp.amount / 1.18;
                    const itc = exp.amount - taxable;
                    return (
                      <tr key={exp.id} className="hover:bg-neutral-50/70">
                        <td className="py-2 px-4 border-r border-neutral-200/60 text-neutral-500">{formatDate(exp.date)}</td>
                        <td className="py-2 px-4 border-r border-neutral-200/60 font-sans font-semibold text-neutral-900">{exp.paidTo || 'Vendor / Counter'}</td>
                        <td className="py-2 px-3 border-r border-neutral-200/60 font-sans text-neutral-600">{exp.category}</td>
                        <td className="py-2 px-3 border-r border-neutral-200/60 text-neutral-500">{exp.receiptNo || '—'}</td>
                        <td className="py-2 px-3 text-right border-r border-neutral-200/60 text-neutral-800">{formatINR(taxable)}</td>
                        <td className="py-2 px-3 text-right border-r border-neutral-200/60 text-emerald-700 font-bold">+{formatINR(itc)}</td>
                        <td className="py-2 px-4 text-right font-bold text-neutral-900">{formatINR(exp.amount)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. GSTR 3B (MONTHLY SUMMARY - OUTWARD VS INWARD ITC)                      */}
      {/* ========================================================================= */}
      {activeReportType === 'GSTR 3 B' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold tracking-tight text-neutral-900 uppercase">
              GSTR-3B Monthly Consolidated Tax Return
            </h2>
            <span className="text-[11px] text-neutral-500">
              Rule 61(5) CGST Rules • GSTIN: <span className="font-mono font-medium text-neutral-900">{settings.gstin}</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-white rounded-3xl border border-neutral-200/80 shadow-2xs space-y-2">
              <span className="text-[10px] uppercase font-bold text-neutral-500">Total Output Tax Liability</span>
              <div className="text-xl font-bold font-mono text-neutral-900">
                {formatINR(totalCgst + totalSgst + totalIgst)}
              </div>
              <p className="text-[11px] text-neutral-500">Collected on {filteredInvoices.length} sales bills</p>
            </div>

            <div className="p-5 bg-white rounded-3xl border border-neutral-200/80 shadow-2xs space-y-2">
              <span className="text-[10px] uppercase font-bold text-neutral-500">Eligible Input Tax Credit (ITC)</span>
              <div className="text-xl font-bold font-mono text-emerald-700">
                {formatINR(estimatedInwardCgst + estimatedInwardSgst)}
              </div>
              <p className="text-[11px] text-neutral-500">Claimable from expenses & purchases</p>
            </div>

            <div className="p-5 bg-black text-white rounded-3xl shadow-xs space-y-2">
              <span className="text-[10px] uppercase font-bold text-neutral-400">Net Tax Payable in Cash</span>
              <div className="text-xl font-bold font-mono text-white">
                {formatINR(Math.max(0, (totalCgst + totalSgst + totalIgst) - (estimatedInwardCgst + estimatedInwardSgst)))}
              </div>
              <p className="text-[11px] text-neutral-400">After adjusting available ITC balance</p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. GSTR 9 (ANNUAL CONSOLIDATED RETURN)                                     */}
      {/* ========================================================================= */}
      {activeReportType === 'GSTR 9' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-black uppercase">
                GSTR-9 Annual Return Summary
              </h2>
              <p className="text-[11px] text-[#86868b]">Financial Year Consolidated Turnover & Tax Summary</p>
            </div>
            <span className="text-xs font-bold font-mono text-neutral-700 bg-neutral-100 px-3 py-1 rounded-full">
              FY 2024-25
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-black/[0.08] shadow-xs p-6 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4 border-b border-neutral-100 font-mono text-xs">
              <div>
                <span className="text-neutral-400 text-[10px] block uppercase font-bold">Annual Gross Turnover</span>
                <span className="text-base font-bold text-black">{formatINR(totalInvoiceValue)}</span>
              </div>
              <div>
                <span className="text-neutral-400 text-[10px] block uppercase font-bold">Taxable Supplies</span>
                <span className="text-base font-bold text-black">{formatINR(totalTaxableValue)}</span>
              </div>
              <div>
                <span className="text-neutral-400 text-[10px] block uppercase font-bold">Total CGST + SGST</span>
                <span className="text-base font-bold text-black">{formatINR(totalCgst + totalSgst)}</span>
              </div>
              <div>
                <span className="text-neutral-400 text-[10px] block uppercase font-bold">Total IGST</span>
                <span className="text-base font-bold text-black">{formatINR(totalIgst)}</span>
              </div>
            </div>
            <p className="text-[11px] text-neutral-500">
              Data compiled from all settled bills under {settings.firmName} ({settings.gstin}).
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. ITEM REPORT BY PARTY                                                   */}
      {/* ========================================================================= */}
      {activeReportType === 'Item Report By Party' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold tracking-tight text-black uppercase">
              Item Report By Party (Customer Purchase Matrix)
            </h2>
            <span className="text-[11px] text-[#86868b]">
              {partyItemReport.length} item line records
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-50/80 text-neutral-600 font-semibold border-b border-neutral-200/80 text-[10px] tracking-wider uppercase">
                  <th className="py-2.5 px-4 border-r border-neutral-200/60">Party Name</th>
                  <th className="py-2.5 px-4 border-r border-neutral-200/60">GSTIN / Phone</th>
                  <th className="py-2.5 px-4 border-r border-neutral-200/60">Purchased Item</th>
                  <th className="py-2.5 px-3 text-center border-r border-neutral-200/60">Quantity</th>
                  <th className="py-2.5 px-3 text-right border-r border-neutral-200/60">Total Amount (₹)</th>
                  <th className="py-2.5 px-3 text-right">Bill Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-mono text-[11px]">
                {partyItemReport.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-neutral-500 font-sans">
                      No party item sales recorded in this period.
                    </td>
                  </tr>
                ) : (
                  partyItemReport.map((p, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="py-2 px-4 border-r border-neutral-100 font-sans font-bold text-neutral-900">{p.partyName}</td>
                      <td className="py-2 px-4 border-r border-neutral-100 text-neutral-500">{p.gstin || p.phone}</td>
                      <td className="py-2 px-4 border-r border-neutral-100 font-sans font-medium text-neutral-900">{p.itemName}</td>
                      <td className="py-2 px-3 text-center border-r border-neutral-100 text-neutral-800">{p.qty} {p.unit}</td>
                      <td className="py-2 px-3 text-right border-r border-neutral-100 font-bold text-neutral-900">{formatINR(p.totalAmount)}</td>
                      <td className="py-2 px-3 text-right text-neutral-500">{formatDate(p.lastDate)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. PROFIT & LOSS SUITE: CLIENT WISE, ITEM WISE, BILL WISE                */}
      {/* ========================================================================= */}
      {['Item Wise Profit And Loss', 'Bill Wise Profit And Loss', 'Client Wise Profit And Loss'].includes(activeReportType) && (
        <div className="space-y-6">
          {/* Header & Meta */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-neutral-900 uppercase flex items-center gap-2">
                {profitTab === 'CLIENT' && 'Client / Party Wise Profit & Loss Report'}
                {profitTab === 'ITEM' && 'Item / Product Wise Profit & Loss Report'}
                {profitTab === 'BILL' && 'Bill / Invoice Wise Profit & Loss Report'}
              </h2>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Real-time Gross Profit Margin & Profitability Analytics across Transactions
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Gross Margin: {overallProfitMargin.toFixed(1)}%
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-neutral-100 text-neutral-800 border border-neutral-200">
                Total Profit: +{formatINR(totalInvoicedProfit)}
              </span>
            </div>
          </div>

          {/* Top 4 KPI Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 bg-white rounded-2xl border border-neutral-200/80 shadow-xs">
              <div className="flex items-center justify-between text-neutral-500 mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider">Total Gross Profit</span>
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-lg font-bold font-mono text-emerald-600">
                +{formatINR(totalInvoicedProfit)}
              </div>
              <span className="text-[10px] text-neutral-400">From {filteredInvoices.length} invoices</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-neutral-200/80 shadow-xs">
              <div className="flex items-center justify-between text-neutral-500 mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider">Overall Margin</span>
                <Percent className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div className="text-lg font-bold font-mono text-blue-600">
                {overallProfitMargin.toFixed(1)}%
              </div>
              <span className="text-[10px] text-neutral-400">On {formatINR(totalInvoicedRevenue)} sales</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-neutral-200/80 shadow-xs">
              <div className="flex items-center justify-between text-neutral-500 mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider">Top Client</span>
                <Users className="w-3.5 h-3.5 text-purple-600" />
              </div>
              <div className="text-sm font-bold text-neutral-900 truncate" title={topProfitableClient?.name || 'N/A'}>
                {topProfitableClient ? topProfitableClient.name : 'No sales recorded'}
              </div>
              <span className="text-[10px] text-emerald-600 font-mono font-medium">
                {topProfitableClient ? `+${formatINR(topProfitableClient.totalProfit)} profit` : '—'}
              </span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-neutral-200/80 shadow-xs">
              <div className="flex items-center justify-between text-neutral-500 mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider">Top Item</span>
                <Package className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div className="text-sm font-bold text-neutral-900 truncate" title={topProfitableProduct?.name || 'N/A'}>
                {topProfitableProduct ? topProfitableProduct.name : 'No sales recorded'}
              </div>
              <span className="text-[10px] text-emerald-600 font-mono font-medium">
                {topProfitableProduct ? `+${formatINR(topProfitableProduct.profit)} (${topProfitableProduct.margin.toFixed(0)}%)` : '—'}
              </span>
            </div>
          </div>

          {/* SubTab Pill Switcher + Search + Sort Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 bg-white rounded-2xl border border-neutral-200/80 shadow-xs">
            {/* Pill Switcher */}
            <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl border border-neutral-200/60">
              <button
                onClick={() => { setProfitTab('CLIENT'); setExpandedProfitRowId(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  profitTab === 'CLIENT'
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Client Wise
              </button>
              <button
                onClick={() => { setProfitTab('ITEM'); setExpandedProfitRowId(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  profitTab === 'ITEM'
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                Item Wise
              </button>
              <button
                onClick={() => { setProfitTab('BILL'); setExpandedProfitRowId(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  profitTab === 'BILL'
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                Bill Wise
              </button>
            </div>

            {/* Search & Sort Controls */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder={
                    profitTab === 'CLIENT'
                      ? 'Search client, phone, GSTIN...'
                      : profitTab === 'ITEM'
                      ? 'Search product or HSN...'
                      : 'Search bill #, party...'
                  }
                  value={profitSearch}
                  onChange={(e) => setProfitSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-neutral-50 rounded-xl border border-neutral-200 text-xs font-medium text-neutral-900 focus:outline-none focus:border-black placeholder:text-neutral-400"
                />
              </div>

              <div className="relative">
                <select
                  value={profitSort}
                  onChange={(e) => setProfitSort(e.target.value as any)}
                  className="px-3 py-1.5 bg-neutral-50 rounded-xl border border-neutral-200 text-xs font-medium text-neutral-900 focus:outline-none focus:border-black appearance-none pr-7 cursor-pointer"
                >
                  <option value="PROFIT_DESC">Highest Profit</option>
                  <option value="PROFIT_ASC">Lowest Profit</option>
                  <option value="MARGIN_DESC">Highest Margin %</option>
                  <option value="SALES_DESC">Highest Revenue</option>
                </select>
                <ChevronDown className="w-3 h-3 text-neutral-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Tab 1: CLIENT WISE PROFIT TABLE */}
          {profitTab === 'CLIENT' && (
            <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-50/80 text-neutral-600 font-semibold border-b border-neutral-200/80 text-[10px] tracking-wider uppercase">
                      <th className="py-2.5 px-4 border-r border-neutral-200/60">Party / Client Name</th>
                      <th className="py-2.5 px-3 border-r border-neutral-200/60">GSTIN / Phone</th>
                      <th className="py-2.5 px-3 text-center border-r border-neutral-200/60">Bills</th>
                      <th className="py-2.5 px-4 text-right border-r border-neutral-200/60">Total Revenue</th>
                      <th className="py-2.5 px-4 text-right border-r border-neutral-200/60">Cost of Goods (COGS)</th>
                      <th className="py-2.5 px-4 text-right border-r border-neutral-200/60">Gross Profit (₹)</th>
                      <th className="py-2.5 px-3 text-right border-r border-neutral-200/60">Margin (%)</th>
                      <th className="py-2.5 px-3 text-center">Invoices</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 font-mono text-[11px]">
                    {filteredSortedClientProfit.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-[#86868b] font-sans">
                          No client profit records found.
                        </td>
                      </tr>
                    ) : (
                      filteredSortedClientProfit.map((client) => {
                        const isExpanded = expandedProfitRowId === client.id;
                        const isProfitPositive = client.totalProfit >= 0;
                        return (
                          <React.Fragment key={client.id}>
                            <tr className="hover:bg-black/[0.015] transition-colors">
                              <td className="py-2.5 px-4 border-r border-black/[0.04] font-sans">
                                <span className="font-bold text-black block text-xs">{client.name}</span>
                              </td>
                              <td className="py-2.5 px-3 border-r border-black/[0.04] text-[#86868b]">
                                <div>{client.phone}</div>
                                {client.gstin !== 'Unregistered' && (
                                  <span className="text-[9px] px-1 py-0.5 rounded bg-black/5 font-mono text-neutral-700">
                                    {client.gstin}
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center border-r border-black/[0.04] font-sans font-medium text-black">
                                {client.invoicesCount} {client.invoicesCount === 1 ? 'bill' : 'bills'}
                              </td>
                              <td className="py-2.5 px-4 text-right border-r border-black/[0.04] text-black">
                                {formatINR(client.totalRevenue)}
                              </td>
                              <td className="py-2.5 px-4 text-right border-r border-black/[0.04] text-neutral-500">
                                {formatINR(client.totalCost)}
                              </td>
                              <td className={`py-2.5 px-4 text-right border-r border-black/[0.04] font-bold ${
                                isProfitPositive ? 'text-emerald-700' : 'text-rose-600'
                              }`}>
                                {isProfitPositive ? '+' : ''}{formatINR(client.totalProfit)}
                              </td>
                              <td className={`py-2.5 px-3 text-right border-r border-black/[0.04] font-bold ${
                                isProfitPositive ? 'text-emerald-700' : 'text-rose-600'
                              }`}>
                                {client.margin.toFixed(1)}%
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  onClick={() => setExpandedProfitRowId(isExpanded ? null : client.id)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-sans font-medium border border-black/10 hover:bg-black hover:text-white transition-all cursor-pointer"
                                >
                                  <span>{isExpanded ? 'Hide' : 'View'}</span>
                                  <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                </button>
                              </td>
                            </tr>

                            {/* Client Invoices Drill-down Drawer */}
                            {isExpanded && (
                              <tr className="bg-[#fcfcfd]">
                                <td colSpan={8} className="p-4 border-b border-black/[0.08]">
                                  <div className="bg-white rounded-xl border border-black/[0.08] p-3 shadow-2xs">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-[11px] font-semibold text-black">
                                        Invoices for {client.name} ({client.invoices.length})
                                      </span>
                                      <span className="text-[10px] text-[#86868b]">
                                        Click invoice number to preview
                                      </span>
                                    </div>
                                    <table className="w-full text-left text-xs border-collapse">
                                      <thead>
                                        <tr className="border-b border-black/[0.04] text-[9px] text-[#86868b] uppercase tracking-wider">
                                          <th className="py-1.5 px-2">Invoice #</th>
                                          <th className="py-1.5 px-2">Date</th>
                                          <th className="py-1.5 px-2">Type</th>
                                          <th className="py-1.5 px-2 text-right">Grand Total</th>
                                          <th className="py-1.5 px-2 text-right">Est. Cost</th>
                                          <th className="py-1.5 px-2 text-right">Profit</th>
                                          <th className="py-1.5 px-2 text-right">Margin %</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-black/[0.03] font-mono text-[10px]">
                                        {client.invoices.map((inv) => {
                                          const cost = inv.items.reduce((s, it) => s + ((it.purchasePrice || it.salePrice * 0.7) * it.qty), 0);
                                          const profit = (inv.totalProfit !== undefined && inv.totalProfit !== null) ? inv.totalProfit : (inv.grandTotal - cost);
                                          const margin = inv.grandTotal > 0 ? (profit / inv.grandTotal) * 100 : 0;
                                          return (
                                            <tr key={inv.id} className="hover:bg-black/[0.01]">
                                              <td className="py-1.5 px-2 font-bold">
                                                <button
                                                  onClick={() => onSelectInvoice(inv)}
                                                  className="text-blue-600 hover:underline flex items-center gap-1 cursor-pointer font-mono"
                                                >
                                                  <Eye className="w-3 h-3" />
                                                  {inv.invoiceNumber}
                                                </button>
                                              </td>
                                              <td className="py-1.5 px-2 text-[#86868b]">{formatDate(inv.date)}</td>
                                              <td className="py-1.5 px-2 font-sans text-neutral-600">{inv.saleType || 'B2B'}</td>
                                              <td className="py-1.5 px-2 text-right text-black font-semibold">{formatINR(inv.grandTotal)}</td>
                                              <td className="py-1.5 px-2 text-right text-neutral-500">{formatINR(cost)}</td>
                                              <td className={`py-1.5 px-2 text-right font-bold ${profit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                                                {profit >= 0 ? '+' : ''}{formatINR(profit)}
                                              </td>
                                              <td className={`py-1.5 px-2 text-right font-semibold ${profit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                                                {margin.toFixed(1)}%
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 2: ITEM WISE PROFIT TABLE */}
          {profitTab === 'ITEM' && (
            <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-50/80 text-neutral-600 font-semibold border-b border-neutral-200/80 text-[10px] tracking-wider uppercase">
                      <th className="py-2.5 px-4 border-r border-neutral-200/60">Product Name</th>
                      <th className="py-2.5 px-3 border-r border-neutral-200/60">HSN</th>
                      <th className="py-2.5 px-3 text-center border-r border-neutral-200/60">Units Sold</th>
                      <th className="py-2.5 px-3 text-right border-r border-neutral-200/60">Avg Sale Rate</th>
                      <th className="py-2.5 px-3 text-right border-r border-neutral-200/60">Avg Cost Rate</th>
                      <th className="py-2.5 px-4 text-right border-r border-neutral-200/60">Sales Revenue</th>
                      <th className="py-2.5 px-4 text-right border-r border-neutral-200/60">Cost of Goods</th>
                      <th className="py-2.5 px-4 text-right border-r border-neutral-200/60">Gross Profit (₹)</th>
                      <th className="py-2.5 px-3 text-right">Margin (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 font-mono text-[11px]">
                    {filteredSortedItemProfit.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-neutral-500 font-sans">
                          No sales data available to calculate item profit margins.
                        </td>
                      </tr>
                    ) : (
                      filteredSortedItemProfit.map((it, idx) => {
                        const isProfitPositive = it.profit >= 0;
                        return (
                          <tr key={idx} className="hover:bg-neutral-50/70 transition-colors">
                            <td className="py-2.5 px-4 border-r border-neutral-100 font-sans font-bold text-neutral-900">{it.name}</td>
                            <td className="py-2.5 px-3 border-r border-neutral-100 text-neutral-500">{it.hsn}</td>
                            <td className="py-2.5 px-3 text-center border-r border-neutral-100 text-neutral-900 font-semibold">{it.qty}</td>
                            <td className="py-2.5 px-3 text-right border-r border-neutral-100 text-neutral-600">{formatINR(it.avgSalePrice)}</td>
                            <td className="py-2.5 px-3 text-right border-r border-neutral-100 text-neutral-500">{formatINR(it.avgCostPrice)}</td>
                            <td className="py-2.5 px-4 text-right border-r border-neutral-100 font-semibold text-neutral-900">{formatINR(it.revenue)}</td>
                            <td className="py-2.5 px-4 text-right border-r border-neutral-100 text-neutral-500">{formatINR(it.cost)}</td>
                            <td className={`py-2.5 px-4 text-right border-r border-neutral-100 font-bold ${
                              isProfitPositive ? 'text-emerald-700' : 'text-rose-600'
                            }`}>
                              {isProfitPositive ? '+' : ''}{formatINR(it.profit)}
                            </td>
                            <td className={`py-2.5 px-3 text-right font-bold ${
                              isProfitPositive ? 'text-emerald-700' : 'text-rose-600'
                            }`}>
                              <div className="flex items-center justify-end gap-1.5">
                                <span>{it.margin.toFixed(1)}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: BILL WISE PROFIT TABLE */}
          {profitTab === 'BILL' && (
            <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-50/80 text-neutral-600 font-semibold border-b border-neutral-200/80 text-[10px] tracking-wider uppercase">
                      <th className="py-2.5 px-4 border-r border-neutral-200/60">Invoice Number</th>
                      <th className="py-2.5 px-3 border-r border-neutral-200/60">Date</th>
                      <th className="py-2.5 px-4 border-r border-neutral-200/60">Party / Client</th>
                      <th className="py-2.5 px-3 border-r border-neutral-200/60">Payment / Type</th>
                      <th className="py-2.5 px-4 text-right border-r border-neutral-200/60">Grand Total (₹)</th>
                      <th className="py-2.5 px-4 text-right border-r border-neutral-200/60">Bill Cost (₹)</th>
                      <th className="py-2.5 px-4 text-right border-r border-neutral-200/60">Net Profit (₹)</th>
                      <th className="py-2.5 px-3 text-right border-r border-neutral-200/60">Margin (%)</th>
                      <th className="py-2.5 px-3 text-center">Items</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 font-mono text-[11px]">
                    {filteredSortedBillProfit.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-neutral-500 font-sans">
                          No bills recorded in this period.
                        </td>
                      </tr>
                    ) : (
                      filteredSortedBillProfit.map((b) => {
                        const isExpanded = expandedProfitRowId === b.id;
                        const isProfitPositive = b.billProfit >= 0;
                        return (
                          <React.Fragment key={b.id}>
                            <tr className="hover:bg-neutral-50/70 transition-colors">
                              <td className="py-2.5 px-4 border-r border-neutral-100 font-bold">
                                <button
                                  onClick={() => onSelectInvoice(b.invoice)}
                                  className="text-blue-600 hover:underline flex items-center gap-1.5 cursor-pointer font-mono"
                                  title="Click to preview full invoice"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>{b.invoiceNumber}</span>
                                </button>
                              </td>
                              <td className="py-2.5 px-3 border-r border-neutral-100 text-neutral-500">
                                {formatDate(b.date)}
                              </td>
                              <td className="py-2.5 px-4 border-r border-neutral-100 font-sans font-semibold text-neutral-900">
                                <div>{b.customerName}</div>
                                <span className="text-[10px] text-neutral-500 font-normal">{b.customerPhone}</span>
                              </td>
                              <td className="py-2.5 px-3 border-r border-neutral-100 font-sans text-neutral-600">
                                <span className="px-1.5 py-0.5 rounded bg-neutral-100 text-[10px] font-medium border border-neutral-200">
                                  {b.saleType || 'B2B'}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-right border-r border-neutral-100 font-semibold text-neutral-900">
                                {formatINR(b.grandTotal)}
                              </td>
                              <td className="py-2.5 px-4 text-right border-r border-neutral-100 text-neutral-500">
                                {formatINR(b.billCost)}
                              </td>
                              <td className={`py-2.5 px-4 text-right border-r border-neutral-100 font-bold ${
                                isProfitPositive ? 'text-emerald-700' : 'text-rose-600'
                              }`}>
                                {isProfitPositive ? '+' : ''}{formatINR(b.billProfit)}
                              </td>
                              <td className={`py-2.5 px-3 text-right border-r border-neutral-100 font-bold ${
                                isProfitPositive ? 'text-emerald-700' : 'text-rose-600'
                              }`}>
                                {b.margin.toFixed(1)}%
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  onClick={() => setExpandedProfitRowId(isExpanded ? null : b.id)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-sans font-medium border border-neutral-200 hover:bg-neutral-100 text-neutral-800 transition-all cursor-pointer"
                                >
                                  <span>{isExpanded ? 'Hide' : 'Items'}</span>
                                  <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                </button>
                              </td>
                            </tr>

                            {/* Itemized Bill Breakdown */}
                            {isExpanded && (
                              <tr className="bg-neutral-50/50">
                                <td colSpan={9} className="p-4 border-b border-neutral-200">
                                  <div className="bg-white rounded-xl border border-neutral-200 p-3 shadow-2xs">
                                    <div className="text-[11px] font-semibold text-neutral-900 mb-2">
                                      Line Items for Invoice #{b.invoiceNumber}
                                    </div>
                                    <table className="w-full text-left text-xs border-collapse">
                                      <thead>
                                        <tr className="border-b border-neutral-200 text-[9px] text-neutral-500 uppercase tracking-wider">
                                          <th className="py-1.5 px-2">Item Name</th>
                                          <th className="py-1.5 px-2 text-center">Qty</th>
                                          <th className="py-1.5 px-2 text-right">Sale Price</th>
                                          <th className="py-1.5 px-2 text-right">Purchase Price (Cost)</th>
                                          <th className="py-1.5 px-2 text-right">Line Total</th>
                                          <th className="py-1.5 px-2 text-right">Item Profit</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-neutral-100 font-mono text-[10px]">
                                        {b.items.map((it, iIdx) => {
                                          const costRate = it.purchasePrice || (it.salePrice * 0.7);
                                          const totalCost = costRate * it.qty;
                                          const itemProfit = it.total - totalCost;
                                          return (
                                            <tr key={iIdx} className="hover:bg-neutral-50/60">
                                              <td className="py-1.5 px-2 font-sans font-medium text-neutral-900">{it.name}</td>
                                              <td className="py-1.5 px-2 text-center text-neutral-900">{it.qty} {it.unit || 'Pcs'}</td>
                                              <td className="py-1.5 px-2 text-right text-neutral-700">{formatINR(it.salePrice)}</td>
                                              <td className="py-1.5 px-2 text-right text-neutral-500">{formatINR(costRate)}</td>
                                              <td className="py-1.5 px-2 text-right font-medium text-neutral-900">{formatINR(it.total)}</td>
                                              <td className={`py-1.5 px-2 text-right font-bold ${itemProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                                                {itemProfit >= 0 ? '+' : ''}{formatINR(itemProfit)}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. BANK STATEMENT                                                         */}
      {/* ========================================================================= */}
      {activeReportType === 'Bank Statement' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-neutral-900 uppercase">
                Bank Statement & UPI Passbook
              </h2>
              <p className="text-[11px] text-neutral-500">
                {settings.bankName || 'State Bank of India'} • A/C: {settings.accountNumber || '382001092834'}
              </p>
            </div>
            <span className="text-[11px] font-mono text-neutral-700">
              UPI: {settings.upiId}
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-50/80 text-neutral-600 font-semibold border-b border-neutral-200/80 text-[10px] tracking-wider uppercase">
                  <th className="py-2.5 px-4 border-r border-neutral-200/60">Date</th>
                  <th className="py-2.5 px-4 border-r border-neutral-200/60">Particulars / Counterparty</th>
                  <th className="py-2.5 px-3 border-r border-neutral-200/60">Ref / Bill No</th>
                  <th className="py-2.5 px-3 border-r border-neutral-200/60">Mode</th>
                  <th className="py-2.5 px-3 text-right border-r border-neutral-200/60">Withdrawal / Debit (-)</th>
                  <th className="py-2.5 px-4 text-right">Deposit / Credit (+)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-mono text-[11px]">
                {bankStatementEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-neutral-500 font-sans">
                      No bank or UPI transactions found for this date range.
                    </td>
                  </tr>
                ) : (
                  bankStatementEntries.map((b) => (
                    <tr key={b.id} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="py-2 px-4 border-r border-neutral-100 text-neutral-500">{formatDate(b.date)}</td>
                      <td className="py-2 px-4 border-r border-neutral-100 font-sans font-semibold text-neutral-900">{b.particulars}</td>
                      <td className="py-2 px-3 border-r border-neutral-100 text-neutral-500">{b.ref}</td>
                      <td className="py-2 px-3 border-r border-neutral-100">
                        <span className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 font-mono text-[10px] border border-neutral-200">
                          {b.mode}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right border-r border-neutral-100 text-rose-600 font-bold">
                        {b.debit > 0 ? `-${formatINR(b.debit)}` : '—'}
                      </td>
                      <td className="py-2 px-4 text-right text-emerald-700 font-bold">
                        {b.credit > 0 ? `+${formatINR(b.credit)}` : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. DEFAULT GSTR-1 OUTWARD SUPPLIES REPORT                                 */}
      {/* ========================================================================= */}
      {(activeReportType === 'GSTR 1' ||
        (!['Sale Summary By HSN', 'SAC Report', 'Stock summary', 'Low Stock Summary', 'GSTR 2', 'GSTR 3 B', 'GSTR 9', 'Item Report By Party', 'Item Wise Profit And Loss', 'Bill Wise Profit And Loss', 'Client Wise Profit And Loss', 'Bank Statement'].includes(activeReportType))) && (
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold tracking-tight text-neutral-900 uppercase">
                GSTR-1 Outward Supplies Report
              </h2>
              <span className="text-[11px] text-neutral-500">
                Rule 59 CGST Rules • GSTIN: <span className="font-mono font-medium text-neutral-900">{settings.gstin}</span>
              </span>
            </div>

            {/* Aggregated Total Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3.5 bg-white rounded-2xl border border-neutral-200/80 shadow-xs">
                <span className="text-[10px] text-neutral-500 font-medium block">Total Invoices</span>
                <span className="text-base font-bold font-mono text-neutral-900">{filteredInvoices.length} Bills</span>
              </div>
              <div className="p-3.5 bg-white rounded-2xl border border-neutral-200/80 shadow-xs">
                <span className="text-[10px] text-neutral-500 font-medium block">Taxable Value</span>
                <span className="text-base font-bold font-mono text-neutral-900">{formatINR(totalTaxableValue)}</span>
              </div>
              <div className="p-3.5 bg-white rounded-2xl border border-neutral-200/80 shadow-xs">
                <span className="text-[10px] text-neutral-500 font-medium block">Central Tax (CGST)</span>
                <span className="text-base font-bold font-mono text-neutral-900">{formatINR(totalCgst)}</span>
              </div>
              <div className="p-3.5 bg-white rounded-2xl border border-neutral-200/80 shadow-xs">
                <span className="text-[10px] text-neutral-500 font-medium block">State Tax (SGST)</span>
                <span className="text-base font-bold font-mono text-neutral-900">{formatINR(totalSgst)}</span>
              </div>
              <div className="p-3.5 bg-white rounded-2xl border border-neutral-200/80 shadow-xs">
                <span className="text-[10px] text-neutral-500 font-medium block">Gross Total</span>
                <span className="text-base font-bold font-mono text-neutral-900">{formatINR(totalInvoiceValue)}</span>
              </div>
            </div>

            {/* Invoices Table */}
            <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-50/80 text-neutral-600 font-semibold border-b border-neutral-200/80 text-[10px] tracking-wider uppercase">
                      <th className="py-2.5 px-4 border-r border-neutral-200/60">Invoice No</th>
                      <th className="py-2.5 px-3 border-r border-neutral-200/60">Date</th>
                      <th className="py-2.5 px-4 border-r border-neutral-200/60">Party Name</th>
                      <th className="py-2.5 px-3 border-r border-neutral-200/60">GSTIN</th>
                      <th className="py-2.5 px-4 text-right border-r border-neutral-200/60">Taxable (₹)</th>
                      <th className="py-2.5 px-3 text-right border-r border-neutral-200/60">CGST (₹)</th>
                      <th className="py-2.5 px-3 text-right border-r border-neutral-200/60">SGST (₹)</th>
                      <th className="py-2.5 px-3 text-right border-r border-neutral-200/60">IGST (₹)</th>
                      <th className="py-2.5 px-4 text-right">Invoice Value (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 font-mono text-[11px]">
                    {filteredInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-neutral-500 font-sans">
                          No sales invoices recorded for this period.
                        </td>
                      </tr>
                    ) : (
                      filteredInvoices.map((inv) => (
                        <tr
                          key={inv.id}
                          onClick={() => onSelectInvoice(inv)}
                          className="hover:bg-neutral-50/70 cursor-pointer transition-colors"
                        >
                          <td className="py-2.5 px-4 border-r border-neutral-100 font-bold text-neutral-900">{inv.invoiceNumber}</td>
                          <td className="py-2.5 px-3 border-r border-neutral-100 text-neutral-500">{formatDate(inv.date)}</td>
                          <td className="py-2.5 px-4 border-r border-neutral-100 font-sans font-medium text-neutral-900 truncate max-w-xs">{inv.customer.name}</td>
                          <td className="py-2.5 px-3 border-r border-neutral-100 text-neutral-500">{inv.customer.gstin || 'B2C'}</td>
                          <td className="py-2.5 px-4 text-right border-r border-neutral-100 text-neutral-900">{formatINR(inv.taxableTotal)}</td>
                          <td className="py-2.5 px-3 text-right border-r border-neutral-100 text-neutral-500">{formatINR(inv.cgstTotal)}</td>
                          <td className="py-2.5 px-3 text-right border-r border-neutral-100 text-neutral-500">{formatINR(inv.sgstTotal)}</td>
                          <td className="py-2.5 px-3 text-right border-r border-neutral-100 text-neutral-500">{formatINR(inv.igstTotal)}</td>
                          <td className="py-2.5 px-4 text-right font-bold text-neutral-900">{formatINR(inv.grandTotal)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
