import { InvoiceItem, TaxRate } from '../types';

export interface CalculationResult {
  items: InvoiceItem[];
  subtotal: number;
  itemDiscountTotal: number;
  taxableTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  roundOff: number;
  grandTotal: number;
  totalProfit: number;
  extraChargesTotal?: number;
}

export interface ExtraChargeOptions {
  shippingCharges?: number;
  shippingTaxRate?: number;
  packagingCharges?: number;
  packagingTaxRate?: number;
  enableRoundOff?: boolean;
}

export function calculateItemTaxes(
  item: Omit<InvoiceItem, 'taxableAmount' | 'cgst' | 'sgst' | 'igst' | 'total' | 'discountAmount'> & { discountAmount?: number },
  isInterState: boolean
): InvoiceItem {
  const effectiveBasePrice = item.priceWithTax && item.taxRate > 0
    ? item.salePrice / (1 + item.taxRate / 100)
    : item.salePrice;

  const gross = effectiveBasePrice * item.qty;
  const discountAmount = item.discountAmount !== undefined && item.discountAmount > 0
    ? item.discountAmount
    : Number(((gross * (item.discountPercent || 0)) / 100).toFixed(2));
  const taxableAmount = Math.max(0, Number((gross - discountAmount).toFixed(2)));

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (item.taxRate > 0) {
    if (isInterState) {
      igst = Number(((taxableAmount * item.taxRate) / 100).toFixed(2));
    } else {
      const halfRate = item.taxRate / 2;
      cgst = Number(((taxableAmount * halfRate) / 100).toFixed(2));
      sgst = Number(((taxableAmount * halfRate) / 100).toFixed(2));
    }
  }

  const total = Number((taxableAmount + cgst + sgst + igst).toFixed(2));

  return {
    ...item,
    discountAmount,
    taxableAmount,
    cgst,
    sgst,
    igst,
    total,
  };
}

export function calculateInvoiceTotals(
  rawItems: InvoiceItem[],
  isInterState: boolean,
  billDiscount: number = 0,
  extraOptions?: ExtraChargeOptions
): CalculationResult {
  let items = rawItems.map((it) => calculateItemTaxes(it, isInterState));

  const subtotal = items.reduce((sum, it) => sum + (it.salePrice * it.qty), 0);
  const itemDiscountTotal = items.reduce((sum, it) => sum + it.discountAmount, 0);
  const preDiscountTaxable = items.reduce((sum, it) => sum + it.taxableAmount, 0);

  // Apportion bill discount proportionately across items so GST calculates accurately
  const effectiveBillDiscount = Math.min(Math.max(0, billDiscount), preDiscountTaxable);

  if (effectiveBillDiscount > 0 && preDiscountTaxable > 0) {
    items = items.map((it) => {
      const shareOfDiscount = (it.taxableAmount / preDiscountTaxable) * effectiveBillDiscount;
      const adjustedTaxable = Math.max(0, it.taxableAmount - shareOfDiscount);
      let cgst = 0;
      let sgst = 0;
      let igst = 0;
      if (it.taxRate > 0) {
        if (isInterState) {
          igst = Number(((adjustedTaxable * it.taxRate) / 100).toFixed(2));
        } else {
          const halfRate = it.taxRate / 2;
          cgst = Number(((adjustedTaxable * halfRate) / 100).toFixed(2));
          sgst = Number(((adjustedTaxable * halfRate) / 100).toFixed(2));
        }
      }
      return {
        ...it,
        taxableAmount: Number(adjustedTaxable.toFixed(2)),
        cgst,
        sgst,
        igst,
        total: Number((adjustedTaxable + cgst + sgst + igst).toFixed(2)),
      };
    });
  }

  // Calculate extra charges: shipping + packaging
  const shipping = extraOptions?.shippingCharges || 0;
  const shippingRate = extraOptions?.shippingTaxRate || 0;
  const shippingTax = shipping > 0 ? (shipping * shippingRate) / 100 : 0;

  const packaging = extraOptions?.packagingCharges || 0;
  const packagingRate = extraOptions?.packagingTaxRate || 0;
  const packagingTax = packaging > 0 ? (packaging * packagingRate) / 100 : 0;

  const extraTaxable = shipping + packaging;
  const extraTax = shippingTax + packagingTax;
  const extraChargesTotal = extraTaxable + extraTax;

  const taxableTotal = Math.max(0, preDiscountTaxable - effectiveBillDiscount) + extraTaxable;

  let extraCgst = 0;
  let extraSgst = 0;
  let extraIgst = 0;
  if (extraTax > 0) {
    if (isInterState) {
      extraIgst = extraTax;
    } else {
      extraCgst = extraTax / 2;
      extraSgst = extraTax / 2;
    }
  }

  const cgstTotal = items.reduce((sum, it) => sum + it.cgst, 0) + extraCgst;
  const sgstTotal = items.reduce((sum, it) => sum + it.sgst, 0) + extraSgst;
  const igstTotal = items.reduce((sum, it) => sum + it.igst, 0) + extraIgst;

  // Total profit = Sum of [ (SalePrice - itemDiscountPerUnit - PurchasePrice) * Qty ] - effectiveBillDiscount
  const totalProfit = items.reduce((sum, it) => {
    const netSalePerUnit = it.salePrice - (it.discountAmount / (it.qty || 1));
    const profitPerUnit = netSalePerUnit - (it.purchasePrice || 0);
    return sum + (profitPerUnit * it.qty);
  }, 0) - effectiveBillDiscount;

  const rawGrandTotal = Math.max(0, taxableTotal + cgstTotal + sgstTotal + igstTotal);
  const enableRoundOff = extraOptions?.enableRoundOff !== undefined ? extraOptions.enableRoundOff : true;
  const roundedGrandTotal = enableRoundOff ? Math.round(rawGrandTotal) : Number(rawGrandTotal.toFixed(2));
  const roundOff = enableRoundOff ? Number((roundedGrandTotal - rawGrandTotal).toFixed(2)) : 0;

  return {
    items,
    subtotal: Number(subtotal.toFixed(2)),
    itemDiscountTotal: Number(itemDiscountTotal.toFixed(2)),
    taxableTotal: Number(taxableTotal.toFixed(2)),
    cgstTotal: Number(cgstTotal.toFixed(2)),
    sgstTotal: Number(sgstTotal.toFixed(2)),
    igstTotal: Number(igstTotal.toFixed(2)),
    roundOff,
    grandTotal: roundedGrandTotal,
    totalProfit: Number(totalProfit.toFixed(2)),
    extraChargesTotal: Number(extraChargesTotal.toFixed(2)),
  };
}
