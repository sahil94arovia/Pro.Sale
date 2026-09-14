import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';
import { Invoice, BusinessSettings } from '../types';
import { formatINR, formatDate, numberToWordsINR } from '../utils/formatters';

export async function downloadInvoicePDF(
  invoice: Invoice,
  settings: BusinessSettings
): Promise<void> {
  // Generate UPI QR code if UPI ID is present
  let qrCodeDataUrl = '';
  if (settings.upiId) {
    try {
      const upiUrl = `upi://pay?pa=${settings.upiId}&pn=${encodeURIComponent(
        settings.firmName || 'Pro.Sale'
      )}&am=${invoice.balanceAmount > 0 ? invoice.balanceAmount : invoice.grandTotal}&cu=INR&tn=${encodeURIComponent(
        `Invoice ${invoice.invoiceNumber}`
      )}`;
      qrCodeDataUrl = await QRCode.toDataURL(upiUrl, { width: 120, margin: 1 });
    } catch (err) {
      console.error('Failed to generate UPI QR for PDF:', err);
    }
  }

  // Create an off-screen container for crisp vector rendering
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  container.style.width = '794px'; // standard A4 width at 96 DPI
  container.style.minHeight = '1123px'; // standard A4 height
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#000000';
  container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, sans-serif';
  container.style.padding = '36px 40px';
  container.style.boxSizing = 'border-box';
  container.style.zIndex = '-9999';

  const isInterState = invoice.isInterState;
  const isPaid = invoice.balanceAmount === 0 || invoice.status === 'PAID';

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; justify-content: space-between; min-height: 1040px;">
      <div>
        <!-- Top Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 2px solid #000000;">
          <div style="max-width: 480px;">
            <h1 style="margin: 0 0 4px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; text-transform: uppercase; color: #000000;">
              ${settings.firmName || 'TAX INVOICE'}
            </h1>
            ${settings.tagline ? `<div style="font-size: 11px; color: #555; margin-bottom: 6px; font-weight: 500;">${settings.tagline}</div>` : ''}
            <div style="font-size: 11px; line-height: 1.4; color: #333;">
              ${settings.address ? `<div>${settings.address}${settings.city ? `, ${settings.city}` : ''}${settings.state ? `, ${settings.state}` : ''} ${settings.pincode || ''}</div>` : ''}
              ${settings.gstin ? `<div style="font-weight: 700; margin-top: 3px;">GSTIN: <span style="font-family: monospace;">${settings.gstin}</span></div>` : ''}
              ${settings.phone ? `<div>Phone: ${settings.phone} ${settings.email ? `• Email: ${settings.email}` : ''}</div>` : ''}
            </div>
          </div>

          <div style="text-align: right;">
            <div style="display: inline-block; padding: 4px 12px; background: #000000; color: #ffffff; font-size: 11px; font-weight: 700; letter-spacing: 1px; border-radius: 4px; text-transform: uppercase; margin-bottom: 8px;">
              TAX INVOICE
            </div>
            <div style="font-size: 10px; color: #666; margin-bottom: 4px;">Rule 46 CGST Act 2017</div>
            <div style="font-size: 14px; font-weight: 800; color: #000000;"># ${invoice.invoiceNumber}</div>
            <div style="font-size: 11px; color: #444; margin-top: 3px;">Date: <strong>${formatDate(invoice.date)}</strong></div>
            ${invoice.dueDate ? `<div style="font-size: 10px; color: #666; margin-top: 2px;">Due: <strong>${formatDate(invoice.dueDate)}</strong></div>` : ''}
          </div>
        </div>

        <!-- Bill To & Transaction Details -->
        <div style="display: flex; justify-content: space-between; margin-top: 18px; padding-bottom: 16px; border-bottom: 1px solid #e5e5ea;">
          <div style="width: 55%;">
            <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #86868b; letter-spacing: 0.5px; margin-bottom: 4px;">
              BILLED TO:
            </div>
            <div style="font-size: 14px; font-weight: 700; color: #000000; margin-bottom: 2px;">
              ${invoice.customer?.name || 'Cash Customer'}
            </div>
            ${invoice.customer?.companyName ? `<div style="font-size: 11px; font-weight: 600; color: #444;">${invoice.customer.companyName}</div>` : ''}
            ${invoice.customer?.billingAddress ? `<div style="font-size: 11px; color: #555; margin-top: 2px; line-height: 1.3;">${invoice.customer.billingAddress}</div>` : ''}
            ${invoice.customer?.gstin ? `<div style="font-size: 11px; font-weight: 600; color: #000000; margin-top: 2px;">GSTIN: <span style="font-family: monospace;">${invoice.customer.gstin}</span></div>` : ''}
            ${invoice.customer?.phone ? `<div style="font-size: 10px; color: #666; margin-top: 2px;">Phone: ${invoice.customer.phone}</div>` : ''}
          </div>

          <div style="width: 40%; text-align: right; font-size: 11px; color: #444;">
            <div style="margin-bottom: 3px;">Payment Mode: <strong style="color: #000000; text-transform: uppercase;">${invoice.paymentMode || invoice.saleType || 'CASH'}</strong></div>
            <div style="margin-bottom: 3px;">Payment Status: <strong style="color: ${isPaid ? '#059669' : '#dc2626'};">${isPaid ? 'PAID' : 'PAYMENT DUE'}</strong></div>
            <div style="margin-bottom: 3px;">Place of Supply: <strong>${invoice.placeOfSupply || settings.state || 'Intrastate'}</strong></div>
            <div style="margin-bottom: 3px;">Tax Type: <strong>${isInterState ? 'IGST (Inter-state)' : 'CGST + SGST (Intra-state)'}</strong></div>
          </div>
        </div>

        <!-- Items Table -->
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 11px;">
          <thead>
            <tr style="background-color: #f5f5f7; border-top: 1px solid #000000; border-bottom: 1px solid #000000;">
              <th style="padding: 8px 6px; text-align: center; width: 30px; font-weight: 700;">#</th>
              <th style="padding: 8px 8px; text-align: left; font-weight: 700;">ITEM DESCRIPTION</th>
              <th style="padding: 8px 6px; text-align: center; width: 60px; font-weight: 700;">HSN</th>
              <th style="padding: 8px 6px; text-align: right; width: 45px; font-weight: 700;">QTY</th>
              <th style="padding: 8px 8px; text-align: right; width: 65px; font-weight: 700;">RATE</th>
              <th style="padding: 8px 8px; text-align: right; width: 75px; font-weight: 700;">TAXABLE</th>
              <th style="padding: 8px 6px; text-align: right; width: 45px; font-weight: 700;">GST%</th>
              <th style="padding: 8px 8px; text-align: right; width: 85px; font-weight: 700;">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.items
              .map(
                (it, idx) => `
              <tr style="border-bottom: 1px solid #f0f0f2;">
                <td style="padding: 8px 6px; text-align: center; color: #666;">${idx + 1}</td>
                <td style="padding: 8px 8px; text-align: left; font-weight: 600; color: #111;">
                  ${it.name}
                  ${it.size ? `<span style="font-size: 9px; color: #666; font-weight: normal;"> (${it.size})</span>` : ''}
                </td>
                <td style="padding: 8px 6px; text-align: center; font-family: monospace; color: #555;">${it.hsn || '—'}</td>
                <td style="padding: 8px 6px; text-align: right; font-weight: 600;">${it.qty} <span style="font-size: 9px; color: #777;">${it.unit || 'pcs'}</span></td>
                <td style="padding: 8px 8px; text-align: right;">₹${(Number(it.salePrice) || 0).toFixed(2)}</td>
                <td style="padding: 8px 8px; text-align: right;">₹${(Number(it.taxableAmount) || 0).toFixed(2)}</td>
                <td style="padding: 8px 6px; text-align: right;">${it.taxRate}%</td>
                <td style="padding: 8px 8px; text-align: right; font-weight: 700; color: #000000;">₹${(Number(it.total) || 0).toFixed(2)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <!-- Totals Calculation Box -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-top: 18px;">
          <!-- Left: Amount in Words & Bank Info -->
          <div style="width: 52%; font-size: 11px;">
            <div style="background: #fafafa; border: 1px solid #eeeeee; border-radius: 6px; padding: 10px 12px; margin-bottom: 12px;">
              <div style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #86868b; margin-bottom: 2px;">
                TOTAL AMOUNT IN WORDS
              </div>
              <div style="font-weight: 600; color: #111; line-height: 1.3;">
                ${numberToWordsINR(invoice.grandTotal)}
              </div>
            </div>

            ${
              settings.bankName || settings.upiId
                ? `
              <div style="display: flex; gap: 12px; align-items: center; border: 1px solid #eeeeee; border-radius: 6px; padding: 10px 12px; background: #ffffff;">
                ${
                  qrCodeDataUrl
                    ? `<img src="${qrCodeDataUrl}" style="width: 75px; height: 75px; border-radius: 4px; border: 1px solid #e5e5ea;" alt="UPI QR" />`
                    : ''
                }
                <div style="font-size: 10px; color: #333; line-height: 1.4;">
                  <div style="font-weight: 700; text-transform: uppercase; color: #000; margin-bottom: 2px;">PAYMENT DETAILS</div>
                  ${settings.bankName ? `<div>Bank: <strong>${settings.bankName}</strong></div>` : ''}
                  ${settings.accountNumber ? `<div>A/c: <strong>${settings.accountNumber}</strong></div>` : ''}
                  ${settings.ifscCode ? `<div>IFSC: <strong>${settings.ifscCode}</strong></div>` : ''}
                  ${settings.upiId ? `<div>UPI ID: <strong style="color: #0071e3;">${settings.upiId}</strong></div>` : ''}
                </div>
              </div>
            `
                : ''
            }
          </div>

          <!-- Right: Bill Summary Numbers -->
          <div style="width: 44%;">
            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
              <tr>
                <td style="padding: 4px 6px; color: #555;">Subtotal (Taxable Value):</td>
                <td style="padding: 4px 6px; text-align: right; font-weight: 600;">${formatINR(invoice.taxableTotal)}</td>
              </tr>
              ${
                !isInterState
                  ? `
                <tr>
                  <td style="padding: 4px 6px; color: #555;">Central GST (CGST):</td>
                  <td style="padding: 4px 6px; text-align: right; font-weight: 600;">${formatINR(invoice.cgstTotal)}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 6px; color: #555;">State GST (SGST):</td>
                  <td style="padding: 4px 6px; text-align: right; font-weight: 600;">${formatINR(invoice.sgstTotal)}</td>
                </tr>
              `
                  : `
                <tr>
                  <td style="padding: 4px 6px; color: #555;">Integrated GST (IGST):</td>
                  <td style="padding: 4px 6px; text-align: right; font-weight: 600;">${formatINR(invoice.igstTotal)}</td>
                </tr>
              `
              }
              ${
                invoice.itemDiscountTotal > 0 || invoice.billDiscount > 0
                  ? `
                <tr>
                  <td style="padding: 4px 6px; color: #16a34a;">Discount:</td>
                  <td style="padding: 4px 6px; text-align: right; font-weight: 600; color: #16a34a;">- ${formatINR((invoice.itemDiscountTotal || 0) + (invoice.billDiscount || 0))}</td>
                </tr>
              `
                  : ''
              }
              ${
                invoice.roundOff !== 0
                  ? `
                <tr>
                  <td style="padding: 4px 6px; color: #555;">Round Off:</td>
                  <td style="padding: 4px 6px; text-align: right;">${invoice.roundOff > 0 ? '+' : ''}${invoice.roundOff.toFixed(2)}</td>
                </tr>
              `
                  : ''
              }
              <tr style="border-top: 2px solid #000000; border-bottom: 2px solid #000000;">
                <td style="padding: 8px 6px; font-size: 13px; font-weight: 800; text-transform: uppercase;">Grand Total:</td>
                <td style="padding: 8px 6px; text-align: right; font-size: 15px; font-weight: 900; color: #000000;">${formatINR(invoice.grandTotal)}</td>
              </tr>
              <tr>
                <td style="padding: 5px 6px; color: #059669; font-weight: 600;">Paid Amount:</td>
                <td style="padding: 5px 6px; text-align: right; font-weight: 700; color: #059669;">${formatINR(invoice.paidAmount)}</td>
              </tr>
              ${
                invoice.balanceAmount > 0
                  ? `
                <tr style="background: #fff1f2;">
                  <td style="padding: 5px 6px; color: #e11d48; font-weight: 700;">Balance Due:</td>
                  <td style="padding: 5px 6px; text-align: right; font-weight: 800; color: #e11d48;">${formatINR(invoice.balanceAmount)}</td>
                </tr>
              `
                  : ''
              }
            </table>
          </div>
        </div>
      </div>

      <!-- Footer & Signatures -->
      <div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #e5e5ea; display: flex; justify-content: space-between; align-items: flex-end;">
        <div style="width: 60%; font-size: 9px; color: #666; line-height: 1.4;">
          <div style="font-weight: 700; text-transform: uppercase; margin-bottom: 2px; color: #333;">Terms & Conditions:</div>
          <div>${settings.termsAndConditions || '1. Goods once sold will not be returned.\n2. All disputes subject to local jurisdiction.'}</div>
          <div style="margin-top: 6px; font-size: 8px; color: #888;">Computer generated invoice powered by Pro.Sale Enterprise OS</div>
        </div>

        <div style="width: 35%; text-align: center; font-size: 10px; color: #333;">
          <div style="font-weight: 700; margin-bottom: 45px;">For ${settings.firmName || 'Authorized Business'}</div>
          <div style="border-top: 1px dashed #777; padding-top: 4px; font-weight: 600;">Authorized Signatory</div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

    const safeInvNo = (invoice.invoiceNumber || 'INV').replace(/[^a-zA-Z0-9-_]/g, '_');
    const safeParty = (invoice.customer?.name || 'Bill').replace(/[^a-zA-Z0-9-_]/g, '_');
    const fileName = `Invoice_${safeInvNo}_${safeParty}.pdf`;

    // Download straight to local storage!
    pdf.save(fileName);
  } finally {
    document.body.removeChild(container);
  }
}
