import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Printer,
  Save,
  Download,
  Upload,
  CheckCircle2,
  Loader2,
  Image as ImageIcon,
  LayoutTemplate,
  Check,
  Trash2,
  Percent,
  MessageSquare,
  Sparkles,
  ShieldAlert,
  CreditCard,
  QrCode,
  FileText,
  X,
  RefreshCw,
  Info,
} from 'lucide-react';
import {
  BusinessSettings,
  InvoiceCustomization,
  TaxesGstSettings,
  TransactionMessagesSettings,
} from '../../types';
import {
  INDIAN_STATES,
  DEFAULT_BUSINESS_SETTINGS,
  INVOICE_THEMES,
} from '../../utils/constants';
import { verifyAndFetchGSTDetails, GSTVerificationResult } from '../../services/gstLookupService';
import { updateService } from '../../services/updateService';
import { AppUpdateInfo } from '../../types/update';

interface SettingsViewProps {
  settings: BusinessSettings;
  activeSubTab?: string;
  onSelectSubTab?: (sub: string) => void;
  onSaveSettings: (settings: BusinessSettings) => void;
  onExportBackup: () => void;
  onImportBackup: (jsonStr: string) => boolean;
  onClearAllData?: () => void;
  onOpenAppInfo?: () => void;
  onOpenUpdateModal?: (info: AppUpdateInfo) => void;
  onClose?: () => void;
}

