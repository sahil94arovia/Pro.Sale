import React, { useState, useEffect } from 'react';
import {
  Home,
  Users,
  Package,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Landmark,
  FileBarChart,
  RefreshCw,
  Wrench,
  Settings,
  Tag,
  Plus,
  Printer,
  MoreVertical,
  ChevronDown,
  ChevronRight,
  Info,
} from 'lucide-react';
import { BusinessSettings } from '../../types';

export type MainNavTab =
  | 'home'
  | 'parties'
  | 'items'
  | 'sale'
  | 'purchase'
  | 'grow'
  | 'cash_bank'
  | 'reports'
  | 'backup'
  | 'utilities'
  | 'settings'
  | 'pricing';

export type GstrReportTab =
  | 'GSTR 1'
  | 'GSTR 2'
  | 'GSTR 3 B'
  | 'GSTR 9'
  | 'Client Wise Profit And Loss'
  | 'Item Wise Profit And Loss'
  | 'Bill Wise Profit And Loss'
  | 'Sale Summary By HSN'
  | 'SAC Report'
  | 'Stock summary'
  | 'Item Report By Party'
  | 'Low Stock Summary'
  | 'Profit And Loss'
  | 'Stock Summary'
  | 'Bank Statement';

interface VyaparLayoutProps {
  currentTab: MainNavTab;
  setCurrentTab: (tab: MainNavTab) => void;
  activeReport: GstrReportTab;
  setActiveReport: (rep: GstrReportTab) => void;
  activeSubTab: string;
  setActiveSubTab: (sub: string) => void;
  settings: BusinessSettings;
  onOpenAddSale: () => void;
  onOpenAddPurchase: () => void;
  onOpenAppInfo?: () => void;
  children: React.ReactNode;
}

