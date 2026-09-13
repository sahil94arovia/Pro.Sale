import React, { useState } from 'react';
import {
  LayoutDashboard,
  Receipt,
  Package,
  Users,
  FileText,
  Truck,
  Wallet,
  FileCheck2,
  Settings,
  HelpCircle,
  ChevronDown,
  Sparkles,
  Layers,
  PanelLeftClose,
  Check,
  Shield,
  ShoppingBag,
} from 'lucide-react';

export type ActiveTab =
  | 'dashboard'
  | 'billing'
  | 'inventory'
  | 'customers'
  | 'quotations'
  | 'challans'
  | 'expenses'
  | 'einvoice'
  | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  firmName: string;
  lowStockCount: number;
  pendingReceivables: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  firmName,
  lowStockCount,
}) => {
  const [financesOpen, setFinancesOpen] = useState(true);

  return (
    <aside className="w-64 h-screen bg-[#fafbfc] border-r border-gray-200/80 flex flex-col justify-between select-none fixed left-0 top-0 z-30 transition-all duration-300">
      <div className="flex-1 overflow-y-auto">
        {/* Brand Header with Collapse Icon */}
        <div className="px-5 pt-5 pb-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#2563eb] flex items-center justify-center text-white shadow-xs">
              <Layers className="w-4 h-4 fill-current" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-base tracking-tight text-black">Pro.Sale</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-blue-50 text-[#2563eb]">
                  GST PRO
                </span>
              </div>
              <p className="text-[10px] text-gray-400 truncate max-w-[120px] font-medium">{firmName || 'Enterprise ERP'}</p>
            </div>
          </div>
          <button className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100">
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Primary Navigation */}
        <nav className="px-3.5 space-y-1 mt-1 text-xs">
          {/* Dashboard (Active Pill Style) */}
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium transition-all ${
              activeTab === 'dashboard'
                ? 'bg-[#2563eb] text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-3">
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </div>
            {activeTab === 'dashboard' && <Check className="w-3.5 h-3.5 text-white/90" />}
          </button>

          {/* Orders / Billing */}
          <button
            onClick={() => setActiveTab('billing')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium transition-all ${
              activeTab === 'billing'
                ? 'bg-[#2563eb] text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-3">
              <ShoppingBag className="w-4 h-4" />
              <span>Orders / POS</span>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                activeTab === 'billing'
                  ? 'bg-white/20 text-white'
                  : 'bg-emerald-50 text-emerald-700 font-mono'
              }`}
            >
              46
            </span>
          </button>

          {/* Products / Inventory */}
          <button
            onClick={() => setActiveTab('inventory')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium transition-all ${
              activeTab === 'inventory'
                ? 'bg-[#2563eb] text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Package className="w-4 h-4" />
              <span>Products</span>
            </div>
            {lowStockCount > 0 && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  activeTab === 'inventory'
                    ? 'bg-white/20 text-white'
                    : 'bg-red-50 text-red-600'
                }`}
              >
                {lowStockCount}
              </span>
            )}
          </button>

          {/* Customers */}
          <button
            onClick={() => setActiveTab('customers')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium transition-all ${
              activeTab === 'customers'
                ? 'bg-[#2563eb] text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Users className="w-4 h-4" />
              <span>Customers</span>
            </div>
          </button>

          {/* Quotations / Content */}
          <button
            onClick={() => setActiveTab('quotations')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium transition-all ${
              activeTab === 'quotations'
                ? 'bg-[#2563eb] text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-3">
              <FileText className="w-4 h-4" />
              <span>Estimates & Quotes</span>
            </div>
          </button>

          {/* Delivery Challans */}
          <button
            onClick={() => setActiveTab('challans')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium transition-all ${
              activeTab === 'challans'
                ? 'bg-[#2563eb] text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Truck className="w-4 h-4" />
              <span>Delivery Challans</span>
            </div>
          </button>

          {/* Finances Section Group */}
          <div className="pt-2">
            <button
              onClick={() => setFinancesOpen(!financesOpen)}
              className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-gray-500 hover:text-gray-800 font-semibold"
            >
              <div className="flex items-center space-x-3">
                <Wallet className="w-4 h-4" />
                <span>Finances</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  financesOpen ? 'rotate-0' : '-rotate-90'
                }`}
              />
            </button>

            {financesOpen && (
              <div className="pl-9 pr-2 space-y-0.5 mt-0.5">
                <button
                  onClick={() => setActiveTab('billing')}
                  className={`w-full text-left py-1.5 px-3 rounded-lg text-xs transition-colors ${
                    activeTab === 'billing' ? 'font-bold text-[#2563eb]' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Invoices
                </button>
                <button
                  onClick={() => setActiveTab('customers')}
                  className={`w-full text-left py-1.5 px-3 rounded-lg text-xs transition-colors ${
                    activeTab === 'customers' ? 'font-bold text-[#2563eb]' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Transactions / Ledger
                </button>
                <button
                  onClick={() => setActiveTab('expenses')}
                  className={`w-full text-left py-1.5 px-3 rounded-lg text-xs transition-colors ${
                    activeTab === 'expenses' ? 'font-bold text-[#2563eb]' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Expenses & Profit
                </button>
              </div>
            )}
          </div>

          {/* E-Way Bill & E-Invoice */}
          <button
            onClick={() => setActiveTab('einvoice')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium transition-all ${
              activeTab === 'einvoice'
                ? 'bg-[#2563eb] text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-3">
              <FileCheck2 className="w-4 h-4" />
              <span>E-Way & E-Invoice</span>
            </div>
          </button>

          {/* Settings */}
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium transition-all ${
              activeTab === 'settings'
                ? 'bg-[#2563eb] text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Upgrade to Premium Blue Gradient Card */}
      <div className="p-3.5">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#1e40af] via-[#1d4ed8] to-[#2563eb] text-white shadow-md relative overflow-hidden">
          <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center mb-3">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <h4 className="text-xs font-bold tracking-tight">Upgrade to Premium!</h4>
          <p className="text-[11px] text-white/80 mt-1 leading-snug">
            Upgrade your account and unlock all of the benefits.
          </p>
          <button
            onClick={() => setActiveTab('settings')}
            className="mt-3 w-full py-2 px-3 rounded-xl bg-[#2563eb] hover:bg-blue-600 active:scale-98 text-white font-semibold text-xs transition-all shadow-sm border border-white/20"
          >
            Upgrade premium
          </button>
        </div>
      </div>
    </aside>
  );
};