export type SettingsSection = 'profile' | 'print' | 'taxes' | 'messages' | 'backup';

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  activeSubTab,
  onSelectSubTab,
  onSaveSettings,
  onExportBackup,
  onImportBackup,
  onClearAllData,
  onOpenAppInfo,
  onOpenUpdateModal,
  onClose,
}) => {
  // Normalize incoming subtab from left sidebar
  const getNormalizedSection = (tab?: string): SettingsSection => {
    if (!tab) return 'profile';
    if (tab === 'print' || tab === 'print_setup') return 'print';
    if (tab === 'taxes' || tab === 'taxes_gst') return 'taxes';
    if (tab === 'messages' || tab === 'transaction_message') return 'messages';
    if (tab === 'backup' || tab === 'export_json' || tab === 'restore_json') return 'backup';
    return 'profile';
  };

  const [currentSection, setCurrentSection] = useState<SettingsSection>(() =>
    getNormalizedSection(activeSubTab)
  );

  // App Updates state
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateStatusMessage, setUpdateStatusMessage] = useState<string | null>(null);
  const [availableUpdate, setAvailableUpdate] = useState<AppUpdateInfo | null>(null);

  const handleCheckForUpdates = async () => {
    setIsCheckingUpdate(true);
    setUpdateStatusMessage(null);
    try {
      const res = await updateService.checkForUpdates(true);
      if (res.status === 'UPDATE_AVAILABLE' && res.updateInfo) {
        setAvailableUpdate(res.updateInfo);
        setUpdateStatusMessage(`A newer version (v${res.updateInfo.latestVersion}) is available!`);
        if (onOpenUpdateModal) {
          onOpenUpdateModal(res.updateInfo);
        }
      } else if (res.status === 'UP_TO_DATE') {
        setAvailableUpdate(null);
        setUpdateStatusMessage(`You're up to date. PROSALE v${updateService.CURRENT_VERSION} is the latest version.`);
      } else if (res.status === 'NO_RELEASE') {
        setAvailableUpdate(null);
        setUpdateStatusMessage('No new published releases found on GitHub.');
      } else {
        setAvailableUpdate(null);
        setUpdateStatusMessage(res.message || 'Unable to check for updates right now.');
      }
    } catch {
      setAvailableUpdate(null);
      setUpdateStatusMessage('Unable to connect. PROSALE is running in offline mode.');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  // Keep section in sync when user clicks left sidebar accordion item
  useEffect(() => {
    if (activeSubTab) {
      setCurrentSection(getNormalizedSection(activeSubTab));
    }
  }, [activeSubTab]);

  const handleSwitchSection = (section: SettingsSection) => {
    setCurrentSection(section);
    if (onSelectSubTab) {
      onSelectSubTab(section);
    }
  };

  const [formData, setFormData] = useState<BusinessSettings>(() => ({
    ...DEFAULT_BUSINESS_SETTINGS,
    ...settings,
    invoiceCustomization: {
      ...DEFAULT_BUSINESS_SETTINGS.invoiceCustomization!,
      ...(settings.invoiceCustomization || {}),
    },
    taxesGstSettings: {
      ...DEFAULT_BUSINESS_SETTINGS.taxesGstSettings!,
      ...(settings.taxesGstSettings || {}),
    },
    transactionMessages: {
      ...DEFAULT_BUSINESS_SETTINGS.transactionMessages!,
      ...(settings.transactionMessages || {}),
    },
  }));

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [importStatus, setImportStatus] = useState<string>('');
  const [isVerifyingGST, setIsVerifyingGST] = useState(false);
  const [gstResult, setGstResult] = useState<GSTVerificationResult | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const sigInputRef = useRef<HTMLInputElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  const customization = formData.invoiceCustomization || DEFAULT_BUSINESS_SETTINGS.invoiceCustomization!;
  const taxes = formData.taxesGstSettings || DEFAULT_BUSINESS_SETTINGS.taxesGstSettings!;
  const msgs = formData.transactionMessages || DEFAULT_BUSINESS_SETTINGS.transactionMessages!;

  // Customization Updater
  const updateCustomization = (patch: Partial<InvoiceCustomization>) => {
    setFormData((prev) => ({
      ...prev,
      invoiceCustomization: {
        ...(prev.invoiceCustomization || DEFAULT_BUSINESS_SETTINGS.invoiceCustomization!),
        ...patch,
      },
    }));
  };

  // Taxes Updater
  const updateTaxes = (patch: Partial<TaxesGstSettings>) => {
    setFormData((prev) => ({
      ...prev,
      taxesGstSettings: {
        ...(prev.taxesGstSettings || DEFAULT_BUSINESS_SETTINGS.taxesGstSettings!),
        ...patch,
      },
    }));
  };

  // Messages Updater
  const updateMessages = (patch: Partial<TransactionMessagesSettings>) => {
    setFormData((prev) => ({
      ...prev,
      transactionMessages: {
        ...(prev.transactionMessages || DEFAULT_BUSINESS_SETTINGS.transactionMessages!),
        ...patch,
      },
    }));
  };

  // Logo Handler
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      alert('Logo image should be under 3MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const b64 = event.target?.result as string;
      if (b64) {
        setFormData((prev) => ({
          ...prev,
          logoUrl: b64,
          invoiceCustomization: {
            ...(prev.invoiceCustomization || DEFAULT_BUSINESS_SETTINGS.invoiceCustomization!),
            logoUrl: b64,
            showLogo: true,
          },
        }));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({
      ...prev,
      logoUrl: '',
      invoiceCustomization: {
        ...(prev.invoiceCustomization || DEFAULT_BUSINESS_SETTINGS.invoiceCustomization!),
        logoUrl: '',
      },
    }));
  };

  // Signature Handler
  const handleSigUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Signature image should be under 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const b64 = event.target?.result as string;
      if (b64) {
        updateCustomization({ signatureImageUrl: b64, showSignature: true });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveSig = () => {
    updateCustomization({ signatureImageUrl: '' });
  };

  // GST Lookup
  const handleGstinChange = async (val: string) => {
    const clean = val.toUpperCase().trim();
    let derivedPan = formData.pan;
    if (clean.length >= 12) {
      derivedPan = clean.substring(2, 12);
    }

    setFormData((prev) => ({
      ...prev,
      gstin: clean,
      pan: derivedPan,
    }));

    if (clean.length === 15) {
      setIsVerifyingGST(true);
      try {
        const res = await verifyAndFetchGSTDetails(clean);
        setGstResult(res);
        if (res.isValid) {
          setFormData((prev) => ({
            ...prev,
            gstin: clean,
            pan: res.pan || prev.pan,
            address: res.address || prev.address,
            city: res.city || prev.city,
            state: res.state || prev.state,
            stateCode: res.stateCode || prev.stateCode,
            pincode: res.pincode || prev.pincode,
            firmName: res.tradeName || res.legalName || prev.firmName,
          }));
        }
      } catch (err) {
        console.error('Settings GST lookup error:', err);
      } finally {
        setIsVerifyingGST(false);
      }
    } else {
      setGstResult(null);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSaveSettings(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  // Import Backup Handler
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const success = onImportBackup(content);
        if (success) {
          setImportStatus('Backup restored successfully! Refreshing...');
          setTimeout(() => window.location.reload(), 1200);
        } else {
          setImportStatus('Failed to restore backup. Invalid JSON schema.');
        }
      } catch {
        setImportStatus('Error reading file. Please select a valid JSON backup file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const navItems: Array<{ id: SettingsSection; label: string; icon: React.ElementType }> = [
    { id: 'profile', label: 'Business Profile & GSTIN', icon: Building2 },
    { id: 'print', label: 'Invoice Themes & Print (15)', icon: Printer },
    { id: 'taxes', label: 'Taxes & GST', icon: Percent },
    { id: 'messages', label: 'WhatsApp & Messages', icon: MessageSquare },
    { id: 'backup', label: 'Backup & Reset Data', icon: RefreshCw },
  ];

  return (
    <div className="flex flex-col h-full bg-[#f5f5f7] text-neutral-900 w-full min-h-screen">
      {/* Sleek Top Header Bar */}
      <header className="bg-white/95 backdrop-blur-xl border-b border-neutral-200/80 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-900 flex items-center justify-center font-bold shadow-xs">
            <Building2 className="w-5 h-5 text-neutral-900" />
          </div>
          <div>
            <h1 className="text-base font-bold text-neutral-900 tracking-tight leading-tight">
              Settings
            </h1>
            <p className="text-[11px] text-neutral-500">
              Configure business profile, invoice print themes, GST tax rules & backup
            </p>
          </div>
        </div>

        {/* Clean Horizontal Sub-Menu Switcher */}
        <div className="flex items-center bg-neutral-100 p-1 rounded-2xl border border-neutral-200/60 overflow-x-auto max-w-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isSelected = currentSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSwitchSection(item.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-white text-neutral-900 shadow-xs font-bold'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-neutral-900' : 'text-neutral-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Save Action & Close */}
        <div className="flex items-center space-x-3">
          {saveSuccess && (
            <div className="flex items-center space-x-1.5 text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 text-xs font-semibold animate-fade-in shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Saved Successfully</span>
            </div>
          )}
          {onOpenAppInfo && (
            <button
              type="button"
              onClick={onOpenAppInfo}
              className="flex items-center space-x-1.5 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-200 rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
              title="View Pro.Sale Version, Compliance, and Diagnostics"
            >
              <Info className="w-3.5 h-3.5 text-neutral-600" />
              <span>App Info</span>
            </button>
          )}
          <button
            type="submit"
            onClick={handleSubmit}
            className="flex items-center space-x-1.5 px-5 py-2 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Settings</span>
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
              title="Close Settings"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* Main Full-Width Content Workspace */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full overflow-y-auto space-y-6">
        {/* ========================================================================= */}
        {/* SECTION 1: BUSINESS PROFILE & GSTIN                                       */}
        {/* ========================================================================= */}
        {currentSection === 'profile' && (
          <div className="space-y-6 text-xs animate-fade-in">
            {/* Business Identity */}
            <div className="p-6 bg-white rounded-3xl border border-neutral-200/80 shadow-xs space-y-4">
              <div className="flex items-center space-x-2 pb-2 border-b border-neutral-100">
                <Building2 className="w-5 h-5 text-neutral-900" />
                <div>
                  <h2 className="text-sm font-bold text-neutral-900">Business Identity & Address</h2>
                  <p className="text-[11px] text-neutral-500">
                    Your official company credentials printed on GST Tax Invoices
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Company / Firm Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.firmName}
                    onChange={(e) => setFormData({ ...formData, firmName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    GSTIN on Sale <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={15}
                      value={formData.gstin}
                      onChange={(e) => handleGstinChange(e.target.value)}
                      className="w-full p-2.5 pr-8 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white font-mono uppercase font-bold text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                    />
                    {isVerifyingGST && (
                      <Loader2 className="w-4 h-4 animate-spin text-[#0071e3] absolute right-2.5 top-3" />
                    )}
                    {gstResult?.isValid && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 absolute right-2.5 top-3" />
                    )}
                  </div>
                  {gstResult && (
                    <p
                      className={`text-[10px] mt-1 font-medium ${
                        gstResult.isValid ? 'text-emerald-700' : 'text-red-600'
                      }`}
                    >
                      {gstResult.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">PAN Number</label>
                  <input
                    type="text"
                    maxLength={10}
                    value={formData.pan}
                    onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white font-mono uppercase font-bold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Tagline / Subtitle</label>
                  <input
                    type="text"
                    value={formData.tagline}
                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-semibold text-neutral-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">State</label>
                  <select
                    value={formData.state}
                    onChange={(e) => {
                      const sel = INDIAN_STATES.find((s) => s.name === e.target.value);
                      setFormData({
                        ...formData,
                        state: e.target.value,
                        stateCode: sel ? sel.code : formData.stateCode,
                      });
                    }}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 font-semibold focus:outline-none"
                  >
                    {INDIAN_STATES.map((st) => (
                      <option key={st.code} value={st.name}>
                        {st.name} ({st.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Pincode</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 font-mono focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-semibold text-neutral-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 font-mono focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Bank & UPI Details */}
            <div className="p-6 bg-white rounded-3xl border border-neutral-200/80 shadow-xs space-y-4">
              <div className="flex items-center space-x-2 pb-2 border-b border-neutral-100">
                <CreditCard className="w-5 h-5 text-neutral-900" />
                <div>
                  <h2 className="text-sm font-bold text-neutral-900">Bank Account & UPI Dynamic QR</h2>
                  <p className="text-[11px] text-neutral-500">
                    Allows customers to scan UPI QR on invoice or transfer directly via NEFT/RTGS
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 font-semibold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Account Number</label>
                  <input
                    type="text"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 font-mono font-bold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">IFSC Code</label>
                  <input
                    type="text"
                    value={formData.ifscCode}
                    onChange={(e) =>
                      setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })
                    }
                    className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 font-mono uppercase font-bold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Branch Name</label>
                  <input
                    type="text"
                    value={formData.branchName}
                    onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-semibold text-neutral-700 mb-1">
                    UPI ID (e.g. shyamjimukhwas@sbi)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.upiId}
                      onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                      className="w-full p-2.5 pl-9 rounded-xl border border-neutral-200 bg-neutral-50 font-mono font-semibold focus:outline-none"
                    />
                    <QrCode className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-1">
                    Dynamic QR code generated on printed invoices automatically encodes the balance amount for instant customer scanning.
                  </p>
                </div>
              </div>
            </div>

            {/* Invoicing Preferences & Terms */}
            <div className="p-6 bg-white rounded-3xl border border-neutral-200/80 shadow-xs space-y-4">
              <div className="flex items-center space-x-2 pb-2 border-b border-neutral-100">
                <FileText className="w-5 h-5 text-neutral-900" />
                <div>
                  <h2 className="text-sm font-bold text-neutral-900">Invoice Numbering & Terms</h2>
                  <p className="text-[11px] text-neutral-500">
                    Series prefix and standard business conditions
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Invoice Prefix</label>
                  <input
                    type="text"
                    value={formData.invoicePrefix}
                    onChange={(e) => setFormData({ ...formData, invoicePrefix: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 font-mono font-bold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Next Invoice Number
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.nextInvoiceNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, nextInvoiceNumber: Number(e.target.value) })
                    }
                    className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 font-mono font-bold focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Terms & Conditions
                  </label>
                  <textarea
                    rows={3}
                    value={formData.termsAndConditions}
                    onChange={(e) =>
                      setFormData({ ...formData, termsAndConditions: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-xs focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 2: INVOICE THEMES & PRINT SETUP                                   */}
        {/* ========================================================================= */}
        {currentSection === 'print' && (
          <div className="space-y-6 text-xs animate-fade-in">
            {/* Top Themes Gallery (All 15 Themes) */}
            <div className="p-6 bg-white rounded-3xl border border-neutral-200/80 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-neutral-100">
                <div className="flex items-center space-x-2">
                  <LayoutTemplate className="w-5 h-5 text-neutral-900" />
                  <div>
                    <h2 className="text-sm font-bold text-neutral-900">
                      Invoice Themes (15 Ready-to-Print Templates)
                    </h2>
                    <p className="text-[11px] text-neutral-500">
                      Select official GST layout for A4 print and thermal desk slips
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-neutral-700 bg-neutral-100 px-3 py-1 rounded-full">
                  Active: {INVOICE_THEMES.find((t) => t.id === customization.template)?.name || customization.template}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {INVOICE_THEMES.map((t) => {
                  const isSelected = customization.template === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => updateCustomization({ template: t.id })}
                      className={`p-3 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                        isSelected
                          ? 'border-black bg-neutral-50 shadow-apple-card ring-2 ring-black/10'
                          : 'border-neutral-200 hover:border-neutral-300 bg-white'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-black text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      )}

                      <div className="h-14 rounded-xl border border-neutral-200 p-1.5 flex flex-col justify-between mb-2 bg-neutral-50/70">
                        <div className="flex justify-between items-center pb-0.5">
                          <div
                            className="w-8 h-1.5 rounded"
                            style={{ backgroundColor: t.accent || '#000' }}
                          />
                          <div className="w-4 h-1 bg-neutral-300 rounded" />
                        </div>
                        <div className="space-y-0.5">
                          <div className="w-full h-1 bg-neutral-200 rounded-xs" />
                          <div className="w-3/4 h-1 bg-neutral-100 rounded-xs" />
                        </div>
                        <div className="flex justify-end">
                          <div className="w-6 h-1 bg-neutral-400 rounded" />
                        </div>
                      </div>

                      <div>
                        <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">
                          {t.category}
                        </span>
                        <h4 className="text-xs font-bold text-neutral-900 leading-tight">
                          {t.name}
                        </h4>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Header Toggles & Logo Upload */}
            <div className="p-6 bg-white rounded-3xl border border-neutral-200/80 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between pb-3 border-b border-neutral-100 gap-3">
                <div className="flex items-center space-x-2">
                  <Building2 className="w-5 h-5 text-neutral-900" />
                  <h2 className="text-sm font-bold text-neutral-900">
                    Print Company Info & Header Setup
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-neutral-700">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customization.printCompanyInfo !== false}
                      onChange={(e) => updateCustomization({ printCompanyInfo: e.target.checked })}
                      className="w-4 h-4 rounded text-black accent-black"
                    />
                    <span>Print Company Info / Header</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customization.makeRegularPrinterDefault !== false}
                      onChange={(e) =>
                        updateCustomization({ makeRegularPrinterDefault: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-black accent-black"
                    />
                    <span>Make Regular Printer Default</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customization.printRepeatHeader !== false}
                      onChange={(e) =>
                        updateCustomization({ printRepeatHeader: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-black accent-black"
                    />
                    <span>Print repeat header in all pages</span>
                  </label>
                </div>
              </div>

              {/* Company Logo (Change) Section */}
              <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-3.5">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                  {formData.logoUrl ? (
                    <div className="w-16 h-16 rounded-xl bg-white border border-neutral-200 p-1 flex items-center justify-center shrink-0 shadow-2xs">
                      <img
                        src={formData.logoUrl}
                        alt="Company Logo"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-white border-2 border-dashed border-neutral-300 flex items-center justify-center text-neutral-400">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-neutral-900 text-xs">Company Logo</h4>
                    <p className="text-[11px] text-neutral-500">
                      {formData.logoUrl ? 'Active on printed tax bills' : 'No logo uploaded yet'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="px-4 py-2 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                  >
                    (Change)
                  </button>
                  {formData.logoUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                      title="Remove Logo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Paper, Sizing & Orientation */}
            <div className="p-6 bg-white rounded-3xl border border-neutral-200/80 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-neutral-900 pb-2 border-b border-neutral-100">
                Paper, Sizing & Orientation
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Paper Size</label>
                  <select
                    value={customization.paperSize || 'A4'}
                    onChange={(e) => updateCustomization({ paperSize: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 font-semibold text-xs"
                  >
                    <option value="A4">A4 (Standard)</option>
                    <option value="A5">A5 (Half Page)</option>
                    <option value="THERMAL_80MM">3-inch Thermal (80mm)</option>
                    <option value="THERMAL_58MM">2-inch Thermal (58mm)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Orientation</label>
                  <select
                    value={customization.orientation || 'PORTRAIT'}
                    onChange={(e) => updateCustomization({ orientation: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 font-semibold text-xs"
                  >
                    <option value="PORTRAIT">Portrait</option>
                    <option value="LANDSCAPE">Landscape</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Company Name Text Size
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={customization.companyNameTextSize || 5}
                    onChange={(e) =>
                      updateCustomization({ companyNameTextSize: Number(e.target.value) })
                    }
                    className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 font-mono font-bold text-center"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Invoice Text Size
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={customization.invoiceTextSize || 3}
                    onChange={(e) =>
                      updateCustomization({ invoiceTextSize: Number(e.target.value) })
                    }
                    className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 font-mono font-bold text-center"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Extra space on Top of PDF
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={customization.extraSpaceOnTopOfPdf !== undefined ? customization.extraSpaceOnTopOfPdf : 1}
                    onChange={(e) =>
                      updateCustomization({ extraSpaceOnTopOfPdf: Number(e.target.value) })
                    }
                    className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 font-mono font-bold text-center"
                  />
                </div>
              </div>
            </div>

            {/* Copies Setup */}
            <div className="p-6 bg-white rounded-3xl border border-neutral-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                <h2 className="text-sm font-bold text-neutral-900">Print Original/Duplicate Copies</h2>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customization.printOriginalDuplicate !== false}
                    onChange={(e) =>
                      updateCustomization({ printOriginalDuplicate: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-black accent-black"
                  />
                  <span className="font-semibold text-neutral-700">Enable Copies Header</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Choose default no. of copies
                  </label>
                  <select
                    value={customization.defaultCopies || 1}
                    onChange={(e) => updateCustomization({ defaultCopies: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 font-bold"
                  >
                    <option value={1}>1 Copy (Original)</option>
                    <option value={2}>2 Copies (Original + Duplicate)</option>
                    <option value={3}>3 Copies (Triplicate)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Original Title</label>
                  <input
                    type="text"
                    value={customization.originalTitle || 'ORIGINAL FOR RECIPIENT'}
                    onChange={(e) => updateCustomization({ originalTitle: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 uppercase font-semibold text-[11px]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Duplicate Title</label>
                  <input
                    type="text"
                    value={customization.duplicateTitle || 'DUPLICATE FOR TRANSPORTER'}
                    onChange={(e) => updateCustomization({ duplicateTitle: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 uppercase font-semibold text-[11px]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Triplicate Title</label>
                  <input
                    type="text"
                    value={customization.triplicateTitle || 'TRIPLICATE FOR SUPPLIER'}
                    onChange={(e) => updateCustomization({ triplicateTitle: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 uppercase font-semibold text-[11px]"
                  />
                </div>
              </div>
            </div>

            {/* Item Table & Totals/Taxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Item Table Box */}
              <div className="p-6 bg-white rounded-3xl border border-neutral-200/80 shadow-xs space-y-3.5">
                <h2 className="text-sm font-bold text-neutral-900 pb-2 border-b border-neutral-100">
                  Item Table Customization
                </h2>

                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customization.expandTableToWholePage !== false}
                    onChange={(e) =>
                      updateCustomization({ expandTableToWholePage: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-black accent-black"
                  />
                  <span className="font-semibold text-neutral-800">
                    Expand table to print on whole page
                  </span>
                </label>

                <div className="flex items-center justify-between pt-1">
                  <span className="font-semibold text-neutral-700">
                    Min No. of Rows in Item Table
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={25}
                    value={customization.minItemRows !== undefined ? customization.minItemRows : 0}
                    onChange={(e) => updateCustomization({ minItemRows: Number(e.target.value) })}
                    className="w-20 p-2 rounded-xl border border-neutral-200 bg-neutral-50 font-mono font-bold text-center"
                  />
                </div>

                <div className="pt-2 border-t border-neutral-100 space-y-2">
                  <span className="font-bold text-neutral-900 block">Item Table Columns</span>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={customization.showHsn}
                        onChange={(e) => updateCustomization({ showHsn: e.target.checked })}
                        className="w-3.5 h-3.5 rounded text-black accent-black"
                      />
                      <span className="text-neutral-700">HSN/SAC Code</span>
                    </label>

                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={customization.showUnit}
                        onChange={(e) => updateCustomization({ showUnit: e.target.checked })}
                        className="w-3.5 h-3.5 rounded text-black accent-black"
                      />
                      <span className="text-neutral-700">Unit of Measure</span>
                    </label>

                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={customization.showDiscount}
                        onChange={(e) => updateCustomization({ showDiscount: e.target.checked })}
                        className="w-3.5 h-3.5 rounded text-black accent-black"
                      />
                      <span className="text-neutral-700">Discount Amount</span>
                    </label>

                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={customization.showTaxBreakdown}
                        onChange={(e) =>
                          updateCustomization({ showTaxBreakdown: e.target.checked })
                        }
                        className="w-3.5 h-3.5 rounded text-black accent-black"
                      />
                      <span className="text-neutral-700">Tax Breakdown</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Totals & Taxes Box */}
              <div className="p-6 bg-white rounded-3xl border border-neutral-200/80 shadow-xs space-y-3">
                <h2 className="text-sm font-bold text-neutral-900 pb-2 border-b border-neutral-100">
                  Totals & Taxes
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customization.showTotalItemQty !== false}
                      onChange={(e) => updateCustomization({ showTotalItemQty: e.target.checked })}
                      className="w-4 h-4 rounded text-black accent-black"
                    />
                    <span className="text-neutral-700">Total Item Quantity</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customization.showAmountWithDecimal !== false}
                      onChange={(e) =>
                        updateCustomization({ showAmountWithDecimal: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-black accent-black"
                    />
                    <span className="text-neutral-700">Amount with Decimal</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customization.showReceivedAmount !== false}
                      onChange={(e) =>
                        updateCustomization({ showReceivedAmount: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-black accent-black"
                    />
                    <span className="text-neutral-700">Received Amount</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customization.showBalanceAmount !== false}
                      onChange={(e) =>
                        updateCustomization({ showBalanceAmount: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-black accent-black"
                    />
                    <span className="text-neutral-700">Balance Amount</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customization.showCurrentBalanceParty !== false}
                      onChange={(e) =>
                        updateCustomization({ showCurrentBalanceParty: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-black accent-black"
                    />
                    <span className="text-neutral-700">Current Balance of Party</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customization.showTaxDetails !== false}
                      onChange={(e) => updateCustomization({ showTaxDetails: e.target.checked })}
                      className="w-4 h-4 rounded text-black accent-black"
                    />
                    <span className="text-neutral-700">Tax Details</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customization.showYouSaved !== false}
                      onChange={(e) => updateCustomization({ showYouSaved: e.target.checked })}
                      className="w-4 h-4 rounded text-black accent-black"
                    />
                    <span className="text-neutral-700">You Saved</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customization.printAmountWithGrouping !== false}
                      onChange={(e) =>
                        updateCustomization({ printAmountWithGrouping: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-black accent-black"
                    />
                    <span className="text-neutral-700">Print Amount with Grouping</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={customization.amountInWords !== false}
                      onChange={(e) => updateCustomization({ amountInWords: e.target.checked })}
                      className="w-4 h-4 rounded text-black accent-black"
                    />
                    <span className="text-neutral-700">Amount in Words</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer & Signatures */}
            <div className="p-6 bg-white rounded-3xl border border-neutral-200/80 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-neutral-900 pb-2 border-b border-neutral-100">
                Footer & Signatures
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customization.printDescription !== false}
                    onChange={(e) => updateCustomization({ printDescription: e.target.checked })}
                    className="w-4 h-4 rounded text-black accent-black"
                  />
                  <span className="text-neutral-700">Print Description</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customization.printTerms !== false}
                    onChange={(e) => updateCustomization({ printTerms: e.target.checked })}
                    className="w-4 h-4 rounded text-black accent-black"
                  />
                  <span className="text-neutral-700">Print Terms and Conditions</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customization.printReceivedBy !== false}
                    onChange={(e) => updateCustomization({ printReceivedBy: e.target.checked })}
                    className="w-4 h-4 rounded text-black accent-black"
                  />
                  <span className="text-neutral-700">Print Received by details</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customization.printDeliveredBy !== false}
                    onChange={(e) => updateCustomization({ printDeliveredBy: e.target.checked })}
                    className="w-4 h-4 rounded text-black accent-black"
                  />
                  <span className="text-neutral-700">Print Delivered by details</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customization.printPaymentMode !== false}
                    onChange={(e) => updateCustomization({ printPaymentMode: e.target.checked })}
                    className="w-4 h-4 rounded text-black accent-black"
                  />
                  <span className="text-neutral-700">Payment Mode</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customization.printAcknowledgement !== false}
                    onChange={(e) =>
                      updateCustomization({ printAcknowledgement: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-black accent-black"
                  />
                  <span className="text-neutral-700">Print Acknowledgement</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customization.showQrCode}
                    onChange={(e) => updateCustomization({ showQrCode: e.target.checked })}
                    className="w-4 h-4 rounded text-black accent-black"
                  />
                  <span className="text-neutral-700">UPI Dynamic QR Code</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customization.showBankDetails}
                    onChange={(e) => updateCustomization({ showBankDetails: e.target.checked })}
                    className="w-4 h-4 rounded text-black accent-black"
                  />
                  <span className="text-neutral-700">Bank Account Details</span>
                </label>
              </div>

              {/* Signature Text & Device Signature Upload */}
              <div className="pt-4 border-t border-neutral-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Print Signature Text
                  </label>
                  <input
                    type="text"
                    value={customization.signatureText || 'Authorized Signatory'}
                    onChange={(e) => updateCustomization({ signatureText: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Change Signature (Image / Stamp)
                  </label>
                  <input
                    ref={sigInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleSigUpload}
                  />
                  <div className="flex items-center space-x-3">
                    {customization.signatureImageUrl ? (
                      <div className="h-10 px-3 bg-neutral-100 rounded-xl flex items-center border border-neutral-200">
                        <img
                          src={customization.signatureImageUrl}
                          alt="Signature"
                          className="h-8 w-auto object-contain"
                        />
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => sigInputRef.current?.click()}
                      className="px-4 py-2 bg-neutral-900 hover:bg-black text-white rounded-xl font-semibold transition-all cursor-pointer shadow-2xs"
                    >
                      Change Signature
                    </button>
                    {customization.signatureImageUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveSig}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-xl"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 3: TAXES & GST                                                    */}
        {/* ========================================================================= */}
        {currentSection === 'taxes' && (
          <div className="max-w-4xl space-y-6 text-xs animate-fade-in">
            <div className="p-6 bg-white rounded-3xl border border-neutral-200/80 shadow-xs space-y-4">
              <div className="flex items-center space-x-2 pb-2 border-b border-neutral-100">
                <Percent className="w-5 h-5 text-neutral-900" />
                <div>
                  <h2 className="text-sm font-bold text-neutral-900">GST Registration & Tax Slabs</h2>
                  <p className="text-[11px] text-neutral-500">
                    Set default GST tax rules, composition scheme, and e-way billing thresholds
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex items-center space-x-2.5 cursor-pointer p-3.5 rounded-2xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100/60 transition-colors">
                  <input
                    type="checkbox"
                    checked={taxes.gstRegistered}
                    onChange={(e) => updateTaxes({ gstRegistered: e.target.checked })}
                    className="w-4 h-4 rounded text-black accent-black"
                  />
                  <div>
                    <span className="font-bold text-neutral-900 block">GST Registered Business</span>
                    <span className="text-[11px] text-neutral-500">
                      Enable GST tax breakdown (CGST, SGST, IGST) and tax input credits
                    </span>
                  </div>
                </label>

                <label className="flex items-center space-x-2.5 cursor-pointer p-3.5 rounded-2xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100/60 transition-colors">
                  <input
                    type="checkbox"
                    checked={taxes.compositionScheme}
                    onChange={(e) => updateTaxes({ compositionScheme: e.target.checked })}
                    className="w-4 h-4 rounded text-black accent-black"
                  />
                  <div>
                    <span className="font-bold text-neutral-900 block">Composite Scheme</span>
                    <span className="text-[11px] text-neutral-500">
                      Print 'Bill of Supply' with flat composition tax rate
                    </span>
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Default GST Rate
                  </label>
                  <select
                    value={taxes.defaultTaxRate}
                    onChange={(e) => updateTaxes({ defaultTaxRate: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 font-bold"
                  >
                    <option value={0}>0% (Tax Exempt)</option>
                    <option value={5}>5% GST</option>
                    <option value={12}>12% GST</option>
                    <option value={18}>18% GST (Standard)</option>
                    <option value={28}>28% GST</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    E-Way Bill Mandatory Threshold (₹)
                  </label>
                  <input
                    type="number"
                    value={taxes.ewayBillThreshold}
                    onChange={(e) => updateTaxes({ ewayBillThreshold: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Reverse Charge (RCM)
                  </label>
                  <select
                    value={taxes.rcmEnabled ? 'YES' : 'NO'}
                    onChange={(e) => updateTaxes({ rcmEnabled: e.target.value === 'YES' })}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 font-bold"
                  >
                    <option value="NO">Disabled</option>
                    <option value="YES">Enabled (Section 9(3))</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 4: WHATSAPP & MESSAGES                                            */}
        {/* ========================================================================= */}
        {currentSection === 'messages' && (
          <div className="max-w-4xl space-y-6 text-xs animate-fade-in">
            <div className="p-6 bg-white rounded-3xl border border-neutral-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-5 h-5 text-neutral-900" />
                  <div>
                    <h2 className="text-sm font-bold text-neutral-900">
                      WhatsApp & SMS Templates
                    </h2>
                    <p className="text-[11px] text-neutral-500">
                      Auto-compose WhatsApp bills and payment reminders directly to customers
                    </p>
                  </div>
                </div>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={msgs.autoSendWhatsApp}
                    onChange={(e) => updateMessages({ autoSendWhatsApp: e.target.checked })}
                    className="w-4 h-4 rounded text-black accent-black"
                  />
                  <span className="font-bold text-neutral-800">Auto-prompt WhatsApp</span>
                </label>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Tax Invoice WhatsApp Message
                </label>
                <textarea
                  rows={3}
                  value={msgs.invoiceWhatsApp}
                  onChange={(e) => updateMessages({ invoiceWhatsApp: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 leading-relaxed font-mono text-[11px]"
                />
                <p className="text-[10px] text-neutral-400 mt-1">
                  Variables: {'{party_name}'}, {'{invoice_no}'}, {'{amount}'}, {'{due_date}'}
                </p>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Payment Due Reminder Message
                </label>
                <textarea
                  rows={3}
                  value={msgs.paymentReminder}
                  onChange={(e) => updateMessages({ paymentReminder: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 leading-relaxed font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Delivery Challan Dispatch Message
                </label>
                <textarea
                  rows={2}
                  value={msgs.challanMessage}
                  onChange={(e) => updateMessages({ challanMessage: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 leading-relaxed font-mono text-[11px]"
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 5: BACKUP & RESET DATA                                            */}
        {/* ========================================================================= */}
        {currentSection === 'backup' && (
          <div className="max-w-4xl space-y-6 text-xs animate-fade-in">
            {/* Export & Restore */}
            <div className="p-6 bg-white rounded-3xl border border-neutral-200/80 shadow-xs space-y-4">
              <div className="flex items-center space-x-2 pb-2 border-b border-neutral-100">
                <RefreshCw className="w-5 h-5 text-neutral-900" />
                <div>
                  <h2 className="text-sm font-bold text-neutral-900">Backup & Restore</h2>
                  <p className="text-[11px] text-neutral-500">
                    Export your complete database or restore from a previously saved JSON file
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-bold text-neutral-900 text-xs">Export Backup</h3>
                    <p className="text-[11px] text-neutral-500 mt-1">
                      Download a full JSON copy of all invoices, parties, items, and settings to your computer.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onExportBackup}
                    className="flex items-center justify-center space-x-2 py-2.5 px-4 bg-neutral-900 hover:bg-black text-white rounded-xl font-bold text-xs shadow-2xs transition-all active:scale-95 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download JSON Backup</span>
                  </button>
                </div>

                <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-bold text-neutral-900 text-xs">Restore Backup</h3>
                    <p className="text-[11px] text-neutral-500 mt-1">
                      Select a backup JSON file to restore all bills, party records, and catalog data.
                    </p>
                  </div>
                  <input
                    ref={importFileRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleFileImport}
                  />
                  <button
                    type="button"
                    onClick={() => importFileRef.current?.click()}
                    className="flex items-center justify-center space-x-2 py-2.5 px-4 bg-white hover:bg-neutral-100 text-neutral-900 border border-neutral-300 rounded-xl font-bold text-xs shadow-2xs transition-all active:scale-95 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Choose Backup File...</span>
                  </button>
                </div>
              </div>

              {importStatus && (
                <div className="p-3 bg-neutral-100 text-neutral-800 rounded-xl font-mono text-[11px]">
                  {importStatus}
                </div>
              )}
            </div>

            {/* Application Updates Card */}
            <div className="p-6 bg-white rounded-3xl border border-neutral-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-neutral-900" />
                  <div>
                    <h2 className="text-sm font-bold text-neutral-900">Application Updates</h2>
                    <p className="text-[11px] text-neutral-500">
                      Check for official PROSALE production updates distributed via GitHub Releases
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold font-mono bg-neutral-100 text-neutral-800 border border-neutral-200">
                  v{updateService.CURRENT_VERSION}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-neutral-50 border border-neutral-200">
                <div>
                  <p className="text-xs font-bold text-neutral-900">
                    Installed Version: <span className="font-mono text-neutral-700">v{updateService.CURRENT_VERSION} (Build {updateService.CURRENT_VERSION_CODE})</span>
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    {updateStatusMessage || 'Updates are manual and will never alter your local business records.'}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  {availableUpdate && (
                    <button
                      type="button"
                      onClick={() => onOpenUpdateModal && onOpenUpdateModal(availableUpdate)}
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-2xs transition-all active:scale-95 cursor-pointer flex items-center space-x-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>View Update</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleCheckForUpdates}
                    disabled={isCheckingUpdate}
                    className="px-4 py-2 bg-neutral-900 hover:bg-black text-white rounded-xl font-bold text-xs shadow-2xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center space-x-2"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                    <span>{isCheckingUpdate ? 'Checking...' : 'Check for Updates'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Danger Zone: Reset / Clear All Demo Data */}
            {onClearAllData && (
              <div className="p-6 bg-red-50/50 rounded-3xl border border-red-200/80 shadow-2xs space-y-3">
                <div className="flex items-center space-x-2">
                  <ShieldAlert className="w-5 h-5 text-red-600" />
                  <h2 className="text-sm font-bold text-red-900">Danger Zone: Reset Application Data</h2>
                </div>
                <p className="text-[11px] text-red-700">
                  Wipe all transactions, customer ledgers, and inventory items to start afresh. Your company profile and invoice template customization will be preserved.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onClearAllData}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs transition-all cursor-pointer shadow-2xs active:scale-95"
                  >
                    Clear All Data
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