export const VyaparLayout: React.FC<VyaparLayoutProps> = ({
  currentTab,
  setCurrentTab,
  activeReport,
  setActiveReport,
  activeSubTab,
  setActiveSubTab,
  settings,
  onOpenAddSale,
  onOpenAddPurchase,
  onOpenAppInfo,
  children,
}) => {
  // Navigation & Submenus Definition
  interface SubMenuItem {
    id: string;
    label: string;
    isReport?: boolean;
  }

  const submenusMap: Record<MainNavTab, SubMenuItem[]> = {
    home: [
      { id: 'dashboard_overview', label: 'Business Overview' },
      { id: 'recent_transactions', label: 'Recent Sale Ledger' },
      { id: 'tax_liabilities', label: 'Live GST Liabilities' },
    ],
    parties: [
      { id: 'all_parties', label: 'All Parties & Ledgers' },
      { id: 'customers_receivable', label: 'Customers (Receivable)' },
      { id: 'suppliers_pay', label: 'Suppliers (To Pay)' },
    ],
    items: [
      { id: 'all_items', label: 'Stock Master & Items' },
      { id: 'low_stock', label: 'Low Stock Reorder' },
      { id: 'barcodes', label: 'Barcode Generator' },
    ],
    sale: [
      { id: 'invoices', label: 'Sale Invoices (All Bills)' },
      { id: 'new_sale', label: '+ Create Sale Bill' },
      { id: 'quotations', label: 'Estimates & Quotations' },
      { id: 'challans', label: 'Delivery Challans' },
    ],
    purchase: [
      { id: 'expenses', label: 'Business Expenses' },
      { id: 'purchases', label: 'Purchase Invoices' },
    ],
    grow: [
      { id: 'eway_einvoice', label: 'E-Way Bill & E-Invoice' },
    ],
    cash_bank: [
      { id: 'bank_accounts', label: 'Bank Accounts' },
      { id: 'cash_in_hand', label: 'Cash in Hand' },
    ],
    reports: [
      { id: 'GSTR 1', label: 'GSTR 1 (Outward Supplies)', isReport: true },
      { id: 'GSTR 2', label: 'GSTR 2 (Inward Supplies)', isReport: true },
      { id: 'GSTR 3 B', label: 'GSTR 3B (Monthly Summary)', isReport: true },
      { id: 'GSTR 9', label: 'GSTR 9 (Annual Return)', isReport: true },
      { id: 'Client Wise Profit And Loss', label: 'Client Wise Profit', isReport: true },
      { id: 'Item Wise Profit And Loss', label: 'Item Wise Profit', isReport: true },
      { id: 'Bill Wise Profit And Loss', label: 'Bill Wise Profit', isReport: true },
      { id: 'Sale Summary By HSN', label: 'Sale Summary By HSN', isReport: true },
      { id: 'SAC Report', label: 'SAC Services Report', isReport: true },
      { id: 'Stock summary', label: 'Stock Summary Report', isReport: true },
      { id: 'Item Report By Party', label: 'Item Report By Party', isReport: true },
      { id: 'Low Stock Summary', label: 'Low Stock Summary', isReport: true },
      { id: 'Bank Statement', label: 'Bank Statement', isReport: true },
    ],
    backup: [
      { id: 'backup', label: 'Backup & Reset Data' },
    ],
    utilities: [
      { id: 'barcode_generator', label: 'Barcode Generator' },
      { id: 'import_data', label: 'Import Excel / CSV' },
    ],
    settings: [
      { id: 'profile', label: 'Business Profile & GSTIN' },
      { id: 'print', label: 'Invoice Themes & Print Setup' },
      { id: 'taxes', label: 'Taxes & GST' },
      { id: 'messages', label: 'WhatsApp & Messages' },
      { id: 'backup', label: 'Backup & Reset Data' },
    ],
    pricing: [
      { id: 'plans', label: 'Enterprise Plan (Active)' },
    ],
  };

  const primaryNav: Array<{ id: MainNavTab; label: string; icon: React.ElementType }> = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'parties', label: 'Parties', icon: Users },
    { id: 'items', label: 'Items', icon: Package },
    { id: 'sale', label: 'Sale', icon: Receipt },
    { id: 'purchase', label: 'Purchase & Expense', icon: ShoppingCart },
    { id: 'grow', label: 'Grow Your Business', icon: TrendingUp },
    { id: 'cash_bank', label: 'Cash & Bank', icon: Landmark },
    { id: 'reports', label: 'Reports', icon: FileBarChart },
    { id: 'backup', label: 'Sync, Share & Backup', icon: RefreshCw },
    { id: 'utilities', label: 'Utilities', icon: Wrench },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'pricing', label: 'Plans & Pricing', icon: Tag },
  ];

  // Keep track of strictly one accordion submenu open at a time
  const [openAccordionTab, setOpenAccordionTab] = useState<MainNavTab | null>(currentTab);

  // Ensure only the active tab's accordion is open when currentTab changes
  useEffect(() => {
    setOpenAccordionTab(currentTab);
  }, [currentTab]);

  const handleTabClick = (tabId: MainNavTab) => {
    if (currentTab === tabId) {
      // Toggle accordion expansion if tapping the current active tab
      setOpenAccordionTab((prev) => (prev === tabId ? null : tabId));
    } else {
      // Switch tab: automatically close previous accordion and open only this one
      setCurrentTab(tabId);
      setOpenAccordionTab(tabId);

      // Automatically default to the first sub-item
      const subs = submenusMap[tabId];
      if (subs && subs.length > 0) {
        if (tabId === 'reports') {
          setActiveReport('GSTR 1');
        } else {
          setActiveSubTab(subs[0].id);
        }
      }
    }
  };

  const handleSubItemClick = (
    e: React.MouseEvent,
    tabId: MainNavTab,
    sub: SubMenuItem
  ) => {
    e.stopPropagation();
    setOpenAccordionTab(tabId);
    if (currentTab !== tabId) {
      setCurrentTab(tabId);
    }
    if (sub.isReport) {
      setActiveReport(sub.id as GstrReportTab);
    } else {
      setActiveSubTab(sub.id);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#f5f5f7] font-sans text-black antialiased select-none">
      {/* ========================================================================= */}
      {/* 1. PRIMARY LEFT SIDEBAR (Dense OLED Pitch Black #000000 with Accordions)  */}
      {/* ========================================================================= */}
      <aside className="w-64 bg-[#000000] text-[#86868b] flex flex-col justify-between flex-shrink-0 z-30 h-screen sticky top-0 border-r border-neutral-900 select-none">
        <div className="flex-1 flex flex-col min-h-0">
          {/* Logo Header: Pro.Sale Bespoke Brand Identity */}
          <div
            onClick={() => onOpenAppInfo && onOpenAppInfo()}
            className="px-4 py-3.5 border-b border-neutral-900 flex items-center space-x-3 flex-shrink-0 cursor-pointer group hover:bg-neutral-950/80 transition-colors"
            title="Click to view Pro.Sale App Info & System Diagnostics"
          >
            <img
              src="/app-icon.png"
              alt="Pro.Sale Logo"
              className="w-8 h-8 rounded-xl object-contain drop-shadow-sm group-hover:scale-105 transition-transform"
            />
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="text-sm font-bold text-white tracking-tight">Pro<span className="text-[#38bdf8]">.</span>Sale</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-neutral-900 text-neutral-300 border border-neutral-800 uppercase tracking-wider">
                  PRO
                </span>
              </div>
              <span className="text-[10px] text-[#86868b] block font-sans tracking-wide truncate">Enterprise Billing OS</span>
            </div>
          </div>

          {/* Nav List with Expandable In-Line Submenus */}
          <nav className="p-2.5 space-y-1 overflow-y-auto flex-1 text-xs font-medium custom-scrollbar">
            {primaryNav.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              const isExpanded = openAccordionTab === item.id;
              const subItems = submenusMap[item.id];
              const hasSub = subItems && subItems.length > 0;

              return (
                <div key={item.id} className="space-y-0.5">
                  <button
                    data-nav={item.id}
                    onClick={() => handleTabClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all group text-left cursor-pointer ${
                      isActive
                        ? 'bg-neutral-900 text-white shadow-xs font-semibold'
                        : 'text-[#86868b] hover:text-white hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Icon
                        className={`w-4 h-4 transition-colors ${
                          isActive ? 'text-white' : 'text-[#86868b] group-hover:text-white'
                        }`}
                      />
                      <span className="text-xs">{item.label}</span>
                    </div>

                    {hasSub && (
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-[#6e6e73] transition-transform duration-200 ${
                          isExpanded ? 'rotate-180 text-white' : 'group-hover:text-white'
                        }`}
                      />
                    )}
                  </button>

                  {/* Expandable In-Line Accordion Submenu under the option */}
                  {isExpanded && hasSub && (
                    <div className="ml-3 pl-3 border-l border-neutral-800/80 space-y-0.5 py-1">
                      {subItems.map((sub) => {
                        const isSubActive =
                          currentTab === item.id &&
                          (sub.isReport ? activeReport === sub.id : activeSubTab === sub.id);

                        return (
                          <button
                            key={sub.id}
                            data-subnav={sub.id}
                            onClick={(e) => handleSubItemClick(e, item.id, sub)}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] transition-all flex items-center justify-between group cursor-pointer ${
                              isSubActive
                                ? 'bg-neutral-800 text-white font-medium shadow-xs'
                                : 'text-[#86868b] hover:text-white hover:bg-white/[0.04]'
                            }`}
                          >
                            <span className="truncate">{sub.label}</span>
                            {isSubActive && (
                              <span className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0 ml-1.5" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Bottom Company Selector Card (Sleek Apple Dark Glass) */}
        <div className="p-3 border-t border-neutral-900 mt-auto flex-shrink-0">
          <div
            onClick={() => {
              setCurrentTab('settings');
              setActiveSubTab('profile');
            }}
            className="p-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-900 border border-neutral-900 cursor-pointer transition-colors flex items-center justify-between group"
          >
            <div className="flex items-center space-x-2.5 truncate">
              <div className="w-7 h-7 rounded-lg bg-neutral-800 text-white flex items-center justify-center text-xs font-semibold uppercase flex-shrink-0">
                {settings.firmName ? settings.firmName.charAt(0) : 'P'}
              </div>
              <div className="truncate">
                <p className="text-[11px] font-medium text-white truncate">{settings.firmName || 'Pro.Sale'}</p>
                <p className="text-[9px] text-[#86868b] truncate">GST: {settings.gstin || 'Unregistered'}</p>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-[#6e6e73] group-hover:text-white transition-colors flex-shrink-0" />
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. EXPANDED MAIN WORKSPACE SCREEN (Full-Width, Spacious Apple Monochrome) */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#f5f5f7]">
        {/* Top Header Action Bar */}
        <header className="h-14 bg-white border-b border-black/[0.06] px-6 flex items-center justify-between z-10 shadow-2xs">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-[#86868b] uppercase tracking-wider">
              {currentTab.toUpperCase()}
            </span>
            {currentTab === 'reports' ? (
              <>
                <span className="text-black/20">/</span>
                <span className="text-xs font-semibold text-black">{activeReport}</span>
              </>
            ) : (
              <>
                <span className="text-black/20">/</span>
                <span className="text-xs font-semibold text-black capitalize">
                  {activeSubTab.replace('_', ' ')}
                </span>
              </>
            )}
          </div>

          {/* Right Action Buttons (Apple Monochrome: Dense OLED Black & Crisp White) */}
          <div className="flex items-center space-x-2.5">
            {/* Add Sale Button */}
            <button
              onClick={onOpenAddSale}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-full bg-black hover:bg-neutral-900 text-white font-medium text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              <span>Add Sale</span>
            </button>

            {/* Add Purchase Button */}
            <button
              onClick={onOpenAddPurchase}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-full bg-white hover:bg-neutral-50 text-black font-medium text-xs border border-black/15 shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-black" />
              <span>Add Purchase</span>
            </button>

            {/* Print icon */}
            <button
              onClick={() => window.print()}
              title="Print Screen"
              className="p-1.5 text-[#86868b] hover:text-black transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* App Info Dialog Trigger */}
            {onOpenAppInfo && (
              <button
                onClick={onOpenAppInfo}
                title="Pro.Sale App Info & System Diagnostics"
                className="p-1.5 text-[#86868b] hover:text-black transition-colors cursor-pointer"
              >
                <Info className="w-4 h-4" />
              </button>
            )}

            {/* More options (Settings shortcut) */}
            <button
              onClick={() => setCurrentTab('settings')}
              title="Settings"
              className="p-1.5 text-[#86868b] hover:text-black transition-colors cursor-pointer"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Dynamic Main Pane Body */}
        <main className="p-6 flex-1 overflow-y-auto bg-[#f5f5f7]">{children}</main>
      </div>
    </div>
  );
};
