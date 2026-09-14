import React, { useState } from 'react';
import {
  Package,
  Plus,
  Search,
  Barcode,
  Edit2,
  Trash2,
  AlertTriangle,
  ArrowUpDown,
  Filter,
  Layers,
  Sparkles,
  DollarSign,
} from 'lucide-react';
import { Product, TaxRate, BusinessSettings } from '../../types';
import { formatINR } from '../../utils/formatters';
import { AppleModal } from '../common/AppleModal';
import { BarcodeGeneratorModal } from './BarcodeGeneratorModal';
import { GST_RATES, COMMON_UNITS } from '../../utils/constants';

interface InventoryViewProps {
  products: Product[];
  settings: BusinessSettings;
  onSaveProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  onAdjustStock: (id: string, delta: number) => void;
  activeSubTab?: string;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  settings,
  onSaveProduct,
  onDeleteProduct,
  onAdjustStock,
  activeSubTab,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedForBarcode, setSelectedForBarcode] = useState<Product | null>(null);

  React.useEffect(() => {
    if (activeSubTab === 'low_stock') {
      setOnlyLowStock(true);
    } else if (activeSubTab === 'all_items') {
      setOnlyLowStock(false);
    } else if (activeSubTab === 'barcodes' && products.length > 0) {
      setSelectedForBarcode(products[0]);
    }
  }, [activeSubTab, products]);

  // Form states
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    sku: '',
    barcode: '',
    category: '',
    hsn: '',
    unit: '',
    mrp: 0,
    purchasePrice: 0,
    salePrice: 0,
    taxRate: 18,
    taxType: 'EXCLUSIVE',
    finalPrice: 0,
    stock: 0,
    minStockAlert: 0,
    description: '',
  });

  const categories = ['ALL', ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))];

  // Filtered list
  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.hsn?.includes(searchQuery);

    const matchesCategory = categoryFilter === 'ALL' || p.category === categoryFilter;
    const matchesLowStock = !onlyLowStock || p.stock <= p.minStockAlert;

    return matchesSearch && matchesCategory && matchesLowStock;
  });

  // Analytics Metrics
  const totalStockUnits = products.reduce((sum, p) => sum + p.stock, 0);
  const totalCostValuation = products.reduce((sum, p) => sum + (p.purchasePrice * p.stock), 0);
  const totalRetailValuation = products.reduce((sum, p) => sum + (p.salePrice * p.stock), 0);
  const lowStockItemsCount = products.filter((p) => p.stock <= p.minStockAlert).length;

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      sku: '',
      barcode: '',
      category: '',
      hsn: '',
      unit: '',
      mrp: 0,
      purchasePrice: 0,
      salePrice: 0,
      taxRate: 18,
      taxType: 'EXCLUSIVE',
      finalPrice: 0,
      stock: 0,
      minStockAlert: 0,
      description: '',
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    const taxType = p.taxType || 'EXCLUSIVE';
    // If it was inclusive, display the final price in the input for user convenience
    const displaySalePrice = taxType === 'INCLUSIVE' && p.finalPrice ? p.finalPrice : p.salePrice;
    setFormData({
      ...p,
      salePrice: displaySalePrice,
      taxType,
    });
    setIsFormOpen(true);
  };

  // Live GST Breakdown Calculation
  const enteredPrice = Number(formData.salePrice) || 0;
  const currentTaxRate = Number(formData.taxRate) || 0;
  const currentTaxType = formData.taxType || 'EXCLUSIVE';

  let computedBasePrice = enteredPrice;
  let computedGstAmount = 0;
  let computedFinalPrice = enteredPrice;

  if (currentTaxType === 'EXCLUSIVE') {
    computedBasePrice = enteredPrice;
    computedGstAmount = Number(((enteredPrice * currentTaxRate) / 100).toFixed(2));
    computedFinalPrice = Number((computedBasePrice + computedGstAmount).toFixed(2));
  } else {
    // INCLUSIVE: enteredPrice is final price
    computedFinalPrice = enteredPrice;
    computedBasePrice = currentTaxRate > 0 ? Number((enteredPrice / (1 + currentTaxRate / 100)).toFixed(2)) : enteredPrice;
    computedGstAmount = Number((computedFinalPrice - computedBasePrice).toFixed(2));
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || enteredPrice <= 0) {
      alert('Product Name and valid Sale Price are required.');
      return;
    }

    const productToSave: Product = {
      id: editingProduct ? editingProduct.id : 'prod-' + Date.now(),
      name: formData.name || '',
      sku: formData.sku || '',
      barcode: formData.barcode || '',
      category: formData.category || '',
      hsn: formData.hsn || '',
      unit: formData.unit || 'Pcs',
      mrp: Number(formData.mrp) || 0,
      purchasePrice: Number(formData.purchasePrice) || 0,
      salePrice: computedBasePrice,
      taxRate: currentTaxRate as TaxRate,
      taxType: currentTaxType,
      finalPrice: computedFinalPrice,
      stock: Number(formData.stock) || 0,
      minStockAlert: Number(formData.minStockAlert) || 0,
      description: formData.description || '',
      createdAt: editingProduct ? editingProduct.createdAt : new Date().toISOString(),
    };

    onSaveProduct(productToSave);
    setIsFormOpen(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans text-xs text-neutral-900">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-neutral-200/80 shadow-xs">
          <div className="flex items-center space-x-2 text-neutral-500 text-[10px] font-semibold uppercase tracking-wider">
            <Package className="w-4 h-4 text-neutral-700" />
            <span>Total SKUs</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-neutral-900 font-sans mt-2">{products.length}</p>
          <span className="text-[11px] text-neutral-500 mt-0.5 block">{totalStockUnits} units in stock</span>
        </div>

        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-neutral-200/80 shadow-xs">
          <div className="flex items-center space-x-2 text-neutral-500 text-[10px] font-semibold uppercase tracking-wider">
            <DollarSign className="w-4 h-4 text-neutral-700" />
            <span>Cost Valuation</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-neutral-900 font-sans mt-2">{formatINR(totalCostValuation)}</p>
          <span className="text-[11px] text-neutral-500 mt-0.5 block truncate">Purchase stock worth</span>
        </div>

        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-neutral-200/80 shadow-xs">
          <div className="flex items-center space-x-2 text-neutral-500 text-[10px] font-semibold uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Retail Valuation</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-neutral-900 font-sans mt-2">{formatINR(totalRetailValuation)}</p>
          <span className="text-[11px] text-emerald-700 font-medium mt-0.5 block truncate">
            Margin: {formatINR(totalRetailValuation - totalCostValuation)}
          </span>
        </div>

        <div
          onClick={() => setOnlyLowStock(!onlyLowStock)}
          className={`p-4 sm:p-5 rounded-2xl border cursor-pointer transition-all ${
            onlyLowStock
              ? 'bg-rose-50 text-rose-900 border-rose-300 ring-2 ring-rose-200'
              : 'bg-white border-neutral-200/80 shadow-xs hover:border-neutral-300'
          }`}
        >
          <div className="flex items-center space-x-2 text-[10px] font-semibold uppercase tracking-wider text-rose-600">
            <AlertTriangle className="w-4 h-4" />
            <span>Low Stock Alert</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold font-sans mt-2 text-rose-600">{lowStockItemsCount}</p>
          <span className="text-[11px] mt-0.5 block text-neutral-500">
            {onlyLowStock ? 'Showing low stock items' : 'Click to filter low stock'}
          </span>
        </div>
      </div>

      {/* Control Bar: Search & Actions */}
      <div className="p-3 sm:p-4 bg-white rounded-2xl border border-neutral-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[260px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search product by name, barcode, SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-neutral-200 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white border border-neutral-200 text-xs font-medium text-neutral-800 focus:outline-none focus:border-black"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                Category: {c}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-black hover:bg-neutral-800 active:scale-95 text-white text-xs font-bold shadow-xs transition-all cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Products Table (Desktop & Tablet) */}
      <div className="hidden md:block bg-white rounded-3xl border border-neutral-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200/80">
                <th className="py-3.5 px-4">Item & SKU</th>
                <th className="py-3.5 px-3">Barcode / HSN</th>
                <th className="py-3.5 px-3">Category</th>
                <th className="py-3.5 px-3 text-right">Purchase (₹)</th>
                <th className="py-3.5 px-3 text-right">MRP (₹)</th>
                <th className="py-3.5 px-3 text-right">Sale Price (₹)</th>
                <th className="py-3.5 px-3 text-center">GST %</th>
                <th className="py-3.5 px-3 text-center">Stock Level</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs text-neutral-500">
                    No products found in inventory. Click "Add New Product" above to add items.
                  </td>
                </tr>
              ) : (
                filtered.map((product) => {
                  const isLow = product.stock <= product.minStockAlert;
                  return (
                    <tr key={product.id} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-neutral-900 line-clamp-1">{product.name}</p>
                        <span className="text-[10px] text-neutral-400 font-mono">SKU: {product.sku || '—'}</span>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-neutral-700">
                        <div>{product.barcode || '—'}</div>
                        <span className="text-[10px] text-neutral-400">HSN: {product.hsn || '—'}</span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-700 text-[10px] font-medium">
                          {product.category || 'General'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-neutral-600">
                        {formatINR(product.purchasePrice)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-neutral-400 line-through">
                        {formatINR(product.mrp)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-neutral-900">
                        {formatINR(product.salePrice)}
                      </td>
                      <td className="py-3.5 px-3 text-center font-mono">
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-[#0071e3] font-medium">
                          {product.taxRate}%
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <div className="inline-flex items-center space-x-1.5">
                          <button
                            onClick={() => onAdjustStock(product.id, -1)}
                            className="w-5 h-5 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-200 font-bold flex items-center justify-center text-xs transition-colors"
                          >
                            -
                          </button>
                          <span
                            className={`font-mono font-bold px-2 py-0.5 rounded-full text-xs ${
                              isLow
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {product.stock} {product.unit}
                          </span>
                          <button
                            onClick={() => onAdjustStock(product.id, 1)}
                            className="w-5 h-5 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-200 font-bold flex items-center justify-center text-xs transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => setSelectedForBarcode(product)}
                            title="Print Barcode Label"
                            className="p-1.5 rounded-xl hover:bg-neutral-100 text-neutral-500 hover:text-[#0071e3] transition-colors"
                          >
                            <Barcode className="w-4 h-4 text-[#0071e3]" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(product)}
                            title="Edit Product"
                            className="p-1.5 rounded-xl hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete product "${product.name}"?`)) {
                                onDeleteProduct(product.id);
                              }
                            }}
                            title="Delete Product"
                            className="p-1.5 rounded-xl hover:bg-rose-50 text-neutral-400 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Product Cards (< md) */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-neutral-200/80 text-xs text-neutral-500 shadow-xs">
            No products found. Tap "Add New Product" to create one.
          </div>
        ) : (
          filtered.map((product) => {
            const isLow = product.stock <= product.minStockAlert;
            return (
              <div
                key={product.id}
                className="p-4 bg-white rounded-2xl border border-neutral-200/80 space-y-3 shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-neutral-900 text-sm">{product.name}</h4>
                    <div className="flex items-center space-x-2 mt-0.5 text-[11px] text-neutral-500 font-mono">
                      <span>SKU: {product.sku || '—'}</span>
                      <span>•</span>
                      <span>HSN: {product.hsn || '—'}</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-700 text-[10px] font-medium shrink-0">
                    {product.category || 'General'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 py-2 border-y border-neutral-100 text-xs">
                  <div>
                    <span className="text-[10px] text-neutral-400 block">Sale Price</span>
                    <span className="font-bold text-neutral-900 font-mono">{formatINR(product.salePrice)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 block">MRP</span>
                    <span className="text-neutral-400 font-mono line-through">{formatINR(product.mrp)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 block">GST Slab</span>
                    <span className="text-neutral-700 font-mono">{product.taxRate}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-neutral-500">Stock:</span>
                    <div className="inline-flex items-center space-x-1.5">
                      <button
                        onClick={() => onAdjustStock(product.id, -1)}
                        className="w-6 h-6 rounded-md bg-neutral-100 text-neutral-700 border border-neutral-200 font-bold flex items-center justify-center text-xs"
                      >
                        -
                      </button>
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded-full text-xs ${
                          isLow
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {product.stock} {product.unit}
                      </span>
                      <button
                        onClick={() => onAdjustStock(product.id, 1)}
                        className="w-6 h-6 rounded-md bg-neutral-100 text-neutral-700 border border-neutral-200 font-bold flex items-center justify-center text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setSelectedForBarcode(product)}
                      title="Print Barcode"
                      className="p-2 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-600 hover:text-black"
                    >
                      <Barcode className="w-4 h-4 text-[#0071e3]" />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(product)}
                      title="Edit Product"
                      className="p-2 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-600 hover:text-black"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete product "${product.name}"?`)) {
                          onDeleteProduct(product.id);
                        }
                      }}
                      title="Delete Product"
                      className="p-2 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-500 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Product Modal */}
      <AppleModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingProduct ? 'Edit Product' : 'Add New Product to Inventory'}
        subtitle="Manage product pricing, stock, tax slabs and barcode"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs font-sans">
          <div>
            <label className="block font-semibold text-neutral-700 mb-1">Product / Item Name *</label>
            <input
              type="text"
              required
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-900 focus:border-black focus:outline-none text-xs font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">SKU Code</label>
              <input
                type="text"
                value={formData.sku || ''}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-900 focus:outline-none font-sans tabular-nums focus:border-black"
              />
            </div>
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Barcode</label>
              <input
                type="text"
                value={formData.barcode || ''}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-900 focus:outline-none font-sans tabular-nums focus:border-black"
              />
            </div>
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">HSN / SAC Code</label>
              <input
                type="text"
                value={formData.hsn || ''}
                onChange={(e) => setFormData({ ...formData, hsn: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-900 focus:outline-none font-sans tabular-nums focus:border-black"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Category</label>
              <input
                type="text"
                value={formData.category || ''}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-900 focus:outline-none font-medium focus:border-black"
              />
            </div>
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Unit of Measure</label>
              <select
                value={formData.unit || ''}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-900 focus:outline-none font-medium focus:border-black"
              >
                <option value="">-- Select Unit --</option>
                {COMMON_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tax Calculation Mode: Include vs Exclude */}
          <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200/80 space-y-3">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1.5">GST Tax Calculation Mode</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-white rounded-xl border border-neutral-200">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, taxType: 'EXCLUSIVE' })}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    currentTaxType === 'EXCLUSIVE'
                      ? 'bg-black text-white shadow-xs'
                      : 'text-neutral-600 hover:text-black'
                  }`}
                >
                  + Tax Excluded (Base + GST)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, taxType: 'INCLUSIVE' })}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    currentTaxType === 'INCLUSIVE'
                      ? 'bg-black text-white shadow-xs'
                      : 'text-neutral-600 hover:text-black'
                  }`}
                >
                  ✓ Tax Included (MRP / Net)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold text-neutral-600 mb-1">Purchase Cost (₹)</label>
                <input
                  type="number"
                  value={formData.purchasePrice ? formData.purchasePrice : ''}
                  onChange={(e) => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 rounded-xl border border-neutral-200 bg-white text-neutral-900 font-sans tabular-nums focus:outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="block font-semibold text-neutral-600 mb-1">MRP (₹)</label>
                <input
                  type="number"
                  value={formData.mrp ? formData.mrp : ''}
                  onChange={(e) => setFormData({ ...formData, mrp: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 rounded-xl border border-neutral-200 bg-white text-neutral-900 font-sans tabular-nums focus:outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="block font-semibold text-neutral-900 mb-1 truncate">
                  {currentTaxType === 'INCLUSIVE' ? 'Selling (Gross) *' : 'Sale (Base) *'}
                </label>
                <input
                  type="number"
                  required
                  value={formData.salePrice ? formData.salePrice : ''}
                  onChange={(e) => setFormData({ ...formData, salePrice: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 rounded-xl border border-black bg-white font-sans tabular-nums font-bold text-neutral-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-neutral-600 mb-1">GST Slab</label>
                <select
                  value={formData.taxRate !== undefined ? formData.taxRate : 18}
                  onChange={(e) => setFormData({ ...formData, taxRate: parseInt(e.target.value, 10) as TaxRate })}
                  className="w-full p-2 rounded-xl border border-neutral-200 bg-white text-neutral-900 focus:outline-none font-medium focus:border-black"
                >
                  {GST_RATES.map((r) => (
                    <option key={r} value={r}>
                      {r}% GST
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Live Pricing Breakdown Card - Displays when price entered */}
            {enteredPrice > 0 && (
              <div className="p-3 bg-white text-neutral-900 rounded-xl space-y-1.5 border border-neutral-200 font-sans shadow-2xs">
                <div className="flex items-center justify-between text-[11px] text-neutral-500">
                  <span>Pricing Summary</span>
                  <span className="font-semibold text-neutral-700">
                    {currentTaxType === 'INCLUSIVE' ? 'Tax Included in Price' : 'Tax Added on Base Price'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-neutral-100 text-xs">
                  <div>
                    <span className="text-[10px] text-neutral-500 block">Base Taxable Rate</span>
                    <span className="font-sans tabular-nums font-semibold text-neutral-800">₹{computedBasePrice.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 block">GST Tax ({currentTaxRate}%)</span>
                    <span className="font-sans tabular-nums font-semibold text-emerald-700">+ ₹{computedGstAmount.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 block font-semibold text-neutral-700">Final Price (Net)</span>
                    <span className="font-sans tabular-nums font-bold text-sm text-neutral-900">₹{computedFinalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Current Stock Qty</label>
              <input
                type="number"
                value={formData.stock ? formData.stock : ''}
                onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value, 10) || 0 })}
                className="w-full p-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-900 font-mono focus:outline-none focus:border-black"
              />
            </div>
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Low Stock Alert Threshold</label>
              <input
                type="number"
                value={formData.minStockAlert ? formData.minStockAlert : ''}
                onChange={(e) => setFormData({ ...formData, minStockAlert: parseInt(e.target.value, 10) || 0 })}
                className="w-full p-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-900 font-mono focus:outline-none focus:border-black"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-black hover:bg-neutral-800 active:scale-95 text-white font-bold text-xs shadow-xs transition-all mt-2 cursor-pointer"
          >
            {editingProduct ? 'Update Product' : 'Save & Add to Stock'}
          </button>
        </form>
      </AppleModal>

      {/* Barcode Generator & Print Modal */}
      <BarcodeGeneratorModal
        isOpen={!!selectedForBarcode}
        onClose={() => setSelectedForBarcode(null)}
        product={selectedForBarcode}
        firmName={settings.firmName}
      />
    </div>
  );
};
