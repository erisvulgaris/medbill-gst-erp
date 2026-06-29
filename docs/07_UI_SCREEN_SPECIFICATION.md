# 07 — UI Screen Specification

> **Status:** Source of truth for screen layouts and elements
> **Related:** `06_COMPONENT_LIBRARY.md`, `05_DESIGN_SYSTEM.md`, `08_USER_FLOWS.md`

## 1. Screen Inventory

| # | Screen | View Key | Route | Data Source |
|---|--------|----------|-------|-------------|
| 1 | Onboarding | — | `/` (pre-onboard) | Local state |
| 2 | Dashboard | `dashboard` | `/` | `/api/dashboard` |
| 3 | Sales & Invoices | `sales` | `/` | `/api/invoices` |
| 4 | Invoice Editor | `sales` (action=new) | `/` | `/api/products`, `/api/parties` |
| 5 | Invoice Viewer | `sales` (action=view) | `/` | `/api/invoices/:id` |
| 6 | POS Billing | `pos` | `/` | `/api/products` |
| 7 | Purchases | `purchases` | `/` | `/api/purchases` |
| 8 | Inventory | `inventory` | `/` | `/api/products` |
| 9 | Parties | `parties` | `/` | `/api/parties` |
| 10 | Party Statement | `parties` (action=view) | `/` | `/api/parties/:id` |
| 11 | Quotations | `quotations` | `/` | `/api/quotations` |
| 12 | Quotation Editor | `quotations` (action=new) | `/` | `/api/products`, `/api/parties` |
| 13 | Quotation Viewer | `quotations` (action=view) | `/` | `/api/quotations/:id` |
| 14 | Expenses | `expenses` | `/` | `/api/expenses` |
| 15 | Reports | `reports` | `/` | `/api/reports` |
| 16 | GST Returns | `gst` | `/` | `/api/gst` |
| 17 | Audit Log | `audit` | `/` | `/api/audit` |
| 18 | Settings | `settings` | `/` | `/api/business` |

## 2. App Shell (Persistent)

### 2.1 Desktop (≥1024px)
```
┌──────────┬──────────────────────────────┐
│          │ Topbar (glass, sticky)       │
│ Sidebar  ├──────────────────────────────┤
│ (glass,  │                              │
│ sticky,  │   Main Content (view)        │
│ 248px)   │   (scrollable)               │
│          │                              │
├──────────┴──────────────────────────────┤
│ (no bottom nav on desktop)              │
└──────────────────────────────────────────┘
```

### 2.2 Mobile (<1024px)
```
┌──────────────────────────────┐
│ Topbar (glass, sticky)       │
├──────────────────────────────┤
│                              │
│   Main Content (view)        │
│   (scrollable, pb-24)        │
│                              │
├──────────────────────────────┤
│ MobileBottomNav (5 tabs)     │
│ (glass, fixed, safe-area)    │
└──────────────────────────────┘
```

## 3. Screen Specifications

### 3.1 Onboarding (4 steps)
**Layout:** Full-screen, grid-bg background, centered card

**Step 1 — Business:**
- Business name*, legal name, business type, GSTIN*, PAN
- Phone, email, address, city, state, pincode

**Step 2 — Industry:**
- 12 industry cards in 3-column grid
- Each: icon + label + description
- Selection auto-configures modules

**Step 3 — Modules:**
- 11 module toggle cards in 2-column grid
- Each: icon + label + description + switch
- Pre-set by industry, user can override

**Step 4 — Review:**
- Two summary cards (Business + Industry/Modules)
- "Launch MedBill" CTA

### 3.2 Dashboard
**Layout:** `p-4 sm:p-6 lg:p-7 space-y-5 max-w-[1600px] mx-auto`

**Sections:**
1. **Hero banner** — emerald gradient, greeting, inline stats (4), quick actions (3)
2. **KPI grid** — 4 stat cards (purchases, expenses, customers, inventory)
3. **Charts row** — Sales/collections area chart (2/3) + GST pie (1/3)
4. **Bottom row** — Recent invoices (2/3) + [Stock alerts + Activity] (1/3)
5. **Top products** — Horizontal bar chart

### 3.3 Sales & Invoices
**List mode:**
- Header: title + "New Invoice" button
- 4 stat cards (total invoiced, collected, outstanding, count)
- Filter bar: search + status tabs (All/Paid/Unpaid/Partial) + export
- Table: Invoice | Customer | Date | Due | Total | Balance | Status

**Editor mode (action=new):**
- Header: "Create Tax Invoice" + Save button
- Top grid: Customer card (2/3) + Invoice details (1/3)
- Items table: Item | Qty | Rate | Disc% | GST% | Taxable | Tax | Total | Delete
- Add product bar (searchable picker)
- Bottom: Notes + Terms (left) | Totals panel (right)

