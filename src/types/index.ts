export type TaxRate = 0 | 5 | 12 | 18 | 28;

export type PaymentMode = 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE' | 'CREDIT' | 'SPLIT';

export interface SplitPaymentEntry {
  method: 'CASH' | 'UPI' | 'BANK' | 'CHEQUE';
  amount: number;
  referenceNo?: string;
}

export interface InvoiceItem {
  id: string;
  productId?: string;
  name: string;
  barcode?: string;
  hsn: string;
  qty: number;
  unit: string;
  mrp: number;
  purchasePrice: number; // for bill-wise profit tracking
  salePrice: number;
  size?: string;
  priceWithTax?: boolean;
  discountPercent: number;
  discountAmount: number;
  taxRate: TaxRate;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export interface Customer {
  id: string;
  name: string;
  companyName?: string;
  phone: string;
  email?: string;
  gstin?: string;
  pan?: string;
  billingAddress: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  creditLimit: number;
  currentBalance: number; // >0 means customer owes us money (Receivable Balance Due)
  notes?: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  type: 'TAX_INVOICE' | 'BILL_OF_SUPPLY';
  saleType: 'CASH' | 'CREDIT';
  customer: Customer;
  items: InvoiceItem[];
  subtotal: number;
  itemDiscountTotal: number;
  billDiscount: number;
  taxableTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  roundOff: number;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  paymentMode: PaymentMode;
  splitPayments: SplitPaymentEntry[];
  notes: string;
  terms: string;
  status: 'PAID' | 'PARTIAL' | 'UNPAID' | 'CANCELLED';
  totalProfit: number;
  isInterState: boolean;
  placeOfSupply?: string;
  transportName?: string;
  vehicleNumber?: string;
  deliveryDate?: string;
  deliveryLocation?: string;
  shippingCharges?: number;
  shippingTaxRate?: number;
  packagingCharges?: number;
  packagingTaxRate?: number;
  paymentTerms?: string;
  numberOfCopies?: string;
  discountAmount?: number;
  eWayBillNo?: string;
  irn?: string;
  ackNo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  hsn: string;
  unit: string;
  mrp: number;
  purchasePrice: number;
  salePrice: number;
  taxRate: TaxRate;
  taxType?: 'INCLUSIVE' | 'EXCLUSIVE';
  finalPrice?: number;
  stock: number;
  minStockAlert: number;
  description?: string;
  createdAt: string;
}

export interface CustomerLedgerEntry {
  id: string;
  customerId: string;
  date: string;
  type: 'INVOICE' | 'PAYMENT_RECEIVED' | 'CREDIT_NOTE' | 'OPENING_BALANCE';
  referenceNumber: string;
  debit: number;   // Customer billed/owes
  credit: number;  // Customer paid
  balance: number; // Running balance
  notes: string;
  paymentMode?: string;
}

export interface Quotation {
  id: string;
  quoteNumber: string;
  date: string;
  expiryDate: string;
  customer: Customer;
  items: InvoiceItem[];
  subtotal: number;
  taxableTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  grandTotal: number;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'CONVERTED';
  convertedInvoiceId?: string;
  notes?: string;
  createdAt: string;
}

export interface DeliveryChallan {
  id: string;
  challanNumber: string;
  date: string;
  customer: Customer;
  items: InvoiceItem[];
  vehicleNumber?: string;
  driverName?: string;
  driverPhone?: string;
  status: 'PENDING' | 'DISPATCHED' | 'DELIVERED' | 'CONVERTED';
  convertedInvoiceId?: string;
  notes?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  date: string;
  category: 'Rent' | 'Salaries' | 'Electricity & Water' | 'Logistics & Transport' | 'Office & Tea' | 'Maintenance' | 'Marketing' | 'Tax & Compliance' | 'Others' | 'Raw Material & Inventory Purchases';
  amount: number;
  paymentMode: 'CASH' | 'UPI' | 'BANK';
  description: string;
  paidTo: string;
  receiptNo?: string;
  productId?: string;
  qty?: number;
  createdAt: string;
}

export type InvoiceTemplateId =
  | 'TALLY'
  | 'LANDSCAPE_1'
  | 'LANDSCAPE_2'
  | 'GST_1'
  | 'GST_2'
  | 'GST_3'
  | 'GST_4'
  | 'GST_5'
  | 'GST_6'
  | 'DOUBLE_DIVINE'
  | 'FRENCH_ELITE'
  | 'THEME_1'
  | 'THEME_2'
  | 'THEME_3'
  | 'THEME_4'
  | 'APPLE_MINIMAL'
  | 'CLASSIC_GST'
  | 'MODERN_ACCENT'
  | 'COMPACT_PRO';

export interface InvoiceCustomization {
  template: InvoiceTemplateId;
  themeColor: string; // e.g. '#000000', '#0071e3', '#059669', '#dc2626', etc.
  headerTitle: string; // default "TAX INVOICE"
  headerSubtitle?: string; // e.g. "Issued under Rule 46 of CGST Rules, 2017"
  logoUrl?: string; // base64 data url from device
  logoWidth?: number; // e.g. 70 - 160 px
  logoAlignment?: 'left' | 'center' | 'right';
  showLogo: boolean;
  showHsn: boolean;
  showUnit: boolean;
  showDiscount: boolean;
  showTaxBreakdown: boolean;
  showQrCode: boolean;
  showBankDetails: boolean;
  showTerms: boolean;
  showSignature: boolean;
  showVehicleDetails: boolean;
  showTotalInWords: boolean;
  footerNote: string;
  termsAndConditions: string;

