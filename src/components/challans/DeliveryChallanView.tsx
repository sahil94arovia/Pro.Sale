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
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="p-5 bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-apple-subtle flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-black tracking-tight">Delivery Challans & Dispatch</h2>
          <p className="text-xs text-gray-500">
            Track goods sent on approval, delivery, or logistics before generating final invoice
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 rounded-2xl bg-black hover:bg-neutral-900 active:scale-95 text-white text-xs font-semibold shadow-apple-subtle transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Delivery Challan</span>
        </button>
      </div>

      {/* Challans List */}
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-apple-subtle overflow-hidden">
        {challans.length === 0 ? (
          <div className="p-16 text-center text-gray-400 space-y-3">
            <Truck className="w-10 h-10 mx-auto text-gray-300" />
            <p className="text-sm font-semibold text-gray-600">No delivery challans created yet</p>
            <p className="text-xs text-gray-400 max-w-xs mx-auto">
              Create dispatch challans for vehicle gate passes and material transport.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                  <th className="py-3.5 px-4">Challan No</th>
                  <th className="py-3.5 px-3">Date</th>
                  <th className="py-3.5 px-4">Client / Destination</th>
                  <th className="py-3.5 px-3">Vehicle No</th>
                  <th className="py-3.5 px-3">Driver / Transporter</th>
                  <th className="py-3.5 px-3 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {challans.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-black">{c.challanNumber}</td>
                    <td className="py-3.5 px-3 text-gray-500">{formatDate(c.date)}</td>
                    <td className="py-3.5 px-4 font-medium text-gray-900">
                      <div>{c.customer.name}</div>
                      <span className="text-[10px] text-gray-400">{c.customer.city}, {c.customer.state}</span>
                    </td>
                    <td className="py-3.5 px-3 font-mono font-semibold text-gray-700">{c.vehicleNumber || '—'}</td>
                    <td className="py-3.5 px-3 text-gray-600">{c.driverName || '—'}</td>
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold uppercase ${
                          c.status === 'CONVERTED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : c.status === 'DISPATCHED'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-amber-50 text-amber-700'
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
                            className="flex items-center space-x-1 px-3 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs border border-emerald-200 transition-colors"
                          >
                            <span>Convert to Invoice</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => onDeleteChallan(c.id)}
                          title="Delete Challan"
                          className="p-1.5 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-600"
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Receiver Party *</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.companyName ? `(${c.companyName})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Vehicle / Truck Number</label>
              <input
                type="text"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none font-mono uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Driver / Transporter Name</label>
              <input
                type="text"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Dispatch Remarks</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Select Items for Dispatch</label>
            <div className="flex flex-wrap gap-1.5 p-3 bg-gray-50 rounded-2xl border border-gray-200 max-h-36 overflow-y-auto">
              {products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleAddItem(p)}
                  className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-neutral-50 border border-gray-200 text-black text-[11px] font-medium transition-colors"
                >
                  + {p.name}
                </button>
              ))}
            </div>
          </div>

          {items.length > 0 && (
            <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-700 block">Dispatch Items ({items.length})</span>
                <span className="text-[11px] font-mono text-gray-500">
                  Total: {formatINR(items.reduce((s, i) => s + i.total, 0))}
                </span>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {items.map((it, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-xl border border-gray-200">
                    <div className="truncate max-w-[180px]">
                      <span className="font-medium text-gray-800 text-[11px] block truncate">{it.name}</span>
                      <span className="text-[10px] text-gray-400 font-mono">@ {formatINR(it.salePrice)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="1"
                        value={it.qty}
                        onChange={(e) => handleUpdateQty(idx, parseInt(e.target.value, 10) || 1)}
                        className="w-14 text-center p-1 rounded-lg border border-gray-200 font-mono text-xs"
                      />
                      <span className="text-gray-500 font-mono text-xs">{it.unit}</span>
                      <span className="font-mono text-xs font-bold text-gray-800 w-16 text-right">
                        {formatINR(it.total)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
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
            className="w-full py-3 rounded-2xl bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold text-xs shadow-apple-subtle transition-all"
          >
            Issue Delivery Challan
          </button>
        </form>
      </AppleModal>
    </div>
  );
};
