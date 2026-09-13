import React, { useState, useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import {
  Wrench,
  Barcode,
  FileSpreadsheet,
  Printer,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Copy,
  Package,
  FileText,
  Users,
} from 'lucide-react';
import { Product, Customer, BusinessSettings } from '../../types';
import { formatINR } from '../../utils/formatters';

interface UtilitiesViewProps {
  products: Product[];
  customers: Customer[];
  settings: BusinessSettings;
  activeSubTab?: string;
  onSaveProduct: (product: Product) => void;
  onSaveCustomer: (customer: Customer) => void;
}

export const UtilitiesView: React.FC<UtilitiesViewProps> = ({
  products,
  customers,
  settings,
  activeSubTab = 'barcode_generator',
  onSaveProduct,
  onSaveCustomer,
}) => {
  const [activeTab, setActiveTab] = useState<'barcode' | 'import'>(
    activeSubTab === 'import_data' ? 'import' : 'barcode'
  );

  useEffect(() => {
    if (activeSubTab === 'import_data') {
      setActiveTab('import');
    } else if (activeSubTab === 'barcode_generator') {
      setActiveTab('barcode');
    }
  }, [activeSubTab]);

  // Barcode Generator States
  const [selectedProductId, setSelectedProductId] = useState<string>(
    products[0]?.id || ''
  );
  const [customName, setCustomName] = useState('SHYAMJI MUKHWAS PREMIUM');
  const [customBarcode, setCustomBarcode] = useState('8901234567890');
  const [customPrice, setCustomPrice] = useState(100);
  const [customMrp, setCustomMrp] = useState(120);
  const [labelCopies, setLabelCopies] = useState(24);
  const [labelGrid, setLabelGrid] = useState<'24_A4' | '40_A4' | 'SINGLE_THERMAL'>('24_A4');
  const barcodeSvgRef = useRef<SVGSVGElement>(null);

  // Import State
  const [importType, setImportType] = useState<'PRODUCTS' | 'CUSTOMERS'>('PRODUCTS');
  const [importStatus, setImportStatus] = useState<string>('');
  const [importError, setImportError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync selected product
  useEffect(() => {
    if (selectedProductId) {
      const p = products.find((prod) => prod.id === selectedProductId);
      if (p) {
        setCustomName(p.name);
        setCustomBarcode(p.barcode || p.sku || '8901234567890');
        setCustomPrice(p.salePrice);
        setCustomMrp(p.mrp || p.salePrice);
      }
    }
  }, [selectedProductId, products]);

  // Generate SVG barcode
  useEffect(() => {
    if (barcodeSvgRef.current && customBarcode) {
      try {
        JsBarcode(barcodeSvgRef.current, customBarcode, {
          format: 'CODE128',
          width: 1.5,
          height: 38,
          displayValue: true,
          fontSize: 11,
          font: 'monospace',
          margin: 0,
        });
      } catch (e) {
        console.error('Barcode generation error:', e);
      }
    }
  }, [customBarcode, activeTab]);

  const handlePrintLabels = () => {
    window.print();
  };

  // Download Sample CSV
  const handleDownloadSampleProductsCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Name,SKU,Barcode,Category,HSN,Unit,MRP,PurchasePrice,SalePrice,TaxRate,Stock\n' +
      'Royal Shahi Mukhwas 200g,RSM-200,8901001001,Mukhwas,210690,Pcs,150,85,120,18,50\n' +
      'Kashmiri Sweet Saunf 100g,KSS-100,8901001002,Saunf,091099,Pcs,60,30,45,5,100\n' +
      'Digestive Hing Peda 250g,DHP-250,8901001003,Peda,210690,Pcs,110,60,90,12,75\n';
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'sample_products_import.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadSampleCustomersCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Name,CompanyName,Phone,Email,GSTIN,Address,City,State,Pincode\n' +
      'Rajesh Sharma,Sharma Sweets & Bakers,9826012345,sharmasweets@gmail.com,23AABCS1429B1Z8,Station Road,Morena,Madhya Pradesh,476001\n' +
      'Amit Verma,Verma General Store,9425198765,verma.store@gmail.com,,Main Bazaar,Gwalior,Madhya Pradesh,474001\n';
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'sample_parties_import.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle CSV file upload
  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStatus('');
    setImportError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length <= 1) {
          setImportError('CSV file has no data rows.');
          return;
        }

        if (importType === 'PRODUCTS') {
          let count = 0;
          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
            if (cols.length >= 3 && cols[0]) {
              const newProd: Product = {
                id: 'prod-' + Date.now() + Math.random(),
                name: cols[0],
                sku: cols[1] || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
                barcode: cols[2] || `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
                category: cols[3] || 'General',
                hsn: cols[4] || '210690',
                unit: cols[5] || 'Pcs',
                mrp: Number(cols[6]) || 100,
                purchasePrice: Number(cols[7]) || 60,
                salePrice: Number(cols[8]) || 90,
                taxRate: (Number(cols[9]) || 18) as any,
                taxType: 'EXCLUSIVE',
                finalPrice: Number(cols[8]) || 90,
                stock: Number(cols[10]) || 10,
                minStockAlert: 5,
                createdAt: new Date().toISOString(),
              };
              onSaveProduct(newProd);
              count++;
            }
          }
          setImportStatus(`Successfully imported ${count} products into inventory!`);
        } else {
          let count = 0;
          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
            if (cols.length >= 2 && cols[0]) {
              const newCust: Customer = {
                id: 'cust-' + Date.now() + Math.random(),
                name: cols[0],
                companyName: cols[1] || '',
                phone: cols[2] || '',
                email: cols[3] || '',
                gstin: cols[4] || '',
                pan: cols[4] ? cols[4].slice(2, 12) : '',
                billingAddress: cols[5] || 'Local',
                city: cols[6] || settings.city,
                state: cols[7] || settings.state,
                stateCode: '23',
                pincode: cols[8] || settings.pincode,
                creditLimit: 0,
                currentBalance: 0,
                createdAt: new Date().toISOString(),
              };
              onSaveCustomer(newCust);
              count++;
            }
          }
          setImportStatus(`Successfully imported ${count} party records!`);
        }
      } catch (err: any) {
        setImportError('Failed to parse CSV: ' + (err.message || 'Unknown error'));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans text-xs text-black">
      {/* Top Header & Tab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-black/[0.06]">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-neutral-900 text-white flex items-center justify-center font-bold shadow-2xs">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-neutral-900 tracking-tight leading-tight">
              Business Utilities & Tools
            </h1>
            <p className="text-[11px] text-neutral-500">
              Print barcode sticker label sheets, export & import catalog data from Excel/CSV
            </p>
          </div>
        </div>

        {/* Clean Segmented Controls */}
        <div className="flex items-center bg-neutral-200/60 p-1 rounded-2xl border border-neutral-200">
          <button
            type="button"
            onClick={() => setActiveTab('barcode')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'barcode'
                ? 'bg-white text-black shadow-xs'
                : 'text-neutral-600 hover:text-black'
            }`}
          >
            <Barcode className="w-4 h-4" />
            <span>Barcode Sheet Generator</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'import'
                ? 'bg-white text-black shadow-xs'
                : 'text-neutral-600 hover:text-black'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Import Excel / CSV</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: BARCODE LABEL SHEET GENERATOR                                  */}
      {/* ========================================================================= */}
      {activeTab === 'barcode' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Controls Column */}
          <div className="p-6 bg-white rounded-3xl border border-neutral-200/80 shadow-apple-subtle space-y-4">
            <h2 className="text-sm font-bold text-neutral-900 pb-2 border-b border-neutral-100 flex items-center space-x-2">
              <Barcode className="w-4 h-4 text-black" />
              <span>Label Configuration</span>
            </h2>

            {/* Product Selector */}
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Select from Catalog (or edit below)
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 font-bold"
              >
                <option value="">-- Custom Label --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({formatINR(p.salePrice)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Item Title / Name</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 font-semibold"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Barcode Value / SKU</label>
              <input
                type="text"
                value={customBarcode}
                onChange={(e) => setCustomBarcode(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 font-mono font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">MRP (₹)</label>
                <input
                  type="number"
                  value={customMrp}
                  onChange={(e) => setCustomMrp(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Our Price (₹)</label>
                <input
                  type="number"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 font-mono font-bold text-emerald-700"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Label Paper Grid</label>
              <select
                value={labelGrid}
                onChange={(e) => {
                  const g = e.target.value as any;
                  setLabelGrid(g);
                  if (g === '24_A4') setLabelCopies(24);
                  else if (g === '40_A4') setLabelCopies(40);
                  else setLabelCopies(1);
                }}
                className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 font-bold"
              >
                <option value="24_A4">24 Labels / A4 Sheet (3 x 8 grid - 70x37mm)</option>
                <option value="40_A4">40 Labels / A4 Sheet (4 x 10 grid - 52.5x29.7mm)</option>
                <option value="SINGLE_THERMAL">Single Thermal Sticker (50x25mm)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Number of Labels</label>
              <input
                type="number"
                min={1}
                max={120}
                value={labelCopies}
                onChange={(e) => setLabelCopies(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 font-mono font-bold text-center"
              />
            </div>

            <button
              type="button"
              onClick={handlePrintLabels}
              className="w-full py-3 bg-neutral-900 hover:bg-black text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-2 cursor-pointer shadow-2xs transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Print Sticker Sheet</span>
            </button>
          </div>

          {/* Right Live Sheet Preview Column */}
          <div className="lg:col-span-2 p-6 bg-white rounded-3xl border border-neutral-200/80 shadow-apple-subtle space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <h3 className="text-sm font-bold text-neutral-900">
                Sticker Sheet Live Preview ({labelCopies} labels)
              </h3>
              <span className="text-[11px] text-neutral-500 font-mono">
                {settings.firmName}
              </span>
            </div>

            {/* Hidden master barcode SVG used for rendering */}
            <div className="hidden">
              <svg ref={barcodeSvgRef}></svg>
            </div>

            {/* Grid preview */}
            <div
              className={`p-4 bg-neutral-50 rounded-2xl border border-neutral-200 max-h-[600px] overflow-y-auto ${
                labelGrid === 'SINGLE_THERMAL'
                  ? 'flex justify-center'
                  : labelGrid === '40_A4'
                  ? 'grid grid-cols-2 sm:grid-cols-4 gap-2'
                  : 'grid grid-cols-1 sm:grid-cols-3 gap-3'
              }`}
            >
              {Array.from({ length: labelCopies }).map((_, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-white rounded-xl border border-neutral-300 flex flex-col items-center justify-between text-center space-y-1 shadow-2xs"
                >
                  <span className="text-[9px] font-bold text-neutral-500 truncate max-w-full uppercase">
                    {settings.firmName}
                  </span>
                  <p className="text-[10px] font-bold text-neutral-900 truncate max-w-full leading-tight">
                    {customName}
                  </p>

                  <div className="py-1 w-full flex justify-center overflow-hidden">
                    <svg
                      dangerouslySetInnerHTML={{
                        __html: barcodeSvgRef.current?.innerHTML || '',
                      }}
                      className="max-h-12 w-auto max-w-full"
                    />
                  </div>

                  <div className="flex items-center justify-between w-full text-[10px] pt-1 border-t border-neutral-100 font-mono">
                    <span className="text-neutral-400 line-through">MRP: ₹{customMrp}</span>
                    <span className="font-bold text-black">₹{customPrice}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: IMPORT EXCEL / CSV                                             */}
      {/* ========================================================================= */}
      {activeTab === 'import' && (
        <div className="max-w-4xl space-y-6">
          <div className="p-6 bg-white rounded-3xl border border-neutral-200/80 shadow-apple-subtle space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-neutral-100">
              <FileSpreadsheet className="w-5 h-5 text-neutral-900" />
              <div>
                <h2 className="text-sm font-bold text-neutral-900">Bulk Import via CSV Spreadsheet</h2>
                <p className="text-[11px] text-neutral-500">
                  Quickly migrate your product inventory or customer party database from Excel
                </p>
              </div>
            </div>

            {/* Type Switcher */}
            <div className="flex items-center space-x-4 pt-1">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="importType"
                  checked={importType === 'PRODUCTS'}
                  onChange={() => setImportType('PRODUCTS')}
                  className="w-4 h-4 text-black accent-black"
                />
                <span className="font-bold text-neutral-800">Products & Stock Inventory</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="importType"
                  checked={importType === 'CUSTOMERS'}
                  onChange={() => setImportType('CUSTOMERS')}
                  className="w-4 h-4 text-black accent-black"
                />
                <span className="font-bold text-neutral-800">Parties / Customers</span>
              </label>
            </div>

            {/* Download Sample Box */}
            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-neutral-900">
                  Step 1: Download Sample Excel / CSV Format
                </h4>
                <p className="text-[11px] text-neutral-500">
                  Use our standardized columns to format your data without any errors.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  importType === 'PRODUCTS'
                    ? handleDownloadSampleProductsCSV
                    : handleDownloadSampleCustomersCSV
                }
                className="px-4 py-2 bg-white hover:bg-neutral-100 border border-neutral-300 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer shadow-2xs"
              >
                <Download className="w-4 h-4 text-[#0071e3]" />
                <span>
                  Download Sample {importType === 'PRODUCTS' ? 'Products' : 'Parties'} CSV
                </span>
              </button>
            </div>

            {/* Upload CSV Box */}
            <div className="p-6 bg-white rounded-2xl border-2 border-dashed border-neutral-300 text-center space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleCsvFileUpload}
              />
              <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto text-neutral-500">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-neutral-900">Step 2: Upload CSV File</h4>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Select the filled CSV file from your computer to import
                </p>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-2.5 bg-neutral-900 hover:bg-black text-white rounded-xl font-bold text-xs cursor-pointer shadow-2xs transition-all active:scale-95"
              >
                Choose CSV File...
              </button>
            </div>

            {importStatus && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center space-x-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{importStatus}</span>
              </div>
            )}

            {importError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-center space-x-2 font-medium">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{importError}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
