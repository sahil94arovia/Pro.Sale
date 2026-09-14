import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  ArrowRight,
  Printer,
  CheckCircle2,
  Clock,
  Trash2,
  PackageCheck,
} from 'lucide-react';
import { DeliveryChallan, Product, Customer, InvoiceItem, BusinessSettings } from '../../types';
import { formatDate, formatINR } from '../../utils/formatters';
import { AppleModal } from '../common/AppleModal';
import { calculateItemTaxes } from '../../services/gstCalculator';

interface DeliveryChallanViewProps {
  challans: DeliveryChallan[];
  products: Product[];
  customers: Customer[];
  settings: BusinessSettings;
  onSaveChallan: (challan: DeliveryChallan) => void;
  onConvertToInvoice: (challan: DeliveryChallan) => void;
  onDeleteChallan: (id: string) => void;
}

export const DeliveryChallanView: React.FC<DeliveryChallanViewProps> = ({
  challans,
  products,
  customers,
  settings,
  onSaveChallan,
  onConvertToInvoice,
  onDeleteChallan,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([]);

  useEffect(() => {
    if (!selectedCustomerId && customers.length > 0) {
      setSelectedCustomerId(customers[0].id);
    }
  }, [customers, selectedCustomerId]);

  const customer = customers.find((c) => c.id === selectedCustomerId) || customers[0];
  const isInterState = customer ? customer.stateCode !== settings.stateCode : false;

  const handleAddItem = (p: Product) => {
    const calculated = calculateItemTaxes(
      {
        id: 'citem-' + Date.now() + Math.random(),
        productId: p.id,
        name: p.name,
        hsn: p.hsn,
        qty: 1,
        unit: p.unit,
        mrp: p.mrp,
        purchasePrice: p.purchasePrice,
        salePrice: p.salePrice,
        discountPercent: 0,
        taxRate: p.taxRate,
      },
      isInterState
    );
    setItems((prev) => [...prev, calculated]);
  };

  const handleUpdateQty = (idx: number, qty: number) => {
    setItems((prev) => {
      const up = [...prev];
      const target = up[idx];
      if (target) {
        up[idx] = calculateItemTaxes(
          {
            ...target,
            qty: Math.max(1, qty),
          },
          isInterState
        );
      }
      return up;
    });
  };

  const handleRemoveItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCreateChallan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || items.length === 0) {
      alert('Please select customer and add items for dispatch.');
      return;
    }

    const newChallan: DeliveryChallan = {
      id: 'dc-' + Date.now(),
      challanNumber: `DC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString(),
      customer,
      items,
      vehicleNumber: vehicleNumber.trim() || undefined,
      driverName: driverName.trim() || undefined,
      status: 'DISPATCHED',
      notes,
      createdAt: new Date().toISOString(),
    };

    onSaveChallan(newChallan);
    setIsModalOpen(false);
    setItems([]);
    setVehicleNumber('');
    setDriverName('');
    setNotes('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans text-xs text-neutral-900">
      {/* Top Header */}
      <div className="p-5 bg-white rounded-3xl border border-neutral-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 tracking-tight">Delivery Challans & Dispatch</h2>
          <p className="text-xs text-neutral-500">
            Track goods sent on approval, delivery, or logistics before generating final invoice
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 rounded-2xl bg-black hover:bg-neutral-800 active:scale-95 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Delivery Challan</span>
        </button>
      </div>

      {/* Challans List */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-xs overflow-hidden">
        {challans.length === 0 ? (
          <div className="p-16 text-center text-neutral-400 space-y-3">
            <Truck className="w-10 h-10 mx-auto text-neutral-400" />
            <p className="text-sm font-semibold text-neutral-900">No delivery challans created yet</p>
            <p className="text-xs text-neutral-500 max-w-xs mx-auto">
              Create dispatch challans for vehicle gate passes and material transport.
            </p>
          </div>
        ) : (
          <div>
            {/* Mobile View: Cards (< md) */}
            <div className="md:hidden p-4 space-y-3">
              {challans.map((c) => (
                <div key={c.id} className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-neutral-900 text-xs">{c.challanNumber}</span>
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                        c.status === 'CONVERTED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : c.status === 'DISPATCHED'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-neutral-900 text-xs">{c.customer.name}</div>
                    <div className="text-[10px] text-neutral-500">{formatDate(c.date)} • {c.customer.city || 'Local'}</div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-neutral-600 pt-2 border-t border-neutral-200/60">
                    <span>Veh: <strong className="text-neutral-900 font-mono">{c.vehicleNumber || '—'}</strong></span>
                    <span>Driver: <strong className="text-neutral-900">{c.driverName || '—'}</strong></span>
                  </div>
                  <div className="flex items-center justify-end space-x-2 pt-1">
                    {c.status !== 'CONVERTED' && (
                      <button
                        onClick={() => onConvertToInvoice(c)}
                        className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs border border-emerald-200 transition-colors"
                      >
                        <span>Convert to Invoice</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => onDeleteChallan(c.id)}
                      title="Delete Challan"
                      className="p-1.5 rounded-xl bg-neutral-100 hover:bg-rose-50 text-neutral-500 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop / Tablet View: Table (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-50/80 text-neutral-600 font-bold border-b border-neutral-200/80">
                    <th className="py-3.5 px-4">Challan No</th>
                    <th className="py-3.5 px-3">Date</th>
                    <th className="py-3.5 px-4">Client / Destination</th>
                    <th className="py-3.5 px-3">Vehicle No</th>
                    <th className="py-3.5 px-3">Driver / Transporter</th>
                    <th className="py-3.5 px-3 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {challans.map((c) => (
                    <tr key={c.id} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-neutral-900">{c.challanNumber}</td>
                      <td className="py-3.5 px-3 text-neutral-600">{formatDate(c.date)}</td>
                      <td className="py-3.5 px-4 font-medium text-neutral-900">
                        <div>{c.customer.name}</div>
                        <span className="text-[10px] text-neutral-500">{c.customer.city}, {c.customer.state}</span>
                      </td>
                      <td className="py-3.5 px-3 font-mono font-semibold text-neutral-700">{c.vehicleNumber || '—'}</td>
                      <td className="py-3.5 px-3 text-neutral-700">{c.driverName || '—'}</td>
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                            c.status === 'CONVERTED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : c.status === 'DISPATCHED'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {c.status !== 'CONVERTED' && (
                            <button
                              onClick={() => onConvertToInvoice(c)}
                              className="flex items-center space-x-1 px-3 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs border border-emerald-200 transition-colors"
                            >
                              <span>Convert to Invoice</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => onDeleteChallan(c.id)}
                            title="Delete Challan"
                            className="p-1.5 rounded-xl hover:bg-rose-50 text-neutral-400 hover:text-rose-600 transition-colors"
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

      {/* New Delivery Challan Modal */}
      <AppleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Delivery Challan / Gate Pass"
        subtitle="Record goods movement with vehicle and logistics info"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateChallan} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Receiver Party *</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:border-black"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id} className="bg-white text-neutral-900">
                    {c.name} {c.companyName ? `(${c.companyName})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Vehicle / Truck Number</label>
              <input
                type="text"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                className="w-full p-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black font-mono uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Driver / Transporter Name</label>
              <input
                type="text"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black"
              />
            </div>
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Dispatch Remarks</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-neutral-700 mb-1">Select Items for Dispatch</label>
            <div className="flex flex-wrap gap-1.5 p-3 bg-neutral-50 rounded-2xl border border-neutral-200/80 max-h-36 overflow-y-auto">
              {products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleAddItem(p)}
                  className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-800 text-[11px] font-medium transition-colors shadow-xs cursor-pointer"
                >
                  + {p.name}
                </button>
              ))}
            </div>
          </div>

          {items.length > 0 && (
            <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-neutral-800 block">Dispatch Items ({items.length})</span>
                <span className="text-[11px] font-mono text-neutral-500">
                  Total: {formatINR(items.reduce((s, i) => s + i.total, 0))}
                </span>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {items.map((it, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-xl border border-neutral-200 shadow-xs">
                    <div className="truncate max-w-[180px]">
                      <span className="font-medium text-neutral-900 text-[11px] block truncate">{it.name}</span>
                      <span className="text-[10px] text-neutral-500 font-mono">@ {formatINR(it.salePrice)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="1"
                        value={it.qty}
                        onChange={(e) => handleUpdateQty(idx, parseInt(e.target.value, 10) || 1)}
                        className="w-14 text-center p-1 rounded-lg border border-neutral-200 bg-white text-neutral-900 font-mono text-xs focus:outline-none focus:border-black"
                      />
                      <span className="text-neutral-500 font-mono text-xs">{it.unit}</span>
                      <span className="font-mono text-xs font-bold text-neutral-900 w-16 text-right">
                        {formatINR(it.total)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1 text-neutral-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-black hover:bg-neutral-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            Issue Delivery Challan
          </button>
        </form>
      </AppleModal>
    </div>
  );
};
