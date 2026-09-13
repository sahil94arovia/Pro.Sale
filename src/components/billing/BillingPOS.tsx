import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  Trash2,
  Scan,
  User,
  ShoppingBag,
  Percent,
  TrendingUp,
  Receipt,
  FileCheck,
  RotateCcw,
  Sparkles,
  Search,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calculator,
  Settings as SettingsIcon,
  ChevronDown,
  Share2,
  Printer,
  FileText,
  Image as ImageIcon,
  Paperclip,
  Truck,
  Check,
  Zap,
} from 'lucide-react';
import {
  Product,
  Customer,
  InvoiceItem,
  Invoice,
  BusinessSettings,
  TaxRate,
  PaymentMode,
  SplitPaymentEntry,
} from '../../types';
import { calculateInvoiceTotals, ExtraChargeOptions } from '../../services/gstCalculator';
import { formatINR, formatDate } from '../../utils/formatters';
import { GST_RATES, COMMON_UNITS, INDIAN_STATES } from '../../utils/constants';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { PaymentModal } from './PaymentModal';
import { AppleModal } from '../common/AppleModal';
import { verifyAndFetchGSTDetails, GSTVerificationResult } from '../../services/gstLookupService';
import { openWhatsApp, generateInvoiceWhatsAppMessage } from '../../services/whatsapp';

interface BillingPOSProps {
  products: Product[];
  customers: Customer[];
  settings: BusinessSettings;
  initialInvoice?: Invoice | null;
  onSaveInvoice: (invoice: Invoice) => void;
  onAddNewCustomer: (customer: Customer) => void;
  onAddNewProduct?: (product: Product) => void;
  onClose?: () => void;
  onCancelEdit?: () => void;
}

// Editable row in the table
interface BillingRow {
  id: string;
  productId?: string;
  name: string;
  barcode?: string;
  hsn: string;
  size: string;
  qty: number;
  unit: string;
  mrp: number;
  purchasePrice: number;
  salePrice: number;
  priceWithTax: boolean; // toggle: With Tax vs Without Tax
  discountPercent: number;
  discountAmount: number;
  taxRate: TaxRate;
}

