import React, { useState } from 'react';
import { Crown, Sparkles, Check, X, ArrowRight, ShieldCheck } from 'lucide-react';
import { licenseService } from '../../services/license';

interface UpgradeToGoldModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
  featureDescription?: string;
  onSuccess?: () => void;
}

export const UpgradeToGoldModal: React.FC<UpgradeToGoldModalProps> = ({
  isOpen,
  onClose,
  featureName,
  featureDescription,
  onSuccess,
}) => {
  const [licenseKey, setLicenseKey] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const res = licenseService.activateLicense(licenseKey);
    if (res.success) {
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setLicenseKey('');
        if (onSuccess) onSuccess();
        onClose();
      }, 1200);
    } else {
      setErrorMsg(res.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-neutral-200/80 overflow-hidden text-neutral-900">
        {/* Top Accent Ribbon */}
        <div className="h-1.5 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-900 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 sm:p-7 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-xs">
              <Crown className="w-7 h-7" />
            </div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Gold Edition Feature</span>
            </div>
            <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
              {featureName} is locked in Silver
            </h2>
            <p className="text-xs text-neutral-500 max-w-md mx-auto leading-relaxed">
              {featureDescription ||
                `${featureName} is available exclusively in Pro.Sale Gold (₹2,999 Lifetime Edition) with complete statutory compliance and advanced automation.`}
            </p>
          </div>

          {/* Gold Benefits Grid */}
          <div className="bg-amber-50/30 p-4 rounded-2xl border border-amber-200 space-y-2.5">
            <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
              Included with Gold Lifetime (₹2,999):
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs text-neutral-800">
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Barcode Scan & Print</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-amber-600 shrink-0" />
                <span>All 11 CBIC GST Reports</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Item & Client Profitability</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-amber-600 shrink-0" />
                <span>E-Way & E-Invoice JSON</span>
              </div>
            </div>
          </div>

          {/* License Key Activation Form */}
          <form onSubmit={handleActivate} className="space-y-3">
            <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider">
              Enter Gold License Key:
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder="Enter license key..."
                className="flex-1 h-10 px-3.5 bg-neutral-50 rounded-xl border border-neutral-200 text-xs font-mono uppercase text-neutral-900 placeholder-neutral-400 focus:outline-none focus:bg-white focus:border-black transition-all"
              />
              <button
                type="submit"
                className="h-10 px-5 rounded-xl bg-black hover:bg-neutral-800 text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer flex items-center space-x-1.5"
              >
                <span>Unlock</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {errorMsg && <p className="text-xs text-rose-600 font-medium">{errorMsg}</p>}
            {isSuccess && (
              <p className="text-xs text-emerald-600 font-bold flex items-center space-x-1">
                <ShieldCheck className="w-4 h-4" />
                <span>Gold Edition Unlocked! Refreshing...</span>
              </p>
            )}
          </form>

          {/* Footer Note */}
          <div className="pt-2 text-center border-t border-neutral-200">
            <p className="text-[11px] text-neutral-500">
              One-time payment • Lifetime license on this device • Zero recurring fees
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
