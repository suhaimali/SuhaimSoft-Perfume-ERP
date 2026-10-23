# SuhaimSoft Perfume Management System

> **Manage Every Fragrance. Control Every Sale.**  
> *Presented by: Suhaim Ali VP — SuhaimSoft*

---

## 1. Executive Summary

**SuhaimSoft Perfume Business Management ERP** is an enterprise-grade full-stack MERN application built specifically for luxury fragrance brands, boutique perfume shops, retail outlets, wholesale distributors, and multi-branch perfume houses.

It provides centralized management of products, fragrance taxonomy, multi-warehouse stock balances, suppliers, customer loyalty, purchase orders, fast POS billing with barcode scanner support, immutable financial ledgers, operating expenses, daily cash drawer reconciliations, staff RBAC permissions, and comprehensive Profit & Loss analytics.

---

## 2. Technology Stack

- **Frontend**: React.js (Vite)
- **Styling**: Tailwind CSS v4 with bespoke luxury charcoal & gold palette
- **State & Data Fetching**: TanStack React Query, React Context, Axios
- **Charts & Data Visualization**: Recharts
- **Icons**: Lucide React
- **Notifications**: Sonner
- **Backend**: Node.js & Express.js
- **Database**: MongoDB (Atlas ready, with automatic fallback in-memory replica set for dev & testing)
- **Object Data Modeling**: Mongoose with atomic transaction support
- **Authentication**: JWT with token-version instant revocation & bcrypt password hashing
- **PDF Generation**: PDFKit (Sales Tax Invoices, Receipts, Purchase Vouchers)
- **Testing**: Automated Vitest integration test suite

---

## 3. Key Modules & Features

### 1. Master Admin Dashboard
- Live database-backed metrics: Total products, bottle variants, active brands, suppliers, and customers.
- Real-time stock counters, low-stock threshold triggers, and out-of-stock emergency alerts.
- Today's sales vs. monthly revenue, gross margins, and customer receivables (AR) vs. supplier payables (AP).
- 6-month interactive revenue and profit trend graphs.
- Top-moving perfume variants by quantity and revenue.
- Live stream of recent POS receipts, purchase orders, and inventory ledger movements.

### 2. High-Speed POS Billing Terminal
- Real-time fragrance search by perfume name, fragrance code, SKU, or barcode scanner input.
- Quick filter buttons for major houses (Creed, Kurkdjian, Tom Ford, Roja, Ajmal Oud).
- Line item quantity adjustments (+ / -) with automatic stock validation preventing overselling.
- Customer account lookup (wholesale vs. retail pricing rules, customer discount %, loyalty points balance).
- Coupon codes, cart discounts, and loyalty point redemption.
- Multiple payment methods: Cash, Card, UPI, and split payments.
- Instant change calculation and outstanding credit balance recording.
- Professional printable & downloadable PDF tax invoice generation.

### 3. Fragrance Catalog & Product Management
- Complete fragrance attributes: Brand house, fragrance family (Oriental, Woody, Floral, Fresh, Gourmand, Citrus), gender category, concentration (Parfum, EDP, EDT, EDC, Attar), size in ml.
- Detailed olfactory pyramids: Top notes, Heart notes, and Base notes.
- Multi-variant architecture: Single fragrance supports multiple bottle sizes and concentration SKUs.
- Price levels: Purchase cost, retail price, wholesale price, discount pricing, and HSN/tax settings.
- Opening stock initialization automatically logged as an opening stock transaction.

### 4. Boutique Stock & Inventory Ledger
- Streamlined single-branch boutique inventory management.
- Real-time stock counts per perfume variant and batch number.
- Immutable movement ledger recording every event (`opening`, `purchase_receipt`, `sale`, `adjustment`, `damaged`, `leaked`, `expired`).
- Physical stock adjustments with audit reason tracking.

### 5. Supplier Procurement & Goods Receiving
- Complete purchase order workflow (PO creation -> approval -> partial or full goods receipt).
- Inventory increases **only** for quantities physically received at the designated warehouse.
- Automatic moving-average cost (MAC) recalculation upon goods receipt.
- Supplier accounts payable tracking and payment history.

### 6. Payments, Accounts & Daily Cash Closing
- Accounts Receivable (AR) customer payment recording with automated invoice balance reduction.
- Accounts Payable (AP) supplier payouts.
- End-of-day register cash closing: compares system expected cash (Opening + Cash sales - Cash refunds - Cash expenses) against physical drawer count and logs overage/shortage differences.

### 7. Profit & Loss, Valuation & Certified Reports
- Comprehensive Income Statement: Sales Revenue - COGS = Gross Profit - Operating Expenses = Net Profit.
- Inventory Valuation Report: Units on hand, cost valuation, retail potential valuation, and gross margin potential.
- Date-filtered sales ledger with one-click CSV export.

---

## 4. Default Credentials (Seeded Automatically)

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Master Admin** | `admin@suhaimsoft.com` | `Admin@12345` | Full unrestricted access to all modules, settings, and finances |
| **POS Cashier** | `cashier@suhaimsoft.com` | `Cashier@12345` | POS Billing, Customer creation, and receipt printing |

*(One-click quick login buttons for these accounts are also available directly on the login page)*

---

## 5. Getting Started & Installation

### Prerequisites
- Node.js >= 20.x
- npm >= 10.x

### Quick Start (Run Both Server & Client)

1. **Install root & workspace dependencies**:
   ```bash
   cd d:\perfume
   cd server && npm install
   cd ../client && npm install
   cd ..
   ```

2. **Start Backend API Server**:
   ```bash
   npm run dev:server
   ```
   *Runs at `http://localhost:5000` with auto-seeding enabled.*

3. **Start Frontend Client**:
   ```bash
   npm run dev:client
   ```
   *Runs at `http://localhost:5173` with Vite HMR.*

4. **Open in browser**:
   Navigate to [http://localhost:5173](http://localhost:5173) and sign in.

---

## 6. Running Automated Integration Tests

Run the complete Vitest test suite verifying authentication, RBAC, inventory deduction, overselling prevention, and financial calculations:

```bash
npm test
```

All 7 integration test suites execute against a test in-memory database and pass with zero errors.
