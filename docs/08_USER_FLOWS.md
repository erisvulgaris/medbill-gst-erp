# 08 — User Flows

> **Status:** Source of truth for step-by-step user journeys
> **Related:** `07_UI_SCREEN_SPECIFICATION.md`, `01_PRD.md`, `10_BUSINESS_RULES.md`

## 1. Onboarding Flow

### 1.1 First-Time Setup
**Trigger:** User opens app with no business in DB.

```
1. App loads → useBootstrapBusiness() → GET /api/business
2. Response: { business: null }
3. Auto-seed: POST /api/seed (creates demo business)
4. Re-fetch: GET /api/business → { business: {...} }
5. Check onboarded flag in store → false
6. Render <Onboarding />
```

### 1.2 Onboarding Wizard
```
Step 1: Business Info
  → Enter name*, legal name, business type, GSTIN*, PAN
  → Enter phone, email, address, city, state, pincode
  → Click Continue

Step 2: Industry
  → Select from 12 industry cards (retail, medical, restaurant, ...)
  → Selection auto-configures modules via INDUSTRY_PRESET
  → Click Continue

Step 3: Modules
  → Review auto-enabled modules (11 toggle cards)
  → Toggle modules on/off
  → Click Continue

Step 4: Review
  → Review business + industry + modules summary
  → Click "Launch MedBill"
  → PATCH /api/business with form + modules
  → setBusiness() in store → onboarded = true
  → Render app shell
```

### 1.3 Acceptance Criteria
- [ ] Wizard completes in <2 minutes
- [ ] GSTIN validated (format)
- [ ] State code auto-set from GSTIN or state selection
- [ ] Modules persist to business config
- [ ] Dashboard renders after launch

---

## 2. Create Invoice Flow

### 2.1 Happy Path
```
1. Dashboard → Click "New Invoice" (or Sales → New Invoice)
2. SalesView renders InvoiceEditor (action=new)
3. Select customer:
   → Click customer combobox
   → Search by name/phone/GSTIN
   → Select party → supply type auto-derived
4. Add products:
   → Click "Add product" combobox
   → Search by name/SKU/barcode
   → Select → line added with qty=1, price=salePrice, taxRate
   → Repeat for more products
5. Adjust line items:
   → Edit quantity, price, discount%, GST%
   → Live totals update (subtotal, CGST/SGST/IGST, grand total, amount-in-words)
6. Optional: edit notes, terms, invoice date, due date
7. Click "Save Invoice"
   → POST /api/invoices
   → Stock decremented, movements recorded, notification created, audit logged
   → On success: navigate to InvoiceViewer (action=view, id=newId)
8. InvoiceViewer renders printable invoice
```

### 2.2 Edge Cases
- **No customer selected:** Save blocked with toast "Please select a customer"
- **No items:** Save blocked with toast "Add at least one item"
- **Invalid GSTIN:** Client-side `isValidGstin()` check, toast on failure
- **Stock insufficient:** Warning shown but save allowed (can go negative)
- **Inter-state party:** Supply type auto-switches to "inter" → IGST applies

### 2.3 Acceptance Criteria
- [ ] GST calculates correctly (CGST+SGST for intra, IGST for inter)
- [ ] Grand total rounds to nearest rupee
- [ ] Amount in words displays
- [ ] Invoice number auto-generates (INV-0001)
- [ ] Stock decrements on save
- [ ] Printable view shows all details

---

## 3. Collect Payment Flow

### 3.1 From Invoice Viewer
```
1. Open unpaid invoice (Sales → click invoice row)
2. InvoiceViewer shows "Collect Payment" button (only if balance > 0)
3. Status banner shows "Payment pending — Balance ₹X"
4. Click "Collect Payment" or "Collect Now"
5. Dialog opens:
   → Shows: Total | Balance | After Payment
   → Quick amounts: Full | Half | Quarter
   → Amount input (prefilled with balance)
   → Payment mode select (cash/upi/card/bank/cheque/rtgs)
   → Reference input (UTR/cheque no)
   → Note input
   → "Fully Paid" indicator if amount = balance
6. Click "Record ₹X"
   → POST /api/payments { type: "receipt", invoiceId, amount, mode, ... }
   → Invoice status updated (paid/partial)
   → Audit logged
   → Dialog closes, viewer reloads
7. InvoiceViewer shows PAID status + payment history entry
```

