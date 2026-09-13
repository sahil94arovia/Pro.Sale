import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { AppleModal } from '../common/AppleModal';
import { PaymentMode, SplitPaymentEntry, BusinessSettings } from '../../types';
import { formatINR } from '../../utils/formatters';
import {
  CreditCard,
  Banknote,
  QrCode,
  Landmark,
  FileCheck,
  Split,
  Plus,
  Trash2,
  CheckCircle2,
} from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  grandTotal: number;
  customerName: string;
  settings: BusinessSettings;
  initialMode?: PaymentMode;
  initialPaidAmount?: number;
  initialNotes?: string;
  onConfirmPayment: (
    mode: PaymentMode,
    paidAmount: number,
    splitEntries: SplitPaymentEntry[],
    notes: string
  ) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  grandTotal,
  customerName,
  settings,
  initialMode,
  initialPaidAmount,
  initialNotes,
  onConfirmPayment,
}) => {
  const [mode, setMode] = useState<PaymentMode>(initialMode || 'CASH');
  const [paidAmount, setPaidAmount] = useState<number>(
    initialPaidAmount !== undefined ? initialPaidAmount : grandTotal
  );
  const [notes, setNotes] = useState(initialNotes || '');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [splits, setSplits] = useState<SplitPaymentEntry[]>([
    { method: 'CASH', amount: Math.round(grandTotal / 2) },
    { method: 'UPI', amount: grandTotal - Math.round(grandTotal / 2) },
  ]);

  // When grandTotal changes or modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialMode) setMode(initialMode);
      if (initialPaidAmount !== undefined) {
        setPaidAmount(initialPaidAmount);
      } else {
        setPaidAmount(grandTotal);
      }
      if (initialNotes !== undefined) setNotes(initialNotes);
    }
  }, [isOpen, grandTotal, initialMode, initialPaidAmount, initialNotes]);

  // Generate UPI QR Code
  useEffect(() => {
    if (isOpen && settings.upiId) {
      const upiUrl = `upi://pay?pa=${settings.upiId}&pn=${encodeURIComponent(
        settings.firmName
      )}&am=${paidAmount > 0 ? paidAmount : grandTotal}&cu=INR&tn=${encodeURIComponent(
        'Invoice Payment'
      )}`;

      QRCode.toDataURL(upiUrl, { width: 200, margin: 1 })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error(err));
    }
  }, [isOpen, settings.upiId, paidAmount, grandTotal, settings.firmName]);

  const balanceRemaining = Math.max(0, grandTotal - paidAmount);

  const handleModeSelect = (newMode: PaymentMode) => {
    setMode(newMode);
    if (newMode === 'CREDIT') {
      setPaidAmount(0); // 100% Credit on Account
    } else if (newMode === 'SPLIT') {
      const sum = splits.reduce((s, x) => s + (x.amount || 0), 0);
      setPaidAmount(sum);
    } else {
      setPaidAmount(grandTotal);
    }
  };

  const handleSplitAmountChange = (index: number, val: number) => {
    const updated = [...splits];
    updated[index].amount = val;
    setSplits(updated);
    const sum = updated.reduce((s, x) => s + (x.amount || 0), 0);
    setPaidAmount(sum);
  };

  const handleAddSplit = () => {
    setSplits([...splits, { method: 'UPI', amount: 0 }]);
  };

  const handleRemoveSplit = (index: number) => {
    const updated = splits.filter((_, i) => i !== index);
    setSplits(updated);
    const sum = updated.reduce((s, x) => s + (x.amount || 0), 0);
    setPaidAmount(sum);
  };

  const handleSubmit = () => {
    // Trigger sweet celebration confetti
    try {
      confetti({
        particleCount: 75,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (e) {
      // ignore
    }

    onConfirmPayment(
      mode,
      paidAmount,
      mode === 'SPLIT' ? splits : [],
      notes
    );
    onClose();
  };

  return (
    <AppleModal
      isOpen={isOpen}
      onClose={onClose}
      title="Complete Payment & Settlement"
      subtitle={`Billing Total: ${formatINR(grandTotal)} for ${customerName || 'Walk-in Client'}`}
      maxWidth="max-w-xl"
    >
      <div className="space-y-6">
        {/* Payment Mode Selector Pills */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-2">
            Select Settlement Mode
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'CASH', label: 'Cash', icon: Banknote },
              { id: 'UPI', label: 'UPI QR Code', icon: QrCode },
              { id: 'CREDIT', label: 'Credit (On Account)', icon: CreditCard },
              { id: 'BANK_TRANSFER', label: 'Bank / NEFT', icon: Landmark },
              { id: 'CHEQUE', label: 'Cheque', icon: FileCheck },
              { id: 'SPLIT', label: 'Split Payment', icon: Split },
            ].map((item) => {
              const Icon = item.icon;
              const isSelected = mode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleModeSelect(item.id as PaymentMode)}
                  className={`flex items-center justify-center space-x-2 p-3 rounded-2xl border text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-black text-white border-black shadow-apple-subtle'
                      : 'bg-white hover:bg-gray-50 text-black border-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* UPI QR Code Dynamic Display */}
        {mode === 'UPI' && (
          <div className="p-4 bg-white rounded-2xl border border-gray-200 flex flex-col items-center justify-center text-center">
            <span className="text-xs font-semibold text-black">Scan & Pay with any UPI App</span>
            <span className="text-[11px] text-gray-500 mb-2">Google Pay, PhonePe, Paytm, BHIM</span>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="UPI QR" className="w-44 h-44 rounded-xl border border-gray-100 shadow-sm" />
            ) : (
              <div className="w-44 h-44 bg-gray-100 rounded-xl flex items-center justify-center text-xs text-gray-400">
                Generating QR...
              </div>
            )}
            <span className="text-xs font-sans tabular-nums font-medium text-black mt-2">
              UPI ID: {settings.upiId || 'Not configured'}
            </span>
            <span className="text-xs font-bold text-gray-800 mt-0.5 font-sans tabular-nums">
              Pay Amount: {formatINR(paidAmount)}
            </span>
          </div>
        )}

        {/* Split Payment Editor */}
        {mode === 'SPLIT' && (
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-black">Split Payment Breakdown</span>
              <button
                type="button"
                onClick={handleAddSplit}
                className="flex items-center space-x-1 text-xs text-black font-medium hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Row</span>
              </button>
            </div>

            {splits.map((entry, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <select
                  value={entry.method}
                  onChange={(e) => {
                    const up = [...splits];
                    up[idx].method = e.target.value as any;
                    setSplits(up);
                  }}
                  className="px-2.5 py-2 rounded-xl border border-gray-200 text-xs bg-white focus:outline-none font-medium"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK">Bank</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
                <input
                  type="number"
                  value={entry.amount || ''}
                  onChange={(e) => handleSplitAmountChange(idx, parseFloat(e.target.value) || 0)}
                  className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white focus:outline-none font-sans tabular-nums"
                />
                <input
                  type="text"
                  value={entry.referenceNo || ''}
                  onChange={(e) => {
                    const up = [...splits];
                    up[idx].referenceNo = e.target.value;
                    setSplits(up);
                  }}
                  className="w-28 px-2.5 py-2 rounded-xl border border-gray-200 text-xs bg-white focus:outline-none"
                />
                {splits.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSplit(idx)}
                    className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Amount Received & Balance Summary */}
        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2 font-sans">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-500">Bill Grand Total:</span>
            <span className="font-semibold text-gray-800 tabular-nums">{formatINR(grandTotal)}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-gray-700">Amount Received Now:</span>
            <div className="w-36">
              <input
                type="number"
                value={paidAmount || 0}
                disabled={mode === 'CREDIT' || mode === 'SPLIT'}
                onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                className="w-full text-right font-sans tabular-nums font-bold text-sm px-3 py-1.5 rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-[#0071e3] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-gray-200 text-xs">
            <span className="font-medium text-gray-600">Pending Balance Due / Credit:</span>
            <span
              className={`font-bold font-sans tabular-nums ${
                balanceRemaining > 0 ? 'text-amber-600' : 'text-emerald-600'
              }`}
            >
              {formatINR(balanceRemaining)}
            </span>
          </div>
        </div>

        {/* Payment Notes / Reference */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Reference / Cheque / Transaction Note (Optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#0071e3] focus:outline-none"
          />
        </div>

        {/* Confirm Button */}
        <button
          onClick={handleSubmit}
          className="w-full flex items-center justify-center space-x-2 py-3.5 rounded-2xl bg-black hover:bg-neutral-900 active:scale-[0.99] text-white font-medium text-sm shadow-apple-card transition-all cursor-pointer"
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>Confirm & Complete Billing ({formatINR(paidAmount)} Paid)</span>
        </button>
      </div>
    </AppleModal>
  );
};