  // Vyapar Print Suite Options (User Requested)
  printCompanyInfo?: boolean;
  makeRegularPrinterDefault?: boolean;
  printRepeatHeader?: boolean;
  paperSize?: 'A4' | 'A5' | 'THERMAL_80MM' | 'THERMAL_58MM';
  orientation?: 'PORTRAIT' | 'LANDSCAPE';
  companyNameTextSize?: number; // 1 - 10, default 5
  invoiceTextSize?: number; // 1 - 5, default 3
  extraSpaceOnTopOfPdf?: number; // default 1
  printOriginalDuplicate?: boolean;
  defaultCopies?: number; // 1, 2, or 3
  originalTitle?: string; // "ORIGINAL FOR RECIPIENT"
  duplicateTitle?: string; // "DUPLICATE FOR TRANSPORTER"
  triplicateTitle?: string; // "TRIPLICATE FOR SUPPLIER"
  expandTableToWholePage?: boolean;
  minItemRows?: number; // default 0
  showTotalItemQty?: boolean;
  showAmountWithDecimal?: boolean;
  showReceivedAmount?: boolean;
  showBalanceAmount?: boolean;
  showCurrentBalanceParty?: boolean;
  showTaxDetails?: boolean;
  showYouSaved?: boolean;
  printAmountWithGrouping?: boolean;
  amountInWords?: boolean;
  printDescription?: boolean;
  printTerms?: boolean;
  printReceivedBy?: boolean;
  printDeliveredBy?: boolean;
  signatureText?: string; // "Authorized Signatory"
  signatureImageUrl?: string;
  printPaymentMode?: boolean;
  printAcknowledgement?: boolean;
}

export interface GeneralSettings {
  enablePasscode: boolean;
  businessCurrency: string;
  amountDecimalPlaces: number;
  showGstinNumber: boolean;
  stopSaleOnNegativeStock: boolean;
  blockNewItemsFromTxn: boolean;
  blockNewPartiesFromTxn: boolean;
  moreTransactions: {
    estimate: boolean;
    proforma: boolean;
    saleOrder: boolean;
    otherIncome: boolean;
    fixedAssets: boolean;
    deliveryChallan: boolean;
    goodsReturnChallan: boolean;
    printAmountChallan: boolean;
  };
  multiFirm: {
    activeFirmId: string;
    firms: Array<{ id: string; name: string; isDefault: boolean }>;
  };
  godownManagement: boolean;
  autoBackup: boolean;
  auditTrail: boolean;
  screenZoom: number;
}

export interface TransactionSettings {
  header: {
    invoiceNumber: boolean;
    addTime: boolean;
    cashSaleByDefault: boolean;
    billingNameOfParties: boolean;
    customerPoDetails: boolean;
  };
  itemsTable: {
    taxRateOnPriceUnit: boolean;
    displayPurchasePrice: boolean;
    showLast5SalePrice: boolean;
    showLast5PurchasePrice: boolean;
    freeItemQty: boolean;
    count: boolean;
  };
  taxesDiscountTotals: {
    transactionWiseTax: boolean;
    transactionWiseDiscount: boolean;
    roundOffTotal: boolean;
    roundOffNearestTo: number;
  };
  moreFeatures: {
    ewayBillNo: boolean;
    quickEntry: boolean;
    doNotShowInvoicePreview: boolean;
    repeatInvoices: boolean;
    enablePasscodeForEditDelete: boolean;
    discountDuringPayments: boolean;
    linkPaymentsToInvoices: boolean;
    dueDatesPaymentTerms: boolean;
    showProfitWhileSale: boolean;
  };
  prefixes: {
    firm: string;
    sale: string;
    creditNote: string;
    saleOrder: string;
    purchaseOrder: string;
    estimate: string;
    proformaInvoice: string;
    deliveryChallan: string;
    paymentIn: string;
  };
  billingType: 'LITE' | 'FULL';
}

export interface PartySettings {
  partyGrouping: boolean;
  shippingAddress: boolean;
  printShippingAddress: boolean;
  managePartyStatus: boolean;
  enablePaymentReminder: boolean;
  reminderDueDays: number;
  reminderMessage: string;
  additionalFields: Array<{ id: string; name: string; type: string; showInPrint: boolean }>;
  enableLoyaltyPoint: boolean;
}

export interface ItemSettings {
  enableItem: boolean;
  whatDoYouSell: 'PRODUCT' | 'SERVICE';
  barcodeScan: boolean;
  directBarcodeScan: boolean;
  stockMaintenance: boolean;
  manufacturing: boolean;
  showLowStockDialog: boolean;
  itemsUnit: boolean;
  defaultUnit: string;
  itemCategory: boolean;
  partyWiseItemRate: boolean;
  description: boolean;
  itemWiseTax: boolean;
  itemWiseDiscount: boolean;
  updateSalePriceFromTxn: boolean;
  qtyDecimalPlaces: number;
  mrpPrice: {
    mrp: boolean;
    calcSalePriceFromMrpDisc: boolean;
    useMrpForBatchTracking: boolean;
    calcTaxBasedOnMrp: boolean;
  };
  serialNoTracking: boolean;
  batchTracking: {
    batchNo: boolean;
    expDate: boolean;
    mfgDate: boolean;
    modelNo: boolean;
    size: boolean;
  };
}

export interface TaxesGstSettings {
  gstRegistered: boolean;
  compositionScheme: boolean;
  rcmEnabled: boolean;
  defaultTaxRate: number;
  enableCess: boolean;
  ewayBillThreshold: number;
  einvoiceThreshold: number;
}

export interface TransactionMessagesSettings {
  invoiceWhatsApp: string;
  paymentReminder: string;
  challanMessage: string;
  greetings: string;
  autoSendWhatsApp: boolean;
}

export interface ServiceRemindersSettings {
  enableServiceReminders: boolean;
  notifyDaysBefore: number;
  autoSendWhatsApp: boolean;
  reminderMessage: string;
  autoRenewOnInvoice: boolean;
}

export interface AccountingSettings {
  bookkeepingType: 'DOUBLE_ENTRY' | 'SINGLE_ENTRY';
  financialYearStart: string;
  autoCreateJournalEntries: boolean;
  roundOffLedgerAccount: string;
  warnNegativeCashBalance: boolean;
  cashInHandAlertLimit: number;
}

export interface MultiCurrencySettings {
  enableMultiCurrency: boolean;
  baseCurrency: string;
  baseSymbol: string;
  secondaryCurrencies: Array<{
    code: string;
    name: string;
    symbol: string;
    exchangeRate: number;
    active: boolean;
  }>;
  printDualCurrency: boolean;
}

export interface BusinessSettings {
  firmName: string;
  tagline: string;
  gstin: string;
  pan: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
  upiId: string;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  termsAndConditions: string;
  defaultInvoiceFormat: 'A4_STANDARD' | 'A4_MODERN' | 'THERMAL_80MM' | 'THERMAL_58MM';
  logoUrl?: string;
  invoiceCustomization?: InvoiceCustomization;
  hardwareSettings: {
    enableCameraScanner: boolean;
    enableHardwareBeep: boolean;
    autoPrintOnSave: boolean;
  };
  generalSettings?: GeneralSettings;
  transactionSettings?: TransactionSettings;
  partySettings?: PartySettings;
  itemSettings?: ItemSettings;
  taxesGstSettings?: TaxesGstSettings;
  transactionMessages?: TransactionMessagesSettings;
  serviceReminders?: ServiceRemindersSettings;
  accountingSettings?: AccountingSettings;
  multiCurrencySettings?: MultiCurrencySettings;
}

export interface IndianState {
  name: string;
  code: string;
}
