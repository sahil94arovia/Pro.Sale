import React, { useState } from 'react';
import { ShieldAlert, ArrowRight, CheckCircle2, Lock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { licenseService } from '../../services/license';

interface TrialExpiredModalProps {
  isOpen: boolean;
  onSuccess?: () => void;
}

export const TrialExpiredModal: React.FC<TrialExpiredModalProps> = ({ isOpen, onSuccess }) => {
  const [licenseKey, setLicenseKey] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isActivating, setIsActivating] = useState(false);

  if (!isOpen) return null;

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!licenseKey.trim()) {
      setErrorMsg('Please enter your official license key.');
      return;
    }

    setIsActivating(true);
    setTimeout(() => {
      const res = licenseService.activateLicense(licenseKey);
      setIsActivating(false);
      if (res.success) {
        try {
          confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
        } catch {}
        if (onSuccess) onSuccess();
      } else {
        setErrorMsg(res.message);
      }
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-neutral-200/80 overflow-hidden text-neutral-900">
        {/* Top Accent Ribbon */}
        <div className="h-1.5 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-600" />

        <div className="p-6 sm:p-8 space-y-6 text-center">
          {/* Lock / Expiry Icon */}
          <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto shadow-xs">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold uppercase tracking-wider">
              <Lock className="w-3.5 h-3.5" />
              <span>6-Day Evaluation Period Expired</span>
            </span>
            <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">
              License Activation Required
            </h2>
            <p className="text-xs text-neutral-500 max-w-md mx-auto leading-relaxed">
              Your 6-day evaluation trial of Pro.Sale has completed. To continue generating bills, managing inventory, and accessing your data, please activate Silver Edition (₹1,999) or Gold Edition (₹2,999) by entering your official license key below.
            </p>
          </div>

          {/* Plan Options Summary */}
          <div className="grid grid-cols-2 gap-3 text-left">
            <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80">
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Silver Edition</p>
              <p className="text-base font-black text-neutral-900 mt-0.5 font-mono">₹1,999</p>
              <p className="text-[11px] text-neutral-500 mt-1">Unlimited tax bills, customer ledgers & PDF downloads.</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-amber-50/40 text-neutral-900 border border-amber-300 shadow-sm">
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Gold Edition</p>
              <p className="text-base font-black text-neutral-900 mt-0.5 font-mono">₹2,999</p>
              <p className="text-[11px] text-neutral-600 mt-1">Complete OS: Barcode scanner, 11 GST reports & profit engine.</p>
            </div>
          </div>

          {/* License Key Activation Form */}
          <form onSubmit={handleActivate} className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row items-stretch gap-2">
              <input
                type="text"
                autoComplete="off"
                spellCheck="false"
                value={licenseKey}
                onChange={(e) => {
                  setLicenseKey(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="ENTER LICENSE KEY"
                className="flex-1 h-11 px-4 bg-neutral-50 rounded-xl border border-neutral-200 text-xs font-mono uppercase text-neutral-900 placeholder-neutral-400 focus:outline-none focus:bg-white focus:border-black transition-all text-center tracking-widest font-bold"
              />
              <button
                type="submit"
                disabled={isActivating}
                className="h-11 px-6 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-xs shadow-xs transition-all active:scale-98 cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-1.5 whitespace-nowrap"
              >
                <span>{isActivating ? 'Activating...' : 'Activate License'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-600 font-semibold">{errorMsg}</p>
            )}
          </form>

          {/* Footer Note */}
          <div className="pt-2 border-t border-neutral-200">
            <p className="text-[11px] text-neutral-500 flex items-center justify-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>All your existing invoices, inventory, and customer data remain 100% safe locally.</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
