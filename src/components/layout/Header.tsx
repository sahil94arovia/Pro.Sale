import React, { useState, useEffect } from 'react';
import {
  Plus,
  Bell,
  Search,
  Sun,
  Moon,
  ShieldCheck,
  Command,
  X,
  Receipt,
  Package,
  Users,
  Wallet,
  ArrowRight,
  FileCheck2,
} from 'lucide-react';
import { ActiveTab } from './Sidebar';
import { BusinessSettings, Product, Customer, Invoice } from '../../types';
import { formatINR } from '../../utils/formatters';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  settings: BusinessSettings;
  lowStockCount: number;
  onQuickInvoice: () => void;
  products: Product[];
  customers: Customer[];
  invoices: Invoice[];
  onSelectInvoice: (inv: Invoice) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  settings,
  lowStockCount,
  onQuickInvoice,
  products,
  customers,
  invoices,
  onSelectInvoice,
}) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Keyboard shortcut listener (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsCommandOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filtered search results
  const q = searchQuery.toLowerCase().trim();
  const filteredProducts = q
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.barcode?.includes(q)
      )
    : [];

  const filteredCustomers = q
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.companyName?.toLowerCase().includes(q) ||
          c.gstin?.toLowerCase().includes(q)
      )
    : [];

  const filteredInvoices = q
    ? invoices.filter(
        (i) =>
          i.invoiceNumber.toLowerCase().includes(q) ||
          i.customer.name.toLowerCase().includes(q)
      )
    : [];

  const quickActions = [
    { label: 'Create New GST Bill', tab: 'billing' as ActiveTab, icon: Receipt },
    { label: 'Add New Product to Stock', tab: 'inventory' as ActiveTab, icon: Package },
    { label: 'View Customer Accounts & Ledgers', tab: 'customers' as ActiveTab, icon: Users },
    { label: 'Record Business Expense', tab: 'expenses' as ActiveTab, icon: Wallet },
    { label: 'Generate E-Way Bill & E-Invoice', tab: 'einvoice' as ActiveTab, icon: FileCheck2 },
  ].filter((a) => !q || a.label.toLowerCase().includes(q));

  return (
    <>
      <header className="h-16 bg-white/90 backdrop-blur-xl border-b border-gray-200/70 sticky top-0 z-20 px-8 flex items-center justify-between">
        {/* Left Search Bar (Matches Reference with interactive Command Palette trigger) */}
        <div className="flex items-center space-x-4 flex-1 max-w-md">
          <div
            onClick={() => setIsCommandOpen(true)}
            className="relative w-full cursor-pointer group"
          >
            <Search className="w-4 h-4 text-gray-400 group-hover:text-[#2563eb] transition-colors absolute left-3.5 top-2.5" />
            <input
              type="text"
              readOnly
              placeholder="Search anything (bills, stock, parties)..."
              className="w-full pl-10 pr-12 py-2 rounded-xl bg-gray-50 group-hover:bg-gray-100/80 border border-gray-200 text-xs text-gray-700 placeholder-gray-400 cursor-pointer transition-all focus:outline-none"
            />
            <div className="absolute right-2.5 top-2 flex items-center space-x-0.5 px-1.5 py-0.5 rounded bg-gray-200/70 text-[10px] text-gray-500 font-mono font-medium">
              <Command className="w-3 h-3" />
              <span>K</span>
            </div>
          </div>
        </div>

        {/* Right Controls: GSTIN, Theme Toggle, Notifications, User Avatar & New Invoice */}
        <div className="flex items-center space-x-3">
          {/* GSTIN Badge */}
          <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-[#2563eb] text-xs font-medium border border-blue-100">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>GSTIN: {settings.gstin}</span>
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            title="Toggle Theme"
            className="w-9 h-9 rounded-full bg-gray-50 hover:bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600 transition-colors"
          >
            {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-500" />}
          </button>

          {/* Notifications Bell */}
          <button
            onClick={() => alert(`Active Alerts: ${lowStockCount} items running low in stock.`)}
            title="Notifications"
            className="relative w-9 h-9 rounded-full bg-gray-50 hover:bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600 transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {lowStockCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
            )}
          </button>

          {/* User Profile Avatar */}
          <div
            onClick={() => setActiveTab('settings')}
            title="Business Profile & Settings"
            className="flex items-center space-x-2 pl-1 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-full overflow-hidden border border-gray-200 shadow-xs ring-2 ring-gray-100">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80"
                alt="User Avatar"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Quick New Invoice Action Button */}
          <button
            onClick={onQuickInvoice}
            className="ml-2 flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#2563eb] hover:bg-blue-700 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Bill</span>
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* COMMAND PALETTE / SPOTLIGHT SEARCH MODAL (Touches & Opens on Search/⌘K)  */}
      {/* ========================================================================= */}
      {isCommandOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
          <div
            onClick={() => setIsCommandOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
          />

          <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden z-10 animate-in zoom-in-95 duration-150">
            {/* Search Input Bar */}
            <div className="p-4 border-b border-gray-100 flex items-center space-x-3">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                autoFocus
                placeholder="Type to search invoices, products, clients or actions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-sm text-gray-900 placeholder-gray-400 focus:outline-none bg-transparent"
              />
              <button
                onClick={() => setIsCommandOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Results Container */}
            <div className="p-4 max-h-96 overflow-y-auto space-y-4 text-xs">
              {/* Quick Actions */}
              {quickActions.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1.5">
                    Quick Navigation & Actions
                  </span>
                  <div className="space-y-1">
                    {quickActions.map((action, idx) => {
                      const Icon = action.icon;
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            setActiveTab(action.tab);
                            setIsCommandOpen(false);
                          }}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50 cursor-pointer text-gray-700 hover:text-[#2563eb] transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <Icon className="w-4 h-4 text-[#2563eb]" />
                            <span className="font-medium">{action.label}</span>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Products Results */}
              {filteredProducts.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1.5">
                    Products in Stock ({filteredProducts.length})
                  </span>
                  <div className="space-y-1">
                    {filteredProducts.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setActiveTab('inventory');
                          setIsCommandOpen(false);
                        }}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-purple-50 cursor-pointer transition-colors"
                      >
                        <div>
                          <p className="font-semibold text-gray-900">{p.name}</p>
                          <p className="text-[10px] text-gray-400 font-mono">
                            SKU: {p.sku} • HSN: {p.hsn} • Stock: {p.stock} {p.unit}
                          </p>
                        </div>
                        <span className="font-mono font-bold text-[#2563eb]">{formatINR(p.salePrice)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Customers Results */}
              {filteredCustomers.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1.5">
                    Parties & Clients ({filteredCustomers.length})
                  </span>
                  <div className="space-y-1">
                    {filteredCustomers.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setActiveTab('customers');
                          setIsCommandOpen(false);
                        }}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-emerald-50 cursor-pointer transition-colors"
                      >
                        <div>
                          <p className="font-semibold text-gray-900">{c.name}</p>
                          <p className="text-[10px] text-gray-400 font-mono">
                            Ph: {c.phone} {c.companyName ? `• ${c.companyName}` : ''}
                          </p>
                        </div>
                        <span
                          className={`font-mono font-bold ${
                            c.currentBalance > 0 ? 'text-red-600' : 'text-emerald-600'
                          }`}
                        >
                          Balance Due: {formatINR(c.currentBalance)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Invoices Results */}
              {filteredInvoices.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1.5">
                    Invoices ({filteredInvoices.length})
                  </span>
                  <div className="space-y-1">
                    {filteredInvoices.map((inv) => (
                      <div
                        key={inv.id}
                        onClick={() => {
                          onSelectInvoice(inv);
                          setIsCommandOpen(false);
                        }}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50 cursor-pointer transition-colors"
                      >
                        <div>
                          <p className="font-mono font-bold text-gray-900">{inv.invoiceNumber}</p>
                          <p className="text-[10px] text-gray-500">{inv.customer.name}</p>
                        </div>
                        <span className="font-mono font-bold text-[#2563eb]">{formatINR(inv.grandTotal)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
              <span>Press ESC or click outside to exit</span>
              <span className="font-medium text-[#2563eb]">Pro.Sale Search</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
