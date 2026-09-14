import React, { useState } from 'react';
import { Crown, ShieldAlert, ArrowRight, Download, Check, Shield } from 'lucide-react';
import { licenseService } from '../../services/license';
import { dbService } from '../../services/db';
import confetti from 'canvas-confetti';

interface TrialExpiredLockScreenProps {
  onUnlocked: () => void;
}

export const TrialExpiredLockScreen: React.FC<TrialExpiredLockScreenProps> = ({ onUnlocked }) => {
  const [keyInput, setKeyInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isActivating, setIsActivating] = useState(false);

  const licenseState = licenseService.getLicenseState();

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!keyInput.trim()) {
      setErrorMsg('Please enter your official license key.');
      return;
    }

    setIsActivating(true);
    setTimeout(() => {
      const res = licenseService.activateLicense(keyInput);
      setIsActivating(false);
      if (res.success) {
        try {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        } catch {}
        setTimeout(() => {
          onUnlocked();
        }, 500);
      } else {
        setErrorMsg(res.message);
      }
    }, 400);
  };

  const handleDownloadBackup = () => {
    const data = dbService.exportDatabaseJSON();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ProSale_Safety_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-neutral-900 font-sans flex flex-col justify-between selection:bg-neutral-200 p-4 sm:p-8">
      {/* Top Accent */}
      <div className="w-full max-w-3xl mx-auto pt-4 space-y-6">
        {/* Main Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-12 border border-neutral-200/80 shadow-xl text-center space-y-6">
          {/* Top Warning Badge */}
          <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto shadow-xs">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="px-3.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold uppercase tracking-wider">
              6-Day Evaluation Period Concluded
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
              Activate Pro.Sale to Continue
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 max-w-lg mx-auto leading-relaxed">
              Your free 6-day evaluation trial has ended. To continue issuing GST bills, managing stock, and accessing customer ledgers, enter your official license key below.
            </p>
          </div>

          {/* License Activation Form */}
          <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200 max-w-xl mx-auto space-y-3 text-left">
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Enter Official License Key
            </label>
            <form onSubmit={handleActivate} className="flex flex-col sm:flex-row items-stretch gap-2.5">
              <input
                type="text"
                value={keyInput}
                onChange={(e) => {
                  setKeyInput(e.target.value);
                  setErrorMsg('');
                }}
                autoFocus
                autoComplete="off"
                spellCheck="false"
                placeholder="ENTER LICENSE KEY"
                className="flex-1 h-11 px-4 bg-white rounded-xl border border-neutral-200 text-xs font-mono uppercase text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black shadow-xs"
              />
              <button
                type="submit"
                disabled={isActivating}
                className="h-11 px-6 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-xs shadow-xs transition-all active:scale-98 cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-1.5 whitespace-nowrap"
              >
                <span>{isActivating ? 'Verifying...' : 'Unlock Lifetime Access'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
            {errorMsg && <p className="text-xs text-rose-600 font-semibold">{errorMsg}</p>}
          </div>

          {/* Plan Comparison Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-left">
            {/* Silver Plan Card */}
            <div className="p-5 rounded-2xl border border-neutral-200 bg-neutral-50/50 flex flex-col justify-between space-y-3 shadow-xs">
              <div>
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                  Essential POS
                </span>
                <h3 className="text-base font-bold text-neutral-900">Silver Edition</h3>
                <div className="text-xl font-extrabold text-neutral-900 mt-1 font-mono">
                  ₹1,999 <span className="text-xs font-normal text-neutral-500 font-sans">/ Lifetime</span>
                </div>
                <div className="pt-3 space-y-2 text-xs text-neutral-700">
                  <div className="flex items-center space-x-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Unlimited Invoicing & Bills</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Customer & Supplier Ledgers</span>
                  </div>
                  <div className="flex items-center space-x-2 text-neutral-400 line-through">
                    <span>✕ Barcode & GSTR Reports</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Gold Plan Card */}
            <div className="p-5 rounded-2xl border border-amber-300 bg-amber-50/30 text-neutral-900 flex flex-col justify-between space-y-3 shadow-sm">
              <div>
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                  Full Enterprise OS
                </span>
                <h3 className="text-base font-bold text-neutral-900 flex items-center space-x-1.5">
                  <span>Gold Edition</span>
                  <Crown className="w-4 h-4 text-amber-500" />
                </h3>
                <div className="text-xl font-extrabold text-neutral-900 mt-1 font-mono">
                  ₹2,999 <span className="text-xs font-normal text-neutral-500 font-sans">/ Lifetime</span>
                </div>
                <div className="pt-3 space-y-2 text-xs text-neutral-800">
                  <div className="flex items-center space-x-2">
                    <Check className="w-3.5 h-3.5 text-amber-600" />
                    <span>All Invoicing, POS & Cash Registers</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Check className="w-3.5 h-3.5 text-amber-600" />
                    <span>Barcode Scanner & Label Print</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Check className="w-3.5 h-3.5 text-amber-600" />
                    <span>All 11 CBIC GST Filing Reports</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Check className="w-3.5 h-3.5 text-amber-600" />
                    <span>Client & Item Profitability Tracking</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Safety Backup Option */}
          <div className="pt-4 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500">
            <div className="flex items-center space-x-1.5">
              <Shield className="w-4 h-4 text-neutral-500" />
              <span>Your local store database is 100% safe on this device.</span>
            </div>
            <button
              type="button"
              onClick={handleDownloadBackup}
              className="inline-flex items-center space-x-1.5 text-neutral-900 hover:text-black font-semibold cursor-pointer underline underline-offset-2"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Local Backup File</span>
            </button>
          </div>
        </div>
      </div>

      <footer className="py-4 text-center text-[11px] text-neutral-400">
        Pro.Sale Enterprise Operating System • 100% Offline Local Privacy
      </footer>
    </div>
  );
};