### 3.2 Acceptance Criteria
- [ ] Amount cannot exceed balance (validation)
- [ ] Full payment → status = "paid"
- [ ] Partial payment → status = "partial"
- [ ] Payment appears in history
- [ ] Balance updates correctly

---

## 4. POS Checkout Flow

### 4.1 Happy Path
```
1. Click "POS Billing" in nav
2. PosView renders (product grid + cart)
3. Add products:
   → Search by name/SKU/barcode in search bar
   → Click product card → added to cart (qty=1)
   → Or scan barcode (Phase 5)
4. Adjust cart:
   → +/- quantity buttons
   → Or type quantity directly
   → Remove item (trash icon)
5. Enter customer name (default: "Walk-in Customer")
6. Select payment mode (cash/upi/card)
7. Click "Charge ₹X"
   → POST /api/invoices (creates tax invoice)
   → POST /api/payments (records receipt)
   → Both in single checkout
8. Success animation:
   → Green checkmark
   → Invoice number displayed
   → "Print" + "New Sale" buttons
9. Click "New Sale" → cart cleared, ready for next customer
```

### 4.2 Acceptance Criteria
- [ ] Product search filters by name/SKU/barcode
- [ ] Cart updates live (subtotal, tax, total)
- [ ] Out-of-stock products disabled
- [ ] Checkout creates invoice + payment atomically
- [ ] Success state shows invoice number

---

## 5. Quotation → Invoice Flow

### 5.1 Create Quotation
```
1. Quotations → "New Quotation"
2. QuotationEditor renders (same pattern as InvoiceEditor)
3. Select customer, add products, adjust line items
4. Optional: enter subject, valid-until date
5. Click "Save Quotation"
   → POST /api/quotations
   → Number auto-generates (QT-0001)
   → Navigate to QuotationViewer
```

### 5.2 Send & Accept
```
1. QuotationViewer shows "Mark Sent" button (status=draft)
2. Click "Mark Sent" → PATCH /api/quotations/:id { status: "sent" }
3. Customer reviews (via WhatsApp share or print)
4. Click "Accept" → status = "accepted"
   OR Click "Reject" → status = "rejected"
```

### 5.3 Convert to Invoice
```
1. QuotationViewer (status=accepted) shows "Convert to Invoice"
2. Click "Convert to Invoice"
   → Confirm dialog
   → PATCH /api/quotations/:id { convertToInvoice: true }
   → Backend creates Invoice with same items/party/totals
   → Stock decremented for all items
   → Quotation status = "converted"
   → Audit logged
3. Navigate to InvoiceViewer (action=view, id=newInvoiceId)
```

### 5.4 Acceptance Criteria
- [ ] Quotation number auto-generates
- [ ] Status workflow enforced (draft → sent → accepted → converted)
- [ ] Conversion creates a valid tax invoice
- [ ] Stock decremented at conversion (not at quotation creation)
- [ ] Original quotation preserved (not deleted)

---

## 6. Party Statement Flow

### 6.1 View Statement
```
1. Parties → click party row
2. PartiesView routes to PartyStatement (action=view, id=partyId)
3. PartyStatement renders:
   → Party header card (name, contact, GSTIN, closing balance)
   → 4 stat cards (total sales, received, outstanding, credit limit)
   → Ledger table (date, particulars, type, debit, credit, balance)
   → Closing balance row (bold)
4. Optional: Print, WhatsApp share
5. Click "Back to parties"
```

### 6.2 Acceptance Criteria
- [ ] Opening balance is first entry
- [ ] All invoices, purchases, payments appear chronologically
- [ ] Running balance correct (Dr/Cr)
- [ ] Closing balance = last entry's balance
- [ ] Debit = receivable, Credit = payable

---

## 7. Inventory Adjustment Flow

