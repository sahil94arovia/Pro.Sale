<p align="center">
  <img src="public/app-icon.png" width="120" height="120" alt="Pro.Sale Logo" style="border-radius: 26px; box-shadow: 0 10px 30px rgba(0,0,0,0.25);" />
</p>

<h1 align="center">Pro.Sale — Enterprise GST Billing & Business OS</h1>

<p align="center">
  <strong>Apple-grade minimalist design, 100% offline-first privacy, and instant GST statutory compliance for modern Indian enterprises.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Version-v1.0.1-0071e3?style=for-the-badge" alt="Version 1.0.1" />
  <img src="https://img.shields.io/badge/License-Enterprise%20Lifetime-10b981?style=for-the-badge" alt="Lifetime License" />
  <img src="https://img.shields.io/badge/GST%20Compliance-CBIC%202026%20Ready-f59e0b?style=for-the-badge" alt="GST 2026 Ready" />
  <img src="https://img.shields.io/badge/Privacy-100%25%20Offline%20Air--Gapped-000000?style=for-the-badge" alt="Offline Privacy" />
</p>

---

## 🌟 Overview

**Pro.Sale** is a modern, high-performance billing and business operating system engineered specifically for Indian businesses. Built with an obsessive focus on Apple Human Interface design principles, Pro.Sale delivers zero-lag POS billing, automated stock tracking, comprehensive party ledgers, and CBIC-compliant GST filing suites in an air-gapped, offline-first package.

---

## 🚀 Key Highlights

- ** Apple Minimalist UI**: High-contrast OLED dark navigation, frosted-glass modals, responsive layout, and typography tuned for maximum legibility.
- **⚡ Reactive Live Auto-Sync**: Multi-tab synchronization and 1.5s internal background reactive polling. Zero manual browser reloads (`Cmd+R`) needed.
- **🛡️ 100% Client-Side Privacy**: Zero cloud telemetry, zero remote tracking. All data is persisted locally via browser storage with encrypted JSON backup & restore.
- **📊 Complete Profit & Loss Suite**: Instant visibility into **Client-wise**, **Item-wise**, and **Bill-wise** profitability with cost deduction and discount apportionment.
- **📑 Full GST Statutory Suite**: Built-in support for GSTR-1, GSTR-2, GSTR-3B, GSTR-9, HSN summaries, and NIC Schema 1.04 E-Way / E-Invoice payloads.
- **🖨️ Thermal & A4 Invoicing**: Supports standard 80mm thermal receipts and 15 distinct A4 invoice design themes with direct WhatsApp sharing.

---

## 🛠️ Modules & Features

### 1. High-Speed POS & Billing (`BillingPOS.tsx`)
- Keyboard-driven workflow (`F2`: New Sale, `F3`: Quick Purchase, `F4`: Receive Payment).
- Automatic Inter-state vs. Intra-state tax detection (IGST vs. CGST+SGST).
- Split payment handling (Cash, UPI, Bank Transfer, Cheque).
- Real-time stock alerts and barcode scanning support.
- Full bill editing with automatic delta reconciliation for inventory and party balances.

### 2. Sale Invoices Register (`SaleInvoicesView.tsx`)
- Granular filtering: **Day-wise** (Today, Yesterday, Custom Day), **Month-wise** (This Month, Last Month, Custom Month), and **Payment Type** (Cash, Credit, Fully Paid, UPI, Bank).
- Instant multi-field search across Invoice #, Customer Name, Phone, and GSTIN.
- Safe 1-click bill deletion with automatic stock restoration and customer ledger balance reversal.
- Export filtered sales register directly to CSV.

### 3. Customer & Supplier Ledger (`CustomerLedgerView.tsx`)
- Automatic double-entry ledger bookkeeping.
- Instant balance tracking with credit limits and overdue alerts.
- Quick payment voucher generation with WhatsApp payment reminders.

### 4. Inventory & Stock Master (`InventoryView.tsx`)
- Multi-unit conversion (PCS, BOX, KG, LTR, MTR, etc.).
- Low-stock reorder alerts with threshold configuration.
- Built-in Code-128 barcode generator with batch print capabilities.

### 5. Expense & Net Profit Management (`ExpenseView.tsx`)
- Real-time gross profit offset against operational expenses.
- Categorized expense tracking (Raw materials, Utilities, Rent, Salaries, Transport).

### 6. Statutory Compliance & E-Invoice (`EwayEinvoiceView.tsx`)
- 64-character simulated IRN generation with QR payload encoding.
- Part A & Part B E-Way bill generation with vehicle number tracking.

### 7. App Info & System Diagnostics (`AppInfoModal.tsx`)
- Built-in diagnostic center (`F1` or top header logo click).
- Real-time storage footprint calculation, statutory versioning, and update validation.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `F1` | Open App Information & System Diagnostics |
| `F2` | Create New Tax Invoice / POS Billing |
| `F3` | Add Quick Purchase / Expense Voucher |
| `F4` | Record Customer Ledger Payment |
| `Esc` | Dismiss any open modal or return to screen |
| `Cmd + P` | Print Active Document / Generate PDF |

---

## 💻 Tech Stack

- **Framework**: React 19 + TypeScript 5.7
- **Bundler**: Vite 8.3
- **Styling**: Tailwind CSS 3.4
- **Animations**: Framer Motion 13
- **Icons**: Lucide Icons
- **Barcode & QR**: JsBarcode + Qrcode
- **Local Engine**: HTML5 Local Storage + IndexedDB with custom reactive event bus

---

## 📦 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or pnpm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/sahil94arovia/pro-sale.git

# Navigate into project directory
cd pro-sale

# Install dependencies
npm install

# Start local development server
npm run dev
```

Visit `http://localhost:5173/` in your browser.

### Production Build

```bash
npm run build
npm run preview
```

---

## 🔒 Data Security & Offline Guarantee

Pro.Sale executes 100% inside your local client runtime. No invoice data, client contact lists, financial profits, or tax details are ever uploaded to any third-party cloud servers. To secure your data, use the **Settings → Backup & Reset Data** section to export encrypted JSON backups regularly.

---

## 📄 License

Distributed under the **Enterprise Commercial Lifetime License**.  
Developed and maintained for high-performance business operations.