**Viewer mode (action=view):**
- Action bar: Back | WhatsApp | Share | Print | Collect Payment | Cancel
- Status banner (if unpaid/overdue)
- Invoice paper: gradient header + bill-to + items table + totals + payment history + footer

### 3.4 POS Billing
**Layout:** `grid lg:grid-cols-[1fr_400px] h-[calc(100vh-4rem)]`

**Left panel:**
- Search bar (scan barcode or search)
- Product grid (2-4 cols, tap to add)
- Each card: icon + name + price + GST% + stock badge

**Right panel (cart):**
- Customer name input
- Cart items (qty controls, remove)
- Totals (subtotal, tax, total)
- Payment mode (cash/upi/card)
- "Charge ₹X" button
- Success animation on checkout

### 3.5 Inventory
- Header: title + "Add Product" button
- 4 stat cards (total products, inventory value, low stock, out of stock)
- Filter bar: search + category select + stock tabs
- Table: Product | Category | HSN/GST | Stock | Sale Price | Value | Actions
- **Add/Edit dialog:** 2-column form (name, SKU, barcode, HSN, category, unit, tax, prices, stock, tracking toggles)
- **Stock adjust dialog:** current/adjust/new display + mode toggle + qty + note

### 3.6 Parties
- Header: title + "Add Party" button
- 4 stat cards (customers, suppliers, receivable, payable)
- Filter bar: search + type tabs (Customers/Suppliers/All)
- Table: Name | Contact | GSTIN | Outstanding | Credit Limit | Actions
- **Add/Edit dialog:** 2-column form (type, name, company, GSTIN, PAN, phone, email, address, credit)
- **Statement view:** party header card + 4 stats + ledger table (date, particulars, type, debit, credit, balance)

### 3.7 Purchases
- Header: title + "New Purchase" button
- 3 stat cards
- Filter bar: search
- Table: Number | Supplier | Bill No | Date | Supply | Total
- **New purchase dialog:** supplier picker + bill no + date + product picker + line table + totals + notes

### 3.8 Quotations
- Header: title + "New Quotation" button
- 4 stat cards
- Filter bar: search + status tabs (All/Drafts/Sent/Accepted/Converted)
- Table: Quotation | Customer | Subject | Date | Valid Until | Value | Status
- **Editor:** same pattern as InvoiceEditor
- **Viewer:** amber-gradient paper + status banner + workflow actions (Mark Sent/Accept/Reject/Convert)

### 3.9 Expenses
- Header: title + "Add Expense" button
- 3 stat cards
- 2-column layout: pie chart (categories) + expense table
- **Add dialog:** category select + amount + date + mode + vendor + note

### 3.10 Reports
- Header: title + Export CSV
- Report picker grid (6 cards)
- Date range picker (from/to)
- Report body (varies by type):
  - P&L: 3 metric cards + table
  - Registers: metric cards + invoice table
  - Party: party table
  - Inventory: metric cards + product table
  - Day Book: 4 sections (sales, purchases, expenses, payments)

### 3.11 GST Returns
- Header: title + Export JSON
- Date range picker
- Filing status banner
- 4 liability cards (taxable, CGST, SGST, IGST)
- Tabs: B2B/Invoices | HSN Summary | Rate-wise
- Tables per tab

### 3.12 Audit Log
- Header: title + Export CSV
- 4 stat cards (total, creates, payments, deletions)
- Filter bar: search + entity select + action select
- Timeline grouped by day (sticky day headers)
- Each entry: entity icon + action badge + summary + user + time + metadata (expandable)

### 3.13 Settings
- Header: title + Save Changes
- Tabs: Business | Modules | Roles | Security | Data
- **Business:** profile form + address form + invoicing form
- **Modules:** 11 toggle cards
- **Roles:** 4 role cards + permission matrix note
- **Security:** 6 security rows (OTP, 2FA, device management)
- **Data:** 4 data rows (export, backup, restore, import) + reset

## 4. Responsive Behavior

### 4.1 Table Columns
Tables hide columns on smaller screens:
```tsx
<th className="hidden md:table-cell">Date</th>
<th className="hidden lg:table-cell">Due</th>
```

### 4.2 Grid Columns
- Mobile: 1-2 columns
- Tablet (sm/md): 2-3 columns
- Desktop (lg+): 3-4 columns

### 4.3 Dialogs
- Mobile: full-screen
- Desktop: centered, max-w

## 5. Loading States

Every view shows skeletons while loading:
```tsx
if (isLoading) return <Skeleton className="h-9 w-64" />;
```

## 6. Empty States

Every list has a designed empty state with icon + message + CTA.

## 7. Error States

View-level errors caught by `ErrorBoundary` (Phase 2 added). Shows error details in dev, generic message in prod.
