import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Crown,
  Shield,
  Zap,
  Building2,
  User,
  Clock,
  Layers,
  FileText,
  Barcode,
  TrendingUp,
  HardDrive,
  CheckCircle2,
} from 'lucide-react';
import { INDIAN_STATES } from '../../utils/constants';
import { BusinessSettings, UserProfile } from '../../types';
import { dbService } from '../../services/db';
import { licenseService, PlanType } from '../../services/license';

interface OnboardingFlowProps {
  onComplete: (userProfile: UserProfile, businessSettings: BusinessSettings) => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // User Profile State (Blank by default per user request)
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: '',
    email: '',
    phone: '',
    role: '',
    pin: '',
  });

  // Business / Company Profile State (Blank by default per user request)
  const [companyProfile, setCompanyProfile] = useState<Partial<BusinessSettings>>({
    firmName: '',
    tagline: '',
    gstin: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    stateCode: '',
    pincode: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    branchName: '',
    upiId: '',
    invoicePrefix: '',
  });

  // Guide Tour Current Slide
  const [tourSlide, setTourSlide] = useState(0);

  // License key input state
  const [licenseKey, setLicenseKey] = useState('');
  const [licenseError, setLicenseError] = useState('');
  const [isActivating, setIsActivating] = useState(false);

  // Tour slides data
  const tourSlides = [
    {
      icon: Zap,
      badge: 'Lightning Speed',
      title: 'High-Performance POS & Tax Invoices',
      desc: 'Process sales in seconds with smart keyboard shortcuts (F2, Tab, Enter), automatic CGST/SGST/IGST tax calculation, and instant 1-click PDF download straight to device storage.',
      highlights: ['Split Payment Modes (Cash, UPI, Credit)', 'Direct Local Storage PDF Download', 'WhatsApp Invoice Delivery'],
    },
    {
      icon: Layers,
      badge: 'Real-Time Inventory',
      title: 'Live Stock & Low Threshold Alerts',
      desc: 'Maintain accurate inventory levels with automated stock deductions on every sale, low-stock warnings, HSN master code validation, and batch management.',
      highlights: ['Automated Stock Deduction', 'Min Stock Threshold Warnings', 'HSN/SAC Validation'],
    },
    {
      icon: TrendingUp,
      badge: 'Financial Intelligence',
      title: '3-Tier Profit Tracking & Ledgers',
      desc: 'Analyze profitability on Client-wise, Item-wise, and Bill-wise levels with live margin tracking, party running balances, and payment reminders.',
      highlights: ['Client-wise & Item-wise Profit', 'Customer & Supplier Ledgers', 'Live Margin Percentages'],
    },
    {
      icon: Shield,
      badge: 'Statutory Compliance',
      title: 'CBIC GST 2026 & 100% Offline Privacy',
      desc: 'Audit-ready GSTR-1, GSTR-3B, and GSTR-9 reports running 100% locally on your machine. Zero cloud dependency, zero subscription lock-in, and military-grade privacy.',
      highlights: ['All 11 Statutory Reports', '100% Offline IndexedDB Storage', 'Instant Local Backup & Restore'],
    },
  ];

  // Helper to handle Indian state selection
  const handleStateChange = (stateName: string) => {
    const found = INDIAN_STATES.find((s) => s.name === stateName);
    setCompanyProfile((prev) => ({
      ...prev,
      state: stateName,
      stateCode: found ? found.code : '',
    }));
  };

  // Error states for form validations
  const [userError, setUserError] = useState('');
  const [companyError, setCompanyError] = useState('');

  // Step 2 Submission (User Profile)
  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile.name.trim()) {
      setUserError('Please enter your full name to proceed.');
      return;
    }
    setUserError('');
    setStep(3);
  };

  // Step 3 Submission (Company Profile)
  const handleCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyProfile.firmName?.trim()) {
      setCompanyError('Please enter your company / business legal name.');
      return;
    }
    setCompanyError('');
    setStep(4);
  };

  // Trigger celebration confetti
  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // safe fallback
    }
  };

  // Finalize Onboarding & Enter App
  const finishOnboarding = (plan: PlanType, key?: string) => {
    // 1. Strict License Verification: Without a valid key, Gold and Silver CANNOT be activated!
    if (plan !== 'trial') {
      if (!key || !key.trim()) {
        setLicenseError(`An authentic license key is strictly required to activate ${plan.toUpperCase()} Edition.`);
        return;
      }
      const val = licenseService.validateLicenseKey(key);
      if (!val.valid || val.tier !== plan) {
        setLicenseError(val.message || `Invalid license key for ${plan.toUpperCase()} Edition.`);
        return;
      }
      const activation = licenseService.activateLicense(key);
      if (!activation.success) {
        setLicenseError(activation.message);
        return;
      }
    } else {
      licenseService.startTrial();
    }

    // 2. Save User Profile
    dbService.saveUserProfile({
      ...userProfile,
      role: userProfile.role || 'Owner',
    });

    // 3. Save Business Settings
    const existingSettings = dbService.getSettings();
    const mergedSettings: BusinessSettings = {
      ...existingSettings,
      firmName: companyProfile.firmName || '',
      tagline: companyProfile.tagline || '',
      gstin: companyProfile.gstin || '',
      phone: companyProfile.phone || userProfile.phone || '',
      email: companyProfile.email || userProfile.email || '',
      address: companyProfile.address || '',
      city: companyProfile.city || '',
      state: companyProfile.state || '',
      stateCode: companyProfile.stateCode || '',
      pincode: companyProfile.pincode || '',
      bankName: companyProfile.bankName || '',
      accountNumber: companyProfile.accountNumber || '',
      ifscCode: companyProfile.ifscCode || '',
      branchName: companyProfile.branchName || '',
      upiId: companyProfile.upiId || '',
      invoicePrefix: companyProfile.invoicePrefix || 'INV-',
    };
    dbService.saveSettings(mergedSettings);

    // 4. Set Onboarding Completed
    dbService.setOnboardingCompleted(true);

    triggerCelebration();

    setTimeout(() => {
      onComplete(userProfile, mergedSettings);
    }, 600);
  };

  // Handle Plan Card click: strictly requires license key for Gold/Silver
  const handlePlanCardClick = (tier: 'gold' | 'silver') => {
    if (licenseKey.trim()) {
      const val = licenseService.validateLicenseKey(licenseKey);
      if (val.valid && val.tier === tier) {
        setIsActivating(true);
        setTimeout(() => {
          setIsActivating(false);
          finishOnboarding(tier, licenseKey);
        }, 300);
        return;
      }
    }

    // If tier is Silver and no key is entered: user gets 6-day evaluation trial from today!
    if (tier === 'silver') {
      finishOnboarding('trial');
      return;
    }

    // Gold strictly requires license key!
    const inputEl = document.getElementById('onboarding-license-input') as HTMLInputElement | null;
    if (inputEl) {
      inputEl.focus();
      inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    setLicenseError(
      'Gold Edition requires an authentic Gold License Key. Without a valid license key, Gold Plan cannot be activated. Please enter your Gold key above.'
    );
  };

  // Handle License Key Activation Form
  const handleActivateLicense = (e: React.FormEvent) => {
    e.preventDefault();
    setLicenseError('');
    if (!licenseKey.trim()) {
      setLicenseError('Please enter a license key or select Silver Edition to start the 6-day trial.');
      return;
    }

    setIsActivating(true);
    setTimeout(() => {
      const res = licenseService.activateLicense(licenseKey);
      setIsActivating(false);
      if (res.success) {
        finishOnboarding(res.plan, licenseKey);
      } else {
        setLicenseError(res.message);
      }
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-neutral-900 font-sans flex flex-col justify-between selection:bg-neutral-200 selection:text-neutral-900">
      {/* Top Ambient Bar */}
      <div className="h-1 bg-gradient-to-r from-blue-600 via-neutral-400 to-blue-600" />

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-10">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            {/* ========================================================================= */}
            {/* STEP 1: WELCOME TO PRO.SALE                                               */}
            {/* ========================================================================= */}
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="bg-white rounded-3xl p-6 sm:p-12 border border-neutral-200/80 shadow-xl text-center space-y-8 text-neutral-900"
              >
                {/* Official Glossy App Icon */}
                <div className="relative inline-block mx-auto">
                  <div className="w-24 h-24 rounded-3xl overflow-hidden shadow-xl mx-auto border border-neutral-200 bg-neutral-50 flex items-center justify-center">
                    <img
                      src="/app-icon.png"
                      alt="Pro.Sale Logo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-black text-white text-[10px] font-bold uppercase tracking-wider shadow-sm">
                    OS 2.4
                  </div>
                </div>

                {/* Title & Subtitle */}
                <div className="space-y-3">
                  <span className="px-3.5 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-700 text-[11px] font-bold uppercase tracking-wider">
                    Enterprise Edition
                  </span>
                  <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight">
                    Welcome to Pro.Sale
                  </h1>
                  <p className="text-neutral-500 text-sm max-w-md mx-auto leading-relaxed">
                    The offline-first enterprise GST billing & business operating system.
                    Engineered with Apple-grade precision for modern Indian commerce.
                  </p>
                </div>

                {/* Core Features Pillars */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-left">
                  <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80">
                    <HardDrive className="w-4 h-4 text-neutral-700 mb-1.5" />
                    <p className="text-xs font-bold text-neutral-900">100% Offline</p>
                    <p className="text-[11px] text-neutral-500">Zero cloud latency or reliance.</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80">
                    <FileText className="w-4 h-4 text-neutral-700 mb-1.5" />
                    <p className="text-xs font-bold text-neutral-900">CBIC GST 2026</p>
                    <p className="text-[11px] text-neutral-500">Rule 46 compliant invoicing.</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80">
                    <Zap className="w-4 h-4 text-neutral-700 mb-1.5" />
                    <p className="text-xs font-bold text-neutral-900">Apple Precision</p>
                    <p className="text-[11px] text-neutral-500">Fast keyboard POS & analytics.</p>
                  </div>
                </div>

                {/* CTA Button */}
                <div className="pt-4">
                  <button
                    onClick={() => setStep(2)}
                    className="w-full sm:w-auto min-w-[220px] h-12 px-8 rounded-2xl bg-black hover:bg-neutral-800 text-white font-bold text-sm shadow-xs transition-all active:scale-98 cursor-pointer inline-flex items-center justify-center space-x-2"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ========================================================================= */}
            {/* STEP 2: USER PROFILE SETUP                                                */}
            {/* ========================================================================= */}
            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="bg-white rounded-3xl p-6 sm:p-10 border border-neutral-200/80 shadow-xl space-y-6 text-neutral-900"
              >
                {/* Step Header */}
                <div className="flex items-center justify-between pb-4 border-b border-neutral-200/80">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-neutral-100 border border-neutral-200 text-neutral-700 flex items-center justify-center">
                      <User className="w-5 h-5 text-neutral-700" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                        Step 1 of 4 • User Profile
                      </p>
                      <h2 className="text-xl font-bold text-neutral-900">Create Operator Account</h2>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm shadow-xs uppercase">
                    {userProfile.name ? userProfile.name.charAt(0) : '?'}
                  </div>
                </div>

                <form onSubmit={handleUserSubmit} autoComplete="off" className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                      Your Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck="false"
                      value={userProfile.name}
                      onChange={(e) => setUserProfile({ ...userProfile, name: e.target.value })}
                      placeholder="Enter full name"
                      className="w-full h-11 px-3.5 bg-neutral-50 rounded-xl border border-neutral-200 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:bg-white focus:border-black transition-all"
                    />
                  </div>

                  {/* Phone & Email Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                        Mobile Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck="false"
                        value={userProfile.phone}
                        onChange={(e) => setUserProfile({ ...userProfile, phone: e.target.value })}
                        placeholder="10-digit mobile number"
                        className="w-full h-11 px-3.5 bg-neutral-50 rounded-xl border border-neutral-200 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:bg-white focus:border-black transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                        Email Address (Optional)
                      </label>
                      <input
                        type="email"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck="false"
                        value={userProfile.email}
                        onChange={(e) => setUserProfile({ ...userProfile, email: e.target.value })}
                        placeholder="operator@business.com"
                        className="w-full h-11 px-3.5 bg-neutral-50 rounded-xl border border-neutral-200 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:bg-white focus:border-black transition-all"
                      />
                    </div>
                  </div>

                  {/* Role & Passcode Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                        Role / Designation
                      </label>
                      <select
                        value={userProfile.role}
                        onChange={(e) => setUserProfile({ ...userProfile, role: e.target.value })}
                        className="w-full h-11 px-3.5 bg-neutral-50 rounded-xl border border-neutral-200 text-sm text-neutral-900 focus:outline-none focus:bg-white focus:border-black transition-all cursor-pointer"
                      >
                        <option value="" className="bg-white text-neutral-900">Select Role / Designation</option>
                        <option value="Owner" className="bg-white text-neutral-900">Owner / Director</option>
                        <option value="Store Manager" className="bg-white text-neutral-900">Store Manager</option>
                        <option value="Accountant" className="bg-white text-neutral-900">Accountant</option>
                        <option value="Cashier" className="bg-white text-neutral-900">Cashier</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                        POS Security Passcode PIN (Optional)
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        autoComplete="new-password"
                        spellCheck="false"
                        value={userProfile.pin}
                        onChange={(e) => setUserProfile({ ...userProfile, pin: e.target.value })}
                        placeholder="4-digit PIN"
                        className="w-full h-11 px-3.5 bg-neutral-50 rounded-xl border border-neutral-200 text-sm font-mono tracking-widest text-neutral-900 placeholder-neutral-400 focus:outline-none focus:bg-white focus:border-black transition-all"
                      />
                    </div>
                  </div>

                  {/* Error display */}
                  {userError && (
                    <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-700 font-medium">
                      {userError}
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="pt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-4 py-2.5 rounded-xl text-neutral-500 hover:text-neutral-900 text-xs font-semibold cursor-pointer"
                    >
                      ← Back
                    </button>
                    <button
                      type="submit"
                      className="h-11 px-6 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-xs shadow-xs transition-all active:scale-98 cursor-pointer flex items-center space-x-1.5"
                    >
                      <span>Continue to Business Profile</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* ========================================================================= */}
            {/* STEP 3: COMPANY / BUSINESS PROFILE SETUP                                  */}
            {/* ========================================================================= */}
            {step === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="bg-white rounded-3xl p-6 sm:p-10 border border-neutral-200/80 shadow-xl space-y-6 text-neutral-900"
              >
                {/* Step Header */}
                <div className="flex items-center justify-between pb-4 border-b border-neutral-200/80">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-neutral-100 border border-neutral-200 text-neutral-700 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-neutral-700" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                        Step 2 of 4 • Company Profile
                      </p>
                      <h2 className="text-xl font-bold text-neutral-900">Set Up Business Details</h2>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-neutral-500 block font-medium">Prints on Tax Invoices</span>
                  </div>
                </div>

                <form onSubmit={handleCompanySubmit} autoComplete="off" className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                  {/* Business Name */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                      Business Legal Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck="false"
                      value={companyProfile.firmName}
                      onChange={(e) => setCompanyProfile({ ...companyProfile, firmName: e.target.value })}
                      placeholder="e.g. Acme Enterprise"
                      className="w-full h-11 px-3.5 bg-neutral-50 rounded-xl border border-neutral-200 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:bg-white focus:border-black transition-all"
                    />
                  </div>

                  {/* Tagline & GSTIN */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                        Tagline / Trade Slogan (Optional)
                      </label>
                      <input
                        type="text"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck="false"
                        value={companyProfile.tagline}
                        onChange={(e) => setCompanyProfile({ ...companyProfile, tagline: e.target.value })}
                        placeholder="e.g. Quality Wholesale Goods"
                        className="w-full h-10 px-3.5 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:bg-white focus:border-black transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                        GSTIN (Optional if Unregistered)
                      </label>
                      <input
                        type="text"
                        maxLength={15}
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck="false"
                        value={companyProfile.gstin}
                        onChange={(e) => setCompanyProfile({ ...companyProfile, gstin: e.target.value.toUpperCase() })}
                        placeholder="15-character GSTIN"
                        className="w-full h-10 px-3.5 bg-neutral-50 rounded-xl border border-neutral-200 text-xs font-mono uppercase text-neutral-900 placeholder-neutral-400 focus:outline-none focus:bg-white focus:border-black transition-all"
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                      Registered Address
                    </label>
                    <input
                      type="text"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck="false"
                      value={companyProfile.address}
                      onChange={(e) => setCompanyProfile({ ...companyProfile, address: e.target.value })}
                      placeholder="Shop/Office address"
                      className="w-full h-10 px-3.5 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:bg-white focus:border-black transition-all"
                    />
                  </div>

                  {/* City, State & Pincode */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                        City
                      </label>
                      <input
                        type="text"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck="false"
                        value={companyProfile.city}
                        onChange={(e) => setCompanyProfile({ ...companyProfile, city: e.target.value })}
                        placeholder="City"
                        className="w-full h-10 px-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:bg-white focus:border-black transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                        State
                      </label>
                      <select
                        autoComplete="off"
                        value={companyProfile.state}
                        onChange={(e) => handleStateChange(e.target.value)}
                        className="w-full h-10 px-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:bg-white focus:border-black transition-all cursor-pointer"
                      >
                        <option value="" className="bg-white text-neutral-900">Select State</option>
                        {INDIAN_STATES.map((s) => (
                          <option key={s.code} value={s.name} className="bg-white text-neutral-900">
                            {s.name} ({s.code})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                        Pincode
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        autoComplete="off"
                        spellCheck="false"
                        value={companyProfile.pincode}
                        onChange={(e) => setCompanyProfile({ ...companyProfile, pincode: e.target.value })}
                        placeholder="6-digit PIN"
                        className="w-full h-10 px-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs font-mono text-neutral-900 placeholder-neutral-400 focus:outline-none focus:bg-white focus:border-black transition-all"
                      />
                    </div>
                  </div>

                  {/* Bank Details & UPI (For Invoices) */}
                  <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
                    <p className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider">
                      Bank & Dynamic UPI QR Code (Optional)
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                          Bank Name
                        </label>
                        <input
                          type="text"
                          autoComplete="off"
                          spellCheck="false"
                          data-lpignore="true"
                          value={companyProfile.bankName}
                          onChange={(e) => setCompanyProfile({ ...companyProfile, bankName: e.target.value })}
                          placeholder="Bank Name"
                          className="w-full h-9 px-3 bg-white rounded-lg border border-neutral-200 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                          Account Number
                        </label>
                        <input
                          type="text"
                          autoComplete="off"
                          spellCheck="false"
                          data-lpignore="true"
                          value={companyProfile.accountNumber}
                          onChange={(e) => setCompanyProfile({ ...companyProfile, accountNumber: e.target.value })}
                          placeholder="Account Number"
                          className="w-full h-9 px-3 bg-white rounded-lg border border-neutral-200 text-xs font-mono text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                          IFSC Code
                        </label>
                        <input
                          type="text"
                          autoComplete="off"
                          spellCheck="false"
                          data-lpignore="true"
                          value={companyProfile.ifscCode}
                          onChange={(e) => setCompanyProfile({ ...companyProfile, ifscCode: e.target.value.toUpperCase() })}
                          placeholder="IFSC"
                          className="w-full h-9 px-3 bg-white rounded-lg border border-neutral-200 text-xs font-mono uppercase text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                          UPI ID for QR Pay
                        </label>
                        <input
                          type="text"
                          autoComplete="off"
                          spellCheck="false"
                          data-lpignore="true"
                          value={companyProfile.upiId}
                          onChange={(e) => setCompanyProfile({ ...companyProfile, upiId: e.target.value })}
                          placeholder="business@upi"
                          className="w-full h-9 px-3 bg-white rounded-lg border border-neutral-200 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Error display */}
                  {companyError && (
                    <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-700 font-medium">
                      {companyError}
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-4 py-2.5 rounded-xl text-neutral-500 hover:text-neutral-900 text-xs font-semibold cursor-pointer"
                    >
                      ← Back
                    </button>
                    <button
                      type="submit"
                      className="h-11 px-6 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-xs shadow-xs transition-all active:scale-98 cursor-pointer flex items-center space-x-1.5"
                    >
                      <span>Continue to Quick Tour</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* ========================================================================= */}
            {/* ========================================================================= */}
            {/* STEP 4: QUICK GUIDE TOUR                                                  */}
            {/* ========================================================================= */}
            {step === 4 && (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="bg-white rounded-3xl p-8 sm:p-10 border border-neutral-200/80 shadow-xl space-y-6 text-neutral-900"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-neutral-200/80">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                        Step 3 of 4 • App Tour
                      </p>
                      <h2 className="text-xl font-bold text-neutral-900">Pro.Sale Operating Tour</h2>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {tourSlides.map((_, idx) => (
                      <div
                        key={idx}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          tourSlide === idx ? 'w-6 bg-black' : 'w-2 bg-neutral-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Active Slide Card */}
                <div className="p-6 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-0.5 rounded-full bg-black text-white text-[10px] font-bold uppercase tracking-wider">
                      {tourSlides[tourSlide].badge}
                    </span>
                    <span className="text-[11px] font-mono text-neutral-500">
                      {tourSlide + 1} / {tourSlides.length}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-neutral-900">
                    {tourSlides[tourSlide].title}
                  </h3>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    {tourSlides[tourSlide].desc}
                  </p>

                  <div className="pt-2 space-y-1.5 border-t border-neutral-200">
                    {tourSlides[tourSlide].highlights.map((h, idx) => (
                      <div key={idx} className="flex items-center space-x-2 text-xs text-neutral-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tour Navigation Controls */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (tourSlide > 0) setTourSlide(tourSlide - 1);
                      else setStep(3);
                    }}
                    className="px-4 py-2.5 rounded-xl text-neutral-500 hover:text-neutral-900 text-xs font-semibold cursor-pointer"
                  >
                    ← Previous
                  </button>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setStep(5)}
                      className="px-3.5 py-2.5 rounded-xl text-neutral-500 hover:text-neutral-800 text-xs font-medium cursor-pointer"
                    >
                      Skip Tour
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (tourSlide < tourSlides.length - 1) {
                          setTourSlide(tourSlide + 1);
                        } else {
                          setStep(5);
                        }
                      }}
                      className="h-11 px-6 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-xs shadow-xs transition-all active:scale-98 cursor-pointer flex items-center space-x-1.5"
                    >
                      <span>
                        {tourSlide < tourSlides.length - 1 ? 'Next Feature' : 'Select Plan & License'}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ========================================================================= */}
            {/* STEP 5: LICENSE KEY & PRICING PLANS                                       */}
            {/* ========================================================================= */}
            {step === 5 && (
              <motion.div
                key="step-5"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="bg-white rounded-3xl p-6 sm:p-10 border border-neutral-200/80 shadow-xl space-y-7 text-neutral-900"
              >
                {/* Header */}
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
                    <Crown className="w-6 h-6 text-amber-500" />
                  </div>
                  <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                    Step 4 of 4 • License & Activation
                  </p>
                  <h2 className="text-2xl font-bold text-neutral-900">Choose Your Edition</h2>
                  <p className="text-xs text-neutral-500 max-w-md mx-auto">
                    Activate with an existing license key, or start immediately with a 6-day free trial.
                  </p>
                </div>

                {/* Option 1: License Key Box */}
                <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider">
                      Have a License Key?
                    </span>
                    <span className="text-[10px] text-neutral-500">Activates Gold / Silver Edition</span>
                  </div>

                  <form onSubmit={handleActivateLicense} className="flex flex-col sm:flex-row items-stretch gap-2">
                    <input
                      id="onboarding-license-input"
                      type="text"
                      autoComplete="off"
                      spellCheck="false"
                      value={licenseKey}
                      onChange={(e) => {
                        setLicenseKey(e.target.value.toUpperCase());
                        setLicenseError('');
                      }}
                      placeholder="ENTER LICENSE KEY"
                      className="flex-1 h-10 px-3.5 bg-white rounded-xl border border-neutral-200 text-xs font-mono uppercase text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black"
                    />
                    <button
                      type="submit"
                      disabled={isActivating}
                      className="h-10 px-5 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-xs shadow-xs transition-all active:scale-98 cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-1.5"
                    >
                      <span>{isActivating ? 'Validating...' : 'Activate Key'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </form>
                  {licenseError && <p className="text-xs text-rose-600 font-medium">{licenseError}</p>}
                </div>

                {/* Option 2: Silver 6-Day Free Evaluation Trial */}
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-800">Don't have a license key right now?</p>
                      <p className="text-[11px] text-emerald-700">Start with Silver Edition 6-day evaluation trial from today. After 6 days, a license key is required.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => finishOnboarding('trial')}
                    className="w-full sm:w-auto h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all active:scale-98 cursor-pointer whitespace-nowrap"
                  >
                    Start 6-Day Silver Trial →
                  </button>
                </div>

                {/* Plan Comparison Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {/* Silver Plan Card */}
                  <div className="p-5 rounded-2xl border border-neutral-200 bg-neutral-50/50 hover:border-neutral-300 transition-all flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                        Essential Billing
                      </span>
                      <h3 className="text-lg font-bold text-neutral-900">Silver Edition</h3>
                      <div className="text-2xl font-black text-neutral-900">
                        ₹1,999 <span className="text-xs font-normal text-neutral-500">/ Lifetime</span>
                      </div>
                      <p className="text-[11px] text-neutral-500 leading-normal">
                        Clean billing & customer ledgers. Includes 6-day evaluation if used without a license key.
                      </p>

                      <div className="pt-3 space-y-2 text-xs">
                        <div className="flex items-center space-x-2 text-neutral-700">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Unlimited Tax Invoices</span>
                        </div>
                        <div className="flex items-center space-x-2 text-neutral-700">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Direct PDF Local Download</span>
                        </div>
                        <div className="flex items-center space-x-2 text-neutral-700">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Customer & Supplier Ledgers</span>
                        </div>
                        <div className="flex items-center space-x-2 text-neutral-400 line-through">
                          <span className="w-3.5 h-3.5 flex items-center justify-center font-bold text-neutral-400 shrink-0">✕</span>
                          <span>Barcode Scanner & Generator</span>
                        </div>
                        <div className="flex items-center space-x-2 text-neutral-400 line-through">
                          <span className="w-3.5 h-3.5 flex items-center justify-center font-bold text-neutral-400 shrink-0">✕</span>
                          <span>CBIC GST Reports (GSTR 1/3B/9)</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handlePlanCardClick('silver')}
                      className="w-full h-10 rounded-xl bg-neutral-200 hover:bg-neutral-300 text-neutral-800 border border-neutral-200 font-bold text-xs transition-all cursor-pointer shadow-xs"
                    >
                      {licenseKey.trim() ? 'Activate Silver Lifetime (₹1,999)' : 'Start Silver (6-Day Free Evaluation)'}
                    </button>
                  </div>

                  {/* Gold Plan Card */}
                  <div className="p-5 rounded-2xl border-2 border-amber-400 bg-amber-50/40 text-neutral-900 shadow-md relative flex flex-col justify-between space-y-4">
                    <div className="absolute -top-3 right-4 px-3 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider shadow-xs flex items-center space-x-1">
                      <Sparkles className="w-3 h-3" />
                      <span>Recommended</span>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                        Full Enterprise OS
                      </span>
                      <h3 className="text-lg font-bold text-neutral-900 flex items-center space-x-1.5">
                        <span>Gold Edition</span>
                        <Crown className="w-4 h-4 text-amber-500" />
                      </h3>
                      <div className="text-2xl font-black text-neutral-900">
                        ₹2,999 <span className="text-xs font-normal text-neutral-500">/ Lifetime</span>
                      </div>
                      <p className="text-[11px] text-neutral-600 leading-normal">
                        Complete unlocked access to all POS, Barcode, GST 2026, and Profit analytics.
                      </p>

                      <div className="pt-3 space-y-2 text-xs">
                        <div className="flex items-center space-x-2 text-neutral-800">
                          <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Everything in Silver</span>
                        </div>
                        <div className="flex items-center space-x-2 text-neutral-800">
                          <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="font-semibold text-neutral-900">Barcode Scan & Label Print</span>
                        </div>
                        <div className="flex items-center space-x-2 text-neutral-800">
                          <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="font-semibold text-neutral-900">All 11 CBIC GST Filing Reports</span>
                        </div>
                        <div className="flex items-center space-x-2 text-neutral-800">
                          <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="font-semibold text-neutral-900">Client, Item & Bill Profitability</span>
                        </div>
                        <div className="flex items-center space-x-2 text-neutral-800">
                          <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>E-Way Bill & E-Invoice JSON</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handlePlanCardClick('gold')}
                      className="w-full h-10 rounded-xl bg-black hover:bg-neutral-800 text-white font-extrabold text-xs transition-all shadow-xs active:scale-98 cursor-pointer"
                    >
                      Activate Gold Edition (₹2,999)
                    </button>
                  </div>
                </div>

                {/* Back Button */}
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="text-neutral-500 hover:text-neutral-900 text-xs font-semibold cursor-pointer"
                  >
                    ← Back to Tour
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Subtle Bottom System Badge */}
      <footer className="py-4 text-center text-[11px] text-neutral-400 border-t border-neutral-200">
        Pro.Sale Enterprise Operating System • Build 2026.09.13 • Offline Data Encryption Enabled
      </footer>
    </div>
  );
};