### 7.1 Stock In/Out
```
1. Inventory → hover product row → click "+" (stock adjust)
2. StockAdjustDialog opens:
   → Shows: Current | Adjust | New (3-column display)
   → Toggle: "Stock In" | "Stock Out"
   → Quantity input
   → Note input (reason)
3. Click "Confirm Adjustment"
   → PATCH /api/products { id, stock: newStock }
   → (Phase 3: POST /api/stock-movements with type=adjustment)
4. Product list refreshes with new stock
```

### 7.2 Acceptance Criteria
- [ ] New stock = current + qty (in) or current - qty (out)
- [ ] Stock cannot go below 0 (clamped)
- [ ] Note recorded for audit
- [ ] (Phase 3) StockMovement created

---

## 8. GST Filing Flow

### 8.1 Generate GSTR-1
```
1. GST Returns → select date range (default: current month)
2. View tabs:
   → B2B/Invoices: all outward invoices with party GSTIN
   → HSN Summary: aggregated by HSN code
   → Rate-wise: aggregated by GST rate
3. Verify totals (taxable, CGST, SGST, IGST)
4. Click "Export GSTR-1 JSON"
   → (Phase 5) Download JSON in GST portal format
5. Click "File Now"
   → (Phase 5) Redirect to GST portal
```

### 8.2 Acceptance Criteria
- [ ] All outward invoices in date range included
- [ ] HSN summary aggregates correctly
- [ ] Rate-wise breakdown matches invoice totals
- [ ] CGST+SGST for intra, IGST for inter

---

## 9. Reports Flow

### 9.1 Generate P&L
```
1. Reports → click "Profit & Loss" card
2. Select date range (from/to)
3. View:
   → 3 metric cards (Revenue, COGS, Net Profit)
   → P&L table (Revenue → COGS → Gross Profit → Expenses → Net Profit)
4. Click "Export CSV" → download
```

### 9.2 Report Types
| Report | What it shows |
|--------|---------------|
| P&L | Revenue, COGS, expenses, net profit |
| Sales Register | All outward invoices with GST |
| Purchase Register | All inward purchases with GST |
| Party Report | Per-party sales/purchases/balance |
| Inventory Valuation | Stock at cost + sale value |
| Day Book | Chronological transactions |

---

## 10. Command Palette Flow

### 10.1 Open & Search
```
1. Press Cmd+K (Mac) / Ctrl+K (Windows/Linux)
   OR click search button in topbar
2. CommandPalette opens (dialog)
3. Type search query:
   → Searches invoices, parties, products (200ms debounce)
   → Results show: Quick Actions + Navigate + Search Results
4. Click result or arrow-key + Enter
   → Invoice: opens viewer
   → Party: opens statement
   → Product: opens inventory (Phase 3)
   → Nav: switches view
5. Press Esc to close
```

### 10.2 Quick Actions
- Create new invoice → Sales (action=new)
- Open POS billing → pos
- Add new product → Inventory (action=new)
- Add party → Parties (action=new)

---

## 11. Navigation Flow

### 11.1 Desktop
- Sidebar (left, 248px) with grouped nav items
- Click any item → view switches instantly
- Collapse/expand sidebar via chevron
- Command palette (⌘K) for power users

### 11.2 Mobile
- Bottom nav (5 tabs): Dashboard, Sales, POS, Inventory, Parties
- Top-left hamburger → Sheet with full nav
- Command palette via search icon

### 11.3 Deep Navigation
- Dashboard → "New Invoice" → Sales (action=new) → Save → Sales (action=view, id)
- Parties → click row → Parties (action=view, id)
- Quotations → click row → Quotations (action=view, id) → Convert → Sales (action=view, id)

---

## 12. Error Recovery Flows

### 12.1 Render Error
```
View throws during render
  → ErrorBoundary catches
  → Shows error UI with "Try again" / "Go home"
  → (dev) Shows error stack
```

### 12.2 API Error
```
API returns 500
  → api() throws Error(message)
  → Caller catches: toast.error(message)
  → View stays in previous state
```

### 12.3 Network Error
```
fetch() fails (offline)
  → api() throws Error("Failed to fetch")
  → Toast: "Network error"
  → (Phase 4) Queue mutation for background sync
```
