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
  Lock,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { BusinessSettings } from '../../types';
import { licenseService } from '../../services/license';
import { dbService } from '../../services/db';
import { UpgradeToGoldModal } from '../common/UpgradeToGoldModal';

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
  const [licenseState, setLicenseState] = useState(() => licenseService.getLicenseState());
  const [userProfile, setUserProfile] = useState(() => dbService.getUserProfile());

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
      {
        id: 'plans',
        label:
          licenseState.plan === 'gold'
            ? 'Enterprise Gold (Active)'
            : licenseState.plan === 'silver'
            ? 'Silver Edition (Active)'
            : `6-Day Trial (${licenseState.trialDaysRemaining}d left)`,
      },
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
  const [lockedFeatureModal, setLockedFeatureModal] = useState<string | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Ensure only the active tab's accordion is open when currentTab changes
  useEffect(() => {
    setOpenAccordionTab(currentTab);
  }, [currentTab]);

  useEffect(() => {
    const handleLicenseUpdate = (e: any) => {
      setLicenseState(e.detail?.state || licenseService.getLicenseState());
    };
    const handleDbUpdate = () => {
      setUserProfile(dbService.getUserProfile());
    };
    window.addEventListener('prosale_license_updated', handleLicenseUpdate);
    window.addEventListener('prosale_db_updated', handleDbUpdate);
    return () => {
      window.removeEventListener('prosale_license_updated', handleLicenseUpdate);
      window.removeEventListener('prosale_db_updated', handleDbUpdate);
    };
  }, []);

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
          if (!licenseService.canAccessFeature('GSTR_REPORTS')) {
            setActiveReport('Stock summary');
          } else {
            setActiveReport('GSTR 1');
          }
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

    // Feature gating check for Silver tier
    if (sub.isReport && sub.id.startsWith('GSTR') && !licenseService.canAccessFeature('GSTR_REPORTS')) {
      setLockedFeatureModal('CBIC GST Reports');
      return;
    }
    if (sub.id === 'barcode_generator' && !licenseService.canAccessFeature('BARCODE')) {
      setLockedFeatureModal('Barcode Generator');
      return;
    }

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

  const renderSidebarContent = (isMobile: boolean = false) => (
    <div className="flex-1 flex flex-col justify-between min-h-0 h-full bg-white">
      <div className="flex-1 flex flex-col min-h-0">
        {/* Logo Header */}
        <div className="px-4 py-3.5 border-b border-neutral-100 flex items-center justify-between flex-shrink-0">
          <div
            onClick={() => {
              if (isMobile) setIsMobileDrawerOpen(false);
              if (onOpenAppInfo) onOpenAppInfo();
            }}
            className="flex items-center space-x-3 cursor-pointer group"
            title="Click to view Pro.Sale App Info & System Diagnostics"
          >
            <img
              src="/app-icon.png"
              alt="Pro.Sale Logo"
              className="w-8 h-8 rounded-xl object-contain drop-shadow-sm group-hover:scale-105 transition-transform"
            />
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="text-sm font-bold text-neutral-900 tracking-tight">Pro<span className="text-[#0071e3]">.</span>Sale</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-neutral-100 text-neutral-600 border border-neutral-200 uppercase tracking-wider">
                  PRO
                </span>
              </div>
              <span className="text-[10px] text-neutral-500 block font-sans tracking-wide truncate">Enterprise Billing OS</span>
            </div>
          </div>

          {/* Close button on mobile drawer */}
          {isMobile && (
            <button
              onClick={() => setIsMobileDrawerOpen(false)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
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
                  onClick={() => {
                    handleTabClick(item.id);
                    if (isMobile && !hasSub) setIsMobileDrawerOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all group text-left cursor-pointer ${
                    isActive
                      ? 'bg-neutral-900 text-white shadow-xs font-semibold'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        isActive ? 'text-white' : 'text-neutral-500 group-hover:text-neutral-900'
                      }`}
                    />
                    <span className="text-xs">{item.label}</span>
                  </div>

                  {hasSub && (
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        isActive
                          ? (isExpanded ? 'rotate-180 text-white' : 'text-white')
                          : (isExpanded ? 'rotate-180 text-neutral-700' : 'text-neutral-400 group-hover:text-neutral-800')
                      }`}
                    />
                  )}
                </button>

                {/* Expandable In-Line Accordion Submenu */}
                {isExpanded && hasSub && (
                  <div className="ml-3 pl-3 border-l border-neutral-200 space-y-0.5 py-1">
                    {subItems.map((sub) => {
                      const isSubActive =
                        currentTab === item.id &&
                        (sub.isReport ? activeReport === sub.id : activeSubTab === sub.id);

                      return (
                        <button
                          key={sub.id}
                          data-subnav={sub.id}
                          onClick={(e) => {
                            handleSubItemClick(e, item.id, sub);
                            if (isMobile) setIsMobileDrawerOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] transition-all flex items-center justify-between group cursor-pointer ${
                            isSubActive
                              ? 'bg-neutral-100 text-neutral-900 font-semibold shadow-2xs'
                              : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
                          }`}
                        >
                          <span className="truncate">{sub.label}</span>
                          {isSubActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-neutral-900 flex-shrink-0 ml-1.5" />
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

      {/* Bottom Company Selector Card */}
      <div className="p-3 border-t border-neutral-100 mt-auto flex-shrink-0">
        <div
          onClick={() => {
            if (isMobile) setIsMobileDrawerOpen(false);
            setCurrentTab('settings');
            setActiveSubTab('profile');
          }}
          className="p-2.5 rounded-xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/80 cursor-pointer transition-colors flex items-center justify-between group"
        >
          <div className="flex items-center space-x-2.5 truncate">
            <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white flex items-center justify-center text-xs font-semibold uppercase flex-shrink-0">
              {userProfile?.name ? userProfile.name.charAt(0) : settings.firmName ? settings.firmName.charAt(0) : 'P'}
            </div>
            <div className="truncate">
              <p className="text-[11px] font-medium text-neutral-900 truncate">
                {userProfile?.name ? `${userProfile.name} (${userProfile.role || 'Admin'})` : settings.firmName || 'Pro.Sale Operator'}
              </p>
              <p className="text-[9px] text-neutral-500 truncate">
                {settings.firmName || 'Local Workstation'} {settings.gstin ? `• ${settings.gstin}` : ''}
              </p>
            </div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-800 transition-colors flex-shrink-0" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#f5f5f7] font-sans text-neutral-900 antialiased select-none relative">
      {/* Mobile Slide-Over Drawer */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-fade-in">
          <div
            onClick={() => setIsMobileDrawerOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
          />
          <div className="relative w-72 max-w-[85vw] bg-white text-neutral-800 h-full z-10 flex flex-col justify-between shadow-2xl border-r border-neutral-200 animate-in slide-in-from-left duration-200">
            {renderSidebarContent(true)}
          </div>
        </div>
      )}

      {/* Primary Desktop / Tablet Sidebar (Collapsible on iPad) */}
      <aside
        className={`bg-white text-neutral-700 flex flex-col justify-between flex-shrink-0 z-30 h-screen sticky top-0 transition-all duration-200 select-none ${
          isSidebarCollapsed ? 'hidden' : 'hidden md:flex md:w-64 border-r border-neutral-200/80'
        }`}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* Main Workspace Screen */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#f5f5f7]">
        {/* Top Header Action Bar */}
        <header className="h-14 bg-white/80 backdrop-blur-xl border-b border-neutral-200/80 px-3 sm:px-6 flex items-center justify-between z-10 sticky top-0 shadow-2xs">
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Mobile Menu Drawer Toggle */}
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className="md:hidden p-1.5 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 cursor-pointer transition-colors"
              title="Open Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Tablet/Desktop Sidebar Toggle Button */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden md:flex p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
              title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isSidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>

            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              {currentTab.toUpperCase()}
            </span>
            {currentTab === 'reports' ? (
              <>
                <span className="text-neutral-300">/</span>
                <span className="text-xs font-semibold text-neutral-900 truncate max-w-[130px] sm:max-w-none">{activeReport}</span>
              </>
            ) : (
              <>
                <span className="text-neutral-300">/</span>
                <span className="text-xs font-semibold text-neutral-900 capitalize truncate max-w-[130px] sm:max-w-none">
                  {activeSubTab.replace('_', ' ')}
                </span>
              </>
            )}
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center space-x-1.5 sm:space-x-2.5">
            {/* Add Sale Button */}
            <button
              onClick={onOpenAddSale}
              className="flex items-center space-x-1 sm:space-x-1.5 px-3 sm:px-4 py-1.5 rounded-full bg-black hover:bg-neutral-800 text-white font-semibold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              <span>Add Sale</span>
            </button>

            {/* Add Purchase Button (Responsive) */}
            <button
              onClick={onOpenAddPurchase}
              className="hidden sm:flex items-center space-x-1.5 px-4 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-medium text-xs border border-neutral-200 shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-neutral-600" />
              <span>Add Purchase</span>
            </button>

            {/* Print icon (Desktop/Tablet) */}
            <button
              onClick={() => window.print()}
              title="Print Screen"
              className="hidden sm:block p-1.5 text-neutral-400 hover:text-neutral-800 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* App Info Dialog Trigger */}
            {onOpenAppInfo && (
              <button
                onClick={onOpenAppInfo}
                title="Pro.Sale App Info & System Diagnostics"
                className="p-1.5 text-neutral-400 hover:text-neutral-800 transition-colors cursor-pointer"
              >
                <Info className="w-4 h-4" />
              </button>
            )}

            {/* Settings shortcut */}
            <button
              onClick={() => setCurrentTab('settings')}
              title="Settings"
              className="p-1.5 text-neutral-400 hover:text-neutral-800 transition-colors cursor-pointer"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Dynamic Main Pane Body (Adaptive Padding for Mobile/Tablet/Laptop) */}
        <main className="p-3 sm:p-5 md:p-6 pb-24 md:pb-8 flex-1 overflow-y-auto bg-[#f5f5f7] text-neutral-900">{children}</main>

        {/* Mobile Bottom Navigation Bar (Apple iOS Native Style) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-t border-neutral-200/80 px-2 py-1.5 flex items-center justify-around shadow-lg">
          <button
            onClick={() => setCurrentTab('home')}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
              currentTab === 'home' ? 'text-black font-bold' : 'text-neutral-400 hover:text-neutral-700'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Home</span>
          </button>

          <button
            onClick={() => {
              setCurrentTab('sale');
              setActiveSubTab('invoices');
            }}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
              currentTab === 'sale' ? 'text-black font-bold' : 'text-neutral-400 hover:text-neutral-700'
            }`}
          >
            <Receipt className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Sales</span>
          </button>

          <button
            onClick={() => {
              setCurrentTab('parties');
              setActiveSubTab('all_parties');
            }}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
              currentTab === 'parties' ? 'text-black font-bold' : 'text-neutral-400 hover:text-neutral-700'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Parties</span>
          </button>

          <button
            onClick={() => {
              setCurrentTab('items');
              setActiveSubTab('all_items');
            }}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
              currentTab === 'items' ? 'text-black font-bold' : 'text-neutral-400 hover:text-neutral-700'
            }`}
          >
            <Package className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Items</span>
          </button>

          <button
            onClick={() => setIsMobileDrawerOpen(true)}
            className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-neutral-400 hover:text-black transition-all cursor-pointer"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 font-medium">More</span>
          </button>
        </nav>
      </div>

      {/* Feature Gating Modal for Silver Tier */}
      <UpgradeToGoldModal
        isOpen={!!lockedFeatureModal}
        onClose={() => setLockedFeatureModal(null)}
        featureName={lockedFeatureModal || ''}
      />
    </div>
  );
};
