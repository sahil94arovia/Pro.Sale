import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  MessageCircle,
  CreditCard,
  History,
  Phone,
  Building2,
  Mail,
  MapPin,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Customer, CustomerLedgerEntry, BusinessSettings } from '../../types';
import { formatINR, formatDate, formatDateTime } from '../../utils/formatters';
import { AppleModal } from '../common/AppleModal';
import { openWhatsApp, generatePaymentReminderMessage } from '../../services/whatsapp';
import { INDIAN_STATES } from '../../utils/constants';
import { verifyAndFetchGSTDetails, GSTVerificationResult } from '../../services/gstLookupService';

interface CustomerLedgerViewProps {
  customers: Customer[];
  ledgerEntries: CustomerLedgerEntry[];
  settings: BusinessSettings;
  activeSubTab?: string;
  onSaveCustomer: (customer: Customer) => void;
  onRecordPayment: (customerId: string, amount: number, mode: string, note: string) => void;
}

export const CustomerLedgerView: React.FC<CustomerLedgerViewProps> = ({
  customers,
  ledgerEntries,
  settings,
  activeSubTab = 'all_parties',
  onSaveCustomer,
  onRecordPayment,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isPaymentVoucherOpen, setIsPaymentVoucherOpen] = useState(false);
  const [partyFilter, setPartyFilter] = useState<'all' | 'receivable' | 'payable'>(() => {
    if (activeSubTab === 'customers_receivable') return 'receivable';
    if (activeSubTab === 'suppliers_pay') return 'payable';
    return 'all';
  });

  useEffect(() => {
    if (activeSubTab === 'customers_receivable') {
      setPartyFilter('receivable');
    } else if (activeSubTab === 'suppliers_pay') {
      setPartyFilter('payable');
    } else if (activeSubTab === 'all_parties') {
      setPartyFilter('all');
    }
  }, [activeSubTab]);

  // New Customer Form State
  const [custForm, setCustForm] = useState<Partial<Customer>>({
    name: '',
    companyName: '',
    phone: '',
    email: '',
    gstin: '',
    pan: '',
    billingAddress: '',
    city: '',
    state: '',
    stateCode: '',
    pincode: '',
    creditLimit: 0,
    currentBalance: 0,
    notes: '',
  });

  // Payment Voucher Form State
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<string>('UPI');
  const [paymentNote, setPaymentNote] = useState<string>('');

  // GST Auto-Verification State
  const [isVerifyingGST, setIsVerifyingGST] = useState(false);
  const [gstStatus, setGstStatus] = useState<GSTVerificationResult | null>(null);

  const filtered = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      c.gstin?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (partyFilter === 'receivable') {
      return (c.currentBalance || 0) > 0;
    }
    if (partyFilter === 'payable') {
      return (
        (c.currentBalance || 0) < 0 ||
        (c.notes || '').toLowerCase().includes('supplier') ||
        (c.companyName || '').toLowerCase().includes('supplier') ||
        (c.name || '').toLowerCase().includes('supplier') ||
        (c.notes || '').toLowerCase().includes('vendor')
      );
    }
    return true;
  });

  useEffect(() => {
    if (filtered.length > 0) {
      if (!selectedCustomer || !filtered.some((c) => c.id === selectedCustomer.id)) {
        setSelectedCustomer(filtered[0]);
      }
    } else {
      setSelectedCustomer(null);
    }
  }, [partyFilter, customers, searchQuery]);

  const totalOutstanding = customers.reduce((sum, c) => sum + (c.currentBalance > 0 ? c.currentBalance : 0), 0);
  const totalCustomersWithBalance = customers.filter((c) => c.currentBalance > 0).length;

  const handleOpenAddCustomer = () => {
    setCustForm({
      name: '',
      companyName: '',
      phone: '',
      email: '',
      gstin: '',
      pan: '',
      billingAddress: '',
      city: '',
      state: '',
      stateCode: '',
      pincode: '',
      creditLimit: 0,
      currentBalance: 0,
      notes: '',
    });
    setGstStatus(null);
    setIsVerifyingGST(false);
    setIsCustomerModalOpen(true);
  };

  const handleGstinInput = async (rawVal: string) => {
    const clean = rawVal.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);
    const derivedPan = clean.length >= 10 ? clean.slice(2, 12) : custForm.pan || '';

    setCustForm((prev) => ({
      ...prev,
      gstin: clean,
      pan: derivedPan,
    }));

    if (clean.length === 15) {
      setIsVerifyingGST(true);
      try {
        const res = await verifyAndFetchGSTDetails(clean);
        setGstStatus(res);
        if (res.isValid) {
          setCustForm((prev) => ({
            ...prev,
            gstin: clean,
            pan: res.pan || prev.pan,
            billingAddress: res.address || prev.billingAddress,
            city: res.city || prev.city,
            state: res.state || prev.state,
            stateCode: res.stateCode || prev.stateCode,
            pincode: res.pincode || prev.pincode,
            companyName: res.tradeName || prev.companyName || res.legalName,
            name: res.legalName || res.tradeName || prev.name,
          }));
        }
      } catch (err) {
        console.error('GST Verification error:', err);
      } finally {
        setIsVerifyingGST(false);
      }
    } else {
      setGstStatus(null);
    }
  };

  const handleStateChange = (stateName: string) => {
    const found = INDIAN_STATES.find((s) => s.name === stateName);
    setCustForm({
      ...custForm,
      state: stateName,
      stateCode: found ? found.code : '07',
    });
  };

  const handleSaveCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custForm.name || !custForm.phone) {
      alert('Client Name and Phone number are required.');
      return;
    }

    const newCustomer: Customer = {
      id: 'cust-' + Date.now(),
      name: custForm.name,
      companyName: custForm.companyName,
      phone: custForm.phone,
      email: custForm.email,
      gstin: custForm.gstin,
      pan: custForm.pan,
      billingAddress: custForm.billingAddress || 'Local',
      city: custForm.city || settings.city,
      state: custForm.state || settings.state,
      stateCode: custForm.stateCode || settings.stateCode,
      pincode: custForm.pincode || settings.pincode,
      creditLimit: Number(custForm.creditLimit) || 0,
      currentBalance: Number(custForm.currentBalance) || 0,
      notes: custForm.notes,
      createdAt: new Date().toISOString(),
    };

    onSaveCustomer(newCustomer);
    setIsCustomerModalOpen(false);
  };

  const handleSendReminder = (customer: Customer) => {
    if (!customer.phone) {
      alert('No phone number recorded for this customer.');
      return;
    }
    const message = generatePaymentReminderMessage(customer, settings);
    openWhatsApp(customer.phone, message);
  };

  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || paymentAmount <= 0) {
      alert('Please enter a valid received payment amount.');
      return;
    }

    onRecordPayment(selectedCustomer.id, paymentAmount, paymentMode, paymentNote);
    setIsPaymentVoucherOpen(false);
    setPaymentAmount(0);
    setPaymentNote('');
  };

  // Ledger entries for the currently selected customer
  const customerLedger = selectedCustomer
    ? ledgerEntries.filter((l) => l.customerId === selectedCustomer.id)
    : [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-neutral-200/80 shadow-xs">
          <div className="flex items-center space-x-2 text-neutral-500 text-xs font-semibold uppercase tracking-wider">
            <Users className="w-4 h-4 text-blue-600" />
            <span>Total Registered Parties</span>
          </div>
          <p className="text-2xl font-bold text-neutral-900 font-mono mt-2">{customers.length}</p>
          <span className="text-[11px] text-neutral-500 mt-0.5 block">Wholesale & retail clients</span>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-neutral-200/80 shadow-xs">
          <div className="flex items-center space-x-2 text-rose-600 text-xs font-semibold uppercase tracking-wider">
            <CreditCard className="w-4 h-4" />
            <span>Total Accounts Receivable</span>
          </div>
          <p className="text-2xl font-bold text-rose-600 font-mono mt-2">{formatINR(totalOutstanding)}</p>
          <span className="text-[11px] text-rose-600/80 mt-0.5 block">
            Across {totalCustomersWithBalance} parties with pending balance
          </span>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-neutral-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-emerald-600 text-xs font-semibold uppercase tracking-wider">
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp Reminders</span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Send instant payment reminders with UPI payment link directly to customer's WhatsApp.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenAddCustomer}
            className="mt-3 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-black hover:bg-neutral-800 text-white text-xs font-semibold shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Party</span>
          </button>
        </div>
      </div>

      {/* Main Layout: Client List & Active Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Customer Directory (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          {/* Quick Filter Switcher */}
          <div className="flex items-center space-x-1 p-1 bg-white rounded-2xl border border-neutral-200/80 shadow-xs">
            <button
              type="button"
              onClick={() => setPartyFilter('all')}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                partyFilter === 'all'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              All ({customers.length})
            </button>
            <button
              type="button"
              onClick={() => setPartyFilter('receivable')}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                partyFilter === 'receivable'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200 font-bold'
                  : 'text-neutral-500 hover:text-rose-600'
              }`}
            >
              Receivable ({totalCustomersWithBalance})
            </button>
            <button
              type="button"
              onClick={() => setPartyFilter('payable')}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                partyFilter === 'payable'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 font-bold'
                  : 'text-neutral-500 hover:text-blue-600'
              }`}
            >
              To Pay
            </button>
          </div>

          <div className="p-2.5 bg-white rounded-2xl border border-neutral-200/80 shadow-xs">
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search party by name, phone, GSTIN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-black"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden divide-y divide-neutral-100 max-h-[640px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-500">
                No parties found. Click "+ Register New Party" above to add your first customer.
              </div>
            ) : (
              filtered.map((customer) => {
              const isSelected = selectedCustomer?.id === customer.id;
              const hasBalance = customer.currentBalance > 0;
              return (
                <div
                  key={customer.id}
                  onClick={() => setSelectedCustomer(customer)}
                  className={`p-3.5 cursor-pointer transition-all flex items-start justify-between ${
                    isSelected ? 'bg-blue-50/60 border-l-4 border-l-blue-600' : 'hover:bg-neutral-50/70'
                  }`}
                >
                  <div className="space-y-1">
                    <p className="font-semibold text-xs text-neutral-900">{customer.name}</p>
                    {customer.companyName && (
                      <p className="text-[11px] text-neutral-500 font-medium">{customer.companyName}</p>
                    )}
                    <div className="flex items-center space-x-2 text-[10px] text-neutral-400 font-mono">
                      <span>Ph: {customer.phone}</span>
                      {customer.gstin && <span>• GSTIN: {customer.gstin}</span>}
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <span
                      className={`text-xs font-mono font-bold block ${
                        hasBalance ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {formatINR(customer.currentBalance)}
                    </span>
                    <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-bold block">
                      {hasBalance ? 'Pending Balance' : 'Settled'}
                    </span>

                    {hasBalance && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSendReminder(customer);
                        }}
                        className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-medium border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                      >
                        <MessageCircle className="w-3 h-3" />
                        <span>Reminder</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            }))}
          </div>
        </div>

        {/* Right Column: Customer Account & Statement (7 Cols) */}
        <div className="lg:col-span-7">
          {selectedCustomer ? (
            <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs p-5 sm:p-6 space-y-6">
              {/* Customer Profile Header */}
              <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-neutral-200/80">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-bold text-neutral-900 tracking-tight">{selectedCustomer.name}</h3>
                    {selectedCustomer.gstin && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-mono font-semibold">
                        GST Registered
                      </span>
                    )}
                  </div>
                  {selectedCustomer.companyName && (
                    <p className="text-xs text-neutral-600 mt-0.5 font-medium">{selectedCustomer.companyName}</p>
                  )}
                  <p className="text-xs text-neutral-500 mt-1">
                    {selectedCustomer.billingAddress}, {selectedCustomer.city}, {selectedCustomer.state} ({selectedCustomer.stateCode}) - {selectedCustomer.pincode}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handleSendReminder(selectedCustomer)}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold border border-neutral-200 shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPaymentVoucherOpen(true)}
                    className="flex items-center space-x-1 px-3.5 py-1.5 rounded-xl bg-black hover:bg-neutral-800 text-white text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    <span>Receive Payment</span>
                  </button>
                </div>
              </div>

              {/* Outstanding Balance Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-neutral-50 rounded-2xl border border-neutral-200/80 text-xs">
                <div>
                  <span className="text-neutral-500 block font-medium">Current Balance:</span>
                  <span className="text-lg font-bold font-sans text-neutral-900">
                    {formatINR(selectedCustomer.currentBalance)}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Credit Limit:</span>
                  <span className="text-sm font-semibold font-mono text-neutral-800">
                    {formatINR(selectedCustomer.creditLimit)}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Place of Supply:</span>
                  <span className="text-xs font-semibold text-neutral-800">
                    {selectedCustomer.state} (Code {selectedCustomer.stateCode})
                  </span>
                </div>
              </div>

              {/* Account Statement / Ledger */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <History className="w-4 h-4 text-blue-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                    Account Statement / Transaction Ledger
                  </h4>
                </div>

                {customerLedger.length === 0 ? (
                  <div className="p-8 text-center bg-neutral-50 rounded-2xl text-xs text-neutral-500 border border-neutral-200">
                    No ledger entries recorded yet for this client.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-neutral-200/80 rounded-2xl overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-neutral-50/80 text-neutral-600 font-semibold border-b border-neutral-200/80 text-[10px] tracking-wider uppercase">
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Type & Ref</th>
                          <th className="py-2.5 px-3 text-right">Debit (Sale ₹)</th>
                          <th className="py-2.5 px-3 text-right">Credit (Paid ₹)</th>
                          <th className="py-2.5 px-3 text-right">Balance (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 font-mono">
                        {customerLedger.map((entry) => (
                          <tr key={entry.id} className="hover:bg-neutral-50/70 transition-colors">
                            <td className="py-2.5 px-3 text-neutral-600 font-sans">{formatDate(entry.date)}</td>
                            <td className="py-2.5 px-3">
                              <span className="font-semibold text-neutral-900 block">{entry.referenceNumber}</span>
                              <span className="text-[10px] text-neutral-500 font-sans">{entry.notes}</span>
                            </td>
                            <td className="py-2.5 px-3 text-right text-rose-600 font-medium">
                              {entry.debit > 0 ? formatINR(entry.debit) : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right text-emerald-600 font-medium">
                              {entry.credit > 0 ? formatINR(entry.credit) : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-neutral-900">
                              {formatINR(entry.balance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-8 bg-white rounded-2xl border border-neutral-200/80 text-center text-neutral-500 space-y-3 shadow-xs">
              <Users className="w-10 h-10 text-neutral-400" />
              <p className="text-sm font-semibold text-neutral-900">Select a party from left</p>
              <p className="text-xs text-neutral-500 max-w-xs">
                View complete ledger statement, pending bills, and send WhatsApp payment reminders.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add New Customer Modal */}
      <AppleModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        title="Register New Party / Customer"
        subtitle="Add party details with GSTIN and Place of Supply"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSaveCustomerSubmit} className="space-y-4 text-xs font-sans">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Contact Person / Name *</label>
              <input
                type="text"
                required
                value={custForm.name || ''}
                onChange={(e) => setCustForm({ ...custForm, name: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-900 focus:border-black focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Firm / Company Name</label>
              <input
                type="text"
                value={custForm.companyName || ''}
                onChange={(e) => setCustForm({ ...custForm, companyName: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-900 focus:border-black focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Phone / WhatsApp No *</label>
              <input
                type="tel"
                required
                value={custForm.phone || ''}
                onChange={(e) => setCustForm({ ...custForm, phone: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-900 focus:border-black focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Email Address</label>
              <input
                type="email"
                value={custForm.email || ''}
                onChange={(e) => setCustForm({ ...custForm, email: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-900 focus:border-black focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-neutral-700">GSTIN (Auto-Verify)</label>
                {isVerifyingGST && (
                  <span className="flex items-center space-x-1 text-[11px] text-blue-600 font-medium animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Verifying...</span>
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  maxLength={15}
                  value={custForm.gstin || ''}
                  onChange={(e) => handleGstinInput(e.target.value)}
                  className="w-full p-2.5 pr-8 rounded-xl border border-neutral-200 bg-white text-neutral-900 focus:border-black focus:outline-none font-mono uppercase text-xs"
                />
                {gstStatus?.isValid && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 absolute right-2.5 top-3 pointer-events-none" />
                )}
                {gstStatus && !gstStatus.isValid && (
                  <AlertCircle className="w-4 h-4 text-amber-500 absolute right-2.5 top-3 pointer-events-none" />
                )}
              </div>

              {gstStatus && (
                <div
                  className={`mt-2 p-2.5 rounded-xl text-xs flex items-start space-x-2 transition-all ${
                    gstStatus.isValid
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  {gstStatus.isValid ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                      <div className="space-y-0.5 text-[11px] leading-tight">
                        <div className="font-semibold text-neutral-900">
                          {gstStatus.tradeName || gstStatus.legalName} {gstStatus.legalName && gstStatus.tradeName !== gstStatus.legalName ? `(${gstStatus.legalName})` : ''}
                        </div>
                        <div className="text-emerald-700">
                          ✓ Live GSTN Active • {gstStatus.constitution || gstStatus.taxpayerType} {gstStatus.city ? `• ${gstStatus.city}, ${gstStatus.state}` : ''}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                      <div className="text-[11px] text-amber-800 leading-tight">
                        {gstStatus.message}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">PAN Number</label>
              <input
                type="text"
                maxLength={10}
                value={custForm.pan || ''}
                onChange={(e) => setCustForm({ ...custForm, pan: e.target.value.toUpperCase() })}
                className="w-full p-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-900 focus:border-black focus:outline-none font-mono uppercase text-xs"
              />
              <p className="mt-1 text-[10px] text-neutral-500">Auto-extracted from GSTIN or enter manually</p>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-neutral-700 mb-1">Billing Street Address</label>
            <input
              type="text"
              value={custForm.billingAddress || ''}
              onChange={(e) => setCustForm({ ...custForm, billingAddress: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-900 focus:border-black focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">State (GST POS) *</label>
              <select
                value={custForm.state || ''}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-900 focus:border-black focus:outline-none text-xs cursor-pointer"
              >
                <option value="">-- Select State --</option>
                {INDIAN_STATES.map((st) => (
                  <option key={st.code} value={st.name}>
                    {st.name} ({st.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">City</label>
              <input
                type="text"
                value={custForm.city || ''}
                onChange={(e) => setCustForm({ ...custForm, city: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-900 focus:border-black focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Pincode</label>
              <input
                type="text"
                value={custForm.pincode || ''}
                onChange={(e) => setCustForm({ ...custForm, pincode: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-900 focus:border-black focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200/80">
            <div>
              <label className="block font-semibold text-neutral-600 mb-1">Credit Limit (₹)</label>
              <input
                type="number"
                value={custForm.creditLimit ? custForm.creditLimit : ''}
                onChange={(e) => setCustForm({ ...custForm, creditLimit: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 rounded-lg border border-neutral-200 bg-white text-neutral-900 font-mono focus:border-black focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-neutral-600 mb-1">Opening Balance Due (₹)</label>
              <input
                type="number"
                value={custForm.currentBalance ? custForm.currentBalance : ''}
                onChange={(e) => setCustForm({ ...custForm, currentBalance: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 rounded-lg border border-neutral-200 bg-white text-neutral-900 font-mono focus:border-black focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-black hover:bg-neutral-800 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer"
          >
            Save Party
          </button>
        </form>
      </AppleModal>

      {/* Record Payment Voucher Modal */}
      <AppleModal
        isOpen={isPaymentVoucherOpen}
        onClose={() => setIsPaymentVoucherOpen(false)}
        title={`Receive Payment from ${selectedCustomer?.name}`}
        subtitle={`Current Balance: ${formatINR(selectedCustomer?.currentBalance || 0)}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleRecordPaymentSubmit} className="space-y-4 text-xs font-sans">
          <div>
            <label className="block font-semibold text-neutral-700 mb-1">Amount Received (₹) *</label>
            <input
              type="number"
              required
              min="1"
              value={paymentAmount || ''}
              onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
              className="w-full p-3 rounded-xl border border-neutral-200 bg-white text-neutral-900 font-mono font-bold text-base focus:border-black focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-neutral-700 mb-1">Payment Method</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-900 focus:border-black focus:outline-none cursor-pointer"
            >
              <option value="UPI">UPI / QR Code</option>
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank NEFT / RTGS</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-neutral-700 mb-1">Transaction Ref / Note</label>
            <input
              type="text"
              value={paymentNote}
              placeholder="e.g. UPI Ref / Bank Note"
              onChange={(e) => setPaymentNote(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400 focus:border-black focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-black hover:bg-neutral-800 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer"
          >
            Record Payment Receipt
          </button>
        </form>
      </AppleModal>
    </div>
  );
};
