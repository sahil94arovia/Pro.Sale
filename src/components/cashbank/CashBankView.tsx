import React, { useState, useMemo } from 'react';
import {
  Landmark,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Download,
  Printer,
  CreditCard,
  QrCode,
  CheckCircle2,
  Calendar,
  Building2,
  Receipt,
  Plus,
} from 'lucide-react';
import { Invoice, Expense, BusinessSettings, CustomerLedgerEntry } from '../../types';
import { formatINR, formatDate, formatDateTime } from '../../utils/formatters';

interface CashBankViewProps {
  invoices: Invoice[];
  expenses: Expense[];
  settings: BusinessSettings;
  ledgerEntries?: CustomerLedgerEntry[];
  activeSubTab?: string;
  onOpenAddExpense?: () => void;
  onOpenAddSale?: () => void;
}

export const CashBankView: React.FC<CashBankViewProps> = ({
  invoices,
  expenses,
  settings,
  ledgerEntries = [],
  activeSubTab = 'bank_accounts',
  onOpenAddExpense,
  onOpenAddSale,
}) => {
  const [activeTab, setActiveTab] = useState<'bank' | 'cash'>(
    activeSubTab === 'cash_in_hand' ? 'cash' : 'bank'
  );
  const [searchQuery, setSearchQuery] = useState('');

  React.useEffect(() => {
    if (activeSubTab === 'cash_in_hand') {
      setActiveTab('cash');
    } else if (activeSubTab === 'bank_accounts') {
      setActiveTab('bank');
    }
  }, [activeSubTab]);

  // Aggregate Bank Transactions (Invoices via UPI/BANK + Ledger entries + Expenses via UPI/BANK)
  const bankTransactions = useMemo(() => {
    const list: Array<{
      id: string;
      date: string;
      particulars: string;
      reference: string;
      mode: string;
      type: 'CREDIT' | 'DEBIT';
      amount: number;
    }> = [];

    // Bank Inflow from Invoices
    invoices.forEach((inv) => {
      if (inv.paymentMode === 'UPI' || inv.paymentMode === 'BANK_TRANSFER') {
        if (inv.paidAmount > 0) {
          list.push({
            id: `inv-${inv.id}`,
            date: inv.date,
            particulars: `Invoice Payment: ${inv.customer.name}`,
            reference: inv.invoiceNumber,
            mode: inv.paymentMode,
            type: 'CREDIT',
            amount: inv.paidAmount,
          });
        }
      } else if (inv.paymentMode === 'SPLIT' && inv.splitPayments) {
        inv.splitPayments.forEach((sp, idx) => {
          if ((sp.method === 'UPI' || sp.method === 'BANK') && sp.amount > 0) {
            list.push({
              id: `inv-sp-${inv.id}-${idx}`,
              date: inv.date,
              particulars: `Split Payment (${sp.method}): ${inv.customer.name}`,
              reference: inv.invoiceNumber,
              mode: sp.method,
              type: 'CREDIT',
              amount: sp.amount,
            });
          }
        });
      }
    });

    // Bank Outflow from Expenses
    expenses.forEach((exp) => {
      if (exp.paymentMode === 'BANK' || exp.paymentMode === 'UPI') {
        list.push({
          id: `exp-${exp.id}`,
          date: exp.date,
          particulars: `${exp.category}: ${exp.paidTo || exp.description}`,
          reference: exp.receiptNo || 'Voucher',
          mode: exp.paymentMode,
          type: 'DEBIT',
          amount: exp.amount,
        });
      }
    });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [invoices, expenses]);

  // Aggregate Cash Transactions
  const cashTransactions = useMemo(() => {
    const list: Array<{
      id: string;
      date: string;
      particulars: string;
      reference: string;
      mode: string;
      type: 'CREDIT' | 'DEBIT';
      amount: number;
    }> = [];

    // Cash Sales Inflow
    invoices.forEach((inv) => {
      if (inv.paymentMode === 'CASH' && inv.paidAmount > 0) {
        list.push({
          id: `cash-inv-${inv.id}`,
          date: inv.date,
          particulars: `Cash Sale: ${inv.customer.name}`,
          reference: inv.invoiceNumber,
          mode: 'CASH',
          type: 'CREDIT',
          amount: inv.paidAmount,
        });
      } else if (inv.paymentMode === 'SPLIT' && inv.splitPayments) {
        inv.splitPayments.forEach((sp, idx) => {
          if (sp.method === 'CASH' && sp.amount > 0) {
            list.push({
              id: `cash-sp-${inv.id}-${idx}`,
              date: inv.date,
              particulars: `Split Cash: ${inv.customer.name}`,
              reference: inv.invoiceNumber,
              mode: 'CASH',
              type: 'CREDIT',
              amount: sp.amount,
            });
          }
        });
      }
    });

    // Cash Expenses Outflow
    expenses.forEach((exp) => {
      if (exp.paymentMode === 'CASH') {
        list.push({
          id: `cash-exp-${exp.id}`,
          date: exp.date,
          particulars: `${exp.category}: ${exp.paidTo || exp.description}`,
          reference: exp.receiptNo || 'Cash Voucher',
          mode: 'CASH',
          type: 'DEBIT',
          amount: exp.amount,
        });
      }
    });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [invoices, expenses]);

  // Totals
  const totalBankCredit = bankTransactions
    .filter((t) => t.type === 'CREDIT')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalBankDebit = bankTransactions
    .filter((t) => t.type === 'DEBIT')
    .reduce((sum, t) => sum + t.amount, 0);
  const netBankBalance = totalBankCredit - totalBankDebit;

  const totalCashCredit = cashTransactions
    .filter((t) => t.type === 'CREDIT')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalCashDebit = cashTransactions
    .filter((t) => t.type === 'DEBIT')
    .reduce((sum, t) => sum + t.amount, 0);
  const netCashBalance = totalCashCredit - totalCashDebit;

  const activeTransactions = activeTab === 'bank' ? bankTransactions : cashTransactions;
  const filteredTransactions = activeTransactions.filter(
    (t) =>
      t.particulars.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.mode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans text-xs text-black">
      {/* Top Header & Tab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-black/[0.06]">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-neutral-900 text-white flex items-center justify-center font-bold shadow-2xs">
            {activeTab === 'bank' ? <Landmark className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}
          </div>
          <div>
            <h1 className="text-base font-bold text-neutral-900 tracking-tight leading-tight">
              {activeTab === 'bank' ? 'Bank Accounts & Online Transfers' : 'Cash in Hand (Cash Register)'}
            </h1>
            <p className="text-[11px] text-neutral-500">
              Track live bank balances, UPI credits, cash drawer receipts, and outlays
            </p>
          </div>
        </div>

        {/* Clean Segmented Controls */}
        <div className="flex items-center bg-neutral-200/60 p-1 rounded-2xl border border-neutral-200">
          <button
            type="button"
            onClick={() => setActiveTab('bank')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'bank'
                ? 'bg-white text-black shadow-xs'
                : 'text-neutral-600 hover:text-black'
            }`}
          >
            <Landmark className="w-4 h-4" />
            <span>Bank Accounts ({bankTransactions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cash')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'cash'
                ? 'bg-white text-black shadow-xs'
                : 'text-neutral-600 hover:text-black'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Cash in Hand ({cashTransactions.length})</span>
          </button>
        </div>
      </div>

      {/* KPI Balance Highlights */}
      {activeTab === 'bank' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Primary Bank Card */}
          <div className="p-5 bg-white rounded-3xl border border-neutral-200/80 shadow-apple-subtle space-y-3 md:col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0071e3] flex items-center justify-center font-bold">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-neutral-900 text-sm">
                    {settings.bankName || 'State Bank of India'}
                  </h3>
                  <p className="text-[11px] text-neutral-500 font-mono">
                    A/C: {settings.accountNumber || '382001092834'} • IFSC: {settings.ifscCode || 'SBIN0001234'}
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[10px]">
                Primary Account
              </span>
            </div>

            <div className="pt-2 flex flex-wrap items-baseline justify-between gap-2 border-t border-neutral-100">
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">
                  Net Ledger Balance
                </span>
                <span className="text-2xl font-bold font-mono text-neutral-900">
                  {formatINR(netBankBalance)}
                </span>
              </div>
              <div className="flex items-center space-x-4 text-xs font-mono">
                <div>
                  <span className="text-neutral-400 text-[10px] block">Deposits (+)</span>
                  <span className="text-emerald-700 font-bold">+{formatINR(totalBankCredit)}</span>
                </div>
                <div>
                  <span className="text-neutral-400 text-[10px] block">Withdrawals (-)</span>
                  <span className="text-red-600 font-bold">-{formatINR(totalBankDebit)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* UPI ID Card */}
          <div className="p-5 bg-white rounded-3xl border border-neutral-200/80 shadow-apple-subtle flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center space-x-2 pb-2 border-b border-neutral-100 text-[#0071e3]">
                <QrCode className="w-4 h-4" />
                <h4 className="font-bold text-neutral-900">UPI Digital Payments</h4>
              </div>
              <p className="text-[11px] text-neutral-500 mt-2">Active VPA Handle for customer scanning:</p>
              <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200 font-mono font-bold text-neutral-800 text-xs mt-1">
                {settings.upiId || 'shyamjimukhwas@sbi'}
              </div>
            </div>
            <p className="text-[10px] text-neutral-400">
              Payments via UPI are credited straight into your linked bank account.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Cash In Hand Summary */}
          <div className="p-5 bg-white rounded-3xl border border-neutral-200/80 shadow-apple-subtle space-y-3 md:col-span-2">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-neutral-900 text-sm">Physical Cash Register</h3>
                <p className="text-[11px] text-neutral-500">
                  Store counter currency notes & coin reserves
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-baseline justify-between gap-2 border-t border-neutral-100">
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">
                  Current Cash in Hand
                </span>
                <span className="text-2xl font-bold font-mono text-neutral-900">
                  {formatINR(netCashBalance)}
                </span>
              </div>
              <div className="flex items-center space-x-4 text-xs font-mono">
                <div>
                  <span className="text-neutral-400 text-[10px] block">Cash Collected (+)</span>
                  <span className="text-emerald-700 font-bold">+{formatINR(totalCashCredit)}</span>
                </div>
                <div>
                  <span className="text-neutral-400 text-[10px] block">Cash Spent (-)</span>
                  <span className="text-red-600 font-bold">-{formatINR(totalCashDebit)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Cash Actions */}
          <div className="p-5 bg-white rounded-3xl border border-neutral-200/80 shadow-apple-subtle flex flex-col justify-between space-y-3">
            <div>
              <h4 className="font-bold text-neutral-900 text-xs">Fast Cash Shortcuts</h4>
              <p className="text-[11px] text-neutral-500 mt-1">
                Record counter sale cash or log petty cash expenses:
              </p>
            </div>
            <div className="space-y-2">
              {onOpenAddSale && (
                <button
                  type="button"
                  onClick={onOpenAddSale}
                  className="w-full py-2 px-3 bg-neutral-900 hover:bg-black text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-2 cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Cash Bill (F2)</span>
                </button>
              )}
              {onOpenAddExpense && (
                <button
                  type="button"
                  onClick={onOpenAddExpense}
                  className="w-full py-2 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Log Cash Expense</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transaction Ledger Table */}
      <div className="p-6 bg-white rounded-3xl border border-neutral-200/80 shadow-apple-subtle space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-100">
          <div>
            <h2 className="text-sm font-bold text-neutral-900">
              {activeTab === 'bank' ? 'Bank Account Passbook Ledger' : 'Cash Drawer Statement'}
            </h2>
            <p className="text-[11px] text-neutral-500">
              {filteredTransactions.length} entries recorded
            </p>
          </div>

          <div className="relative w-72">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search particulars, ref, or amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-neutral-200 bg-neutral-50 text-xs focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-neutral-50 text-neutral-600 font-bold border-b border-neutral-200 text-[11px]">
                <th className="p-3">Date</th>
                <th className="p-3">Particulars / Description</th>
                <th className="p-3">Ref No.</th>
                <th className="p-3">Payment Mode</th>
                <th className="p-3 text-right">Debit / Outflow (-)</th>
                <th className="p-3 text-right">Credit / Inflow (+)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-400">
                    No transactions recorded yet in {activeTab === 'bank' ? 'Bank Account' : 'Cash Register'}.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-neutral-50/70 transition-colors">
                    <td className="p-3 font-mono text-neutral-500">{formatDate(tx.date)}</td>
                    <td className="p-3 font-semibold text-neutral-900">{tx.particulars}</td>
                    <td className="p-3 font-mono text-neutral-500">{tx.reference}</td>
                    <td className="p-3 font-medium">
                      <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 font-mono text-[10px]">
                        {tx.mode}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-red-600">
                      {tx.type === 'DEBIT' ? `-${formatINR(tx.amount)}` : '—'}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-700">
                      {tx.type === 'CREDIT' ? `+${formatINR(tx.amount)}` : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