export const BillingPOS: React.FC<BillingPOSProps> = ({
  products,
  customers,
  settings,
  initialInvoice,
  onSaveInvoice,
  onAddNewCustomer,
  onAddNewProduct,
  onClose,
  onCancelEdit,
}) => {
  // Tab strip state
  const [activeTabName, setActiveTabName] = useState('Sale #1');

  // Sale Header Controls
  const [saleType, setSaleType] = useState<'CREDIT' | 'CASH'>('CREDIT');
  const [selectedGodown, setSelectedGodown] = useState('Main Godown');

  // Party Selection (Starts completely blank!)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [partySearchQuery, setPartySearchQuery] = useState('');
  const [isPartyDropdownOpen, setIsPartyDropdownOpen] = useState(false);
  const partySearchRef = useRef<HTMLDivElement>(null);

  // Invoice Details
  const [invoicePrefix, setInvoicePrefix] = useState(settings.invoicePrefix || 'TaxInvoice');
  const [invoiceNumberSuffix, setInvoiceNumberSuffix] = useState<string>(() =>
    String(settings.nextInvoiceNumber || 25554)
  );
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [invoiceDate, setInvoiceDate] = useState(todayStr);
  const [paymentTerms, setPaymentTerms] = useState('Due on Receipt');
  const [dueDate, setDueDate] = useState(todayStr);
  const [stateOfSupply, setStateOfSupply] = useState(settings.state || 'Madhya Pradesh');

  // Auto-calculate Due Date when Payment Terms or Invoice Date changes
  useEffect(() => {
    try {
      const base = new Date(invoiceDate);
      if (isNaN(base.getTime())) return;
      let addDays = 0;
      if (paymentTerms === 'Net 7') addDays = 7;
      else if (paymentTerms === 'Net 15') addDays = 15;
      else if (paymentTerms === 'Net 30') addDays = 30;
      else if (paymentTerms === 'Net 45') addDays = 45;
      else if (paymentTerms === 'Net 60') addDays = 60;
      else if (paymentTerms === 'Immediate' || paymentTerms === 'Due on Receipt') addDays = 0;

      const due = new Date(base.getTime() + addDays * 86400000);
      setDueDate(due.toISOString().slice(0, 10));
    } catch {
      // fallback
    }
  }, [invoiceDate, paymentTerms]);

  // Update State of Supply when customer is picked
  useEffect(() => {
    if (selectedCustomer?.state) {
      setStateOfSupply(selectedCustomer.state);
    }
  }, [selectedCustomer]);

  // Inter-state auto detection
  const selectedStateObj = useMemo(
    () => INDIAN_STATES.find((s) => s.name.toLowerCase() === stateOfSupply.toLowerCase()),
    [stateOfSupply]
  );
  const isInterState = useMemo(() => {
    if (!selectedStateObj) return false;
    return selectedStateObj.code !== settings.stateCode;
  }, [selectedStateObj, settings.stateCode]);

  // Items Table (starts with 3 clean blank rows ready for typing)
  const createEmptyRow = (idSuffix: string = ''): BillingRow => ({
    id: 'row-' + Date.now() + Math.random().toString(36).slice(2, 7) + idSuffix,
    name: '',
    hsn: '210690',
    size: '',
    qty: 1,
    unit: 'NONE',
    mrp: 0,
    purchasePrice: 0,
    salePrice: 0,
    priceWithTax: true,
    discountPercent: 0,
    discountAmount: 0,
    taxRate: 12,
  });

  const [rows, setRows] = useState<BillingRow[]>([
    createEmptyRow('-1'),
    createEmptyRow('-2'),
  ]);

  // Active product search row & Floating Portal Dropdown (never clipped by table boundaries)
  const [activeItemSearchIndex, setActiveItemSearchIndex] = useState<number | null>(null);
  const [productDropdownPos, setProductDropdownPos] = useState<{
    rowIdx: number;
    top: number;
    left: number;
    width: number;
  } | null>(null);

  // Quick Add Product Modal state
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [addProductTargetRow, setAddProductTargetRow] = useState<number>(0);
  const [newProdName, setNewProdName] = useState('');
  const [newProdSalePrice, setNewProdSalePrice] = useState<number>(0);
  const [newProdPurchasePrice, setNewProdPurchasePrice] = useState<number>(0);
  const [newProdMrp, setNewProdMrp] = useState<number>(0);
  const [newProdTaxRate, setNewProdTaxRate] = useState<TaxRate>(18);
  const [newProdTaxType, setNewProdTaxType] = useState<'INCLUSIVE' | 'EXCLUSIVE'>('EXCLUSIVE');
  const [newProdUnit, setNewProdUnit] = useState('Pcs');
  const [newProdHsn, setNewProdHsn] = useState('210690');
  const [newProdStock, setNewProdStock] = useState<number>(100);

  // Global click & escape handler to dismiss floating product search dropdown
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const portalEl = document.getElementById('item-search-portal');
      const target = e.target as HTMLElement;
      if (portalEl && portalEl.contains(target)) return;
      if (target.closest('[data-item-input]')) return;
      setProductDropdownPos(null);
      setActiveItemSearchIndex(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setProductDropdownPos(null);
        setActiveItemSearchIndex(null);
      }
    };

    window.addEventListener('mousedown', handleGlobalClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleGlobalClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Bottom 3-Column Fields
  // Column 1: Transport & Terms
  const [transportName, setTransportName] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [termsText, setTermsText] = useState(
    settings.termsAndConditions || '1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged if payment is not made within due date.'
  );

  // Column 2: Attachments & Copies
  const [invoiceDescription, setInvoiceDescription] = useState('');
  const [showDescriptionField, setShowDescriptionField] = useState(false);
  const [attachedImageName, setAttachedImageName] = useState<string | null>(null);
  const [attachedDocName, setAttachedDocName] = useState<string | null>(null);
  const [numberOfCopies, setNumberOfCopies] = useState('Original (For Recipient)');
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Column 3: Extra Charges & Discounts
  const [billDiscountPercent, setBillDiscountPercent] = useState<number>(0);
  const [billDiscountAmount, setBillDiscountAmount] = useState<number>(0);
  const [shippingAmount, setShippingAmount] = useState<number>(0);
  const [shippingTaxRate, setShippingTaxRate] = useState<TaxRate>(12);
  const [showShippingSac, setShowShippingSac] = useState(false);
  const [packagingAmount, setPackagingAmount] = useState<number>(0);
  const [packagingTaxRate, setPackagingTaxRate] = useState<TaxRate>(12);
  const [showPackagingSac, setShowPackagingSac] = useState(false);
  const [enableRoundOff, setEnableRoundOff] = useState(true);

  // Interactive Floating Calculator State
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [calcInput, setCalcInput] = useState('');
  const [calcResult, setCalcResult] = useState<string | null>(null);

  // Modals
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);

  // Quick Add Party Form State with Auto GST Verification
  const [partyGstin, setPartyGstin] = useState('');
  const [partyPan, setPartyPan] = useState('');
  const [partyName, setPartyName] = useState('');
  const [partyCompany, setPartyCompany] = useState('');
  const [partyPhone, setPartyPhone] = useState('');
  const [partyAddress, setPartyAddress] = useState('');
  const [partyCity, setPartyCity] = useState('');
  const [partyState, setPartyState] = useState('');
  const [partyStateCode, setPartyStateCode] = useState('');
  const [partyPincode, setPartyPincode] = useState('');
  const [isVerifyingPartyGST, setIsVerifyingPartyGST] = useState(false);
  const [partyGstResult, setPartyGstResult] = useState<GSTVerificationResult | null>(null);

  // Close party search dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (partySearchRef.current && !partySearchRef.current.contains(e.target as Node)) {
        setIsPartyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Synchronize state when initialInvoice is provided (for editing existing bills)
  useEffect(() => {
    if (initialInvoice) {
      setActiveTabName(`Editing: ${initialInvoice.invoiceNumber}`);
      setSaleType(initialInvoice.saleType || 'CREDIT');
      setSelectedCustomer(initialInvoice.customer || null);
      setPartySearchQuery(initialInvoice.customer?.name || '');

      const lastHyphen = initialInvoice.invoiceNumber.lastIndexOf('-');
      if (lastHyphen !== -1) {
        setInvoicePrefix(initialInvoice.invoiceNumber.substring(0, lastHyphen));
        setInvoiceNumberSuffix(initialInvoice.invoiceNumber.substring(lastHyphen + 1));
      } else {
        setInvoiceNumberSuffix(initialInvoice.invoiceNumber);
      }

      setInvoiceDate(initialInvoice.date);
      if (initialInvoice.dueDate) setDueDate(initialInvoice.dueDate);
      if (initialInvoice.paymentTerms) setPaymentTerms(initialInvoice.paymentTerms);
      if (initialInvoice.placeOfSupply) {
        setStateOfSupply(initialInvoice.placeOfSupply);
      } else if (initialInvoice.customer?.state) {
        setStateOfSupply(initialInvoice.customer.state);
      }

      if (initialInvoice.transportName) setTransportName(initialInvoice.transportName);
      if (initialInvoice.deliveryLocation) setDeliveryLocation(initialInvoice.deliveryLocation);
      if (initialInvoice.vehicleNumber) setVehicleNumber(initialInvoice.vehicleNumber);
      if (initialInvoice.deliveryDate) setDeliveryDate(initialInvoice.deliveryDate);
      if (initialInvoice.terms) setTermsText(initialInvoice.terms);
      if (initialInvoice.notes) {
        setInvoiceDescription(initialInvoice.notes);
        setShowDescriptionField(true);
      }
      if (initialInvoice.numberOfCopies) setNumberOfCopies(initialInvoice.numberOfCopies);
      if (initialInvoice.billDiscount) setBillDiscountAmount(initialInvoice.billDiscount);
      if (initialInvoice.shippingCharges) setShippingAmount(initialInvoice.shippingCharges);
      if (initialInvoice.shippingTaxRate) setShippingTaxRate(initialInvoice.shippingTaxRate as TaxRate);
      if (initialInvoice.packagingCharges) setPackagingAmount(initialInvoice.packagingCharges);
      if (initialInvoice.packagingTaxRate) setPackagingTaxRate(initialInvoice.packagingTaxRate as TaxRate);

      if (initialInvoice.items && initialInvoice.items.length > 0) {
        const mappedRows: BillingRow[] = initialInvoice.items.map((it, idx) => ({
          id: it.id || `row-loaded-${idx}`,
          productId: it.productId,
          name: it.name,
          barcode: it.barcode,
          hsn: it.hsn || '210690',
          size: it.size || '',
          qty: it.qty,
          unit: it.unit || 'NONE',
          mrp: it.mrp || it.salePrice,
          purchasePrice: it.purchasePrice || 0,
          salePrice: it.salePrice,
          priceWithTax: !!it.priceWithTax,
          discountPercent: it.discountPercent || 0,
          discountAmount: it.discountAmount || 0,
          taxRate: (it.taxRate as TaxRate) || 12,
        }));
        setRows(mappedRows);
      }
    }
  }, [initialInvoice]);

  // Filtered customers for search
  const filteredCustomers = useMemo(() => {
    if (!partySearchQuery.trim()) return customers.slice(0, 10);
    const q = partySearchQuery.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.companyName && c.companyName.toLowerCase().includes(q)) ||
        (c.gstin && c.gstin.toLowerCase().includes(q))
    );
  }, [customers, partySearchQuery]);

  // Convert BillingRows to InvoiceItem format for calculation
  const calculatedItems = useMemo<InvoiceItem[]>(() => {
    return rows
      .filter((r) => r.name.trim() !== '' || r.salePrice > 0)
      .map((r) => {
        const item: InvoiceItem = {
          id: r.id,
          productId: r.productId,
          name: r.name || 'Untitled Item',
          hsn: r.hsn || '210690',
          size: r.size,
          priceWithTax: r.priceWithTax,
          qty: r.qty || 1,
          unit: r.unit === 'NONE' ? 'Pcs' : r.unit,
          mrp: r.mrp,
          purchasePrice: r.purchasePrice || r.salePrice * 0.7,
          salePrice: r.salePrice,
          discountPercent: r.discountPercent,
          discountAmount: r.discountAmount,
          taxRate: r.taxRate,
          taxableAmount: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          total: 0,
        };
        return item;
      });
  }, [rows]);

  // Calculations
  const extraOptions: ExtraChargeOptions = useMemo(
    () => ({
      shippingCharges: shippingAmount,
      shippingTaxRate,
      packagingCharges: packagingAmount,
      packagingTaxRate,
      enableRoundOff,
    }),
    [shippingAmount, shippingTaxRate, packagingAmount, packagingTaxRate, enableRoundOff]
  );

  const totals = useMemo(() => {
    return calculateInvoiceTotals(calculatedItems, isInterState, billDiscountAmount, extraOptions);
  }, [calculatedItems, isInterState, billDiscountAmount, extraOptions]);

  // Table summary values
  const tableTotalQty = useMemo(() => rows.reduce((s, r) => s + (r.name ? r.qty : 0), 0), [rows]);
  const tableTotalDiscount = useMemo(() => {
    return rows.reduce((s, r) => {
      if (!r.name) return s;
      const base = r.priceWithTax && r.taxRate > 0 ? r.salePrice / (1 + r.taxRate / 100) : r.salePrice;
      const disc = r.discountAmount > 0 ? r.discountAmount : (base * r.qty * r.discountPercent) / 100;
      return s + disc;
    }, 0);
  }, [rows]);
  const tableTotalTax = useMemo(() => totals.cgstTotal + totals.sgstTotal + totals.igstTotal, [totals]);
  const tableSubtotalAmount = useMemo(() => totals.subtotal, [totals]);

  // Sync Bill Discount Percent -> Amount
  const handleBillDiscountPercentChange = (pct: number) => {
    setBillDiscountPercent(pct);
    if (totals.taxableTotal > 0) {
      setBillDiscountAmount(Number(((totals.taxableTotal * pct) / 100).toFixed(2)));
    }
  };

  // Sync Bill Discount Amount -> Percent
  const handleBillDiscountAmountChange = (amt: number) => {
    setBillDiscountAmount(amt);
    if (totals.taxableTotal > 0) {
      setBillDiscountPercent(Number(((amt / totals.taxableTotal) * 100).toFixed(1)));
    }
  };

  // Row update handlers
  const handleUpdateRow = (index: number, updates: Partial<BillingRow>) => {
    setRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };

      // If salePrice or discountPercent changes, recalculate discountAmount
      if ('discountPercent' in updates || 'salePrice' in updates || 'qty' in updates) {
        const row = copy[index];
        const base = row.priceWithTax && row.taxRate > 0 ? row.salePrice / (1 + row.taxRate / 100) : row.salePrice;
        const gross = base * row.qty;
        row.discountAmount = Number(((gross * (row.discountPercent || 0)) / 100).toFixed(2));
      }

      return copy;
    });
  };

  const handleSelectProductForRow = (index: number, product: Product) => {
    handleUpdateRow(index, {
      productId: product.id,
      name: product.name,
      hsn: product.hsn || '210690',
      mrp: product.mrp || product.salePrice,
      purchasePrice: product.purchasePrice || 0,
      salePrice: product.salePrice,
      unit: product.unit || 'Pcs',
      taxRate: (product.taxRate || 12) as TaxRate,
      priceWithTax: true,
    });
    setActiveItemSearchIndex(null);
    setProductDropdownPos(null);
  };

  const handleOpenAddProductModal = (rowIdx: number, initialName: string = '') => {
    setAddProductTargetRow(rowIdx);
    setNewProdName(initialName);
    setNewProdSalePrice(0);
    setNewProdPurchasePrice(0);
    setNewProdMrp(0);
    setNewProdTaxRate(18);
    setNewProdTaxType('EXCLUSIVE');
    setNewProdUnit('Pcs');
    setNewProdHsn('210690');
    setNewProdStock(100);
    setShowAddProductModal(true);
    setProductDropdownPos(null);
    setActiveItemSearchIndex(null);
  };

  const handleSaveQuickProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) {
      alert('Please enter a product name');
      return;
    }
    const baseSalePrice =
      newProdTaxType === 'INCLUSIVE' && newProdTaxRate > 0
        ? newProdSalePrice / (1 + newProdTaxRate / 100)
        : newProdSalePrice;

    const createdProduct: Product = {
      id: 'prod-' + Date.now(),
      name: newProdName.trim(),
      sku: 'SKU-' + Date.now().toString().slice(-6),
      barcode: '',
      category: 'General',
      hsn: newProdHsn.trim() || '210690',
      mrp: newProdMrp || newProdSalePrice,
      purchasePrice: newProdPurchasePrice || 0,
      salePrice: Number(baseSalePrice.toFixed(2)),
      stock: newProdStock,
      unit: newProdUnit,
      taxRate: newProdTaxRate,
      taxType: newProdTaxType,
      finalPrice: newProdSalePrice,
      minStockAlert: 10,
      createdAt: new Date().toISOString(),
    };

    onAddNewProduct?.(createdProduct);
    handleSelectProductForRow(addProductTargetRow, createdProduct);
    setShowAddProductModal(false);
  };

  // Matching products for the active item search dropdown (never clipped)
  const currentSearchProducts = useMemo(() => {
    if (productDropdownPos === null) return [];
    const query = (rows[productDropdownPos.rowIdx]?.name || '').trim().toLowerCase();
    if (!query) return products.slice(0, 10);
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        (p.sku && p.sku.toLowerCase().includes(query)) ||
        (p.barcode && p.barcode.includes(query))
    );
  }, [productDropdownPos, rows, products]);

  const handleAddRow = () => {
    setRows((prev) => [...prev, createEmptyRow()]);
  };

  const handleRemoveRow = (index: number) => {
    if (rows.length === 1) {
      setRows([createEmptyRow()]);
    } else {
      setRows(rows.filter((_, i) => i !== index));
    }
  };

  // Quick Barcode Scanning handler
  const handleBarcodeScanned = (product: Product) => {
    setIsScannerOpen(false);
    const emptyIdx = rows.findIndex((r) => !r.name.trim() && r.salePrice === 0);
    if (emptyIdx >= 0) {
      handleSelectProductForRow(emptyIdx, product);
    } else {
      const newRow = createEmptyRow();
      newRow.productId = product.id;
      newRow.name = product.name;
      newRow.hsn = product.hsn || '210690';
      newRow.mrp = product.mrp || product.salePrice;
      newRow.purchasePrice = product.purchasePrice || 0;
      newRow.salePrice = product.salePrice;
      newRow.unit = product.unit || 'Pcs';
      newRow.taxRate = (product.taxRate || 12) as TaxRate;
      setRows((prev) => [...prev, newRow]);
    }
  };

  // Clear / Reset invoice draft
  const handleResetDraft = () => {
    if (confirm('Clear current invoice and start a fresh bill?')) {
      setSelectedCustomer(null);
      setPartySearchQuery('');
      setRows([createEmptyRow('-1'), createEmptyRow('-2')]);
      setBillDiscountPercent(0);
      setBillDiscountAmount(0);
      setShippingAmount(0);
      setPackagingAmount(0);
      setTransportName('');
      setDeliveryLocation('');
      setVehicleNumber('');
      setDeliveryDate('');
      setInvoiceDescription('');
      setAttachedImageName(null);
      setAttachedDocName(null);
    }
  };

  // Save / Settle handler
  const handleProceedSave = () => {
    if (!selectedCustomer) {
      alert('Please select or add a Customer / Party first.');
      return;
    }
    const validItems = rows.filter((r) => r.name.trim() !== '' && r.salePrice > 0);
    if (validItems.length === 0) {
      alert('Please add at least one product with name and price.');
      return;
    }
    setIsPaymentModalOpen(true);
  };

  const handleConfirmFinalInvoice = (
    paymentMode: PaymentMode,
    paidAmount: number,
    splitEntries: SplitPaymentEntry[],
    notes: string
  ) => {
    if (!selectedCustomer) return;

    const invoiceNumber = `${invoicePrefix}-${invoiceNumberSuffix}`;
    const balanceAmount = Math.max(0, totals.grandTotal - paidAmount);
    const status: Invoice['status'] =
      balanceAmount === 0 ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'UNPAID';

    const savedInvoice: Invoice = {
      id: initialInvoice ? initialInvoice.id : 'inv-' + Date.now(),
      invoiceNumber,
      date: invoiceDate,
      dueDate,
      type: 'TAX_INVOICE',
      saleType,
      customer: selectedCustomer,
      items: totals.items,
      subtotal: totals.subtotal,
      itemDiscountTotal: totals.itemDiscountTotal,
      billDiscount: billDiscountAmount,
      taxableTotal: totals.taxableTotal,
      cgstTotal: totals.cgstTotal,
      sgstTotal: totals.sgstTotal,
      igstTotal: totals.igstTotal,
      roundOff: totals.roundOff,
      grandTotal: totals.grandTotal,
      paidAmount,
      balanceAmount,
      paymentMode,
      splitPayments: splitEntries,
      notes: notes || invoiceDescription,
      terms: termsText,
      status,
      totalProfit: totals.totalProfit,
      isInterState,
      placeOfSupply: stateOfSupply,
      transportName: transportName || undefined,
      vehicleNumber: vehicleNumber || undefined,
      deliveryDate: deliveryDate || undefined,
      deliveryLocation: deliveryLocation || undefined,
      shippingCharges: shippingAmount || undefined,
      shippingTaxRate: shippingTaxRate || undefined,
      packagingCharges: packagingAmount || undefined,
      packagingTaxRate: packagingTaxRate || undefined,
      paymentTerms,
      numberOfCopies,
      createdAt: initialInvoice ? initialInvoice.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveInvoice(savedInvoice);
    setIsPaymentModalOpen(false);

    // Reset for next bill
    setRows([createEmptyRow('-1'), createEmptyRow('-2')]);
    setSelectedCustomer(null);
    setPartySearchQuery('');
    setBillDiscountAmount(0);
    setBillDiscountPercent(0);
    setShippingAmount(0);
    setPackagingAmount(0);
    if (!initialInvoice) {
      setInvoiceNumberSuffix((prev) => String(Number(prev) + 1));
    }
    if (onCancelEdit) {
      onCancelEdit();
    } else if (onClose) {
      onClose();
    }
  };

  // Quick Add Party Form Submission
  const handleSaveNewParty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyName.trim() || !partyPhone.trim()) {
      alert('Party name and phone number are required.');
      return;
    }

    const newParty: Customer = {
      id: 'cust-' + Date.now(),
      name: partyName.trim(),
      companyName: partyCompany.trim() || undefined,
      phone: partyPhone.trim(),
      gstin: partyGstin.trim() || undefined,
      pan: partyPan.trim() || undefined,
      billingAddress: partyAddress.trim() || 'Local Market',
      city: partyCity.trim() || settings.city,
      state: partyState.trim() || settings.state,
      stateCode: partyStateCode.trim() || settings.stateCode,
      pincode: partyPincode.trim() || settings.pincode,
      creditLimit: 50000,
      currentBalance: 0,
      createdAt: new Date().toISOString(),
    };

    onAddNewCustomer(newParty);
    setSelectedCustomer(newParty);
    setShowAddCustomerModal(false);
  };

  const handlePartyGstinChange = async (val: string) => {
    const clean = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);
    setPartyGstin(clean);
    if (clean.length >= 10) setPartyPan(clean.slice(2, 12));

    if (clean.length === 15) {
      setIsVerifyingPartyGST(true);
      try {
        const res = await verifyAndFetchGSTDetails(clean);
        setPartyGstResult(res);
        if (res.isValid) {
          setPartyPan(res.pan);
          if (res.address) setPartyAddress(res.address);
          if (res.city) setPartyCity(res.city);
          if (res.state) setPartyState(res.state);
          if (res.stateCode) setPartyStateCode(res.stateCode);
          if (res.pincode) setPartyPincode(res.pincode);
          if (res.tradeName) setPartyCompany(res.tradeName);
          if (res.legalName || res.tradeName) setPartyName(res.legalName || res.tradeName);
        }
      } catch (err) {
        console.error('GST verification error:', err);
      } finally {
        setIsVerifyingPartyGST(false);
      }
    } else {
      setPartyGstResult(null);
    }
  };

  // Mini Calculator Arithmetic Engine
  const handleCalcButton = (char: string) => {
    if (char === 'C') {
      setCalcInput('');
      setCalcResult(null);
    } else if (char === '=') {
      try {
        const sanitized = calcInput.replace(/[^0-9+\-*/.]/g, '');
        // eslint-disable-next-line no-eval
        const res = Function(`'use strict'; return (${sanitized})`)();
        setCalcResult(String(res));
      } catch {
        setCalcResult('Error');
      }
    } else {
      setCalcInput((prev) => prev + char);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-neutral-900 font-sans text-xs pb-20 flex flex-col selection:bg-neutral-200">
      {/* ========================================================================= */}
      {/* 1. APPLE TOP BAR (SHARP EDGES, MINIMALIST & PROFESSIONAL)                  */}
      {/* ========================================================================= */}
      <div className="bg-white border-b border-neutral-200 px-5 py-2 flex items-center justify-between">
        {/* Tab Strip */}
        <div className="flex items-center space-x-1.5">
          {onCancelEdit && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="mr-1 px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-[5px] border border-neutral-300 text-xs font-medium flex items-center space-x-1 transition-colors cursor-pointer"
            >
              <span>← All Sale Bills</span>
            </button>
          )}
          <div
            className={`flex items-center px-2.5 py-1 rounded-[5px] border text-xs font-medium ${
              initialInvoice
                ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold'
                : 'bg-neutral-100 border-neutral-200 text-neutral-900'
            }`}
          >
            <span>{initialInvoice ? `Editing: ${initialInvoice.invoiceNumber}` : activeTabName}</span>
            <button
              onClick={initialInvoice && onCancelEdit ? onCancelEdit : handleResetDraft}
              className="ml-2 text-neutral-400 hover:text-black transition-colors cursor-pointer"
              title={initialInvoice ? 'Cancel Edit' : 'Close / Reset'}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          {!initialInvoice && (
            <button
              onClick={() => {
                if (confirm('Start a fresh new sale draft?')) {
                  handleResetDraft();
                }
              }}
              className="w-6 h-6 rounded-[5px] border border-neutral-200 bg-white text-neutral-600 hover:text-black hover:bg-neutral-50 flex items-center justify-center transition-all cursor-pointer"
              title="New Draft"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right Controls: Godown, Company, Calculator, Close */}
        <div className="flex items-center space-x-2">
          {/* Godown Selector */}
          <div className="relative">
            <select
              value={selectedGodown}
              onChange={(e) => setSelectedGodown(e.target.value)}
              className="h-7 pl-2.5 pr-6 bg-neutral-50 rounded-[5px] border border-neutral-200 text-xs font-medium text-neutral-700 appearance-none cursor-pointer focus:outline-none focus:border-neutral-900"
            >
              <option value="Main Godown">Godown: Main Godown</option>
              <option value="Retail Counter">Godown: Retail Counter</option>
              <option value="Warehouse A">Godown: Warehouse A</option>
            </select>
            <ChevronDown className="w-3 h-3 text-neutral-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Company Badge */}
          <div className="flex items-center space-x-1.5 h-7 px-2.5 bg-neutral-50 rounded-[5px] border border-neutral-200">
            <div className="w-4 h-4 rounded-[3px] bg-black text-white flex items-center justify-center font-bold text-[9px]">
              {(settings.firmName || 'S').slice(0, 1).toUpperCase()}
            </div>
            <span className="font-medium text-neutral-800 text-xs truncate max-w-[210px]">
              {settings.firmName || 'SHRI SHYAMJI MOUTH FRESHNER'}
            </span>
          </div>

          {/* Quick Calculator Button */}
          <div className="relative">
            <button
              onClick={() => setIsCalculatorOpen(!isCalculatorOpen)}
              className={`w-7 h-7 rounded-[5px] border border-neutral-200 flex items-center justify-center transition-all cursor-pointer ${
                isCalculatorOpen ? 'bg-black text-white' : 'bg-white text-neutral-700 hover:bg-neutral-50'
              }`}
              title="Quick Calculator"
            >
              <Calculator className="w-3.5 h-3.5" />
            </button>

            {/* Floating Mini Calculator */}
            {isCalculatorOpen && (
              <div className="absolute right-0 top-9 w-52 bg-white rounded-md border border-neutral-300 shadow-lg p-2.5 z-50 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-1.5 border-b border-neutral-200 mb-2">
                  <span className="font-semibold text-[10px] uppercase tracking-wider text-neutral-500">Calculator</span>
                  <button onClick={() => setIsCalculatorOpen(false)} className="text-neutral-400 hover:text-black">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="bg-neutral-50 p-2 rounded-[4px] text-right font-sans tabular-nums text-sm font-bold min-h-[34px] mb-2 border border-neutral-200 break-all text-neutral-900">
                  {calcResult !== null ? calcResult : calcInput || '0'}
                </div>
                <div className="grid grid-cols-4 gap-1 font-sans tabular-nums text-xs">
                  {['7', '8', '9', '/'].map((b) => (
                    <button key={b} onClick={() => handleCalcButton(b)} className="p-1.5 rounded-[4px] bg-neutral-100 hover:bg-neutral-200 font-semibold text-neutral-800">
                      {b}
                    </button>
                  ))}
                  {['4', '5', '6', '*'].map((b) => (
                    <button key={b} onClick={() => handleCalcButton(b)} className="p-1.5 rounded-[4px] bg-neutral-100 hover:bg-neutral-200 font-semibold text-neutral-800">
                      {b}
                    </button>
                  ))}
                  {['1', '2', '3', '-'].map((b) => (
                    <button key={b} onClick={() => handleCalcButton(b)} className="p-1.5 rounded-[4px] bg-neutral-100 hover:bg-neutral-200 font-semibold text-neutral-800">
                      {b}
                    </button>
                  ))}
                  {['C', '0', '=', '+'].map((b) => (
                    <button
                      key={b}
                      onClick={() => handleCalcButton(b)}
                      className={`p-1.5 rounded-[4px] font-semibold ${
                        b === '=' ? 'bg-[#0071e3] text-white' : b === 'C' ? 'bg-red-50 text-red-600' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Close Window */}
          {onClose && (
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-[5px] border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-500 hover:text-black flex items-center justify-center transition-all cursor-pointer"
              title="Close Window"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SUB-BAR: SALE TITLE + SEGMENTED CONTROLS (APPLE MINIMALISM)             */}
      {/* ========================================================================= */}
      <div className="px-5 py-2.5 bg-white border-b border-neutral-200 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h1 className="text-base font-semibold tracking-tight text-neutral-900">Sale</h1>

          {/* macOS Segmented Switch */}
          <div className="inline-flex p-0.5 bg-neutral-100 rounded-[6px] border border-neutral-200">
            <button
              type="button"
              onClick={() => setSaleType('CREDIT')}
              className={`px-3 py-1 rounded-[5px] text-xs transition-all cursor-pointer ${
                saleType === 'CREDIT'
                  ? 'bg-white text-neutral-900 font-semibold shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Credit
            </button>
            <button
              type="button"
              onClick={() => setSaleType('CASH')}
              className={`px-3 py-1 rounded-[5px] text-xs transition-all cursor-pointer ${
                saleType === 'CASH'
                  ? 'bg-white text-neutral-900 font-semibold shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Cash
            </button>
          </div>
        </div>

        {/* GST Type Indicator Tag */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-neutral-500 text-[11px]">Tax Type:</span>
          <span
            className={`font-medium px-2 py-0.5 rounded-[4px] text-[11px] border ${
              isInterState
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-neutral-50 text-neutral-700 border-neutral-200'
            }`}
          >
            {isInterState ? 'Inter-State (IGST 100%)' : 'Intra-State (CGST 50% + SGST 50%)'}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN FORM BODY: PARTY & INVOICE DETAILS (SHARP EDGES & CLEAN ALIGNMENT) */}
      {/* ========================================================================= */}
      <div className="p-4 sm:p-5 space-y-3.5 max-w-[1550px] w-full mx-auto flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-white p-3.5 rounded-lg border border-neutral-200 shadow-2xs">
          {/* LEFT 5 COLS: PARTY / CUSTOMER SEARCH & DETAILS */}
          <div className="lg:col-span-5 space-y-1.5" ref={partySearchRef}>
            <div className="relative">
              {!selectedCustomer ? (
                <div>
                  <div
                    onClick={() => setIsPartyDropdownOpen(true)}
                    className="relative flex items-center bg-neutral-50/50 border border-neutral-200 rounded-md px-3 h-8 cursor-pointer hover:border-neutral-400 focus-within:border-neutral-900 focus-within:bg-white transition-all"
                  >
                    <Search className="w-3.5 h-3.5 text-neutral-400 mr-2 shrink-0" />
                    <input
                      type="text"
                      placeholder="Search by Name/Phone *"
                      value={partySearchQuery}
                      onChange={(e) => {
                        setPartySearchQuery(e.target.value);
                        setIsPartyDropdownOpen(true);
                      }}
                      onFocus={() => setIsPartyDropdownOpen(true)}
                      className="w-full bg-transparent text-xs font-normal text-neutral-900 focus:outline-none placeholder:text-neutral-400"
                    />
                    <ChevronDown className="w-3.5 h-3.5 text-neutral-400 ml-1 shrink-0" />
                  </div>

                  {/* Autocomplete Dropdown */}
                  {isPartyDropdownOpen && (
                    <div className="absolute left-0 right-0 top-9 bg-white rounded-md border border-neutral-300 shadow-lg z-30 max-h-60 overflow-y-auto p-1 font-sans">
                      <div className="flex items-center justify-between px-2.5 py-1 border-b border-neutral-100 mb-1">
                        <span className="text-[10px] uppercase font-semibold text-neutral-400 tracking-wider">
                          Select Party
                        </span>
                        <button
                          onClick={() => {
                            setIsPartyDropdownOpen(false);
                            setShowAddCustomerModal(true);
                          }}
                          className="text-[11px] font-medium text-[#0071e3] hover:underline cursor-pointer"
                        >
                          + Add New Party
                        </button>
                      </div>

                      {filteredCustomers.length === 0 ? (
                        <div className="p-3 text-center text-neutral-500">
                          <p>No party found matching &quot;{partySearchQuery}&quot;</p>
                          <button
                            onClick={() => {
                              setIsPartyDropdownOpen(false);
                              setPartyName(partySearchQuery);
                              setShowAddCustomerModal(true);
                            }}
                            className="mt-1.5 px-3 py-1 rounded-md bg-neutral-900 text-white text-xs font-medium cursor-pointer"
                          >
                            Create Party &quot;{partySearchQuery}&quot;
                          </button>
                        </div>
                      ) : (
                        filteredCustomers.map((c) => (
                          <div
                            key={c.id}
                            onClick={() => {
                              setSelectedCustomer(c);
                              setIsPartyDropdownOpen(false);
                              setPartySearchQuery('');
                            }}
                            className="p-2 hover:bg-neutral-50 rounded-[4px] cursor-pointer flex items-center justify-between transition-colors"
                          >
                            <div>
                              <p className="font-semibold text-xs text-neutral-900">{c.name}</p>
                              <p className="text-[10px] text-neutral-500 font-sans tabular-nums">
                                {c.phone} {c.gstin ? `• GST: ${c.gstin}` : ''}
                              </p>
                            </div>
                            <div className="text-right">
                              <span
                                className={`text-[11px] font-sans tabular-nums font-medium ${
                                  c.currentBalance > 0 ? 'text-red-600' : 'text-neutral-600'
                                }`}
                              >
                                Bal: {formatINR(c.currentBalance)}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* Selected Customer Chip */
                <div className="p-2.5 bg-neutral-50 rounded-md border border-neutral-200 flex items-start justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-xs text-neutral-900">{selectedCustomer.name}</span>
                      {selectedCustomer.companyName && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-[3px] bg-neutral-200 text-neutral-600 font-medium">
                          {selectedCustomer.companyName}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-neutral-500 font-sans tabular-nums">
                      Phone: {selectedCustomer.phone || '—'} | GSTIN: {selectedCustomer.gstin || 'Unregistered'}
                    </p>
                    <p className="text-[11px] text-neutral-600 truncate max-w-sm">
                      {selectedCustomer.billingAddress}, {selectedCustomer.city}, {selectedCustomer.state}
                    </p>
                    <div className="pt-0.5">
                      <span
                        className={`text-[11px] font-sans tabular-nums font-semibold ${
                          selectedCustomer.currentBalance > 0 ? 'text-red-600' : 'text-emerald-700'
                        }`}
                      >
                        Balance Due: {formatINR(selectedCustomer.currentBalance)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    className="text-xs text-[#0071e3] hover:underline font-medium cursor-pointer"
                  >
                    Change Party
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT 7 COLS: INVOICE DETAILS GRID (CRISP UNIFIED H-8 INPUTS) */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {/* 1. Invoice Number */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-semibold text-neutral-500 tracking-wider block">
                Invoice Number
              </label>
              <div className="flex items-center h-8 border border-neutral-200 rounded-md overflow-hidden bg-neutral-50/50 focus-within:bg-white focus-within:border-neutral-900 transition-colors">
                <select
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value)}
                  className="h-full px-2 bg-transparent text-[11px] font-medium text-neutral-600 border-r border-neutral-200 focus:outline-none cursor-pointer"
                >
                  <option value="TaxInvoice">TaxInvoice</option>
                  <option value="INV">INV</option>
                  <option value="BILL">BILL</option>
                </select>
                <input
                  type="text"
                  value={invoiceNumberSuffix}
                  onChange={(e) => setInvoiceNumberSuffix(e.target.value)}
                  className="w-full h-full px-2 bg-transparent text-xs font-sans tabular-nums font-semibold text-neutral-900 focus:outline-none"
                />
              </div>
            </div>

            {/* 2. Invoice Date */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-semibold text-neutral-500 tracking-wider block">
                Invoice Date
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full h-8 px-2 rounded-md border border-neutral-200 bg-neutral-50/50 text-xs font-medium text-neutral-800 focus:bg-white focus:outline-none focus:border-neutral-900 transition-colors"
              />
            </div>

            {/* 3. Payment Terms */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-semibold text-neutral-500 tracking-wider block">
                Payment Terms
              </label>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full h-8 px-2 rounded-md border border-neutral-200 bg-neutral-50/50 text-xs font-medium text-neutral-800 focus:bg-white focus:outline-none focus:border-neutral-900 cursor-pointer transition-colors"
              >
                <option value="Due on Receipt">Due on Receipt</option>
                <option value="Immediate">Immediate / Cash</option>
                <option value="Net 7">Net 7 Days</option>
                <option value="Net 15">Net 15 Days</option>
                <option value="Net 30">Net 30 Days</option>
                <option value="Net 60">Net 60 Days</option>
              </select>
            </div>

            {/* 4. Due Date */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-semibold text-neutral-500 tracking-wider block">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full h-8 px-2 rounded-md border border-neutral-200 bg-neutral-50/50 text-xs font-medium text-neutral-800 focus:bg-white focus:outline-none focus:border-neutral-900 transition-colors"
              />
            </div>

            {/* 5. State of supply */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-semibold text-neutral-500 tracking-wider block">
                State of supply
              </label>
              <select
                value={stateOfSupply}
                onChange={(e) => setStateOfSupply(e.target.value)}
                className="w-full h-8 px-2 rounded-md border border-neutral-200 bg-neutral-50/50 text-xs font-medium text-neutral-800 focus:bg-white focus:outline-none focus:border-neutral-900 cursor-pointer transition-colors"
              >
                {INDIAN_STATES.map((st) => (
                  <option key={st.code} value={st.name}>
                    {st.code} - {st.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. THE BILLING ITEM GRID TABLE (CRISP APPLE EXCEL SPREADSHEET STYLE)      */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-lg border border-neutral-200 shadow-2xs">
          <div className="overflow-x-auto min-h-[160px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#f8f9fa] text-neutral-600 font-semibold border-b border-neutral-200 text-[10px] tracking-wider uppercase">
                  {/* Barcode scanner icon */}
                  <th className="py-2 px-2 text-center border-r border-neutral-200 w-10">
                    <button
                      type="button"
                      onClick={() => setIsScannerOpen(true)}
                      className="p-1 rounded hover:bg-neutral-200 text-neutral-700 transition-colors cursor-pointer"
                      title="Scan Barcode Gun"
                    >
                      <Scan className="w-3.5 h-3.5 mx-auto" />
                    </button>
                  </th>
                  <th className="py-2 px-3 border-r border-neutral-200 min-w-[280px]">ITEM</th>
                  <th className="py-2 px-2 text-right border-r border-neutral-200 w-20">MRP</th>
                  <th className="py-2 px-2 border-r border-neutral-200 w-24">SIZE</th>
                  <th className="py-2 px-2 text-center border-r border-neutral-200 w-16">QTY</th>
                  <th className="py-2 px-2 text-center border-r border-neutral-200 w-20">UNIT</th>
                  <th className="py-2 px-2 text-right border-r border-neutral-200 w-32">PRICE/UNIT</th>
                  <th className="py-2 px-2 text-right border-r border-neutral-200 w-28">DISCOUNT % | ₹</th>
                  <th className="py-2 px-2 text-right border-r border-neutral-200 w-28">TAX % | ₹</th>
                  <th className="py-2 px-3 text-right border-r border-neutral-200 w-28">AMOUNT</th>
                  <th className="py-2 px-2 text-center w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-150 font-sans tabular-nums text-xs">
                {rows.map((row, idx) => {
                  const baseRate =
                    row.priceWithTax && row.taxRate > 0
                      ? row.salePrice / (1 + row.taxRate / 100)
                      : row.salePrice;
                  const gross = baseRate * row.qty;
                  const discount =
                    row.discountAmount > 0
                      ? row.discountAmount
                      : (gross * (row.discountPercent || 0)) / 100;
                  const taxable = Math.max(0, gross - discount);
                  const taxAmt = (taxable * (row.taxRate || 0)) / 100;
                  const rowTotal = taxable + taxAmt;

                  return (
                    <tr key={row.id} className="hover:bg-neutral-50/80 transition-colors relative">
                      {/* # Icon */}
                      <td className="py-1.5 px-2 text-center border-r border-neutral-200 font-sans text-neutral-400">
                        {idx === 0 ? <Zap className="w-3.5 h-3.5 text-blue-500 mx-auto" /> : idx + 1}
                      </td>

                      {/* ITEM Name + Autocomplete Trigger */}
                      <td className="py-1 px-2 border-r border-neutral-200 relative font-sans">
                        <input
                          type="text"
                          data-item-input={idx}
                          placeholder="Search product or type item name..."
                          value={row.name}
                          onFocus={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const spaceBelow = window.innerHeight - rect.bottom;
                            const openUpwards = spaceBelow < 260 && rect.top > 260;
                            setProductDropdownPos({
                              rowIdx: idx,
                              top: openUpwards ? rect.top - 250 : rect.bottom + 4,
                              left: Math.max(12, Math.min(rect.left, window.innerWidth - 380)),
                              width: Math.max(rect.width, 360),
                            });
                            setActiveItemSearchIndex(idx);
                          }}
                          onChange={(e) => {
                            handleUpdateRow(idx, { name: e.target.value });
                            const rect = e.currentTarget.getBoundingClientRect();
                            const spaceBelow = window.innerHeight - rect.bottom;
                            const openUpwards = spaceBelow < 260 && rect.top > 260;
                            setProductDropdownPos({
                              rowIdx: idx,
                              top: openUpwards ? rect.top - 250 : rect.bottom + 4,
                              left: Math.max(12, Math.min(rect.left, window.innerWidth - 380)),
                              width: Math.max(rect.width, 360),
                            });
                            setActiveItemSearchIndex(idx);
                          }}
                          className="w-full text-xs font-normal text-neutral-900 bg-transparent px-1.5 py-1 rounded-[3px] focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
                        />
                      </td>

                      {/* MRP */}
                      <td className="py-1 px-1.5 text-right border-r border-neutral-200">
                        <input
                          type="number"
                          value={row.mrp === 0 ? '' : row.mrp}
                          onChange={(e) =>
                            handleUpdateRow(idx, { mrp: parseFloat(e.target.value) || 0 })
                          }
                          placeholder="0"
                          className="w-full text-right bg-transparent px-1.5 py-1 rounded-[3px] focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
                        />
                      </td>

                      {/* SIZE */}
                      <td className="py-1 px-1.5 border-r border-neutral-200">
                        <input
                          type="text"
                          value={row.size}
                          onChange={(e) => handleUpdateRow(idx, { size: e.target.value })}
                          placeholder="Size/Pack"
                          className="w-full font-sans bg-transparent px-1.5 py-1 rounded-[3px] focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
                        />
                      </td>

                      {/* QTY */}
                      <td className="py-1 px-1 text-center border-r border-neutral-200">
                        <input
                          type="number"
                          min="1"
                          value={row.qty === 0 ? '' : row.qty}
                          onChange={(e) =>
                            handleUpdateRow(idx, { qty: Math.max(1, parseFloat(e.target.value) || 1) })
                          }
                          className="w-12 text-center font-bold bg-transparent px-1 py-1 rounded-[3px] focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 mx-auto block"
                        />
                      </td>

                      {/* UNIT */}
                      <td className="py-1 px-1 text-center border-r border-neutral-200">
                        <select
                          value={row.unit}
                          onChange={(e) => handleUpdateRow(idx, { unit: e.target.value })}
                          className="bg-transparent text-xs text-neutral-700 font-sans focus:outline-none cursor-pointer"
                        >
                          <option value="NONE">NONE</option>
                          {COMMON_UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* PRICE / UNIT (With Tax / Without Tax toggle) */}
                      <td className="py-1 px-1.5 text-right border-r border-neutral-200">
                        <div className="flex items-center space-x-1 justify-end">
                          <input
                            type="number"
                            value={row.salePrice === 0 ? '' : row.salePrice}
                            onChange={(e) =>
                              handleUpdateRow(idx, { salePrice: parseFloat(e.target.value) || 0 })
                            }
                            placeholder="0"
                            className="w-16 text-right font-medium bg-transparent px-1 py-1 rounded-[3px] focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
                          />
                          <select
                            value={row.priceWithTax ? 'WITH' : 'WITHOUT'}
                            onChange={(e) =>
                              handleUpdateRow(idx, { priceWithTax: e.target.value === 'WITH' })
                            }
                            className="text-[9px] bg-transparent text-neutral-500 border-none focus:outline-none cursor-pointer"
                          >
                            <option value="WITH">With Tax</option>
                            <option value="WITHOUT">Without Tax</option>
                          </select>
                        </div>
                      </td>

                      {/* DISCOUNT (% and Amount) */}
                      <td className="py-1 px-1.5 text-right border-r border-neutral-200">
                        <div className="flex items-center space-x-1 justify-end">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={row.discountPercent === 0 ? '' : row.discountPercent}
                            onChange={(e) =>
                              handleUpdateRow(idx, {
                                discountPercent: parseFloat(e.target.value) || 0,
                              })
                            }
                            placeholder="%"
                            className="w-10 text-right bg-transparent px-1 py-1 rounded-[3px] focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 text-[11px]"
                          />
                          <span className="text-[10px] text-neutral-500 w-11 text-right truncate">
                            {formatINR(discount)}
                          </span>
                        </div>
                      </td>

                      {/* TAX (% and Amount) */}
                      <td className="py-1 px-1.5 text-right border-r border-neutral-200">
                        <div className="flex items-center space-x-1 justify-end">
                          <select
                            value={row.taxRate}
                            onChange={(e) =>
                              handleUpdateRow(idx, {
                                taxRate: parseInt(e.target.value, 10) as TaxRate,
                              })
                            }
                            className="text-[11px] bg-transparent focus:outline-none cursor-pointer"
                          >
                            {GST_RATES.map((r) => (
                              <option key={r} value={r}>
                                {r}%
                              </option>
                            ))}
                          </select>
                          <span className="text-[10px] text-neutral-500 w-11 text-right truncate">
                            {formatINR(taxAmt)}
                          </span>
                        </div>
                      </td>

                      {/* AMOUNT */}
                      <td className="py-1.5 px-3 text-right border-r border-neutral-200 font-semibold text-neutral-900">
                        {formatINR(rowTotal)}
                      </td>

                      {/* DELETE ROW */}
                      <td className="py-1 px-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          className="p-1 rounded-[3px] text-neutral-400 hover:text-red-600 transition-colors cursor-pointer"
                          title="Delete Row"
                        >
                          <Trash2 className="w-3.5 h-3.5 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* TABLE FOOTER / CONTROLS (CRISP MINIMALIST SUMMARY) */}
          <div className="bg-[#f8f9fa] border-t border-neutral-200 px-3 py-2 flex flex-wrap items-center justify-between gap-3 font-sans tabular-nums text-xs">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleAddRow}
                className="h-7 px-3 rounded-[5px] border border-neutral-300 bg-white text-neutral-800 font-sans font-semibold text-xs hover:bg-neutral-100 transition-all shadow-2xs flex items-center space-x-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ADD ROW</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenAddProductModal(rows.length - 1)}
                className="h-7 px-3 rounded-[5px] border border-blue-200 bg-blue-50/70 text-blue-700 font-sans font-semibold text-xs hover:bg-blue-100 transition-all shadow-2xs flex items-center space-x-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ ADD NEW ITEM</span>
              </button>
            </div>

            {/* Total Row summary */}
            <div className="flex items-center space-x-5 text-neutral-600">
              <span className="font-sans font-bold uppercase text-[10px] tracking-wider text-neutral-900">
                TOTAL
              </span>
              <span>
                Qty: <strong className="text-neutral-900 font-bold">{tableTotalQty}</strong>
              </span>
              <span>
                Discount: <strong className="text-neutral-900 font-bold">{formatINR(tableTotalDiscount)}</strong>
              </span>
              <span>
                Tax: <strong className="text-neutral-900 font-bold">{formatINR(tableTotalTax)}</strong>
              </span>
              <span className="text-xs font-bold text-neutral-900">
                Subtotal: {formatINR(tableSubtotalAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 5. 3-COLUMN LOWER SECTION: TRANSPORT, ATTACHMENTS, CHARGES & TOTALS       */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
          {/* COLUMN 1: TRANSPORT & TERMS (4 COLS) */}
          <div className="lg:col-span-4 bg-white p-3 rounded-lg border border-neutral-200 shadow-2xs space-y-2.5">
            <div className="flex items-center space-x-1.5 text-neutral-800 font-semibold text-xs">
              <Truck className="w-3.5 h-3.5 text-neutral-500" />
              <span>Transport & Delivery Details</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Transport Name"
                value={transportName}
                onChange={(e) => setTransportName(e.target.value)}
                className="w-full h-7.5 px-2.5 rounded-md border border-neutral-200 bg-neutral-50/50 text-xs focus:bg-white focus:outline-none focus:border-neutral-900 transition-colors"
              />
              <input
                type="text"
                placeholder="Delivery Location"
                value={deliveryLocation}
                onChange={(e) => setDeliveryLocation(e.target.value)}
                className="w-full h-7.5 px-2.5 rounded-md border border-neutral-200 bg-neutral-50/50 text-xs focus:bg-white focus:outline-none focus:border-neutral-900 transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Vehicle Number"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                className="w-full h-7.5 px-2.5 rounded-md border border-neutral-200 bg-neutral-50/50 text-xs font-sans tabular-nums font-semibold uppercase tracking-wider focus:bg-white focus:outline-none focus:border-neutral-900 transition-colors"
              />
              <input
                type="date"
                placeholder="Delivery Date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full h-7.5 px-2 rounded-md border border-neutral-200 bg-neutral-50/50 text-xs focus:bg-white focus:outline-none focus:border-neutral-900 transition-colors"
              />
            </div>

            {/* Terms & Conditions Box */}
            <div className="space-y-1 pt-1.5 border-t border-neutral-100">
              <label className="text-[10px] font-semibold text-neutral-600 uppercase tracking-wider block">Terms & Conditions</label>
              <textarea
                rows={2}
                value={termsText}
                onChange={(e) => setTermsText(e.target.value)}
                placeholder="Terms & Conditions..."
                className="w-full p-2 rounded-md border border-neutral-200 bg-neutral-50/50 text-[11px] font-sans text-neutral-800 focus:bg-white focus:outline-none focus:border-neutral-900 resize-none transition-colors"
              />
            </div>
          </div>

          {/* COLUMN 2: ATTACHMENTS, NOTES & COPIES (4 COLS) */}
          <div className="lg:col-span-4 bg-white p-3 rounded-lg border border-neutral-200 shadow-2xs space-y-2">
            <div className="space-y-1.5">
              {/* Add Description Button */}
              <button
                type="button"
                onClick={() => setShowDescriptionField(!showDescriptionField)}
                className="w-full h-7.5 px-3 rounded-md border border-neutral-200 hover:border-neutral-400 text-neutral-700 font-medium text-xs flex items-center justify-center space-x-1.5 bg-neutral-50/60 hover:bg-neutral-100 transition-all cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>+ ADD DESCRIPTION / NOTES</span>
              </button>

              {showDescriptionField && (
                <textarea
                  rows={2}
                  placeholder="Enter invoice remarks or instructions..."
                  value={invoiceDescription}
                  onChange={(e) => setInvoiceDescription(e.target.value)}
                  className="w-full p-2 rounded-md border border-neutral-200 bg-neutral-50/50 text-xs font-sans text-neutral-900 focus:bg-white focus:outline-none focus:border-neutral-900"
                />
              )}

              {/* Add Image Button */}
              <input
                type="file"
                ref={imageInputRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setAttachedImageName(e.target.files[0].name);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="w-full h-7.5 px-3 rounded-md border border-neutral-200 hover:border-neutral-400 text-neutral-700 font-medium text-xs flex items-center justify-center space-x-1.5 bg-neutral-50/60 hover:bg-neutral-100 transition-all cursor-pointer"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>{attachedImageName ? `Image: ${attachedImageName}` : '+ ADD IMAGE'}</span>
              </button>

              {/* Add Document Button */}
              <input
                type="file"
                ref={docInputRef}
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setAttachedDocName(e.target.files[0].name);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => docInputRef.current?.click()}
                className="w-full h-7.5 px-3 rounded-md border border-neutral-200 hover:border-neutral-400 text-neutral-700 font-medium text-xs flex items-center justify-center space-x-1.5 bg-neutral-50/60 hover:bg-neutral-100 transition-all cursor-pointer"
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span>{attachedDocName ? `Doc: ${attachedDocName}` : '+ ADD DOCUMENT / PO'}</span>
              </button>
            </div>

            {/* No. of copies selector */}
            <div className="pt-1.5 border-t border-neutral-100 space-y-1">
              <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block">No. of copies</label>
              <select
                value={numberOfCopies}
                onChange={(e) => setNumberOfCopies(e.target.value)}
                className="w-full h-7.5 px-2 rounded-md border border-neutral-200 bg-neutral-50/50 text-xs font-medium text-neutral-800 focus:outline-none cursor-pointer"
              >
                <option value="Original (For Recipient)">Original (For Recipient)</option>
                <option value="Duplicate (For Transporter)">Duplicate (For Transporter)</option>
                <option value="Triplicate (For Supplier)">Triplicate (For Supplier)</option>
                <option value="Quadruplicate (For Extra Record)">Quadruplicate (For Extra Record)</option>
              </select>
            </div>
          </div>

          {/* COLUMN 3: CHARGES, ROUND-OFF & GRAND TOTAL (4 COLS) */}
          <div className="lg:col-span-4 bg-white p-3 rounded-lg border border-neutral-200 shadow-2xs space-y-2.5 font-sans tabular-nums text-xs">
            {/* Bill Discount */}
            <div className="flex items-center justify-between font-sans">
              <span className="text-neutral-500 text-xs">Discount</span>
              <div className="flex items-center space-x-1 font-sans tabular-nums">
                <input
                  type="number"
                  placeholder="(%)"
                  value={billDiscountPercent === 0 ? '' : billDiscountPercent}
                  onChange={(e) => handleBillDiscountPercentChange(parseFloat(e.target.value) || 0)}
                  className="w-14 h-7 px-1.5 text-right rounded-md border border-neutral-200 bg-neutral-50/50 text-xs focus:bg-white focus:outline-none focus:border-neutral-900"
                />
                <span className="text-neutral-400">-</span>
                <input
                  type="number"
                  placeholder="(₹)"
                  value={billDiscountAmount === 0 ? '' : billDiscountAmount}
                  onChange={(e) => handleBillDiscountAmountChange(parseFloat(e.target.value) || 0)}
                  className="w-20 h-7 px-1.5 text-right rounded-md border border-neutral-200 bg-neutral-50/50 text-xs focus:bg-white focus:outline-none focus:border-neutral-900"
                />
              </div>
            </div>

            {/* Shipping Charges */}
            <div className="flex items-center justify-between font-sans">
              <div className="flex items-center space-x-1.5">
                <span className="text-neutral-500 text-xs">Shipping</span>
                <button
                  type="button"
                  onClick={() => setShowShippingSac(!showShippingSac)}
                  className="text-[10px] text-[#0071e3] hover:underline cursor-pointer"
                >
                  {showShippingSac ? 'SAC: 996511' : 'Add SAC'}
                </button>
              </div>
              <div className="flex items-center space-x-1 font-sans tabular-nums">
                <select
                  value={shippingTaxRate}
                  onChange={(e) => setShippingTaxRate(parseInt(e.target.value, 10) as TaxRate)}
                  className="h-7 text-[10px] px-1 rounded-md border border-neutral-200 bg-neutral-50/50 focus:outline-none cursor-pointer"
                >
                  <option value={0}>GST@0%</option>
                  <option value={5}>GST@5%</option>
                  <option value={12}>GST@12%</option>
                  <option value={18}>GST@18%</option>
                  <option value={28}>GST@28%</option>
                </select>
                <input
                  type="number"
                  value={shippingAmount === 0 ? '' : shippingAmount}
                  onChange={(e) => setShippingAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-20 h-7 px-1.5 text-right rounded-md border border-neutral-200 bg-neutral-50/50 text-xs focus:bg-white focus:outline-none focus:border-neutral-900"
                />
              </div>
            </div>

            {/* Packaging Charges */}
            <div className="flex items-center justify-between font-sans">
              <div className="flex items-center space-x-1.5">
                <span className="text-neutral-500 text-xs">Packaging</span>
                <button
                  type="button"
                  onClick={() => setShowPackagingSac(!showPackagingSac)}
                  className="text-[10px] text-[#0071e3] hover:underline cursor-pointer"
                >
                  {showPackagingSac ? 'SAC: 998599' : 'Add SAC'}
                </button>
              </div>
              <div className="flex items-center space-x-1 font-sans tabular-nums">
                <select
                  value={packagingTaxRate}
                  onChange={(e) => setPackagingTaxRate(parseInt(e.target.value, 10) as TaxRate)}
                  className="h-7 text-[10px] px-1 rounded-md border border-neutral-200 bg-neutral-50/50 focus:outline-none cursor-pointer"
                >
                  <option value={0}>GST@0%</option>
                  <option value={5}>GST@5%</option>
                  <option value={12}>GST@12%</option>
                  <option value={18}>GST@18%</option>
                  <option value={28}>GST@28%</option>
                </select>
                <input
                  type="number"
                  value={packagingAmount === 0 ? '' : packagingAmount}
                  onChange={(e) => setPackagingAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-20 h-7 px-1.5 text-right rounded-md border border-neutral-200 bg-neutral-50/50 text-xs focus:bg-white focus:outline-none focus:border-neutral-900"
                />
              </div>
            </div>

            {/* Round Off Checkbox */}
            <div className="flex items-center justify-between pt-1 border-t border-neutral-100 font-sans">
              <label className="flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableRoundOff}
                  onChange={(e) => setEnableRoundOff(e.target.checked)}
                  className="rounded-[3px] border-neutral-300 text-[#0071e3] focus:ring-0 cursor-pointer"
                />
                <span className="text-xs text-neutral-700 font-medium">Round Off</span>
              </label>
              <span className="font-sans tabular-nums text-xs text-neutral-500">
                {totals.roundOff >= 0 ? `+${totals.roundOff}` : totals.roundOff}
              </span>
            </div>

            {/* Large Grand Total Display */}
            <div className="pt-2 border-t border-neutral-200 flex items-center justify-between">
              <span className="font-sans font-bold text-sm text-neutral-900">Total</span>
              <div className="px-3 py-1.5 bg-neutral-900 rounded-md text-right text-white">
                <span className="text-lg font-bold font-sans tabular-nums">
                  {formatINR(totals.grandTotal)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. BOTTOM FLOATING ACTION BAR (SHARP EDGES, MACOS STATUSBAR AESTHETICS)    */}
      {/* ========================================================================= */}
      <div className="bg-white border-t border-neutral-200 px-6 py-2.5 fixed bottom-0 left-0 right-0 z-20 flex items-center justify-between shadow-md">
        {/* Left: Profit Insight Button */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              Bill Profit: <strong>+{formatINR(totals.totalProfit)}</strong>
            </span>
            <span className="text-[10px] text-emerald-700 font-sans tabular-nums font-semibold">
              ({totals.grandTotal > 0 ? ((totals.totalProfit / totals.grandTotal) * 100).toFixed(1) : 0}%)
            </span>
          </div>
        </div>

        {/* Right: Share Dropdown & Save Button */}
        <div className="flex items-center space-x-2.5">
          {/* Share Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsShareMenuOpen(!isShareMenuOpen)}
              className="h-8 px-3.5 rounded-md border border-neutral-300 bg-white text-neutral-800 font-medium text-xs hover:bg-neutral-50 transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <span>Share</span>
              <ChevronDown className="w-3 h-3 text-neutral-500" />
            </button>

            {isShareMenuOpen && (
              <div className="absolute right-0 bottom-10 w-48 bg-white rounded-md border border-neutral-300 shadow-xl p-1 z-30 font-sans text-xs">
                <button
                  onClick={() => {
                    setIsShareMenuOpen(false);
                    if (!selectedCustomer) {
                      alert('Select a customer first to send WhatsApp bill.');
                      return;
                    }
                    const dummyInv: Invoice = {
                      id: 'draft',
                      invoiceNumber: `${invoicePrefix}-${invoiceNumberSuffix}`,
                      date: invoiceDate,
                      dueDate,
                      type: 'TAX_INVOICE',
                      saleType,
                      customer: selectedCustomer,
                      items: totals.items,
                      subtotal: totals.subtotal,
                      itemDiscountTotal: totals.itemDiscountTotal,
                      billDiscount: billDiscountAmount,
                      taxableTotal: totals.taxableTotal,
                      cgstTotal: totals.cgstTotal,
                      sgstTotal: totals.sgstTotal,
                      igstTotal: totals.igstTotal,
                      roundOff: totals.roundOff,
                      grandTotal: totals.grandTotal,
                      paidAmount: totals.grandTotal,
                      balanceAmount: 0,
                      paymentMode: 'CASH',
                      splitPayments: [],
                      notes: invoiceDescription,
                      terms: termsText,
                      status: 'PAID',
                      totalProfit: totals.totalProfit,
                      isInterState,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    };
                    const msg = generateInvoiceWhatsAppMessage(dummyInv, settings);
                    openWhatsApp(selectedCustomer.phone, msg);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 rounded-[3px] font-medium text-neutral-900 flex items-center space-x-2 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Send via WhatsApp</span>
                </button>
                <button
                  onClick={() => {
                    setIsShareMenuOpen(false);
                    window.print();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 rounded-[3px] font-medium text-neutral-900 flex items-center space-x-2 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-neutral-600" />
                  <span>Print Draft</span>
                </button>
              </div>
            )}
          </div>

          {/* Primary Save Button & Cancel Edit */}
          {initialInvoice && onCancelEdit && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="h-8 px-3.5 rounded-md border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700 font-medium text-xs shadow-xs transition-all cursor-pointer"
            >
              Cancel Edit
            </button>
          )}
          <button
            type="button"
            onClick={handleProceedSave}
            className="h-8 px-5 rounded-md bg-[#0071e3] hover:bg-[#0077ed] active:scale-[0.99] text-white font-semibold text-xs shadow-xs transition-all cursor-pointer flex items-center space-x-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{initialInvoice ? 'Update & Save Invoice' : 'Save Invoice'}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 7. MODALS: PAYMENT, BARCODE GUN & ADD PARTY (SHARP APPLE MODALS)          */}
      {/* ========================================================================= */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        grandTotal={totals.grandTotal}
        customerName={selectedCustomer?.name || 'Walk-in Client'}
        settings={settings}
        initialMode={initialInvoice?.paymentMode}
        initialPaidAmount={initialInvoice?.paidAmount}
        initialNotes={initialInvoice?.notes}
        onConfirmPayment={handleConfirmFinalInvoice}
      />

      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        products={products}
        onProductScanned={handleBarcodeScanned}
      />

      {/* Add New Customer Modal with Auto GST Verification */}
      <AppleModal
        isOpen={showAddCustomerModal}
        onClose={() => setShowAddCustomerModal(false)}
        title="Add New Party / Client"
        subtitle="Enter GSTIN to automatically verify and fill customer business details"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSaveNewParty} className="space-y-3.5 text-xs font-sans">
          {/* GSTIN with Auto-verification */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-neutral-800">GSTIN (15 Digits)</label>
              {isVerifyingPartyGST && (
                <span className="text-[11px] text-[#0071e3] flex items-center gap-1 font-medium">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Verifying Govt Portal...
                </span>
              )}
            </div>
            <input
              type="text"
              maxLength={15}
              placeholder="e.g. 23BSNPG0603H1Z7"
              value={partyGstin}
              onChange={(e) => handlePartyGstinChange(e.target.value)}
              className="w-full h-8 px-3 rounded-md border border-neutral-300 bg-white text-xs font-sans tabular-nums font-bold text-neutral-900 uppercase focus:ring-1 focus:ring-black focus:outline-none"
            />
            {partyGstResult && (
              <div
                className={`mt-1.5 p-2 rounded-md text-[11px] font-medium flex items-center gap-1.5 ${
                  partyGstResult.isValid
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {partyGstResult.isValid ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Verified: {partyGstResult.tradeName || partyGstResult.legalName}</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>{partyGstResult.message || 'Invalid GSTIN'}</span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-neutral-800 block mb-1">Party Name *</label>
              <input
                type="text"
                required
                placeholder="Full Contact Name"
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                className="w-full h-8 px-3 rounded-md border border-neutral-300 bg-white text-xs text-neutral-900 focus:ring-1 focus:ring-black focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-neutral-800 block mb-1">Company / Trade Name</label>
              <input
                type="text"
                placeholder="Firm Name (optional)"
                value={partyCompany}
                onChange={(e) => setPartyCompany(e.target.value)}
                className="w-full h-8 px-3 rounded-md border border-neutral-300 bg-white text-xs text-neutral-900 focus:ring-1 focus:ring-black focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-neutral-800 block mb-1">Phone Number *</label>
              <input
                type="tel"
                required
                placeholder="10 digit mobile"
                value={partyPhone}
                onChange={(e) => setPartyPhone(e.target.value)}
                className="w-full h-8 px-3 rounded-md border border-neutral-300 bg-white text-xs font-sans tabular-nums text-neutral-900 focus:ring-1 focus:ring-black focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-neutral-800 block mb-1">PAN Number</label>
              <input
                type="text"
                maxLength={10}
                placeholder="ABCDE1234F"
                value={partyPan}
                onChange={(e) => setPartyPan(e.target.value.toUpperCase())}
                className="w-full h-8 px-3 rounded-md border border-neutral-300 bg-white text-xs font-sans tabular-nums text-neutral-900 focus:ring-1 focus:ring-black focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-neutral-800 block mb-1">Billing Address</label>
            <input
              type="text"
              placeholder="Shop/Office street address"
              value={partyAddress}
              onChange={(e) => setPartyAddress(e.target.value)}
              className="w-full h-8 px-3 rounded-md border border-neutral-300 bg-white text-xs text-neutral-900 focus:ring-1 focus:ring-black focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-neutral-800 block mb-1">City</label>
              <input
                type="text"
                placeholder="City"
                value={partyCity}
                onChange={(e) => setPartyCity(e.target.value)}
                className="w-full h-8 px-3 rounded-md border border-neutral-300 bg-white text-xs text-neutral-900 focus:ring-1 focus:ring-black focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-neutral-800 block mb-1">State</label>
              <select
                value={partyState}
                onChange={(e) => {
                  const s = INDIAN_STATES.find((st) => st.name === e.target.value);
                  setPartyState(e.target.value);
                  setPartyStateCode(s ? s.code : '23');
                }}
                className="w-full h-8 px-2 rounded-md border border-neutral-300 bg-white text-xs text-neutral-900 focus:ring-1 focus:ring-black focus:outline-none cursor-pointer"
              >
                <option value="">Select State</option>
                {INDIAN_STATES.map((st) => (
                  <option key={st.code} value={st.name}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-neutral-800 block mb-1">Pincode</label>
              <input
                type="text"
                maxLength={6}
                placeholder="Pincode"
                value={partyPincode}
                onChange={(e) => setPartyPincode(e.target.value)}
                className="w-full h-8 px-3 rounded-md border border-neutral-300 bg-white text-xs font-sans tabular-nums text-neutral-900 focus:ring-1 focus:ring-black focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-neutral-200 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowAddCustomerModal(false)}
              className="px-3.5 py-1.5 rounded-md border border-neutral-300 hover:bg-neutral-100 text-xs font-medium text-neutral-800 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-1.5 rounded-md bg-neutral-900 hover:bg-black text-white text-xs font-semibold transition-all cursor-pointer"
            >
              Save Party
            </button>
          </div>
        </form>
      </AppleModal>

      {/* ========================================================================= */}
      {/* 8. FLOATING ITEM SEARCH DROPDOWN PORTAL (NEVER CLIPPED BY ANY TABLE)       */}
      {/* ========================================================================= */}
      {productDropdownPos && activeItemSearchIndex === productDropdownPos.rowIdx && createPortal(
        <div
          id="item-search-portal"
          style={{
            position: 'fixed',
            top: `${productDropdownPos.top}px`,
            left: `${productDropdownPos.left}px`,
            width: `${productDropdownPos.width}px`,
            zIndex: 99999,
          }}
          className="bg-white rounded-lg border border-neutral-300 shadow-2xl p-1.5 font-sans max-h-72 overflow-y-auto ring-1 ring-black/10 animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Header with Results Count */}
          <div className="px-2 py-1 text-[10px] uppercase font-bold text-neutral-400 tracking-wider flex items-center justify-between border-b border-neutral-100">
            <span>Select Product / Item</span>
            <span className="text-[10px] text-neutral-500 tabular-nums font-semibold">
              {currentSearchProducts.length} Available
            </span>
          </div>

          {/* Product Items List */}
          <div className="divide-y divide-neutral-50 max-h-48 overflow-y-auto mt-1">
            {currentSearchProducts.map((p) => (
              <button
                key={p.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectProductForRow(productDropdownPos.rowIdx, p);
                }}
                className="w-full text-left p-2 hover:bg-neutral-100/90 rounded-[4px] flex items-center justify-between cursor-pointer transition-colors group"
              >
                <div>
                  <p className="font-semibold text-xs text-neutral-900 group-hover:text-black">{p.name}</p>
                  <p className="text-[10px] text-neutral-500 tabular-nums">
                    {p.hsn ? `HSN: ${p.hsn} • ` : ''}Stock: <span className={p.stock <= 5 ? 'text-amber-600 font-bold' : 'text-neutral-700 font-medium'}>{p.stock} {p.unit}</span>
                  </p>
                </div>
                <span className="tabular-nums font-semibold text-xs text-neutral-900">
                  {formatINR(p.salePrice)}
                </span>
              </button>
            ))}

            {currentSearchProducts.length === 0 && (
              <div className="p-3 text-center text-xs text-neutral-500">
                No matching product found in inventory
              </div>
            )}
          </div>

          {/* "+ Add as New Product" Action Button */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              const typedName = rows[productDropdownPos.rowIdx]?.name || '';
              handleOpenAddProductModal(productDropdownPos.rowIdx, typedName);
            }}
            className="w-full text-left p-2 mt-1 border-t border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-900 font-semibold text-xs rounded-[4px] flex items-center space-x-2 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-[#0071e3]" />
            <span>
              + Add {rows[productDropdownPos.rowIdx]?.name ? `"${rows[productDropdownPos.rowIdx].name}"` : 'New Item'} to Inventory
            </span>
          </button>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* 9. QUICK ADD PRODUCT MODAL (SHARP APPLE MODAL, IMMEDIATE SALE INCLUSION)  */}
      {/* ========================================================================= */}
      <AppleModal
        isOpen={showAddProductModal}
        onClose={() => setShowAddProductModal(false)}
        title="Add New Product to Inventory"
        subtitle="Quickly register product and add it to this sale invoice"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveQuickProduct} className="space-y-3.5 text-xs font-sans">
          <div>
            <label className="block font-semibold text-neutral-800 mb-1">Product / Item Name *</label>
            <input
              type="text"
              required
              value={newProdName}
              onChange={(e) => setNewProdName(e.target.value)}
              placeholder="e.g. Shyamji Royal Mukhwas 100g"
              className="w-full h-8 px-2.5 rounded-md border border-neutral-300 bg-neutral-50/50 focus:bg-white focus:outline-none focus:border-neutral-900 text-xs font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">HSN / SAC Code</label>
              <input
                type="text"
                value={newProdHsn}
                onChange={(e) => setNewProdHsn(e.target.value)}
                placeholder="210690"
                className="w-full h-8 px-2.5 rounded-md border border-neutral-300 bg-neutral-50/50 focus:bg-white focus:outline-none focus:border-neutral-900 text-xs font-sans tabular-nums"
              />
            </div>
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Unit of Measure</label>
              <select
                value={newProdUnit}
                onChange={(e) => setNewProdUnit(e.target.value)}
                className="w-full h-8 px-2 rounded-md border border-neutral-300 bg-neutral-50/50 focus:bg-white focus:outline-none focus:border-neutral-900 text-xs cursor-pointer font-medium"
              >
                {COMMON_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
                Pricing & GST Mode
              </span>
              <div className="flex space-x-1">
                <button
                  type="button"
                  onClick={() => setNewProdTaxType('EXCLUSIVE')}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                    newProdTaxType === 'EXCLUSIVE'
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-200 text-neutral-700'
                  }`}
                >
                  Without Tax
                </button>
                <button
                  type="button"
                  onClick={() => setNewProdTaxType('INCLUSIVE')}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                    newProdTaxType === 'INCLUSIVE'
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-200 text-neutral-700'
                  }`}
                >
                  With Tax (MRP)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Sale Price (₹) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={newProdSalePrice === 0 ? '' : newProdSalePrice}
                  onChange={(e) => setNewProdSalePrice(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full h-8 px-2 rounded-md border border-neutral-300 bg-white font-sans tabular-nums font-bold text-neutral-900 focus:outline-none focus:border-neutral-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">MRP (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newProdMrp === 0 ? '' : newProdMrp}
                  onChange={(e) => setNewProdMrp(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full h-8 px-2 rounded-md border border-neutral-300 bg-white font-sans tabular-nums text-neutral-900 focus:outline-none focus:border-neutral-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">GST Slab</label>
                <select
                  value={newProdTaxRate}
                  onChange={(e) => setNewProdTaxRate(parseInt(e.target.value, 10) as TaxRate)}
                  className="w-full h-8 px-2 rounded-md border border-neutral-300 bg-white text-xs cursor-pointer font-medium"
                >
                  {GST_RATES.map((r) => (
                    <option key={r} value={r}>
                      {r}% GST
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-neutral-200">
            <button
              type="button"
              onClick={() => setShowAddProductModal(false)}
              className="h-8 px-3 rounded-md border border-neutral-300 text-neutral-700 font-medium text-xs hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-8 px-4 rounded-md bg-neutral-900 hover:bg-black text-white font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
            >
              Save & Add to Sale
            </button>
          </div>
        </form>
      </AppleModal>
    </div>
  );
};
