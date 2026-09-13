import React, { useState } from 'react';
import {
  FileCheck2,
  Download,
  Truck,
  ShieldCheck,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import { Invoice, BusinessSettings } from '../../types';
import { formatINR, formatDate } from '../../utils/formatters';
import {
  generateEWayBillJSON,
  generateEInvoiceJSON,
  generateSimulatedIRN,
} from '../../services/einvoice';

interface EwayEinvoiceViewProps {
  invoices: Invoice[];
  settings: BusinessSettings;
  onUpdateInvoice?: (inv: Invoice) => void;
}

export const EwayEinvoiceView: React.FC<EwayEinvoiceViewProps> = ({
  invoices,
  settings,
  onUpdateInvoice,
}) => {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(
    invoices[0]?.id || ''
  );
  const [vehicleNo, setVehicleNo] = useState('');
  const [distanceKm, setDistanceKm] = useState(0);
  const [transporterName, setTransporterName] = useState('');
  const [transporterId, setTransporterId] = useState('');
  const [activeTab, setActiveTab] = useState<'EWAY' | 'EINVOICE'>('EWAY');
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (!selectedInvoiceId && invoices.length > 0) {
      setSelectedInvoiceId(invoices[0].id);
    }
  }, [invoices, selectedInvoiceId]);

  const selectedInvoice =
    invoices.find((i) => i.id === selectedInvoiceId) || invoices[0];

  if (!selectedInvoice) {
    return (
      <div className="p-16 text-center bg-white rounded-3xl border border-gray-200 text-gray-400">
        <FileCheck2 className="w-12 h-12 mx-auto text-gray-300 mb-3" />
        <h3 className="text-base font-semibold text-gray-700">No Invoices Available</h3>
        <p className="text-xs text-gray-400 mt-1">
          Create an invoice first from the Billing tab to generate E-Way bill and E-Invoice payloads.
        </p>
      </div>
    );
  }

  const ewayPayload = generateEWayBillJSON(selectedInvoice, settings, {
    vehicleNo,
    distanceKm,
    transporterName,
    transporterId,
  });

  const einvoicePayload = generateEInvoiceJSON(selectedInvoice, settings);
  const simulatedIRN = generateSimulatedIRN(
    selectedInvoice.invoiceNumber,
    settings.gstin
  );

  const handleDownloadJSON = (type: 'EWAY' | 'EINVOICE') => {
    const data = type === 'EWAY' ? ewayPayload : einvoicePayload;
    const filename = `${type}_${selectedInvoice.invoiceNumber}_${Date.now()}.json`;
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyIRN = () => {
    navigator.clipboard.writeText(simulatedIRN);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [irnAttached, setIrnAttached] = useState(false);

  const handleAttachIRN = () => {
    if (onUpdateInvoice && selectedInvoice) {
      const updated: Invoice = {
        ...selectedInvoice,
        irn: simulatedIRN,
        ackNo: String(Date.now()).slice(-10),
      };
      onUpdateInvoice(updated);
      setIrnAttached(true);
      setTimeout(() => setIrnAttached(false), 3000);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header Card */}
      <div className="p-5 bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-apple-subtle flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-bold text-black tracking-tight">
              E-Invoice & E-Way Bill Hub
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
              NIC Schema v1.1
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Export official JSON payloads for direct upload to ewaybillgst.gov.in and einvoice1.gst.gov.in
          </p>
        </div>

        {/* Invoice Selector Dropdown */}
        <div className="flex items-center space-x-2 text-xs">
          <label className="font-semibold text-gray-600">Select Invoice:</label>
          <select
            value={selectedInvoice.id}
            onChange={(e) => setSelectedInvoiceId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 bg-white font-mono text-xs focus:ring-2 focus:ring-[#0071e3] focus:outline-none"
          >
            {invoices.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.invoiceNumber} - {inv.customer.name} ({formatINR(inv.grandTotal)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Parameters & Live JSON Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Logistics & Validation (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Invoice Summary Card */}
          <div className="p-5 bg-white rounded-3xl border border-gray-200/80 shadow-apple-subtle space-y-3 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <span className="font-bold text-gray-700">Document No:</span>
              <span className="font-mono font-bold text-[#0071e3]">{selectedInvoice.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Invoice Date:</span>
              <span>{formatDate(selectedInvoice.date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Party GSTIN:</span>
              <span className="font-mono font-semibold">{selectedInvoice.customer.gstin || 'URP (Unregistered)'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Place of Supply (POS):</span>
              <span className="font-semibold">{selectedInvoice.customer.state} ({selectedInvoice.customer.stateCode})</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-100 font-bold">
              <span>Invoice Value:</span>
              <span className="font-mono text-base text-gray-900">{formatINR(selectedInvoice.grandTotal)}</span>
            </div>
          </div>

          {/* Transporter Parameters */}
          <div className="p-5 bg-white rounded-3xl border border-gray-200/80 shadow-apple-subtle space-y-3 text-xs">
            <div className="flex items-center space-x-2 text-gray-800 font-bold">
              <Truck className="w-4 h-4 text-[#0071e3]" />
              <span>Transporter & Vehicle Parameters</span>
            </div>

            <div>
              <label className="block font-semibold text-gray-600 mb-1">Vehicle Number *</label>
              <input
                type="text"
                value={vehicleNo}
                onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none font-mono uppercase"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Distance (KM) *</label>
                <input
                  type="number"
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(parseInt(e.target.value, 10) || 1)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Transporter ID</label>
                <input
                  type="text"
                  value={transporterId}
                  onChange={(e) => setTransporterId(e.target.value.toUpperCase())}
                  className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none font-mono uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-gray-600 mb-1">Transporter Name</label>
              <input
                type="text"
                value={transporterName}
                onChange={(e) => setTransporterName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* IRN Simulation Preview */}
          <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl border border-blue-100 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-900 flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-[#0071e3]" />
                <span>Simulated Invoice Reference (IRN)</span>
              </span>
              <button
                onClick={handleCopyIRN}
                className="flex items-center space-x-1 text-[11px] font-semibold text-[#0071e3] hover:underline"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy IRN'}</span>
              </button>
            </div>
            <p className="font-mono text-[10px] break-all bg-white p-2.5 rounded-xl border border-blue-200 text-gray-700">
              {simulatedIRN}
            </p>
            {onUpdateInvoice && (
              <div className="pt-1 flex justify-end">
                <button
                  onClick={handleAttachIRN}
                  className={`px-3 py-1.5 rounded-xl font-semibold text-xs flex items-center space-x-1.5 transition-all cursor-pointer ${
                    irnAttached
                      ? 'bg-emerald-600 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                  }`}
                >
                  {irnAttached ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Saved to Invoice!</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Save IRN to Invoice Record</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: JSON Payload View & Export (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-3xl border border-gray-200/80 shadow-apple-subtle overflow-hidden">
            {/* Header / Tabs */}
            <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex bg-gray-100 p-1 rounded-2xl">
                <button
                  onClick={() => setActiveTab('EWAY')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'EWAY'
                      ? 'bg-white text-black shadow-apple-subtle'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  🚚 E-Way Bill JSON (NIC)
                </button>
                <button
                  onClick={() => setActiveTab('EINVOICE')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'EINVOICE'
                      ? 'bg-white text-black shadow-apple-subtle'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  ⚡ E-Invoice IRN JSON
                </button>
              </div>

              <button
                onClick={() => handleDownloadJSON(activeTab)}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-2xl bg-black hover:bg-neutral-900 active:scale-95 text-white text-xs font-semibold shadow-apple-subtle transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download {activeTab === 'EWAY' ? 'E-Way' : 'E-Invoice'} JSON</span>
              </button>
            </div>

            {/* Code View */}
            <div className="p-4 bg-gray-900 font-mono text-[11px] text-emerald-400 max-h-[560px] overflow-y-auto rounded-b-3xl select-all">
              <pre>
                {JSON.stringify(
                  activeTab === 'EWAY' ? ewayPayload : einvoicePayload,
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
