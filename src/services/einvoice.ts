import { Invoice, BusinessSettings } from '../types';

export interface EWayBillPayload {
  supplyType: 'O'; // Outward
  subSupplyType: '1'; // Supply
  docType: 'INV';
  docNo: string;
  docDate: string;
  fromGstin: string;
  fromTrdName: string;
  fromAddr1: string;
  fromPlace: string;
  fromPincode: number;
  fromStateCode: number;
  toGstin: string;
  toTrdName: string;
  toAddr1: string;
  toPlace: string;
  toPincode: number;
  toStateCode: number;
  totalValue: number;
  cgstValue: number;
  sgstValue: number;
  igstValue: number;
  totInvValue: number;
  transMode: string;
  transDistance: string;
  transporterName: string;
  transporterId: string;
  vehicleNo: string;
  vehicleType: 'R' | 'O';
  itemList: Array<{
    itemNo: number;
    productName: string;
    productDesc: string;
    hsnCode: number;
    quantity: number;
    qtyUnit: string;
    taxableAmount: number;
    cgstRate: number;
    sgstRate: number;
    igstRate: number;
  }>;
}

export function generateEWayBillJSON(
  invoice: Invoice,
  settings: BusinessSettings,
  transporter: {
    vehicleNo: string;
    distanceKm: number;
    transporterId?: string;
    transporterName?: string;
  }
): EWayBillPayload {
  return {
    supplyType: 'O',
    subSupplyType: '1',
    docType: 'INV',
    docNo: invoice.invoiceNumber,
    docDate: invoice.date.split('T')[0],
    fromGstin: settings.gstin,
    fromTrdName: settings.firmName,
    fromAddr1: settings.address,
    fromPlace: settings.city,
    fromPincode: parseInt(settings.pincode, 10) || 110020,
    fromStateCode: parseInt(settings.stateCode, 10) || 7,
    toGstin: invoice.customer.gstin || 'URP',
    toTrdName: invoice.customer.companyName || invoice.customer.name,
    toAddr1: invoice.customer.billingAddress,
    toPlace: invoice.customer.city || 'Delhi',
    toPincode: parseInt(invoice.customer.pincode, 10) || 110001,
    toStateCode: parseInt(invoice.customer.stateCode, 10) || 7,
    totalValue: invoice.taxableTotal,
    cgstValue: invoice.cgstTotal,
    sgstValue: invoice.sgstTotal,
    igstValue: invoice.igstTotal,
    totInvValue: invoice.grandTotal,
    transMode: '1', // Road
    transDistance: transporter.distanceKm.toString(),
    transporterName: transporter.transporterName || '',
    transporterId: transporter.transporterId || '',
    vehicleNo: transporter.vehicleNo || '',
    vehicleType: 'R', // Regular
    itemList: invoice.items.map((it, idx) => ({
      itemNo: idx + 1,
      productName: it.name,
      productDesc: it.name,
      hsnCode: parseInt(it.hsn, 10) || 998877,
      quantity: it.qty,
      qtyUnit: it.unit,
      taxableAmount: it.taxableAmount,
      cgstRate: invoice.isInterState ? 0 : it.taxRate / 2,
      sgstRate: invoice.isInterState ? 0 : it.taxRate / 2,
      igstRate: invoice.isInterState ? it.taxRate : 0,
    })),
  };
}

export function generateEInvoiceJSON(invoice: Invoice, settings: BusinessSettings) {
  return {
    Version: '1.1',
    TranDtls: {
      TaxSch: 'GST',
      SupTyp: invoice.customer.gstin ? 'B2B' : 'B2C',
      RegRev: 'N',
      EcmGstin: null,
      IgstOnIntra: 'N',
    },
    DocDtls: {
      Typ: 'INV',
      No: invoice.invoiceNumber,
      Dt: invoice.date.split('T')[0],
    },
    SellerDtls: {
      Gstin: settings.gstin,
      LglNm: settings.firmName,
      TrdNm: settings.firmName,
      Pos: settings.stateCode,
      Addr1: settings.address,
      Loc: settings.city,
      Pin: parseInt(settings.pincode, 10),
      Stcd: settings.stateCode,
    },
    BuyerDtls: {
      Gstin: invoice.customer.gstin || 'URP',
      LglNm: invoice.customer.companyName || invoice.customer.name,
      TrdNm: invoice.customer.companyName || invoice.customer.name,
      Pos: invoice.customer.stateCode,
      Addr1: invoice.customer.billingAddress,
      Loc: invoice.customer.city,
      Pin: parseInt(invoice.customer.pincode, 10),
      Stcd: invoice.customer.stateCode,
    },
    ItemList: invoice.items.map((it, idx) => ({
      SlNo: (idx + 1).toString(),
      PrdDesc: it.name,
      IsServc: 'N',
      HsnCd: it.hsn,
      Qty: it.qty,
      Unit: it.unit,
      UnitPrice: it.salePrice,
      TotAmt: it.salePrice * it.qty,
      Discount: it.discountAmount,
      AssAmt: it.taxableAmount,
      GstRt: it.taxRate,
      IgstAmt: it.igst,
      CgstAmt: it.cgst,
      SgstAmt: it.sgst,
      TotItemVal: it.total,
    })),
    ValDtls: {
      AssVal: invoice.taxableTotal,
      CgstVal: invoice.cgstTotal,
      SgstVal: invoice.sgstTotal,
      IgstVal: invoice.igstTotal,
      RndOffAmt: invoice.roundOff,
      TotInvVal: invoice.grandTotal,
    },
  };
}

export function generateSimulatedIRN(invoiceNumber: string, gstin: string): string {
  // 64-char simulated SHA256 hex string
  const str = `${gstin}-${invoiceNumber}-${Date.now()}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `${hex}${hex}${hex}${hex}${hex}${hex}${hex}${hex}`.substring(0, 64);
}
