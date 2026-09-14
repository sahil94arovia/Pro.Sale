import React, { useState } from 'react';
import {
  FileText,
  Plus,
  ArrowRight,
  CheckCircle,
  XCircle,
  Share2,
  Trash2,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { Quotation, Product, Customer, InvoiceItem, BusinessSettings } from '../../types';
import { formatINR, formatDate } from '../../utils/formatters';
import { AppleModal } from '../common/AppleModal';
import { calculateInvoiceTotals } from '../../services/gstCalculator';
import { openWhatsApp } from '../../services/whatsapp';

interface QuotationViewProps {
  quotations: Quotation[];
  products: Product[];
  customers: Customer[];
  settings: BusinessSettings;
  onSaveQuotation: (quote: Quotation) => void;
  onConvertToInvoice: (quote: Quotation) => void;
  onDeleteQuotation: (id: string) => void;
}

export const QuotationView: React.FC<QuotationViewProps> = ({
  quotations,
  products,
  customers,
  settings,
  onSaveQuotation,
  onConvertToInvoice,
  onDeleteQuotation,
}) => {
  const [isNewQuoteOpen, setIsNewQuoteOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  const [quoteItems, setQuoteItems] = useState<InvoiceItem[]>([]);
  const [expiryDays, setExpiryDays] = useState(15);
  const [quoteNotes, setQuoteNotes] = useState('Quotation valid for 15 days from date of issue.');

  React.useEffect(() => {
    if (!selectedCustomerId && customers.length > 0) {
      setSelectedCustomerId(customers[0].id);
    }
  }, [customers, selectedCustomerId]);

  const customer = customers.find((c) => c.id === selectedCustomerId) || customers[0];
  const isInterState = customer ? customer.stateCode !== settings.stateCode : false;
  const totals = calculateInvoiceTotals(quoteItems, isInterState, 0);

  const handleAddItem = (prod: Product) => {
    const newItem: InvoiceItem = {
      id: 'qitem-' + Date.now() + Math.random(),
      productId: prod.id,
      name: prod.name,
      hsn: prod.hsn,
      qty: 1,
      unit: prod.unit,
      mrp: prod.mrp,
      purchasePrice: prod.purchasePrice,
      salePrice: prod.salePrice,
      discountPercent: 0,
      discountAmount: 0,
      taxRate: prod.taxRate,
      taxableAmount: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      total: 0,
    };
    setQuoteItems([...quoteItems, newItem]);
  };

  const handleCreateQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || quoteItems.length === 0) {
      alert('Please select a customer and add at least one item.');
      return;
    }

    const newQuote: Quotation = {
      id: 'quote-' + Date.now(),
      quoteNumber: `EST-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString(),
      expiryDate: new Date(Date.now() + expiryDays * 86400000).toISOString(),
      customer,
      items: totals.items,
      subtotal: totals.subtotal,
      taxableTotal: totals.taxableTotal,
      cgstTotal: totals.cgstTotal,
      sgstTotal: totals.sgstTotal,
      igstTotal: totals.igstTotal,
      grandTotal: totals.grandTotal,
      status: 'SENT',
      notes: quoteNotes,
      createdAt: new Date().toISOString(),
    };

    onSaveQuotation(newQuote);
    setIsNewQuoteOpen(false);
    setQuoteItems([]);
  };

  const handleShareWhatsApp = (q: Quotation) => {
    const msg = `*Quotation / Estimate from ${settings.firmName}*
Quote No: ${q.quoteNumber}
Billed To: ${q.customer.name}
Total Value: ${formatINR(q.grandTotal)}
Validity: Valid until ${formatDate(q.expiryDate)}

Kindly let us know to confirm order.
Contact: ${settings.phone}`;
    openWhatsApp(q.customer.phone || '', msg);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans text-xs text-neutral-900">
      {/* Top Header */}
      <div className="p-5 bg-white rounded-3xl border border-neutral-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 tracking-tight">Estimates & Quotations</h2>
          <p className="text-xs text-neutral-500">
            Create professional price quotes and convert them to GST Invoices with 1-click
          </p>
        </div>
        <button
          onClick={() => setIsNewQuoteOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 rounded-2xl bg-black hover:bg-neutral-800 active:scale-95 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Quotation</span>
        </button>
      </div>

      {/* Quotations List */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-xs overflow-hidden">
        {quotations.length === 0 ? (
          <div className="p-16 text-center text-neutral-500 space-y-3">
            <FileText className="w-10 h-10 mx-auto text-neutral-400" />
            <p className="text-sm font-semibold text-neutral-900">No quotations created yet</p>
            <p className="text-xs text-neutral-500 max-w-xs mx-auto">
              Create formal estimates for prospective clients and convert them directly into invoices.
            </p>
          </div>
        ) : (
          <div>
            {/* Mobile View: Cards (< md) */}
            <div className="md:hidden p-4 space-y-3">
              {quotations.map((q) => (
                <div key={q.id} className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-neutral-900 text-xs">{q.quoteNumber}</span>
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                        q.status === 'CONVERTED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : q.status === 'SENT'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                      }`}
                    >
                      {q.status}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-neutral-900 text-xs">{q.customer.name}</div>
                    <div className="text-[10px] text-neutral-500">{formatDate(q.date)} • {q.items.length} items</div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-neutral-200/60">
                    <span className="font-mono text-xs font-bold text-blue-600">
                      {formatINR(q.grandTotal)}
                    </span>
                    <div className="flex items-center space-x-2">
                      {q.status !== 'CONVERTED' && (
                        <button
                          onClick={() => onConvertToInvoice(q)}
                          className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs border border-emerald-200 transition-colors cursor-pointer"
                        >
                          <span>Convert</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleShareWhatsApp(q)}
                        title="Share via WhatsApp"
                        className="p-1.5 rounded-xl bg-white hover:bg-neutral-100 text-neutral-600 border border-neutral-200 transition-colors cursor-pointer"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteQuotation(q.id)}
                        title="Delete Quote"
                        className="p-1.5 rounded-xl bg-white hover:bg-rose-50 text-neutral-400 hover:text-rose-600 border border-neutral-200 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop / Tablet View: Table (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-50/80 text-neutral-600 font-bold border-b border-neutral-200/80">
                    <th className="py-3.5 px-4">Quote No</th>
                    <th className="py-3.5 px-3">Date</th>
                    <th className="py-3.5 px-4">Client / Party</th>
                    <th className="py-3.5 px-3 text-right">Items</th>
                    <th className="py-3.5 px-4 text-right">Quote Amount (₹)</th>
                    <th className="py-3.5 px-3 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {quotations.map((q) => (
                    <tr key={q.id} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-neutral-900">{q.quoteNumber}</td>
                      <td className="py-3.5 px-3 text-neutral-500">{formatDate(q.date)}</td>
                      <td className="py-3.5 px-4 font-medium text-neutral-900">
                        <div>{q.customer.name}</div>
                        <span className="text-[10px] text-neutral-500">{q.customer.companyName}</span>
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-neutral-500">{q.items.length} items</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-blue-600">
                        {formatINR(q.grandTotal)}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                            q.status === 'CONVERTED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : q.status === 'SENT'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                          }`}
                        >
                          {q.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {q.status !== 'CONVERTED' && (
                            <button
                              onClick={() => onConvertToInvoice(q)}
                              className="flex items-center space-x-1 px-3 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs border border-emerald-200 transition-colors cursor-pointer"
                            >
                              <span>Convert to Invoice</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleShareWhatsApp(q)}
                            title="Share via WhatsApp"
                            className="p-1.5 rounded-xl hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeleteQuotation(q.id)}
                            title="Delete Quote"
                            className="p-1.5 rounded-xl hover:bg-rose-50 text-neutral-400 hover:text-rose-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* New Quotation Modal */}
      <AppleModal
        isOpen={isNewQuoteOpen}
        onClose={() => setIsNewQuoteOpen(false)}
        title="Create New Estimate / Quotation"
        subtitle="Generate quotation with validity terms and tax breakdown"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateQuote} className="space-y-4 text-xs font-sans">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Select Client / Party *</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:border-black cursor-pointer"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.companyName ? `(${c.companyName})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Validity Period (Days)</label>
              <input
                type="number"
                min="1"
                value={expiryDays}
                onChange={(e) => setExpiryDays(parseInt(e.target.value, 10) || 15)}
                className="w-full p-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:border-black font-mono"
              />
            </div>
          </div>

          {/* Add Products to Quote */}
          <div>
            <label className="block font-semibold text-neutral-700 mb-1">Add Items from Catalog</label>
            <div className="flex flex-wrap gap-1.5 p-3 bg-neutral-50 rounded-2xl border border-neutral-200 max-h-36 overflow-y-auto">
              {products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleAddItem(p)}
                  className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-900 text-[11px] font-medium transition-colors shadow-2xs cursor-pointer"
                >
                  + {p.name} ({formatINR(p.salePrice)})
                </button>
              ))}
            </div>
          </div>

          {/* Selected Items */}
          {quoteItems.length > 0 && (
            <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2">
              <span className="font-semibold text-neutral-800 block">Quotation Items ({quoteItems.length})</span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {quoteItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-xl border border-neutral-200 shadow-2xs">
                    <span className="font-medium text-neutral-900 text-[11px] truncate max-w-[200px]">{item.name}</span>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => {
                          const up = [...quoteItems];
                          up[idx].qty = Math.max(1, parseInt(e.target.value, 10) || 1);
                          setQuoteItems(up);
                        }}
                        className="w-12 text-center p-1 rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-900 font-mono"
                      />
                      <span className="font-mono text-[11px] font-bold text-neutral-900">
                        {formatINR(item.salePrice * item.qty)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuoteItems(quoteItems.filter((_, i) => i !== idx))}
                        className="text-neutral-400 hover:text-rose-600 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-neutral-200 flex justify-between font-bold text-xs">
                <span className="text-neutral-600">Total Quotation Value:</span>
                <span className="font-mono text-blue-600 text-sm">{formatINR(totals.grandTotal)}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block font-semibold text-neutral-700 mb-1">Terms / Notes</label>
            <textarea
              rows={2}
              value={quoteNotes}
              onChange={(e) => setQuoteNotes(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-black hover:bg-neutral-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            Create Quotation
          </button>
        </form>
      </AppleModal>
    </div>
  );
};
