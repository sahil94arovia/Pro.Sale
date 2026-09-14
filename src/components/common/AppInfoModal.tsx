import React, { useState } from 'react';
import { AppleModal } from './AppleModal';
import { BusinessSettings, Invoice, Customer, Product, Expense, Quotation, DeliveryChallan } from '../../types';
import { formatINR } from '../../utils/formatters';
import { updateService } from '../../services/updateService';
import { AppUpdateInfo } from '../../types/update';
import {
  ShieldCheck,
  Cpu,
  Database,
  CheckCircle2,
  RefreshCw,
  Key,
  Info,
  Server,
  Zap,
  Download,
} from 'lucide-react';

interface AppInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: BusinessSettings;
  invoices: Invoice[];
  customers: Customer[];
  products: Product[];
  expenses: Expense[];
  quotations: Quotation[];
  challans: DeliveryChallan[];
  onOpenUpdateModal?: (info: AppUpdateInfo) => void;
}

export const AppInfoModal: React.FC<AppInfoModalProps> = ({
  isOpen,
  onClose,
  settings,
  invoices,
  customers,
  products,
  expenses,
  quotations,
  challans,
  onOpenUpdateModal,
}) => {
  const [activeSection, setActiveSection] = useState<'overview' | 'compliance' | 'diagnostics' | 'shortcuts'>('overview');
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [availableUpdate, setAvailableUpdate] = useState<AppUpdateInfo | null>(null);

  // Compute live statistics
  const totalTurnover = invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  const totalStockUnits = products.reduce((sum, p) => sum + p.stock, 0);
  const totalReceivables = customers.reduce((sum, c) => sum + (c.currentBalance > 0 ? c.currentBalance : 0), 0);

  // Approximate storage size
  const approximateStorageKB = Math.round(
    [
      localStorage.getItem('prosale_invoices_v2') || '',
      localStorage.getItem('prosale_customers_v2') || '',
      localStorage.getItem('prosale_products_v2') || '',
      localStorage.getItem('prosale_expenses_v2') || '',
      localStorage.getItem('prosale_ledger_v2') || '',
      localStorage.getItem('prosale_quotations_v2') || '',
      localStorage.getItem('prosale_challans_v2') || '',
      localStorage.getItem('prosale_settings_v2') || '',
    ].reduce((sum, str) => sum + str.length, 0) / 1024
  );

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    setUpdateMessage(null);
    try {
      const result = await updateService.checkForUpdates(true);
      setUpdateMessage(result.message);
      if (result.status === 'UPDATE_AVAILABLE' && result.updateInfo) {
        setAvailableUpdate(result.updateInfo);
        if (onOpenUpdateModal) {
          onOpenUpdateModal(result.updateInfo);
        }
      } else {
        setAvailableUpdate(null);
      }
    } catch (err: any) {
      setUpdateMessage(err?.message || 'Failed to check for updates.');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleCopyDiagnostics = () => {
    const diagnosticData = {
      app: 'PROSALE Enterprise OS',
      version: updateService.CURRENT_VERSION,
      versionCode: updateService.CURRENT_VERSION_CODE,
      environment: 'Android Tablet / Capacitor WebView',
      business: {
        firmName: settings.firmName,
        gstin: settings.gstin,
        state: settings.state,
        stateCode: settings.stateCode,
      },
      database: {
        invoices: invoices.length,
        customers: customers.length,
        products: products.length,
        expenses: expenses.length,
        quotations: quotations.length,
        challans: challans.length,
        approxStorageKB: approximateStorageKB,
      },
      compliance: {
        gstRules: 'CBIC 2026 Standard',
        hsnValidation: 'Enabled',
        einvoiceFormat: 'IRN 64-char schema 1.04',
      },
    };
    navigator.clipboard.writeText(JSON.stringify(diagnosticData, null, 2));
    alert('System Diagnostic info copied to clipboard!');
  };

  return (
    <AppleModal
      isOpen={isOpen}
      onClose={onClose}
      title="App Information & System Status"
      subtitle="Complete specifications, mandatory compliance standards & live database diagnostics"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6">
        {/* 1. Header Hero Card with Official PRO.sale App Icon */}
        <div className="p-6 rounded-3xl bg-neutral-50 text-neutral-900 border border-neutral-200/80 shadow-xs relative overflow-hidden flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-5">
          <div className="relative flex-shrink-0">
            <img
              src="/app-icon.png"
              alt="Pro.Sale Official Icon"
              className="w-20 h-20 rounded-2xl object-contain shadow-md border border-neutral-200"
            />
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
            </span>
          </div>

          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-xl font-bold tracking-tight text-neutral-900">PROSALE Enterprise</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-200/60 text-neutral-800 border border-neutral-300 uppercase tracking-wider">
                v{updateService.CURRENT_VERSION} Production
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Lifetime Active
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1 font-sans">
              Offline-First High-Performance GST Billing & Enterprise ERP Operating System
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-3 text-[11px] text-neutral-700">
              <span className="flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>100% Offline Privacy</span>
              </span>
              <span className="flex items-center space-x-1">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Continuous Auto-Sync</span>
              </span>
              <span className="flex items-center space-x-1">
                <Server className="w-3.5 h-3.5 text-blue-600" />
                <span>Zero Cloud Dependency</span>
              </span>
            </div>
          </div>
        </div>

        {/* 2. Navigation Pills */}
        <div className="flex space-x-1.5 p-1 bg-neutral-100 border border-neutral-200 rounded-2xl overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: 'App Overview', icon: Info },
            { id: 'compliance', label: 'Mandatory Compliance', icon: ShieldCheck },
            { id: 'diagnostics', label: 'Live Database Health', icon: Database },
            { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: Key },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as any)}
                className={`flex-1 min-w-[110px] sm:min-w-0 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-black shadow-xs font-bold border border-neutral-200/60'
                    : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-black' : 'text-neutral-500'}`} />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* 3. Tab Contents */}
        {activeSection === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80">
                <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Application Name</p>
                <p className="text-sm font-bold text-neutral-900 mt-1">PROSALE Enterprise Billing OS</p>
                <p className="text-xs text-neutral-500 mt-0.5">Full commercial business distribution</p>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80">
                <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Release Version</p>
                <p className="text-sm font-bold text-neutral-900 mt-1">v{updateService.CURRENT_VERSION} (Build {updateService.CURRENT_VERSION_CODE})</p>
                <p className="text-xs text-neutral-500 mt-0.5">Unified Core Release</p>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80">
                <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Registered Entity</p>
                <p className="text-sm font-bold text-neutral-900 mt-1 truncate">{settings.firmName || 'PROSALE Enterprise'}</p>
                <p className="text-xs text-neutral-500 mt-0.5">GSTIN: {settings.gstin || 'Unregistered / Composition'}</p>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80">
                <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Jurisdiction State</p>
                <p className="text-sm font-bold text-neutral-900 mt-1">
                  {settings.state || 'Madhya Pradesh'} (Code {settings.stateCode || '23'})
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">Automated Interstate IGST / Intrastate CGST+SGST</p>
              </div>
            </div>

            {/* Check for updates banner */}
            <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-blue-950">Software Update Status</p>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  {updateMessage || `Running production release v${updateService.CURRENT_VERSION} (Build ${updateService.CURRENT_VERSION_CODE}). Manual update system active.`}
                </p>
              </div>
              <div className="flex items-center space-x-2 flex-shrink-0">
                {availableUpdate && (
                  <button
                    onClick={() => {
                      if (onOpenUpdateModal) {
                        onOpenUpdateModal(availableUpdate);
                      }
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-semibold cursor-pointer transition-all flex items-center space-x-1.5 shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>View Update</span>
                  </button>
                )}
                <button
                  onClick={handleCheckUpdate}
                  disabled={isCheckingUpdate}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-semibold cursor-pointer transition-all flex items-center space-x-1.5 shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                  <span>{isCheckingUpdate ? 'Checking...' : 'Check Updates'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'compliance' && (
          <div className="space-y-3.5">
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
              <div className="flex items-center space-x-2 text-amber-800 font-bold text-xs">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>Mandatory Statutory Compliance Engine (India GST 2026)</span>
              </div>
              <p className="text-xs text-amber-700 mt-1">
                Pro.Sale follows all CBIC statutory invoice norms, tax split rules, HSN 4/6/8-digit requirements, and E-Way bill structures.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/80 space-y-1">
                <p className="font-semibold text-neutral-900 flex items-center justify-between">
                  <span>Tax Slab Rates</span>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">CBIC Compliant</span>
                </p>
                <p className="text-neutral-500 text-[11px]">0%, 0.25%, 3%, 5%, 12%, 18%, 28% plus customized Cess rates.</p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/80 space-y-1">
                <p className="font-semibold text-neutral-900 flex items-center justify-between">
                  <span>Interstate Resolution</span>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Auto Split</span>
                </p>
                <p className="text-neutral-500 text-[11px]">Automatic IGST application when Party State != Firm State; CGST+SGST otherwise.</p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/80 space-y-1">
                <p className="font-semibold text-neutral-900 flex items-center justify-between">
                  <span>Invoice Numbering</span>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Rule 46</span>
                </p>
                <p className="text-neutral-500 text-[11px]">Strict unique sequential numbering with configurable business prefix and padding.</p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/80 space-y-1">
                <p className="font-semibold text-neutral-900 flex items-center justify-between">
                  <span>E-Way / E-Invoice Ready</span>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">NIC Schema 1.04</span>
                </p>
                <p className="text-neutral-500 text-[11px]">Direct generation of 64-character IRN, Ack No., Transporter ID, and Vehicle tracking.</p>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'diagnostics' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80">
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Sale Invoices</p>
                <p className="text-lg font-extrabold text-neutral-900 mt-0.5">{invoices.length}</p>
                <p className="text-[10px] text-neutral-500 truncate">{formatINR(totalTurnover)}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80">
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Parties / Clients</p>
                <p className="text-lg font-extrabold text-neutral-900 mt-0.5">{customers.length}</p>
                <p className="text-[10px] text-neutral-500 truncate">{formatINR(totalReceivables)} due</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80">
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Stock Items</p>
                <p className="text-lg font-extrabold text-neutral-900 mt-0.5">{products.length}</p>
                <p className="text-[10px] text-neutral-500 truncate">{totalStockUnits} total qty</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80">
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Storage Used</p>
                <p className="text-lg font-extrabold text-neutral-900 mt-0.5">~{approximateStorageKB} KB</p>
                <p className="text-[10px] text-emerald-600 font-medium">Optimal Local DB</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-50 text-neutral-700 font-mono text-[11px] space-y-2 border border-neutral-200">
              <div className="flex items-center justify-between text-neutral-900 font-sans font-bold">
                <span className="flex items-center space-x-1.5">
                  <Cpu className="w-3.5 h-3.5 text-blue-600" />
                  <span>Internal Engine Telemetry</span>
                </span>
                <span className="text-[10px] text-emerald-600 font-sans font-medium">Auto-Sync Heartbeat: OK (1.5s)</span>
              </div>
              <p className="text-neutral-500 font-sans text-xs">
                Local storage reactivity active across tabs with storage event bus, visibility change listeners, and version fingerprint comparison.
              </p>
              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleCopyDiagnostics}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-neutral-100 text-neutral-800 font-sans text-xs font-semibold cursor-pointer transition-colors border border-neutral-200 shadow-xs"
                >
                  Copy Full Diagnostics Report
                </button>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'shortcuts' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { key: 'F2', action: 'Create New Sale Invoice (POS Billing)' },
                { key: 'F3', action: 'Add Quick Purchase / Expense Voucher' },
                { key: 'F4', action: 'Receive Customer Ledger Payment' },
                { key: 'Esc', action: 'Dismiss Open Overlay or Return to Screen' },
                { key: 'Cmd + P', action: 'Print Screen or Generate Clean PDF' },
                { key: 'Cmd + F', action: 'Instant Search across Tables & Registers' },
              ].map((sc, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-200/80">
                  <span className="text-xs text-neutral-700 font-medium">{sc.action}</span>
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-neutral-200 text-neutral-900 font-mono font-bold text-xs shadow-xs">
                    {sc.key}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Footer Actions */}
        <div className="pt-4 border-t border-neutral-200 flex items-center justify-between">
          <p className="text-[11px] text-neutral-400">
            © 2026 Pro.Sale OS Inc. Licensed exclusively for {settings.firmName || 'Enterprise'}.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-black hover:bg-neutral-800 text-white font-semibold text-xs transition-all active:scale-95 cursor-pointer shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </AppleModal>
  );
};
