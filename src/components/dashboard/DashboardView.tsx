import React, { useState, useRef, useMemo } from 'react';
import {
  TrendingUp,
  CreditCard,
  Receipt,
  Sparkles,
  Calendar,
  ChevronDown,
  LayoutGrid,
  Download,
  MoreHorizontal,
  ArrowUpRight,
  ArrowDownRight,
  Mic,
  ArrowUp,
  Paperclip,
  Star,
  X,
  PieChart,
  BarChart3,
  LineChart,
  Store,
  Truck,
  Building,
  Package,
  Plus,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Invoice, Customer, Product, Expense, BusinessSettings } from '../../types';
import { formatINR } from '../../utils/formatters';
import { ActiveTab } from '../layout/Sidebar';
import { AppleModal } from '../common/AppleModal';

interface DashboardViewProps {
  invoices: Invoice[];
  customers: Customer[];
  products: Product[];
  expenses: Expense[];
  settings: BusinessSettings;
  setActiveTab: (tab: ActiveTab) => void;
  onSelectInvoiceForPreview: (inv: Invoice) => void;
}

// 30-Day Historical Data Points for the Interactive Scrubbing Curve
interface DataPoint {
  dayIndex: number;
  dateStr: string;
  currentTurnover: number;
  prevTurnover: number;
  svgX: number; // 0 to 500
  svgY: number; // 0 to 150
}

const CHART_POINTS: DataPoint[] = [
  { dayIndex: 1, dateStr: '01 Jan, 2026', currentTurnover: 38200, prevTurnover: 28400, svgX: 10, svgY: 115 },
  { dayIndex: 4, dateStr: '04 Jan, 2026', currentTurnover: 46500, prevTurnover: 34100, svgX: 50, svgY: 108 },
  { dayIndex: 7, dateStr: '07 Jan, 2026', currentTurnover: 62000, prevTurnover: 42000, svgX: 95, svgY: 96 },
  { dayIndex: 10, dateStr: '10 Jan, 2026', currentTurnover: 84100, prevTurnover: 53200, svgX: 145, svgY: 78 },
  { dayIndex: 13, dateStr: '13 Jan, 2026', currentTurnover: 95000, prevTurnover: 61000, svgX: 195, svgY: 66 },
  { dayIndex: 16, dateStr: '16 Jan, 2026', currentTurnover: 112000, prevTurnover: 58000, svgX: 245, svgY: 52 },
  { dayIndex: 18, dateStr: '18 Jan, 2026', currentTurnover: 123240, prevTurnover: 59830, svgX: 280, svgY: 42 },
  { dayIndex: 21, dateStr: '21 Jan, 2026', currentTurnover: 89400, prevTurnover: 72000, svgX: 330, svgY: 72 },
  { dayIndex: 24, dateStr: '24 Jan, 2026', currentTurnover: 108500, prevTurnover: 81000, svgX: 380, svgY: 55 },
  { dayIndex: 26, dateStr: '26 Jan, 2026', currentTurnover: 139000, prevTurnover: 94000, svgX: 425, svgY: 30 },
  { dayIndex: 28, dateStr: '28 Jan, 2026', currentTurnover: 152400, prevTurnover: 105000, svgX: 465, svgY: 22 },
  { dayIndex: 30, dateStr: '30 Jan, 2026', currentTurnover: 164310, prevTurnover: 118000, svgX: 500, svgY: 16 },
];

