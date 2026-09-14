import React, { useState, useEffect } from 'react';
import { Crown, Sparkles, Check, Clock, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { licenseService, LicenseState } from '../../services/license';

interface PlansPricingViewProps {
  onRestartOnboarding?: () => void;
  onGoToBackup?: () => void;
  onGoToDashboard?: () => void;
}

export const PlansPricingView: React.FC<PlansPricingViewProps> = ({
  onRestartOnboarding,
  onGoToBackup,
  onGoToDashboard,
}) => {
  const [licenseState, setLicenseState] = useState<LicenseState>(licenseService.getLicenseState());
  const [inputKey, setInputKey] = useState('');
  const [keyMessage, setKeyMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    const handleLicenseUpdate = (e: any) => {
      if (e.detail?.state) {
        setLicenseState(e.detail.state);
      } else {
        setLicenseState(licenseService.getLicenseState());
      }
    };

    window.addEventListener('prosale_license_updated', handleLicenseUpdate);
    return () => window.removeEventListener('prosale_license_updated', handleLicenseUpdate);
  }, []);

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    setKeyMessage(null);

    const res = licenseService.activateLicense(inputKey);
    if (res.success) {
      try {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      } catch {}
      setKeyMessage({ type: 'success', text: res.message });
      setInputKey('');
    } else {
      setKeyMessage({ type: 'error', text: res.message });
    }
  };

  const handlePlanCardClick = (plan: 'silver' | 'gold') => {
    if (inputKey.trim()) {
      const val = licenseService.validateLicenseKey(inputKey);
      if (val.valid && val.tier === plan) {
        const res = licenseService.activateLicense(inputKey);
        if (res.success) {
          try {
            confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
          } catch {}
          setKeyMessage({ type: 'success', text: res.message });
          setInputKey('');
        } else {
          setKeyMessage({ type: 'error', text: res.message });
        }
        return;
      }
    }

    const inputEl = document.getElementById('pricing-license-input') as HTMLInputElement | null;
    if (inputEl) {
      inputEl.focus();
      inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setKeyMessage({
      type: 'error',
      text: `To activate ${plan === 'gold' ? 'Gold' : 'Silver'} Edition, please enter your authentic ${plan.toUpperCase()} license key above.`,
    });
  };

  const isGold = licenseState.plan === 'gold';
  const isSilver = licenseState.plan === 'silver';
  const isTrial = licenseState.plan === 'trial';

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-6 sm:space-y-8 font-sans">
      {/* Top Status Card */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 sm:p-8 shadow-xs text-center space-y-4">
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-xs ${
            isGold
              ? 'bg-amber-50 text-amber-600 border border-amber-200'
              : isSilver
              ? 'bg-neutral-100 text-neutral-800 border border-neutral-200'
              : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
          }`}
        >
          {isGold ? (
            <Crown className="w-7 h-7" />
          ) : isSilver ? (
            <ShieldCheck className="w-7 h-7" />
          ) : (
            <Clock className="w-7 h-7" />
          )}
        </div>

        <div>
          <span
            className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
              isGold
                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                : isSilver
                ? 'bg-neutral-100 text-neutral-800 border border-neutral-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            {isGold
              ? 'Enterprise Gold License Active'
              : isSilver
              ? 'Silver Edition Active'
              : `6-Day Trial Active • ${licenseState.trialDaysRemaining} Days Left`}
          </span>
          <h2 className="text-2xl font-bold text-neutral-900 mt-3">
            {isGold
              ? 'Pro.Sale Gold Desktop Edition'
              : isSilver
              ? 'Pro.Sale Silver Edition'
              : 'Pro.Sale Evaluation Trial'}
          </h2>
          <p className="text-xs text-neutral-500 max-w-lg mx-auto mt-1 leading-relaxed">
            {isGold
              ? 'Your installation is completely unlocked with full lifetime access. No subscription fees, no internet connection required for billing, and 100% offline data privacy.'
              : isSilver
              ? 'Your installation is operating under the Silver tier (₹1,999). Barcode scanning and advanced CBIC GST filing reports are locked.'
              : `You are currently in a 6-day evaluation trial with complete unrestricted access. Enter a license key or upgrade below to ensure lifetime continuity.`}
          </p>
        </div>

        {/* 3 Metric Diagnostics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-2 text-left max-w-2xl mx-auto">
          <div className="p-3.5 sm:p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80">
            <p className="text-[11px] text-neutral-500 font-medium">License Status</p>
            <p className="text-sm font-bold text-neutral-900 mt-1">
              {isTrial ? `${licenseState.trialDaysRemaining} Days Remaining` : 'Lifetime Valid'}
            </p>
          </div>
          <div className="p-3.5 sm:p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80">
            <p className="text-[11px] text-neutral-500 font-medium">GST & Compliance</p>
            <p className="text-sm font-bold text-neutral-900 mt-1">
              {isSilver ? 'Standard Invoicing' : 'All 11 Reports (CBIC 2026)'}
            </p>
          </div>
          <div className="p-3.5 sm:p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80">
            <p className="text-[11px] text-neutral-500 font-medium">Local Database</p>
            <p className="text-sm font-bold text-neutral-900 mt-1">100% Offline / Local</p>
          </div>
        </div>

        {/* Quick Nav Actions */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          {onGoToDashboard && (
            <button
              onClick={onGoToDashboard}
              className="px-5 py-2.5 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-xs cursor-pointer shadow-xs transition-all"
            >
              Go to Dashboard
            </button>
          )}
          {onGoToBackup && (
            <button
              onClick={onGoToBackup}
              className="px-5 py-2.5 rounded-xl bg-neutral-100 text-neutral-800 hover:bg-neutral-200 border border-neutral-200 font-semibold text-xs cursor-pointer transition-all"
            >
              Backup & Security
            </button>
          )}
          {onRestartOnboarding && (
            <button
              onClick={onRestartOnboarding}
              className="px-4 py-2.5 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-700 hover:text-neutral-900 font-semibold text-xs cursor-pointer hover:bg-neutral-200 transition-all flex items-center space-x-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restart Setup / Tour</span>
            </button>
          )}
        </div>
      </div>

      {/* License Key Activation Card */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            <h3 className="text-sm font-bold text-neutral-900">Activate or Upgrade License Key</h3>
            <p className="text-xs text-neutral-500">
              Enter your official license key to instantly unlock Gold or Silver edition.
            </p>
          </div>
          {licenseState.isActivated && (
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg self-start sm:self-auto flex items-center space-x-1">
              <span>● Lifetime Activated</span>
            </span>
          )}
        </div>

        <form onSubmit={handleActivate} className="flex flex-col sm:flex-row items-stretch gap-2.5 pt-1">
          <input
            id="pricing-license-input"
            type="text"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            placeholder="Enter license key..."
            className="flex-1 h-11 px-4 bg-neutral-50 rounded-xl border border-neutral-200 text-xs font-mono uppercase text-neutral-900 placeholder-neutral-400 focus:outline-none focus:bg-white focus:border-black transition-all"
          />
          <button
            type="submit"
            className="h-11 px-6 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-xs shadow-xs transition-all active:scale-98 cursor-pointer flex items-center justify-center space-x-1.5 whitespace-nowrap"
          >
            <span>Activate Key</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {keyMessage && (
          <p
            className={`text-xs font-medium ${
              keyMessage.type === 'success' ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {keyMessage.text}
          </p>
        )}
      </div>

      {/* Side-by-Side Plan Matrix */}
      <div>
        <div className="text-center space-y-1 mb-6">
          <h3 className="text-xl font-bold text-neutral-900">Package Comparison & Licensing</h3>
          <p className="text-xs text-neutral-500">
            One-time lifetime payment • Unlimited local database bills • No monthly subscriptions
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Silver Card */}
          <div
            className={`p-6 sm:p-8 rounded-3xl border transition-all flex flex-col justify-between space-y-6 ${
              isSilver
                ? 'bg-neutral-50/70 border-2 border-black shadow-md'
                : 'bg-white border-neutral-200 hover:border-neutral-300 shadow-xs'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                  Essential POS
                </span>
                {isSilver && (
                  <span className="px-2.5 py-0.5 rounded-full bg-black text-white text-[10px] font-bold uppercase tracking-wider">
                    Current Active
                  </span>
                )}
              </div>
              <h4 className="text-xl font-bold text-neutral-900">Silver Edition</h4>
              <div className="text-3xl font-black text-neutral-900 font-mono">
                ₹1,999 <span className="text-xs font-normal text-neutral-500 font-sans">/ Lifetime (1 PC)</span>
              </div>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Tailored for small retail and quick billing setups not requiring barcode scanners or statutory GST filing reports.
              </p>

              <div className="pt-4 space-y-2.5 text-xs">
                <div className="flex items-center space-x-2 text-neutral-700">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Unlimited Sales & Purchase Bills</span>
                </div>
                <div className="flex items-center space-x-2 text-neutral-700">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Direct Local PDF Bill Download</span>
                </div>
                <div className="flex items-center space-x-2 text-neutral-700">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Customer & Supplier Ledger Statements</span>
                </div>
                <div className="flex items-center space-x-2 text-neutral-700">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Cash & Bank Register</span>
                </div>
                <div className="flex items-center space-x-2 text-neutral-400 line-through">
                  <span className="w-4 h-4 flex items-center justify-center font-bold text-neutral-400 shrink-0">✕</span>
                  <span>Barcode Scanner & Generator (Locked in Silver)</span>
                </div>
                <div className="flex items-center space-x-2 text-neutral-400 line-through">
                  <span className="w-4 h-4 flex items-center justify-center font-bold text-neutral-400 shrink-0">✕</span>
                  <span>CBIC GST Reports: GSTR-1, 3B, 9 (Locked in Silver)</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handlePlanCardClick('silver')}
              disabled={isSilver}
              className={`w-full h-11 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                isSilver
                  ? 'bg-neutral-200 text-neutral-500 cursor-default'
                  : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-200 shadow-xs'
              }`}
            >
              {isSilver ? 'Active Plan' : 'Select Silver Edition (₹1,999)'}
            </button>
          </div>

          {/* Gold Card */}
          <div
            className={`p-6 sm:p-8 rounded-3xl border-2 transition-all relative flex flex-col justify-between space-y-6 ${
              isGold
                ? 'bg-amber-50/40 border-amber-500 shadow-md ring-2 ring-amber-400/30'
                : 'bg-amber-50/20 border-amber-300 shadow-xs hover:border-amber-400'
            }`}
          >
            <div className="absolute -top-3.5 right-6 px-3.5 py-1 rounded-full bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider shadow-xs flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Full Access</span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                  Full Enterprise OS
                </span>
                {isGold && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider">
                    Current Active
                  </span>
                )}
              </div>
              <h4 className="text-xl font-bold text-neutral-900 flex items-center space-x-2">
                <span>Gold Edition</span>
                <Crown className="w-5 h-5 text-amber-500" />
              </h4>
              <div className="text-3xl font-black text-neutral-900 font-mono">
                ₹2,999 <span className="text-xs font-normal text-neutral-500 font-sans">/ Lifetime (1 PC)</span>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Complete, fully unlocked enterprise edition with all statutory CBIC GST compliance, barcode scanner, and profit intelligence.
              </p>

              <div className="pt-4 space-y-2.5 text-xs">
                <div className="flex items-center space-x-2 text-neutral-800">
                  <Check className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Everything in Silver Edition</span>
                </div>
                <div className="flex items-center space-x-2 font-semibold text-neutral-900">
                  <Check className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Barcode Label Generator & Laser/Camera Scanner</span>
                </div>
                <div className="flex items-center space-x-2 font-semibold text-neutral-900">
                  <Check className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>All 11 CBIC GST Reports (GSTR-1, 3B, 9, HSN)</span>
                </div>
                <div className="flex items-center space-x-2 font-semibold text-neutral-900">
                  <Check className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Client-wise, Item-wise & Bill-wise Profit Tracking</span>
                </div>
                <div className="flex items-center space-x-2 text-neutral-800">
                  <Check className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>E-Way Bill & E-Invoice NIC JSON Generation</span>
                </div>
                <div className="flex items-center space-x-2 text-neutral-800">
                  <Check className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Automated Daily Local Backup & Multi-firm</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handlePlanCardClick('gold')}
              disabled={isGold}
              className={`w-full h-11 rounded-xl font-extrabold text-xs transition-all shadow-xs active:scale-98 cursor-pointer ${
                isGold
                  ? 'bg-neutral-200 text-neutral-500 cursor-default'
                  : 'bg-black hover:bg-neutral-800 text-white'
              }`}
            >
              {isGold ? 'Active Gold Edition' : 'Activate Gold Edition (₹2,999)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
