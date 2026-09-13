import { Invoice, Customer, BusinessSettings } from '../types';
import { formatINR, formatDate } from '../utils/formatters';

export function generateInvoiceWhatsAppMessage(invoice: Invoice, settings: BusinessSettings): string {
  const itemsText = invoice.items
    .map((it, idx) => `${idx + 1}. *${it.name}* (x${it.qty} ${it.unit}) - ${formatINR(it.total)}`)
    .join('\n');

  const upiLink = settings.upiId
    ? `\n\n📲 *Pay directly via UPI:* upi://pay?pa=${settings.upiId}&pn=${encodeURIComponent(settings.firmName)}&am=${invoice.balanceAmount > 0 ? invoice.balanceAmount : invoice.grandTotal}&cu=INR`
    : '';

  const balanceText = invoice.balanceAmount > 0
    ? `\n⚠️ *Pending Balance Due:* ${formatINR(invoice.balanceAmount)}`
    : '\n✅ *Status:* Fully Paid';

  const message = `✨ *Tax Invoice from ${settings.firmName}* ✨
━━━━━━━━━━━━━━━━━━━━
📄 *Invoice No:* ${invoice.invoiceNumber}
📅 *Date:* ${formatDate(invoice.date)}
👤 *Billed To:* ${invoice.customer.name} (${invoice.customer.phone || 'N/A'})

📦 *Items Purchased:*
${itemsText}

━━━━━━━━━━━━━━━━━━━━
💰 *Grand Total:* ${formatINR(invoice.grandTotal)}
💵 *Paid Amount:* ${formatINR(invoice.paidAmount)}${balanceText}
${upiLink}

Thank you for your business!
For any queries, contact: ${settings.phone}`;

  return message;
}

export function generatePaymentReminderMessage(customer: Customer, settings: BusinessSettings): string {
  const upiLink = settings.upiId
    ? `\n\n📲 *Click to Pay via UPI:* upi://pay?pa=${settings.upiId}&pn=${encodeURIComponent(settings.firmName)}&am=${customer.currentBalance}&cu=INR`
    : '';

  const message = `Dear *${customer.name}*,

This is a gentle payment reminder from *${settings.firmName}*.

Your current outstanding balance on ledger is *${formatINR(customer.currentBalance)}*.${upiLink}

Kindly clear the balance at your earliest convenience. If you have already made the payment, please share the transaction screenshot.

Thank you!
*${settings.firmName}*
📞 ${settings.phone}`;

  return message;
}

export function openWhatsApp(phone: string, text: string): void {
  // Normalize phone number (strip spaces, dashes, ensure +91 if Indian 10-digit)
  let cleanPhone = phone.replace(/[^0-9]/g, '');
  if (cleanPhone.length === 10) {
    cleanPhone = '91' + cleanPhone;
  }
  const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}