export const DashboardView: React.FC<DashboardViewProps> = ({
  invoices,
  customers,
  products,
  expenses,
  settings,
  setActiveTab,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState('Last 30 days');
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState(false);
  const [isAddWidgetOpen, setIsAddWidgetOpen] = useState(false);
  const [selectedProductModal, setSelectedProductModal] = useState<Product | null>(null);
  const [activeDayNotice, setActiveDayNotice] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponses, setAiResponses] = useState<string[]>([]);
  const [activeWidgets, setActiveWidgets] = useState<string[]>([
    'visitors_by_device',
    'orders_performance',
  ]);

  // Dynamic Chart Cursor Hover State (defaults to Peak Day 18)
  const defaultHoverIndex = 6; // 18 Jan
  const [hoverIndex, setHoverIndex] = useState<number>(defaultHoverIndex);
  const [isCursorActive, setIsCursorActive] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement | null>(null);

  // Real GST Billing Calculations
  const grossMargin = invoices.reduce((sum, inv) => sum + (inv.totalProfit || 0), 0);
  const totalExp = expenses.reduce((sum, e) => sum + e.amount, 0);
  const actualNetProfit = Math.max(0, grossMargin - totalExp);

  const totalCreditReceivable =
    customers.reduce((sum, c) => sum + (c.currentBalance > 0 ? c.currentBalance : 0), 0);
  const creditPartiesCount = customers.filter((c) => c.currentBalance > 0).length;

  const totalInvoicedSales = invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  const totalInvoicesCount = invoices.length;

  const topProduct = products[0] || null;

  // Cursor move handler for dynamic turnover scrubbing
  const handleChartMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!chartContainerRef.current) return;
    const rect = chartContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const ratio = x / rect.width;

    // Find nearest data point
    const index = Math.round(ratio * (CHART_POINTS.length - 1));
    setHoverIndex(Math.max(0, Math.min(CHART_POINTS.length - 1, index)));
    setIsCursorActive(true);
  };

  const currentHoverPoint = CHART_POINTS[hoverIndex] || CHART_POINTS[defaultHoverIndex];

  // Tooltip position in percentage
  const tooltipLeftPercent = (currentHoverPoint.svgX / 500) * 100;
  const clampedTooltipLeft = Math.max(16, Math.min(84, tooltipLeftPercent));

  const handleSendAiPrompt = (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const query = (customPrompt || aiPrompt).trim();
    if (!query) return;
    setAiPrompt('');

    let answer = '';
    const q = query.toLowerCase();
    if (q.includes('turnover') || q.includes('sale')) {
      answer = `📊 Total Invoiced Turnover is ${formatINR(totalInvoicedSales)} across ${totalInvoicesCount} GST bills with an actual net operating profit of ${formatINR(actualNetProfit)}.`;
    } else if (q.includes('receivable') || q.includes('credit') || q.includes('due')) {
      const topDebtor = customers.find((c) => c.currentBalance > 0);
      answer = `💳 Total pending credit receivables are ${formatINR(totalCreditReceivable)} across ${creditPartiesCount} credit clients.${topDebtor ? ` Top debtor: ${topDebtor.name} (${formatINR(topDebtor.currentBalance)}).` : ' No overdue balances.'}`;
    } else if (q.includes('stock') || q.includes('low')) {
      const low = products.filter((p) => p.stock <= p.minStockAlert);
      answer = low.length > 0
        ? `📦 Inventory Alert: ${low.length} items are running below minimum stock. Top priority reorder: ${low[0].name}.`
        : `📦 All inventory stock levels are healthy.`;
    } else {
      answer = `💡 Business Insight for "${query}": Active retail demand is strongest on Tuesdays. Your average gross margin is 24.4% and repeat client retention rate is 68%.`;
    }

    setAiResponses((prev) => [answer, ...prev]);
  };

  const toggleWidget = (id: string) => {
    if (activeWidgets.includes(id)) {
      setActiveWidgets(activeWidgets.filter((w) => w !== id));
    } else {
      setActiveWidgets([...activeWidgets, id]);
    }
  };

  return (
    <div className="space-y-6 max-w-[1380px] mx-auto pb-12 font-sans select-none antialiased">
      {/* ========================================================================= */}
      {/* TOP DASHBOARD CONTROLS (Apple Minimalist Bar)                             */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#000000] tracking-tight">Dashboard</h2>
          <p className="text-xs text-[#86868b] mt-0.5">Real-time GST billing overview & financial analytics</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Date Range Selector Pill */}
          <div className="flex items-center space-x-2 px-3.5 py-2 bg-white rounded-xl border border-black/5 shadow-apple-subtle text-[#000000] font-medium">
            <Calendar className="w-3.5 h-3.5 text-[#86868b]" />
            <span>Jan 1, 2026 - Feb 1, 2026</span>
          </div>

          {/* Period Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsPeriodDropdownOpen(!isPeriodDropdownOpen)}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 rounded-xl border border-black/5 shadow-apple-subtle text-[#000000] font-medium transition-all"
            >
              <span>{selectedPeriod}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#86868b]" />
            </button>

            {isPeriodDropdownOpen && (
              <div className="absolute right-0 top-11 w-36 bg-white/95 backdrop-blur-xl rounded-2xl border border-black/5 shadow-apple-modal z-30 py-1.5">
                {['Today', 'Last 7 days', 'Last 30 days', 'This Quarter', 'This Year'].map(
                  (period) => (
                    <button
                      key={period}
                      onClick={() => {
                        setSelectedPeriod(period);
                        setIsPeriodDropdownOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-1.5 text-xs hover:bg-[#0071e3]/10 hover:text-[#0071e3] text-[#000000] font-medium transition-colors"
                    >
                      {period}
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          {/* Add Widget Button */}
          <button
            onClick={() => setIsAddWidgetOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 rounded-xl border border-black/5 shadow-apple-subtle text-[#000000] font-medium transition-all active:scale-95 cursor-pointer"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-[#86868b]" />
            <span>Add widget</span>
          </button>

          {/* Export Button */}
          <button
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-4 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl font-medium shadow-apple-subtle transition-all active:scale-95 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4 TOP METRIC CARDS (Apple Design: Clear, Breathable, Clickable)           */}
      {/* 1: Actual Net Profit, 2: Credit Amount, 3: Total Invoices, 4: Top Product */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Actual Net Profit */}
        <div
          onClick={() => setActiveTab('expenses')}
          title="Click to open Expenses & Net Profit Manager"
          className="p-5 bg-white rounded-3xl border border-black/[0.06] shadow-apple-subtle space-y-3 cursor-pointer hover:border-[#34c759]/40 hover:shadow-apple-card transition-all active:scale-[0.99] group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#86868b] group-hover:text-[#000000] transition-colors">
              Actual Net Profit
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#34c759]/10 group-hover:bg-[#34c759]/20 flex items-center justify-center text-[#34c759] transition-colors">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-[#000000] tracking-tight font-mono">
              {formatINR(actualNetProfit)}
            </span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-[#34c759]/10 text-[#34c759] text-[11px] font-semibold">
              <ArrowUpRight className="w-3 h-3 mr-0.5" />
              24.4%
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-gray-100 text-[#86868b]">
            <span>Gross Margin - Expenses</span>
            <span className="text-[#0071e3] font-medium group-hover:underline">Open Report →</span>
          </div>
        </div>

        {/* Card 2: Credit Amount (Pending Receivables) */}
        <div
          onClick={() => setActiveTab('customers')}
          title="Click to open Customer Accounts & Receivables Ledger"
          className="p-5 bg-white rounded-3xl border border-black/[0.06] shadow-apple-subtle space-y-3 cursor-pointer hover:border-[#ff9500]/40 hover:shadow-apple-card transition-all active:scale-[0.99] group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#86868b] group-hover:text-[#000000] transition-colors">
              Credit Amount (Receivables)
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#ff9500]/10 group-hover:bg-[#ff9500]/20 flex items-center justify-center text-[#ff9500] transition-colors">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-[#ff3b30] tracking-tight font-mono">
              {formatINR(totalCreditReceivable)}
            </span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-[#ff9500]/10 text-[#ff9500] text-[11px] font-semibold">
              Pending
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-gray-100 text-[#86868b]">
            <span>Across {creditPartiesCount} credit clients</span>
            <span className="text-[#0071e3] font-medium group-hover:underline">View Ledger →</span>
          </div>
        </div>

        {/* Card 3: Total Invoices */}
        <div
          onClick={() => setActiveTab('billing')}
          title="Click to open Billing & POS Engine"
          className="p-5 bg-white rounded-3xl border border-black/[0.06] shadow-apple-subtle space-y-3 cursor-pointer hover:border-[#0071e3]/40 hover:shadow-apple-card transition-all active:scale-[0.99] group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#86868b] group-hover:text-[#000000] transition-colors">
              Total Invoices
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#0071e3]/10 group-hover:bg-[#0071e3]/20 flex items-center justify-center text-[#0071e3] transition-colors">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-[#000000] tracking-tight font-mono">
              {totalInvoicesCount} Bills
            </span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-[#0071e3]/10 text-[#0071e3] text-[11px] font-semibold">
              <ArrowUpRight className="w-3 h-3 mr-0.5" />
              12.8%
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-gray-100 text-[#86868b]">
            <span>Cash & Credit GST bills</span>
            <span className="text-[#0071e3] font-medium group-hover:underline">New Bill →</span>
          </div>
        </div>

        {/* Card 4: Most Selling Product */}
        <div
          onClick={() => setActiveTab('inventory')}
          title="Click to open Inventory & Stock Master"
          className="p-5 bg-white rounded-3xl border border-black/[0.06] shadow-apple-subtle space-y-3 cursor-pointer hover:border-[#af52de]/40 hover:shadow-apple-card transition-all active:scale-[0.99] group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#86868b] group-hover:text-[#000000] transition-colors">
              Most Selling Product
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#af52de]/10 group-hover:bg-[#af52de]/20 flex items-center justify-center text-[#af52de] transition-colors">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-lg font-bold text-[#000000] tracking-tight truncate max-w-[155px]">
              {topProduct ? topProduct.name : 'No Products Yet'}
            </span>
            {topProduct && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-[#af52de]/10 text-[#af52de] text-[10px] font-bold">
                ★ Top
              </span>
            )}
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-gray-100 text-[#86868b]">
            <span>{topProduct ? `${topProduct.stock} units in stock` : '0 items active'}</span>
            <span className="text-[#0071e3] font-medium group-hover:underline">Check Stock →</span>
          </div>
        </div>
      </div>

      {/* Day active notification banner if tapped */}
      {activeDayNotice && (
        <div className="p-3 bg-blue-50/80 border border-blue-200 text-blue-900 text-xs font-semibold rounded-2xl flex items-center justify-between animate-in fade-in">
          <span>{activeDayNotice}</span>
          <button onClick={() => setActiveDayNotice(null)} className="text-blue-500 hover:text-blue-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MAIN 2-COLUMN GRID (Apple Clean Surfaces)                                 */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (8 of 12): Interactive Cursor-Moving Turnover Curve & Products */}
        <div className="lg:col-span-8 space-y-5">
          {/* Card: Total Business Turnover with Dynamic Cursor Scrubbing */}
          <div className="p-6 bg-white rounded-3xl border border-black/[0.06] shadow-apple-subtle space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-[#86868b]">Total Business Turnover (Sales)</span>
                <div className="flex items-baseline space-x-3 mt-1">
                  {/* Big number updates dynamically on hover or shows total! */}
                  <span className="text-3xl font-bold text-[#000000] tracking-tight font-mono">
                    {isCursorActive ? formatINR(currentHoverPoint.currentTurnover) : formatINR(totalInvoicedSales)}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#34c759]/10 text-[#34c759] text-xs font-semibold">
                    <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                    24.4% vs. last period
                  </span>
                </div>
                <p className="text-[11px] text-[#86868b] mt-0.5">
                  {isCursorActive ? `Turnover on ${currentHoverPoint.dateStr}` : 'Hover cursor on chart to inspect date-wise turnover'}
                </p>
              </div>

              <button
                onClick={() => setActiveTab('billing')}
                className="text-xs font-semibold text-[#0071e3] hover:underline flex items-center space-x-1"
              >
                <span>Billing History</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* ===================================================================== */}
            {/* INTERACTIVE CURSOR-TRACKING SVG CHART                                */}
            {/* Move cursor to inspect turnover and tooltip follows smoothly         */}
            {/* ===================================================================== */}
            <div className="relative h-60 w-full">
              {/* Y-Axis scale */}
              <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[10px] font-mono text-[#86868b]">
                <span>₹15L</span>
                <span>₹10L</span>
                <span>₹5L</span>
                <span>₹0</span>
              </div>

              {/* Chart Plot Area with Cursor Tracking Listener */}
              <div
                ref={chartContainerRef}
                onMouseMove={handleChartMouseMove}
                onMouseEnter={() => setIsCursorActive(true)}
                onMouseLeave={() => {
                  setIsCursorActive(false);
                  setHoverIndex(defaultHoverIndex);
                }}
                className="ml-9 h-full flex flex-col justify-between relative cursor-crosshair"
              >
                <div className="relative flex-1">
                  {/* Subtle Grid lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    <div className="border-b border-gray-100 w-full" />
                    <div className="border-b border-gray-100 w-full" />
                    <div className="border-b border-gray-100 w-full" />
                    <div className="border-b border-gray-100 w-full" />
                  </div>

                  {/* SVG Curves */}
                  <svg
                    viewBox="0 0 500 150"
                    preserveAspectRatio="none"
                    className="w-full h-full overflow-visible"
                  >
                    <defs>
                      <linearGradient id="appleChartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0071e3" stopOpacity="0.18" />
                        <stop offset="100%" stopColor="#0071e3" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Area under solid line */}
                    <path
                      d="M 0,120 Q 50,115 95,96 T 195,66 T 280,42 T 380,55 T 500,16 L 500,150 L 0,150 Z"
                      fill="url(#appleChartGradient)"
                    />

                    {/* Previous Period Line (Dashed Light Gray) */}
                    <path
                      d="M 0,135 Q 60,110 120,125 T 240,90 T 360,105 T 480,60 L 500,55"
                      fill="none"
                      stroke="#d2d2d7"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                    />

                    {/* Current Period Line (Solid Apple Electric Blue) */}
                    <path
                      d="M 0,120 Q 50,115 95,96 T 195,66 T 280,42 T 380,55 T 500,16"
                      fill="none"
                      stroke="#0071e3"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />

                    {/* Vertical tracking hair-line following cursor */}
                    <line
                      x1={currentHoverPoint.svgX}
                      y1="0"
                      x2={currentHoverPoint.svgX}
                      y2="150"
                      stroke="#0071e3"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                      opacity={isCursorActive ? 0.8 : 0.4}
                    />

                    {/* Dynamic Indicator Dot on the curve */}
                    <circle
                      cx={currentHoverPoint.svgX}
                      cy={currentHoverPoint.svgY}
                      r="6"
                      fill="#0071e3"
                      stroke="#ffffff"
                      strokeWidth="3"
                      className="transition-all duration-75 drop-shadow-md"
                    />
                  </svg>

                  {/* Dynamic Apple-Grade Tooltip Card that follows the cursor smoothly */}
                  <div
                    style={{
                      left: `${clampedTooltipLeft}%`,
                      top: `${Math.max(10, Math.min(65, (currentHoverPoint.svgY / 150) * 100 - 30))}%`,
                    }}
                    className="absolute -translate-x-1/2 p-3 bg-white/95 backdrop-blur-xl rounded-2xl shadow-apple-card border border-black/5 text-[11px] pointer-events-none z-20 space-y-1 transition-all duration-75 min-w-[155px]"
                  >
                    <p className="font-bold text-[#000000] text-[11px]">{currentHoverPoint.dateStr}</p>
                    <div className="flex items-center space-x-1.5 text-[#000000]">
                      <span className="w-2 h-2 rounded-full bg-[#0071e3]" />
                      <span className="font-bold font-mono text-xs">{formatINR(currentHoverPoint.currentTurnover)}</span>
                      <span className="text-[#86868b] text-[10px]">this month</span>
                    </div>
                    <div className="flex items-center space-x-1.5 text-[#86868b] text-[10px]">
                      <span className="w-2 h-2 rounded-full bg-gray-300" />
                      <span className="font-mono">{formatINR(currentHoverPoint.prevTurnover)} last month</span>
                    </div>
                  </div>
                </div>

                {/* X-Axis dates */}
                <div className="flex justify-between text-[10px] font-medium text-[#86868b] pt-2 border-t border-gray-100">
                  <span>1 Jan</span>
                  <span>8 Jan</span>
                  <span>15 Jan</span>
                  <span>22 Jan</span>
                  <span>29 Jan</span>
                </div>
              </div>
            </div>

            {/* Bottom 3 Customer Breakdown Boxes */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#86868b]">Client Accounts & Parties</span>
                <span className="text-[10px] text-[#0071e3] font-medium">Click any box to inspect →</span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                {/* Cash Sales Parties */}
                <div
                  onClick={() => setActiveTab('billing')}
                  title="Click to open Cash Sales in Billing POS"
                  className="p-3.5 bg-gray-50/80 hover:bg-[#0071e3]/5 cursor-pointer rounded-2xl border border-black/[0.04] hover:border-[#0071e3]/30 flex items-center space-x-3 transition-all active:scale-[0.98] group"
                >
                  <div className="w-8 h-8 rounded-xl bg-[#0071e3]/10 flex items-center justify-center text-[#0071e3] group-hover:scale-105 transition-transform">
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-base font-bold text-[#000000] font-mono block">
                      {customers.filter((c) => c.currentBalance === 0).length}
                    </span>
                    <span className="text-[10px] text-[#86868b] font-medium group-hover:text-[#0071e3]">
                      Cash Retailers →
                    </span>
                  </div>
                </div>

                {/* Credit Receivables Parties */}
                <div
                  onClick={() => setActiveTab('customers')}
                  title="Click to open Credit Receivable Parties"
                  className="p-3.5 bg-gray-50/80 hover:bg-[#34c759]/5 cursor-pointer rounded-2xl border border-black/[0.04] hover:border-[#34c759]/30 flex items-center space-x-3 transition-all active:scale-[0.98] group"
                >
                  <div className="w-8 h-8 rounded-xl bg-[#34c759]/10 flex items-center justify-center text-[#34c759] group-hover:scale-105 transition-transform">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-base font-bold text-[#000000] font-mono block">
                      {creditPartiesCount}
                    </span>
                    <span className="text-[10px] text-[#86868b] font-medium group-hover:text-[#34c759]">
                      Credit Parties →
                    </span>
                  </div>
                </div>

                {/* Wholesale B2B Parties */}
                <div
                  onClick={() => setActiveTab('customers')}
                  title="Click to open Wholesale B2B Client directory"
                  className="p-3.5 bg-gray-50/80 hover:bg-[#ff9500]/5 cursor-pointer rounded-2xl border border-black/[0.04] hover:border-[#ff9500]/30 flex items-center space-x-3 transition-all active:scale-[0.98] group"
                >
                  <div className="w-8 h-8 rounded-xl bg-[#ff9500]/10 flex items-center justify-center text-[#ff9500] group-hover:scale-105 transition-transform">
                    <Building className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-base font-bold text-[#000000] font-mono block">
                      {customers.filter((c) => Boolean(c.gstin)).length}
                    </span>
                    <span className="text-[10px] text-[#86868b] font-medium group-hover:text-[#ff9500]">
                      B2B Wholesalers →
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Best Selling Products Card */}
          <div className="p-6 bg-white rounded-3xl border border-black/[0.06] shadow-apple-subtle space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#000000]">Best Selling Products</h3>
                <p className="text-[11px] text-[#86868b]">Click any product row for fast billing & stock details</p>
              </div>
              <button
                onClick={() => setActiveTab('inventory')}
                className="text-xs font-semibold text-[#0071e3] hover:underline flex items-center space-x-1"
              >
                <span>Manage All Products</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-[#86868b] font-semibold uppercase text-[10px] tracking-wider border-b border-gray-100">
                    <th className="pb-3 px-2">SKU / Code</th>
                    <th className="pb-3 px-3">Product Name</th>
                    <th className="pb-3 px-3 text-right">Sold Qty</th>
                    <th className="pb-3 px-3 text-right">Revenue (₹)</th>
                    <th className="pb-3 px-2 text-right">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100/60">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[#86868b]">
                        No products added to inventory yet.
                      </td>
                    </tr>
                  ) : (
                    products.slice(0, 5).map((p, idx) => (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedProductModal(p)}
                      title={`Click to inspect ${p.name}`}
                      className="hover:bg-blue-50/50 cursor-pointer transition-all active:scale-[0.99] group"
                    >
                      <td className="py-3 px-2 font-mono text-[#86868b] group-hover:text-[#0071e3]">
                        {p.sku || `#${83000 + idx}`}
                      </td>
                      <td className="py-3 px-3 font-semibold text-[#000000]">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm">{idx === 0 ? '📱' : idx === 1 ? '💻' : idx === 2 ? '🎧' : idx === 3 ? '☕' : '🖱️'}</span>
                          <span className="truncate max-w-[260px] group-hover:text-[#0071e3] transition-colors">
                            {p.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right text-[#86868b] font-mono">
                        {Math.floor(40 - idx * 6)} {p.unit} sold
                      </td>
                      <td className="py-3 px-3 text-right font-mono">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                            idx % 2 === 0 ? 'bg-[#34c759]/10 text-[#34c759]' : 'bg-[#ff3b30]/10 text-[#ff3b30]'
                          }`}
                        >
                          {formatINR(p.salePrice * (40 - idx * 6))}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <div className="inline-flex items-center space-x-1 text-amber-500 font-semibold">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span className="text-[#000000] text-[11px]">
                            {idx === 0 ? '(5.0)' : idx === 1 ? '(4.9)' : idx === 2 ? '(4.8)' : '(4.6)'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (4 of 12): Weekly Active, Repeat Rate & AI Assistant */}
        <div className="lg:col-span-4 space-y-5">
          {/* Card 1: Most Day Active */}
          <div className="p-5 bg-white rounded-3xl border border-black/[0.06] shadow-apple-subtle space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-[#000000]">Most Day Active</h3>
                <p className="text-[10px] text-[#86868b]">Click any day to see billing volume</p>
              </div>
              <button
                onClick={() => setActiveTab('billing')}
                className="text-[10px] text-[#0071e3] font-semibold hover:underline"
              >
                View Bills
              </button>
            </div>

            {/* Bar Chart Container */}
            <div className="h-44 flex items-end justify-between px-2 pt-8 pb-1">
              {[
                { day: 'Sun', height: '35%', active: false, amount: '₹34,200', bills: 9 },
                { day: 'Mon', height: '55%', active: false, amount: '₹58,400', bills: 16 },
                { day: 'Tue', height: '90%', active: true, badge: '9,162', amount: '₹91,620', bills: 28 },
                { day: 'Wed', height: '40%', active: false, amount: '₹41,200', bills: 12 },
                { day: 'Thu', height: '30%', active: false, amount: '₹28,500', bills: 8 },
                { day: 'Fri', height: '65%', active: false, amount: '₹68,100', bills: 19 },
                { day: 'Sat', height: '70%', active: false, amount: '₹74,800', bills: 22 },
              ].map((item, idx) => (
                <div
                  key={idx}
                  onClick={() =>
                    setActiveDayNotice(
                      `📅 ${item.day} Billing Summary: ${item.amount} total turnover across ${item.bills} GST invoices.`
                    )
                  }
                  title={`Click to inspect ${item.day} sales`}
                  className="flex flex-col items-center space-y-2 flex-1 relative cursor-pointer group"
                >
                  {/* Badge over Tuesday */}
                  {item.active && (
                    <div className="absolute -top-7 px-1.5 py-0.5 rounded-md bg-[#000000] text-white font-mono text-[9px] font-bold shadow-xs">
                      {item.badge}
                    </div>
                  )}

                  {/* Vertical Bar */}
                  <div className="w-7 h-28 bg-gray-100 group-hover:bg-blue-100 rounded-xl flex items-end p-0.5 transition-colors">
                    <div
                      style={{ height: item.height }}
                      className={`w-full rounded-lg transition-all ${
                        item.active ? 'bg-[#0071e3]' : 'bg-gray-200 group-hover:bg-[#0071e3]/50'
                      }`}
                    />
                  </div>

                  {/* Day Label */}
                  <span
                    className={`text-[10px] font-medium ${
                      item.active ? 'text-[#0071e3] font-bold' : 'text-[#86868b] group-hover:text-[#000000]'
                    }`}
                  >
                    {item.day}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Repeat Customer Rate */}
          <div
            onClick={() => setActiveTab('customers')}
            title="Click to view client retention & payment habits in Ledger"
            className="p-5 bg-white rounded-3xl border border-black/[0.06] shadow-apple-subtle space-y-2 text-center cursor-pointer hover:border-[#34c759]/40 hover:shadow-apple-card transition-all"
          >
            <div className="flex items-center justify-between text-left">
              <h3 className="text-xs font-bold text-[#000000]">Repeat Customer Rate</h3>
              <span className="text-[10px] text-[#0071e3] font-semibold hover:underline">Ledger →</span>
            </div>

            {/* Speedometer Gauge SVG */}
            <div className="relative w-44 h-24 mx-auto mt-2">
              <svg viewBox="0 0 160 90" className="w-full h-full overflow-visible">
                <path
                  d="M 15,80 A 65,65 0 0,1 145,80"
                  fill="none"
                  stroke="#e5e5ea"
                  strokeWidth="10"
                  strokeDasharray="3 3"
                  strokeLinecap="round"
                />
                <path
                  d="M 15,80 A 65,65 0 0,1 115,25"
                  fill="none"
                  stroke="#34c759"
                  strokeWidth="10"
                  strokeDasharray="3 3"
                  strokeLinecap="round"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
                <span className="text-2xl font-bold text-[#000000] tracking-tight">68%</span>
              </div>
            </div>

            <p className="text-[11px] text-[#86868b]">On track for 80% target</p>

            <div className="pt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab('customers');
                }}
                className="px-4 py-1.5 rounded-full border border-gray-200 text-[#000000] hover:bg-gray-50 text-[11px] font-semibold transition-colors shadow-2xs"
              >
                Show details
              </button>
            </div>
          </div>

          {/* Card 3: AI Assistant Widget */}
          <div className="p-5 bg-white rounded-3xl border border-black/[0.06] shadow-apple-subtle space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#000000]">AI Billing Assistant</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0071e3]/10 text-[#0071e3] font-semibold">
                Online
              </span>
            </div>

            {/* 3D Glowing Sphere Graphic */}
            <div className="h-24 flex items-center justify-center relative">
              <div className="w-18 h-18 rounded-full bg-gradient-to-tr from-[#0051a8] via-[#0071e3] to-[#60a5fa] shadow-[0_12px_28px_rgba(0,113,227,0.35)] relative flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-t from-transparent to-white/40 blur-xs" />
                <div className="absolute top-2.5 left-3.5 w-3 h-1.5 rounded-full bg-white/80 rotate-[-25deg] blur-[0.5px]" />
              </div>
            </div>

            {/* Quick-Action Chips */}
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              <button
                type="button"
                onClick={() => handleSendAiPrompt(undefined, 'Today Turnover')}
                className="px-2 py-1 rounded-lg bg-gray-50 hover:bg-blue-50 text-[#000000] hover:text-[#0071e3] border border-gray-200 transition-colors"
              >
                📊 Turnover
              </button>
              <button
                type="button"
                onClick={() => handleSendAiPrompt(undefined, 'Top Receivables')}
                className="px-2 py-1 rounded-lg bg-gray-50 hover:bg-amber-50 text-[#000000] hover:text-amber-700 border border-gray-200 transition-colors"
              >
                💳 Top Receivables
              </button>
              <button
                type="button"
                onClick={() => handleSendAiPrompt(undefined, 'Low Stock Alert')}
                className="px-2 py-1 rounded-lg bg-gray-50 hover:bg-red-50 text-[#000000] hover:text-red-700 border border-gray-200 transition-colors"
              >
                📦 Low Stock
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('billing')}
                className="px-2 py-1 rounded-lg bg-[#0071e3]/10 hover:bg-[#0071e3]/20 text-[#0071e3] font-semibold transition-colors"
              >
                ⚡ New Bill
              </button>
            </div>

            {/* AI Response Box */}
            {aiResponses.length > 0 && (
              <div className="p-2.5 bg-blue-50/70 rounded-xl text-[10px] text-gray-700 max-h-24 overflow-y-auto space-y-1">
                <p className="font-semibold text-[#0071e3]">Pro.Sale Copilot:</p>
                <p className="leading-relaxed">{aiResponses[0]}</p>
              </div>
            )}

            {/* Chat Input Pill */}
            <form onSubmit={handleSendAiPrompt} className="relative flex items-center">
              <Paperclip className="w-3.5 h-3.5 text-[#86868b] absolute left-3.5" />
              <input
                type="text"
                placeholder="Ask about sales, GST or stock..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="w-full pl-9 pr-16 py-2.5 rounded-full bg-gray-50 border border-gray-200 text-xs text-[#000000] placeholder-[#86868b] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
              <div className="absolute right-1.5 flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => handleSendAiPrompt(undefined, 'Today Turnover')}
                  title="Voice prompt"
                  className="p-1 text-[#86868b] hover:text-[#000000] transition-colors"
                >
                  <Mic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="submit"
                  title="Send"
                  className="w-6 h-6 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white flex items-center justify-center transition-colors shadow-xs"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PRODUCT QUICK ACTION MODAL                                                */}
      {/* ========================================================================= */}
      {selectedProductModal && (
        <AppleModal
          isOpen={!!selectedProductModal}
          onClose={() => setSelectedProductModal(null)}
          title={selectedProductModal.name}
          subtitle={`SKU: ${selectedProductModal.sku} • Barcode: ${selectedProductModal.barcode || 'N/A'}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-3 gap-2 p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
              <div>
                <span className="text-[#86868b] block text-[10px]">Sale Price:</span>
                <span className="text-sm font-bold text-[#0071e3] font-mono">
                  {formatINR(selectedProductModal.salePrice)}
                </span>
              </div>
              <div>
                <span className="text-[#86868b] block text-[10px]">MRP:</span>
                <span className="text-xs font-semibold text-[#86868b] line-through font-mono">
                  {formatINR(selectedProductModal.mrp)}
                </span>
              </div>
              <div>
                <span className="text-[#86868b] block text-[10px]">Stock Left:</span>
                <span
                  className={`text-xs font-bold font-mono ${
                    selectedProductModal.stock <= selectedProductModal.minStockAlert
                      ? 'text-[#ff3b30]'
                      : 'text-[#34c759]'
                  }`}
                >
                  {selectedProductModal.stock} {selectedProductModal.unit}
                </span>
              </div>
            </div>

            <div className="p-3 bg-blue-50/50 rounded-2xl text-gray-700 space-y-1">
              <div className="flex justify-between">
                <span>HSN Code:</span>
                <span className="font-mono font-semibold">{selectedProductModal.hsn}</span>
              </div>
              <div className="flex justify-between">
                <span>GST Tax Slab:</span>
                <span className="font-mono font-semibold">{selectedProductModal.taxRate}%</span>
              </div>
              <div className="flex justify-between">
                <span>Profit Margin per unit:</span>
                <span className="font-mono font-bold text-[#34c759]">
                  +{formatINR(selectedProductModal.salePrice - selectedProductModal.purchasePrice)}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  setSelectedProductModal(null);
                  setActiveTab('billing');
                }}
                className="w-full py-2.5 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold flex items-center justify-center space-x-2 shadow-apple-subtle transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Invoice with this Item</span>
              </button>

              <button
                onClick={() => {
                  setSelectedProductModal(null);
                  setActiveTab('inventory');
                }}
                className="w-full py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-[#000000] font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer"
              >
                <Package className="w-4 h-4 text-[#af52de]" />
                <span>Manage Stock in Inventory</span>
              </button>
            </div>
          </div>
        </AppleModal>
      )}

      {/* ========================================================================= */}
      {/* "ADD WIDGET" SLIDE-OVER DRAWER MODAL                                      */}
      {/* ========================================================================= */}
      {isAddWidgetOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            onClick={() => setIsAddWidgetOpen(false)}
            className="fixed inset-0 bg-black/25 backdrop-blur-xs transition-opacity"
          />

          <div className="relative w-full max-w-md bg-white h-full shadow-apple-modal z-10 flex flex-col p-6 overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-[#000000]">Add Widget</h3>
              <button
                onClick={() => setIsAddWidgetOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-[#000000] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 py-4">
              <div className="p-4 rounded-2xl border border-black/[0.06] bg-white hover:border-[#0071e3]/30 transition-all space-y-3 shadow-xs">
                <div className="flex items-start space-x-3">
                  <div className="w-16 h-16 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center justify-center flex-shrink-0">
                    <PieChart className="w-8 h-8 text-[#0071e3]" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h4 className="text-xs font-bold text-[#000000]">GST Sales by Slab (0%, 5%, 12%, 18%)</h4>
                    <p className="text-[11px] text-[#86868b] leading-snug">
                      Monitor tax liability and taxable breakdown across tax rate slabs.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <span className="text-[10px] text-[#86868b] font-medium">#Tax Insights</span>
                  <button
                    onClick={() => toggleWidget('visitors_by_device')}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                      activeWidgets.includes('visitors_by_device')
                        ? 'bg-[#34c759]/10 text-[#34c759] border border-[#34c759]/20'
                        : 'bg-[#0071e3] text-white hover:bg-[#0077ed]'
                    }`}
                  >
                    {activeWidgets.includes('visitors_by_device') ? 'Selected' : 'Select'}
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-black/[0.06] bg-white hover:border-[#0071e3]/30 transition-all space-y-3 shadow-xs">
                <div className="flex items-start space-x-3">
                  <div className="w-16 h-16 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                    <LayoutGrid className="w-8 h-8 text-[#86868b]" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h4 className="text-xs font-bold text-[#000000]">Receivables Ageing Analysis</h4>
                    <p className="text-[11px] text-[#86868b] leading-snug">
                      Categorize receivables by 30-day, 60-day and 90-day outstanding periods.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <span className="text-[10px] text-[#86868b] font-medium">#Collections</span>
                  <button
                    onClick={() => toggleWidget('dashboard_overview')}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                      activeWidgets.includes('dashboard_overview')
                        ? 'bg-[#34c759]/10 text-[#34c759] border border-[#34c759]/20'
                        : 'bg-[#0071e3] text-white hover:bg-[#0077ed]'
                    }`}
                  >
                    {activeWidgets.includes('dashboard_overview') ? 'Selected' : 'Select'}
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-black/[0.06] bg-white hover:border-[#0071e3]/30 transition-all space-y-3 shadow-xs">
                <div className="flex items-start space-x-3">
                  <div className="w-16 h-16 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-center flex-shrink-0">
                    <BarChart3 className="w-8 h-8 text-[#34c759]" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h4 className="text-xs font-bold text-[#000000]">Cash vs Credit Ratio</h4>
                    <p className="text-[11px] text-[#86868b] leading-snug">
                      Compare immediate liquidity cash inflow vs ledger credit sales.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <span className="text-[10px] text-[#86868b] font-medium">#Operations</span>
                  <button
                    onClick={() => toggleWidget('orders_performance')}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                      activeWidgets.includes('orders_performance')
                        ? 'bg-[#34c759]/10 text-[#34c759] border border-[#34c759]/20'
                        : 'bg-[#0071e3] text-white hover:bg-[#0077ed]'
                    }`}
                  >
                    {activeWidgets.includes('orders_performance') ? 'Selected' : 'Select'}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 mt-auto">
              <button
                onClick={() => setIsAddWidgetOpen(false)}
                className="w-full py-2.5 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold text-xs transition-colors shadow-apple-subtle"
              >
                Apply Selected Widgets
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
