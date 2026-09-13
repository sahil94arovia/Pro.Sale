import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Plus,
  TrendingDown,
  DollarSign,
  TrendingUp,
  Tag,
  Trash2,
  Calendar,
  Package,
  ShoppingBag,
  Receipt,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { Expense, BusinessSettings, Product } from '../../types';
import { formatINR, formatDate } from '../../utils/formatters';
import { AppleModal } from '../common/AppleModal';

interface ExpenseViewProps {
  expenses: Expense[];
  invoicedGrossProfit: number;
  settings?: BusinessSettings;
  activeSubTab?: string;
  products?: Product[];
  onSaveExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
  onAdjustStock?: (id: string, delta: number) => void;
}

const EXPENSE_CATEGORIES = [
  'Raw Material & Inventory Purchases',
  'Rent',
  'Salaries',
  'Electricity & Water',
  'Logistics & Transport',
  'Office & Tea',
  'Maintenance',
  'Marketing',
  'Tax & Compliance',
  'Others',
] as const;

export const ExpenseView: React.FC<ExpenseViewProps> = ({
  expenses,
  invoicedGrossProfit,
  settings,
  activeSubTab = 'expenses',
  products = [],
  onSaveExpense,
  onDeleteExpense,
  onAdjustStock,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'ALL' | 'PURCHASES' | 'EXPENSES'>(() => {
    if (activeSubTab === 'purchases') return 'PURCHASES';
    if (activeSubTab === 'expenses') return 'EXPENSES';
    return 'ALL';
  });

  useEffect(() => {
    if (activeSubTab === 'purchases') {
      setViewMode('PURCHASES');
    } else if (activeSubTab === 'expenses') {
      setViewMode('EXPENSES');
    }
  }, [activeSubTab]);

  // Form states
  const [isInventoryPurchase, setIsInventoryPurchase] = useState(activeSubTab === 'purchases');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [purchaseQty, setPurchaseQty] = useState(1);
  const [purchaseRate, setPurchaseRate] = useState(0);

  const [formData, setFormData] = useState<Partial<Expense>>({
    category: activeSubTab === 'purchases' ? 'Raw Material & Inventory Purchases' : 'Rent',
    amount: 0,
    paymentMode: 'BANK',
    description: '',
    paidTo: '',
    receiptNo: '',
  });

  useEffect(() => {
    if (isInventoryPurchase) {
      setFormData((prev) => ({ ...prev, category: 'Raw Material & Inventory Purchases' }));
    }
  }, [isInventoryPurchase]);

  const handleProductSelect = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      const rate = prod.purchasePrice || prod.salePrice || 0;
      setPurchaseRate(rate);
      setFormData((prev) => ({
        ...prev,
        amount: rate * purchaseQty,
        description: `Stock inward: ${prod.name} (${purchaseQty} ${prod.unit || 'pcs'})`,
      }));
    }
  };

  const handleQtyChange = (qty: number) => {
    setPurchaseQty(qty);
    if (purchaseRate > 0) {
      setFormData((prev) => ({
        ...prev,
        amount: purchaseRate * qty,
        description: selectedProductId
          ? `Stock inward: ${products.find((p) => p.id === selectedProductId)?.name || 'Item'} (${qty} units)`
          : prev.description,
      }));
    }
  };

  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalPurchases = expenses
    .filter((e) => e.category === 'Raw Material & Inventory Purchases')
    .reduce((sum, e) => sum + e.amount, 0);
  const totalOverheads = totalExpense - totalPurchases;
  const netBusinessProfit = invoicedGrossProfit - totalExpense;

  const filtered = expenses.filter((e) => {
    if (viewMode === 'PURCHASES') {
      if (e.category !== 'Raw Material & Inventory Purchases') return false;
    } else if (viewMode === 'EXPENSES') {
      if (e.category === 'Raw Material & Inventory Purchases') return false;
    }
    return categoryFilter === 'ALL' || e.category === categoryFilter;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || formData.amount <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    const newExpense: Expense = {
      id: 'exp-' + Date.now(),
      date: new Date().toISOString(),
      category: (formData.category || 'Others') as any,
      amount: Number(formData.amount),
      paymentMode: (formData.paymentMode || 'BANK') as any,
      description: formData.description || '',
      paidTo: formData.paidTo || (isInventoryPurchase ? 'Stock Vendor / Supplier' : 'Vendor'),
      receiptNo: formData.receiptNo || '',
      productId: isInventoryPurchase && selectedProductId ? selectedProductId : undefined,
      qty: isInventoryPurchase && purchaseQty ? purchaseQty : undefined,
      createdAt: new Date().toISOString(),
    };

    onSaveExpense(newExpense);

    // If stock purchase linked to product, adjust inventory stock!
    if (isInventoryPurchase && selectedProductId && onAdjustStock && purchaseQty > 0) {
      onAdjustStock(selectedProductId, purchaseQty);
    }

    setIsModalOpen(false);
    setFormData({
      category: 'Rent',
      amount: 0,
      paymentMode: 'BANK',
      description: '',
      paidTo: '',
      receiptNo: '',
    });
    setSelectedProductId('');
    setPurchaseQty(1);
    setPurchaseRate(0);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Financial Net Profit Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-apple-subtle">
          <div className="flex items-center space-x-2 text-emerald-600 text-xs font-semibold uppercase tracking-wider">
            <TrendingUp className="w-4 h-4" />
            <span>Gross Sales Margin</span>
          </div>
          <p className="text-2xl font-bold text-emerald-700 font-mono mt-2">{formatINR(invoicedGrossProfit)}</p>
          <span className="text-[11px] text-gray-500 mt-0.5 block">Profit made on invoices</span>
        </div>

        <div className="p-5 bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-apple-subtle">
          <div className="flex items-center space-x-2 text-blue-600 text-xs font-semibold uppercase tracking-wider">
            <Package className="w-4 h-4" />
            <span>Stock Purchases</span>
          </div>
          <p className="text-2xl font-bold text-blue-700 font-mono mt-2">{formatINR(totalPurchases)}</p>
          <span className="text-[11px] text-gray-500 mt-0.5 block">Inventory inward cost</span>
        </div>

        <div className="p-5 bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-apple-subtle">
          <div className="flex items-center space-x-2 text-orange-600 text-xs font-semibold uppercase tracking-wider">
            <TrendingDown className="w-4 h-4" />
            <span>Operating Overheads</span>
          </div>
          <p className="text-2xl font-bold text-orange-700 font-mono mt-2">{formatINR(totalOverheads)}</p>
          <span className="text-[11px] text-gray-500 mt-0.5 block">Rent, salaries & utilities</span>
        </div>

        <div className="p-5 bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-apple-subtle">
          <div className="flex items-center space-x-2 text-[#0071e3] text-xs font-semibold uppercase tracking-wider">
            <DollarSign className="w-4 h-4" />
            <span>Net Profit</span>
          </div>
          <p
            className={`text-2xl font-bold font-mono mt-2 ${
              netBusinessProfit >= 0 ? 'text-[#0071e3]' : 'text-red-600'
            }`}
          >
            {formatINR(netBusinessProfit)}
          </p>
          <span className="text-[11px] text-gray-500 mt-0.5 block">Gross Margin - Expenses</span>
        </div>
      </div>

      {/* Action Bar & SubTab Switcher */}
      <div className="p-4 bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-apple-subtle flex flex-wrap items-center justify-between gap-4">
        {/* Pills for fast view switching */}
        <div className="flex items-center space-x-1 p-1 bg-gray-100 rounded-2xl">
          <button
            onClick={() => setViewMode('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'ALL'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            All Vouchers ({expenses.length})
          </button>
          <button
            onClick={() => setViewMode('PURCHASES')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'PURCHASES'
                ? 'bg-white text-[#0071e3] shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Purchase Invoices ({expenses.filter((e) => e.category === 'Raw Material & Inventory Purchases').length})
          </button>
          <button
            onClick={() => setViewMode('EXPENSES')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'EXPENSES'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Operating Expenses ({expenses.filter((e) => e.category !== 'Raw Material & Inventory Purchases').length})
          </button>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium text-gray-700 focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setIsInventoryPurchase(viewMode === 'PURCHASES');
              setIsModalOpen(true);
            }}
            className="flex items-center space-x-2 px-4 py-2 rounded-2xl bg-[#0071e3] hover:bg-[#0077ed] active:scale-95 text-white text-xs font-semibold shadow-apple-subtle transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{viewMode === 'PURCHASES' ? 'Add Purchase Invoice' : 'Record Voucher'}</span>
          </button>
        </div>
      </div>

      {/* Expenses & Purchases Table */}
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-apple-subtle overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-16 text-center text-gray-400 space-y-3">
            <Wallet className="w-10 h-10 mx-auto text-gray-300" />
            <p className="text-sm font-semibold text-gray-600">
              {viewMode === 'PURCHASES'
                ? 'No purchase invoices recorded yet'
                : 'No expenses recorded'}
            </p>
            <p className="text-xs text-gray-400 max-w-xs mx-auto">
              {viewMode === 'PURCHASES'
                ? 'Record raw material and stock purchases from your suppliers to track inward inventory.'
                : 'Track rent, salaries, and operating expenses to calculate accurate net business profit.'}
            </p>
            <button
              onClick={() => {
                setIsInventoryPurchase(viewMode === 'PURCHASES');
                setIsModalOpen(true);
              }}
              className="mt-2 px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-medium cursor-pointer"
            >
              {viewMode === 'PURCHASES' ? '+ Record First Purchase Bill' : '+ Record First Expense'}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-3">Type</th>
                  <th className="py-3.5 px-4">Description / Item</th>
                  <th className="py-3.5 px-3">Supplier / Payee</th>
                  <th className="py-3.5 px-3">Ref No.</th>
                  <th className="py-3.5 px-3">Mode</th>
                  <th className="py-3.5 px-4 text-right">Amount (₹)</th>
                  <th className="py-3.5 px-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((exp) => {
                  const isStock = exp.category === 'Raw Material & Inventory Purchases';
                  return (
                    <tr key={exp.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3.5 px-4 text-gray-500 font-sans">{formatDate(exp.date)}</td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                            isStock
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {isStock ? 'Purchase Bill' : exp.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-gray-800">
                        {exp.description || '—'}
                        {exp.qty ? (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">
                            +{exp.qty} Inward
                          </span>
                        ) : null}
                      </td>
                      <td className="py-3.5 px-3 text-gray-600">{exp.paidTo || '—'}</td>
                      <td className="py-3.5 px-3 font-mono text-gray-500">{exp.receiptNo || '—'}</td>
                      <td className="py-3.5 px-3 font-mono font-medium text-gray-700">{exp.paymentMode}</td>
                      <td
                        className={`py-3.5 px-4 text-right font-mono font-bold ${
                          isStock ? 'text-blue-700' : 'text-red-600'
                        }`}
                      >
                        {formatINR(exp.amount)}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <button
                          onClick={() => onDeleteExpense(exp.id)}
                          className="p-1.5 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Purchase / Expense Modal */}
      <AppleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isInventoryPurchase ? 'Record Inward Purchase Bill' : 'Record Business Expense'}
        subtitle={
          isInventoryPurchase
            ? 'Add supplier invoice and automatically increment inventory stock'
            : 'Log operational overheads to track real net profits'
        }
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Voucher Type Toggle */}
          <div className="flex items-center space-x-1 p-1 bg-gray-100 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setIsInventoryPurchase(true);
                setFormData((prev) => ({ ...prev, category: 'Raw Material & Inventory Purchases' }));
              }}
              className={`flex-1 py-1.5 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                isInventoryPurchase
                  ? 'bg-white text-[#0071e3] shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Stock Purchase Bill
            </button>
            <button
              type="button"
              onClick={() => {
                setIsInventoryPurchase(false);
                setFormData((prev) => ({ ...prev, category: 'Rent' }));
              }}
              className={`flex-1 py-1.5 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                !isInventoryPurchase
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Operational Expense
            </button>
          </div>

          {isInventoryPurchase ? (
            /* Stock Inward Options */
            <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-100 space-y-3">
              <div>
                <label className="block font-semibold text-blue-900 mb-1">
                  Select Product to Restock (Optional)
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-blue-200 bg-white text-xs focus:ring-2 focus:ring-[#0071e3] focus:outline-none"
                >
                  <option value="">-- General Stock / Raw Material --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Current Stock: {p.stock} {p.unit || 'pcs'})
                    </option>
                  ))}
                </select>
              </div>

              {selectedProductId ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-blue-900 mb-1">Inward Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={purchaseQty}
                      onChange={(e) => handleQtyChange(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full p-2 rounded-xl border border-blue-200 bg-white font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-blue-900 mb-1">Rate per Unit (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={purchaseRate || ''}
                      onChange={(e) => {
                        const rate = parseFloat(e.target.value) || 0;
                        setPurchaseRate(rate);
                        setFormData((prev) => ({ ...prev, amount: rate * purchaseQty }));
                      }}
                      className="w-full p-2 rounded-xl border border-blue-200 bg-white font-mono font-bold"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Expense Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none"
              >
                {EXPENSE_CATEGORIES.filter((c) => c !== 'Raw Material & Inventory Purchases').map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Total Bill Amount (₹) *
            </label>
            <input
              type="number"
              required
              min="1"
              value={formData.amount || ''}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              className="w-full p-3 rounded-xl border border-gray-300 font-mono font-bold text-base focus:ring-2 focus:ring-[#0071e3] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                {isInventoryPurchase ? 'Supplier / Vendor Name' : 'Paid To / Vendor'}
              </label>
              <input
                type="text"
                placeholder={isInventoryPurchase ? 'Supplier Firm' : 'Landlord / Staff'}
                value={formData.paidTo || ''}
                onChange={(e) => setFormData({ ...formData, paidTo: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Payment Method</label>
              <select
                value={formData.paymentMode}
                onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value as any })}
                className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none"
              >
                <option value="BANK">Bank Transfer / NEFT</option>
                <option value="UPI">UPI / QR</option>
                <option value="CASH">Cash</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Invoice / Bill Ref No</label>
              <input
                type="text"
                placeholder="PUR-2026-001"
                value={formData.receiptNo || ''}
                onChange={(e) => setFormData({ ...formData, receiptNo: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Description / Remarks</label>
              <input
                type="text"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold text-xs shadow-apple-subtle transition-all cursor-pointer"
          >
            {isInventoryPurchase ? 'Save Purchase Invoice & Update Stock' : 'Record Expense Voucher'}
          </button>
        </form>
      </AppleModal>
    </div>
  );
};
