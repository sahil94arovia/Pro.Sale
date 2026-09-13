import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { AppleModal } from '../common/AppleModal';
import { Invoice, BusinessSettings } from '../../types';
import { formatINR, formatDate, numberToWordsINR } from '../../utils/formatters';
import { openWhatsApp, generateInvoiceWhatsAppMessage } from '../../services/whatsapp';
import {
  Printer,
  Share2,
  CheckCircle2,
  Copy,
  Layers,
} from 'lucide-react';

interface InvoicePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  settings: BusinessSettings;
}

export const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  isOpen,
  onClose,
  invoice,
  settings,
}) => {
  const [format, setFormat] = useState<'A4' | 'THERMAL'>(
    settings.defaultInvoiceFormat?.startsWith('THERMAL') ? 'THERMAL' : 'A4'
  );
  const [upiQrUrl, setUpiQrUrl] = useState<string>('');
  const [selectedCopy, setSelectedCopy] = useState<'ORIGINAL' | 'DUPLICATE' | 'TRIPLICATE'>('ORIGINAL');

  const customization = settings.invoiceCustomization || {
    template: 'GST_1',
    themeColor: '#000000',
    headerTitle: 'TAX INVOICE',
    headerSubtitle: 'Issued under Rule 46 of CGST Rules, 2017',
    logoUrl: settings.logoUrl || '',
    logoWidth: 90,
    logoAlignment: 'left',
    showLogo: true,
    showHsn: true,
    showUnit: true,
    showDiscount: true,
    showTaxBreakdown: true,
    showQrCode: true,
    showBankDetails: true,
    showTerms: true,
    showSignature: true,
    showVehicleDetails: true,
    showTotalInWords: true,
    footerNote: 'Thank you for your business! Visit again.',
    termsAndConditions: settings.termsAndConditions,
    printCompanyInfo: true,
    makeRegularPrinterDefault: true,
    printRepeatHeader: true,
    paperSize: 'A4',
    orientation: 'PORTRAIT',
    companyNameTextSize: 5,
    invoiceTextSize: 3,
    extraSpaceOnTopOfPdf: 1,
    printOriginalDuplicate: true,
    defaultCopies: 1,
    originalTitle: 'ORIGINAL FOR RECIPIENT',
    duplicateTitle: 'DUPLICATE FOR TRANSPORTER',
    triplicateTitle: 'TRIPLICATE FOR SUPPLIER',
    expandTableToWholePage: true,
    minItemRows: 0,
    showTotalItemQty: true,
    showAmountWithDecimal: true,
    showReceivedAmount: true,
    showBalanceAmount: true,
    showCurrentBalanceParty: true,
    showTaxDetails: true,
    showYouSaved: true,
    printAmountWithGrouping: true,
    amountInWords: true,
    printDescription: true,
    printTerms: true,
    printReceivedBy: true,
    printDeliveredBy: true,
    signatureText: 'Authorized Signatory',
    printPaymentMode: true,
    printAcknowledgement: true,
  };

  const activeLogo = settings.logoUrl || customization.logoUrl;
  const themeColor = customization.themeColor || '#000000';
  const template = (customization.template || 'GST_1').toUpperCase();

  // Determine orientation & landscape
  const isLandscape =
    customization.orientation === 'LANDSCAPE' ||
    template === 'LANDSCAPE_1' ||
    template === 'LANDSCAPE_2';

  // Sizing styles
  const companyTitleSize =
    customization.companyNameTextSize === 1
      ? 'text-base'
      : customization.companyNameTextSize === 2
      ? 'text-lg'
      : customization.companyNameTextSize === 3
      ? 'text-xl'
      : customization.companyNameTextSize === 4
      ? 'text-2xl'
      : customization.companyNameTextSize && customization.companyNameTextSize >= 7
      ? 'text-3xl'
      : 'text-xl sm:text-2xl';

  const bodyTextSize =
    customization.invoiceTextSize === 1
      ? 'text-[10px]'
      : customization.invoiceTextSize === 2
      ? 'text-[11px]'
      : customization.invoiceTextSize === 4
      ? 'text-sm'
      : customization.invoiceTextSize === 5
      ? 'text-base'
      : 'text-xs';

  const topPaddingPx = (customization.extraSpaceOnTopOfPdf || 1) * 8;

  useEffect(() => {
    if (invoice && settings.upiId) {
      const upiUrl = `upi://pay?pa=${settings.upiId}&pn=${encodeURIComponent(
        settings.firmName
      )}&am=${invoice.balanceAmount > 0 ? invoice.balanceAmount : invoice.grandTotal}&cu=INR&tn=${encodeURIComponent(
        `Invoice ${invoice.invoiceNumber}`
      )}`;

      QRCode.toDataURL(upiUrl, { width: 140, margin: 1 })
        .then((url) => setUpiQrUrl(url))
        .catch((err) => console.error(err));
    }
  }, [invoice, settings]);

  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    const msg = generateInvoiceWhatsAppMessage(invoice, settings);
    openWhatsApp(invoice.customer.phone || '', msg);
  };

  const isInterState = invoice.isInterState;
  const totalItemQty = invoice.items.reduce((sum, i) => sum + (Number(i.qty) || 0), 0);
  const totalDiscount = invoice.items.reduce((sum, i) => sum + (Number(i.discountAmount) || 0), 0);

  // Copy header label
  let copyLabel = customization.originalTitle || 'ORIGINAL FOR RECIPIENT';
  if (selectedCopy === 'DUPLICATE') {
    copyLabel = customization.duplicateTitle || 'DUPLICATE FOR TRANSPORTER';
  } else if (selectedCopy === 'TRIPLICATE') {
    copyLabel = customization.triplicateTitle || 'TRIPLICATE FOR SUPPLIER';
  }

  // Calculate min extra rows if expand table requested
  const minRows = customization.minItemRows || 0;
  const emptyRowsNeeded = Math.max(0, minRows - invoice.items.length);

  return (
    <AppleModal
      isOpen={isOpen}
      onClose={onClose}
      title={`${customization.headerTitle || 'Tax Invoice'}: ${invoice.invoiceNumber}`}
      subtitle={`Dated: ${formatDate(invoice.date)} • ${invoice.customer.name}`}
      maxWidth={format === 'A4' ? (isLandscape ? 'max-w-6xl' : 'max-w-4xl') : 'max-w-md'}
    >
      <div className="space-y-4">
        {/* Controls Bar (Hidden during print) */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 p-3 bg-neutral-100 rounded-2xl border border-neutral-200">
          {/* Format Switcher */}
          <div className="flex items-center space-x-1 bg-white p-1 rounded-xl border border-neutral-200 shadow-xs">
            <button
              onClick={() => setFormat('A4')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                format === 'A4'
                  ? 'bg-black text-white shadow-xs font-bold'
                  : 'text-neutral-600 hover:text-black'
              }`}
            >
              Standard A4 GST
            </button>
            <button
              onClick={() => setFormat('THERMAL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                format === 'THERMAL'
                  ? 'bg-black text-white shadow-xs font-bold'
                  : 'text-neutral-600 hover:text-black'
              }`}
            >
              80mm Thermal POS
            </button>
          </div>

          {/* Copy Selector (Original / Duplicate / Triplicate) */}
          {format === 'A4' && customization.printOriginalDuplicate !== false && (
            <div className="flex items-center space-x-1 bg-white p-1 rounded-xl border border-neutral-200 shadow-xs">
              <button
                type="button"
                onClick={() => setSelectedCopy('ORIGINAL')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  selectedCopy === 'ORIGINAL'
                    ? 'bg-black text-white'
                    : 'text-neutral-600 hover:text-black'
                }`}
              >
                Original
              </button>
              <button
                type="button"
                onClick={() => setSelectedCopy('DUPLICATE')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  selectedCopy === 'DUPLICATE'
                    ? 'bg-black text-white'
                    : 'text-neutral-600 hover:text-black'
                }`}
              >
                Duplicate
              </button>
              <button
                type="button"
                onClick={() => setSelectedCopy('TRIPLICATE')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  selectedCopy === 'TRIPLICATE'
                    ? 'bg-black text-white'
                    : 'text-neutral-600 hover:text-black'
                }`}
              >
                Triplicate
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleWhatsApp}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-apple-subtle transition-all active:scale-95 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp Bill</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-black hover:bg-neutral-900 text-white text-xs font-semibold shadow-apple-subtle transition-all active:scale-95 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Invoice</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* A4 INVOICE RENDERING WITH 15 THEMES                                       */}
        {/* ========================================================================= */}
        {format === 'A4' && (
          <div
            id="printable-invoice"
            style={{ paddingTop: `${topPaddingPx}px` }}
            className={`printable-area bg-white p-6 sm:p-8 rounded-2xl shadow-sm text-neutral-800 ${bodyTextSize} selection:bg-neutral-200 ${
              template === 'DOUBLE_DIVINE'
                ? 'border-4 border-double border-neutral-900'
                : template === 'TALLY'
                ? 'border-2 border-neutral-900 font-mono'
                : 'border border-neutral-300'
            }`}
          >
            {/* Top Official Banner: TAX INVOICE */}
            <div
              className={`text-center pb-3 mb-4 border-b ${
                template === 'GST_2' || template === 'THEME_2' || template === 'MODERN_ACCENT'
                  ? 'p-4 rounded-xl text-white mb-6'
                  : 'border-neutral-200'
              }`}
              style={{
                backgroundColor:
                  template === 'GST_2' || template === 'THEME_2' || template === 'MODERN_ACCENT'
                    ? themeColor
                    : 'transparent',
                borderColor:
                  template === 'TALLY' || template === 'CLASSIC_GST' || template === 'GST_6'
                    ? '#000000'
                    : undefined,
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-sans tabular-nums uppercase tracking-wider font-bold opacity-80">
                  {customization.printOriginalDuplicate !== false
                    ? copyLabel
                    : invoice.type === 'BILL_OF_SUPPLY'
                    ? 'BILL OF SUPPLY'
                    : 'ORIGINAL FOR RECIPIENT'}
                </span>
                <h1
                  className={`text-lg sm:text-xl font-extrabold tracking-wider uppercase ${
                    template === 'GST_2' || template === 'THEME_2' || template === 'MODERN_ACCENT'
                      ? 'text-white'
                      : template === 'FRENCH_ELITE'
                      ? 'font-serif text-2xl tracking-widest'
                      : 'text-neutral-900'
                  }`}
                  style={{
                    color:
                      !(template === 'GST_2' || template === 'THEME_2' || template === 'MODERN_ACCENT') &&
                      themeColor !== '#000000'
                        ? themeColor
                        : undefined,
                  }}
                >
                  {customization.headerTitle || 'TAX INVOICE'}
                </h1>
                <span className="text-[10px] font-sans tabular-nums opacity-80 font-bold">
                  {invoice.saleType === 'CREDIT' ? 'CREDIT INVOICE' : 'CASH MEMO'}
                </span>
              </div>
              {customization.headerSubtitle && (
                <p
                  className={`text-[10px] mt-0.5 ${
                    template === 'GST_2' || template === 'THEME_2' || template === 'MODERN_ACCENT'
                      ? 'text-white/80'
                      : 'text-neutral-500'
                  }`}
                >
                  {customization.headerSubtitle}
                </p>
              )}
            </div>

            {/* Header: Company Profile + Logo + Invoice Details */}
            <div
              className={`flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 mb-4 border-b ${
                template === 'TALLY' || template === 'GST_6' || template === 'CLASSIC_GST'
                  ? 'border-neutral-900 border-b-2'
                  : 'border-neutral-200'
              }`}
            >
              {/* Company Info with Optional Device Logo */}
              <div className="flex items-start space-x-3.5 max-w-lg">
                {customization.showLogo && activeLogo && (
                  <div
                    className="shrink-0 bg-white p-1 rounded-xl border border-neutral-200 flex items-center justify-center"
                    style={{ width: customization.logoWidth || 90 }}
                  >
                    <img
                      src={activeLogo}
                      alt="Business Logo"
                      className="max-h-16 w-auto object-contain"
                    />
                  </div>
                )}
                <div>
                  <h2
                    className={`${companyTitleSize} font-bold text-neutral-900 tracking-tight leading-tight ${
                      template === 'FRENCH_ELITE' ? 'font-serif' : ''
                    }`}
                  >
                    {settings.firmName}
                  </h2>
                  {settings.tagline && (
                    <p className="text-[11px] text-neutral-600 font-medium">{settings.tagline}</p>
                  )}
                  <p className="text-[11px] text-neutral-600 mt-1 leading-relaxed">
                    {settings.address}, {settings.city}, {settings.state} - {settings.pincode}
                  </p>
                  <div className="mt-1 space-y-0.5 text-[11px] text-neutral-700 font-sans tabular-nums">
                    <p>
                      <span className="font-semibold text-neutral-900">GSTIN:</span> {settings.gstin}
                      <span className="ml-2 font-semibold text-neutral-900">State Code:</span> {settings.stateCode} ({settings.state})
                    </p>
                    <p>
                      <span className="font-semibold text-neutral-900">Phone:</span> {settings.phone}
                      <span className="ml-3 font-semibold text-neutral-900">Email:</span> {settings.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Invoice Meta Grid */}
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1 text-right min-w-[200px] text-xs">
                <div className="flex justify-between space-x-4">
                  <span className="text-neutral-500 font-medium">Invoice No:</span>
                  <span className="font-sans tabular-nums font-bold text-neutral-900">{invoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between space-x-4">
                  <span className="text-neutral-500 font-medium">Date:</span>
                  <span className="font-sans tabular-nums font-semibold text-neutral-900">{formatDate(invoice.date)}</span>
                </div>
                <div className="flex justify-between space-x-4">
                  <span className="text-neutral-500 font-medium">Place of Supply:</span>
                  <span className="font-semibold text-neutral-900">{invoice.placeOfSupply || invoice.customer?.state || 'Madhya Pradesh (23)'}</span>
                </div>
                {invoice.dueDate && (
                  <div className="flex justify-between space-x-4">
                    <span className="text-neutral-500 font-medium">Payment Due:</span>
                    <span className="font-sans tabular-nums font-bold text-amber-600">{formatDate(invoice.dueDate)}</span>
                  </div>
                )}
                {customization.printPaymentMode !== false && (
                  <div className="flex justify-between space-x-4">
                    <span className="text-neutral-500 font-medium">Mode:</span>
                    <span className="font-bold text-neutral-900">{invoice.paymentMode}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Buyer / Customer & Shipping Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 mb-4 border-b border-neutral-200">
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                  Billed To (Client / Party)
                </span>
                <p className="font-bold text-sm text-neutral-900">{invoice.customer.name}</p>
                {invoice.customer.companyName && (
                  <p className="font-semibold text-[11px] text-neutral-700">{invoice.customer.companyName}</p>
                )}
                <p className="text-[11px] text-neutral-600 mt-0.5 leading-relaxed">
                  {invoice.customer.billingAddress || 'No Street Address'}, {invoice.customer.city || ''}{' '}
                  {invoice.customer.state || ''} {invoice.customer.pincode ? `- ${invoice.customer.pincode}` : ''}
                </p>
                <div className="mt-1.5 space-y-0.5 text-[11px] font-sans tabular-nums">
                  {invoice.customer.gstin && (
                    <p>
                      <span className="font-semibold text-neutral-900">GSTIN / UIN:</span> {invoice.customer.gstin}
                    </p>
                  )}
                  {invoice.customer.phone && (
                    <p>
                      <span className="font-semibold text-neutral-900">Mobile:</span> {invoice.customer.phone}
                    </p>
                  )}
                  {customization.showCurrentBalanceParty !== false && invoice.customer.currentBalance > 0 && (
                    <p className="text-amber-700 font-bold">
                      Pending Outstanding Balance: {formatINR(invoice.customer.currentBalance)}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                  Dispatch & Shipping Details
                </span>
                <p className="text-[11px] text-neutral-700">
                  <span className="font-semibold">Shipped Via:</span> Hand Delivery / Surface Logistics
                </p>
                <p className="text-[11px] text-neutral-700 mt-1">
                  <span className="font-semibold">Tax Category:</span>{' '}
                  {isInterState ? 'Inter-State IGST (Integrated Tax)' : 'Intra-State CGST + SGST'}
                </p>
                {invoice.notes && (
                  <p className="text-[11px] text-neutral-600 mt-1 italic">
                    <span className="font-semibold not-italic">Notes:</span> {invoice.notes}
                  </p>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto mb-4">
              <table
                className={`w-full text-left border-collapse ${
                  template === 'TALLY' || template === 'GST_6' || template === 'CLASSIC_GST'
                    ? 'border border-neutral-900'
                    : 'border border-neutral-200'
                }`}
              >
                <thead>
                  <tr
                    className={`border-b ${
                      template === 'GST_2' || template === 'THEME_2' || template === 'MODERN_ACCENT'
                        ? 'text-white'
                        : 'bg-neutral-100 text-neutral-800'
                    } ${
                      template === 'TALLY' || template === 'GST_6' || template === 'CLASSIC_GST'
                        ? 'border-neutral-900 font-bold'
                        : 'border-neutral-200'
                    }`}
                    style={{
                      backgroundColor:
                        template === 'GST_2' || template === 'THEME_2' || template === 'MODERN_ACCENT'
                          ? themeColor
                          : undefined,
                    }}
                  >
                    <th className="py-2 px-2.5 font-bold w-10 text-center border-r border-neutral-200">#</th>
                    <th className="py-2 px-3 font-bold border-r border-neutral-200">Item Description</th>
                    {customization.showHsn && (
                      <th className="py-2 px-2.5 font-bold text-center border-r border-neutral-200">HSN/SAC</th>
                    )}
                    <th className="py-2 px-2.5 font-bold text-right border-r border-neutral-200">Qty</th>
                    {customization.showUnit && (
                      <th className="py-2 px-2 font-bold text-center border-r border-neutral-200">Unit</th>
                    )}
                    <th className="py-2 px-2.5 font-bold text-right border-r border-neutral-200">Rate (₹)</th>
                    {customization.showDiscount && (
                      <th className="py-2 px-2.5 font-bold text-right border-r border-neutral-200">Disc</th>
                    )}
                    {customization.showTaxBreakdown && (
                      <>
                        <th className="py-2 px-2.5 font-bold text-center border-r border-neutral-200">Tax %</th>
                        <th className="py-2 px-2.5 font-bold text-right border-r border-neutral-200">Tax Amt</th>
                      </>
                    )}
                    <th className="py-2 px-3 font-bold text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 font-sans tabular-nums text-[11px]">
                  {invoice.items.map((item, idx) => (
                    <tr
                      key={item.id}
                      className={
                        template === 'COMPACT_PRO' || template === 'THEME_4'
                          ? 'py-0.5'
                          : 'hover:bg-neutral-50/60'
                      }
                    >
                      <td className="py-2 px-2.5 text-center text-neutral-500 border-r border-neutral-200">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 font-sans font-semibold text-neutral-900 border-r border-neutral-200">
                        {item.name}
                        {customization.printDescription !== false && item.barcode && (
                          <span className="text-[10px] text-neutral-400 block font-sans tabular-nums">
                            Barcode: {item.barcode}
                          </span>
                        )}
                      </td>
                      {customization.showHsn && (
                        <td className="py-2 px-2.5 text-center text-neutral-600 border-r border-neutral-200">
                          {item.hsn || '-'}
                        </td>
                      )}
                      <td className="py-2 px-2.5 text-right font-bold text-neutral-900 border-r border-neutral-200">
                        {item.qty}
                      </td>
                      {customization.showUnit && (
                        <td className="py-2 px-2 text-center text-neutral-500 border-r border-neutral-200">
                          {item.unit}
                        </td>
                      )}
                      <td className="py-2 px-2.5 text-right border-r border-neutral-200">
                        {formatINR(item.salePrice)}
                      </td>
                      {customization.showDiscount && (
                        <td className="py-2 px-2.5 text-right text-emerald-700 border-r border-neutral-200">
                          {item.discountAmount > 0 ? `-${formatINR(item.discountAmount)}` : '-'}
                        </td>
                      )}
                      {customization.showTaxBreakdown && (
                        <>
                          <td className="py-2 px-2.5 text-center border-r border-neutral-200">
                            {item.taxRate}%
                          </td>
                          <td className="py-2 px-2.5 text-right border-r border-neutral-200">
                            {formatINR(item.cgst + item.sgst + item.igst)}
                          </td>
                        </>
                      )}
                      <td className="py-2 px-3 text-right font-bold text-neutral-900">
                        {formatINR(item.total)}
                      </td>
                    </tr>
                  ))}

                  {/* Empty rows if expandTableToWholePage or minRows requested */}
                  {Array.from({ length: emptyRowsNeeded }).map((_, rIdx) => (
                    <tr key={`empty-${rIdx}`} className="h-6">
                      <td className="border-r border-neutral-200"></td>
                      <td className="border-r border-neutral-200"></td>
                      {customization.showHsn && <td className="border-r border-neutral-200"></td>}
                      <td className="border-r border-neutral-200"></td>
                      {customization.showUnit && <td className="border-r border-neutral-200"></td>}
                      <td className="border-r border-neutral-200"></td>
                      {customization.showDiscount && <td className="border-r border-neutral-200"></td>}
                      {customization.showTaxBreakdown && (
                        <>
                          <td className="border-r border-neutral-200"></td>
                          <td className="border-r border-neutral-200"></td>
                        </>
                      )}
                      <td></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals & Tax Summary Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 mb-4 border-t border-neutral-200">
              {/* Left Column: Bank Details, UPI QR, In Words & You Saved */}
              <div className="space-y-3">
                {customization.amountInWords !== false && (
                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                      Amount Chargeable in Words
                    </span>
                    <p className="font-semibold text-neutral-800 text-[11px] capitalize mt-0.5 leading-snug">
                      {numberToWordsINR(invoice.grandTotal)}
                    </p>
                  </div>
                )}

                {customization.showYouSaved !== false && totalDiscount > 0 && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl flex items-center justify-between text-xs font-bold">
                    <span>✨ Total Savings on Bill:</span>
                    <span>{formatINR(totalDiscount)}</span>
                  </div>
                )}

                {/* Bank & UPI Section */}
                <div className="flex items-start space-x-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                  {customization.showQrCode && upiQrUrl && (
                    <div className="shrink-0 bg-white p-1.5 rounded-lg border border-neutral-200 text-center">
                      <img src={upiQrUrl} alt="UPI QR" className="w-20 h-20" />
                      <span className="text-[9px] font-sans tabular-nums font-bold text-neutral-600 block mt-0.5">
                        SCAN TO PAY
                      </span>
                    </div>
                  )}

                  {customization.showBankDetails && (
                    <div className="space-y-0.5 text-[11px] font-sans tabular-nums">
                      <p className="font-sans font-bold text-neutral-900 text-xs">Bank Transfer Details</p>
                      <p>
                        <span className="text-neutral-500">Bank:</span> {settings.bankName}
                      </p>
                      <p>
                        <span className="text-neutral-500">A/c No:</span> {settings.accountNumber}
                      </p>
                      <p>
                        <span className="text-neutral-500">IFSC:</span> {settings.ifscCode}
                      </p>
                      {settings.upiId && (
                        <p>
                          <span className="text-neutral-500">UPI ID:</span> {settings.upiId}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Mathematical Totals */}
              <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2 text-xs font-sans tabular-nums">
                {customization.showTotalItemQty !== false && (
                  <div className="flex justify-between text-neutral-600">
                    <span>Total Item Qty:</span>
                    <span className="font-bold text-neutral-900">
                      {invoice.items.length} items ({totalItemQty} units)
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-neutral-600">
                  <span>Taxable Amount:</span>
                  <span className="font-semibold text-neutral-900">{formatINR(invoice.taxableTotal)}</span>
                </div>

                {customization.showTaxDetails !== false && (
                  <>
                    {!isInterState ? (
                      <>
                        <div className="flex justify-between text-neutral-600">
                          <span>Central Tax (CGST):</span>
                          <span>+{formatINR(invoice.cgstTotal)}</span>
                        </div>
                        <div className="flex justify-between text-neutral-600">
                          <span>State Tax (SGST):</span>
                          <span>+{formatINR(invoice.sgstTotal)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-neutral-600">
                        <span>Integrated Tax (IGST):</span>
                        <span>+{formatINR(invoice.igstTotal)}</span>
                      </div>
                    )}
                  </>
                )}

                {((invoice.discountAmount ?? 0) + (invoice.billDiscount ?? 0) + (invoice.itemDiscountTotal ?? 0)) > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Discount:</span>
                    <span>-{formatINR((invoice.discountAmount ?? 0) + (invoice.billDiscount ?? 0) + (invoice.itemDiscountTotal ?? 0))}</span>
                  </div>
                )}

                {invoice.roundOff !== 0 && (
                  <div className="flex justify-between text-neutral-500 text-[11px]">
                    <span>Round Off:</span>
                    <span>{invoice.roundOff > 0 ? `+${invoice.roundOff.toFixed(2)}` : invoice.roundOff.toFixed(2)}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-neutral-300 flex justify-between items-center text-sm sm:text-base font-bold text-neutral-900">
                  <span>Grand Total:</span>
                  <span style={{ color: themeColor !== '#000000' ? themeColor : undefined }}>
                    {formatINR(invoice.grandTotal)}
                  </span>
                </div>

                {customization.showReceivedAmount !== false && (
                  <div className="flex justify-between text-neutral-700 text-[11px] pt-1 border-t border-neutral-200">
                    <span>Received Amount ({invoice.paymentMode}):</span>
                    <span className="font-bold text-emerald-700">{formatINR(invoice.paidAmount)}</span>
                  </div>
                )}

                {customization.showBalanceAmount !== false && invoice.balanceAmount > 0 && (
                  <div className="flex justify-between text-red-600 text-xs font-bold">
                    <span>Balance Due / Credit:</span>
                    <span>{formatINR(invoice.balanceAmount)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Terms, Signatures & Acknowledgement (Footer) */}
            <div className="pt-4 border-t border-neutral-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-[11px] leading-relaxed">
              {/* Terms and Conditions */}
              <div>
                {customization.printTerms !== false && (
                  <>
                    <p className="font-bold text-neutral-900 uppercase tracking-wide text-[10px] mb-1">
                      Terms & Conditions:
                    </p>
                    <p className="text-neutral-600 whitespace-pre-line">
                      {customization.termsAndConditions ||
                        '1. Goods once sold will not be taken back.\n2. Subject to local jurisdiction only.'}
                    </p>
                  </>
                )}

                {customization.printAcknowledgement !== false && (
                  <p className="text-[10px] text-neutral-500 italic mt-2">
                    ✓ I/We hereby certify that registration certificate under GST Act, 2017 is in force on date.
                  </p>
                )}

                {customization.printReceivedBy !== false && (
                  <div className="mt-4 pt-4 border-t border-dashed border-neutral-300 w-44 text-center text-neutral-500 text-[10px]">
                    Customer / Receiver's Signature
                  </div>
                )}
              </div>

              {/* Authorized Signatory Box */}
              <div className="flex flex-col justify-end items-end text-right space-y-1">
                <p className="font-semibold text-neutral-700 text-[10px]">
                  For <span className="font-bold text-neutral-900">{settings.firmName}</span>
                </p>

                {/* Signature Image / Stamp */}
                {customization.showSignature !== false && customization.signatureImageUrl ? (
                  <div className="h-16 flex items-center justify-end py-1">
                    <img
                      src={customization.signatureImageUrl}
                      alt="Signature"
                      className="max-h-14 max-w-[140px] object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-14"></div>
                )}

                <p className="font-bold text-neutral-900 border-t border-neutral-300 pt-1 min-w-[160px] text-center">
                  {customization.signatureText || 'Authorized Signatory'}
                </p>

                {customization.printDeliveredBy !== false && (
                  <p className="text-[9px] text-neutral-400">Delivered By: Surface Dispatch</p>
                )}
              </div>
            </div>

            {/* Bottom Footer Note */}
            <div className="text-center pt-4 mt-4 border-t border-neutral-100 text-[10px] text-neutral-400 font-medium">
              {customization.footerNote || 'Thank you for your business! Visit again.'}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* THERMAL 80MM RECEIPT FORMAT                                               */}
        {/* ========================================================================= */}
        {format === 'THERMAL' && (
          <div
            id="printable-thermal"
            className="printable-thermal bg-white p-4 max-w-[340px] mx-auto font-sans tabular-nums text-xs border border-neutral-300 shadow-sm"
          >
            <div className="text-center pb-2 border-b border-dashed border-neutral-400">
              {customization.showLogo && activeLogo && (
                <img src={activeLogo} alt="Logo" className="max-h-10 mx-auto mb-1 object-contain" />
              )}
              <h2 className="font-bold text-sm uppercase">{settings.firmName}</h2>
              <p className="text-[10px]">
                {settings.address}, {settings.city}
              </p>
              <p className="text-[10px] font-bold">GSTIN: {settings.gstin}</p>
              <p className="text-[10px]">Ph: {settings.phone}</p>
            </div>

            <div className="py-2 border-b border-dashed border-neutral-400 text-[10px]">
              <div className="flex justify-between">
                <span>Bill: {invoice.invoiceNumber}</span>
                <span>{formatDate(invoice.date)}</span>
              </div>
              <div>Client: {invoice.customer.name}</div>
              {invoice.customer.phone && <div>Phone: {invoice.customer.phone}</div>}
              {invoice.customer.gstin && <div>GSTIN: {invoice.customer.gstin}</div>}
            </div>

            <div className="py-2 border-b border-dashed border-neutral-400">
              <div className="flex justify-between font-bold pb-1 text-[10px] uppercase">
                <span>Item</span>
                <span>Qty x Rate</span>
                <span>Amt</span>
              </div>
              {invoice.items.map((it, idx) => (
                <div key={idx} className="py-0.5">
                  <div className="font-semibold truncate">{it.name}</div>
                  <div className="flex justify-between text-neutral-600 text-[10px]">
                    <span>
                      {it.qty} {it.unit} @ {it.salePrice}
                    </span>
                    <span className="font-bold text-neutral-900">{formatINR(it.total)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="py-2 border-b border-dashed border-neutral-400 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Taxable Subtotal:</span>
                <span>{formatINR(invoice.taxableTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>GST Tax:</span>
                <span>{formatINR(invoice.cgstTotal + invoice.sgstTotal + invoice.igstTotal)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold pt-1 border-t border-neutral-300">
                <span>TOTAL:</span>
                <span>{formatINR(invoice.grandTotal)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>Paid ({invoice.paymentMode}):</span>
                <span>{formatINR(invoice.paidAmount)}</span>
              </div>
              {invoice.balanceAmount > 0 && (
                <div className="flex justify-between text-[10px] font-bold text-red-600">
                  <span>Balance Due:</span>
                  <span>{formatINR(invoice.balanceAmount)}</span>
                </div>
              )}
            </div>

            {customization.showQrCode && upiQrUrl && (
              <div className="pt-3 flex flex-col items-center justify-center text-center">
                <img
                  src={upiQrUrl}
                  alt="UPI QR"
                  className="w-24 h-24 border border-neutral-300 rounded p-1 bg-white"
                />
                <span className="text-[9px] text-neutral-500 mt-1 font-bold">SCAN TO PAY (UPI)</span>
              </div>
            )}

            <div className="text-center pt-3 text-[9px] text-neutral-500">
              {customization.footerNote || 'Thank you! Visit again.'}
            </div>
          </div>
        )}
      </div>
    </AppleModal>
  );
};
