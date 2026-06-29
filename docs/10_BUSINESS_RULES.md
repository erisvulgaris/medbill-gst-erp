# 10 — Business Rules

> **Status:** Source of truth for domain logic
> **Related:** `11_GST_ENGINE.md`, `12_INVENTORY_ENGINE.md`, `13_ACCOUNTING_ENGINE.md`

## 1. Invoice Business Rules

### 1.1 Invoice Numbering
- **Format:** `{prefix}-{seq:0000}` (e.g., `INV-0001`, `INV-0002`)
- **Prefix:** Configurable per business (`Business.invoicePrefix`, default `INV`)
- **Sequence:** Integer, incremented per business, never reused
- **Uniqueness:** `@@unique([businessId, number])` at DB level
- **Gap on cancel:** If an invoice is cancelled, its number is NOT reused. The sequence continues.

### 1.2 Invoice Statuses
| Status | Meaning | Transition |
|--------|---------|------------|
| `draft` | Created but not finalized | → `unpaid` on issue |
| `unpaid` | Issued, awaiting payment | → `partial` or `paid` |
| `partial` | Partially paid | → `paid` on full payment |
| `paid` | Fully paid (balance = 0) | Terminal |
| `overdue` | Past due date, unpaid | Auto-set by cron (planned) |
| `cancelled` | Voided; stock restored | Terminal |

### 1.3 Invoice Types
| Type | Purpose |
|------|---------|
| `tax_invoice` | Standard GST tax invoice (B2B/B2C) |
| `pos` | POS receipt (simplified) |
| `estimate` | Non-binding estimate |
| `proforma` | Proforma invoice (pre-shipment) |
| `delivery_challan` | Delivery note (no tax) |
| `credit_note` | Credit to customer (return/discount) |
| `debit_note` | Debit to customer (price increase) |

### 1.4 Supply Type
- **Intra-state:** Business state code == party state code → CGST + SGST
- **Inter-state:** Different state codes → IGST
- **Default:** If either state code missing, assume intra (most retail is local)
- See `11_GST_ENGINE.md` §2

### 1.5 Rounding
- Per-line values: rounded to 2 decimals (`r2()`)
- Document grand total: rounded to nearest rupee (integer)
- Round-off amount recorded as `Invoice.roundOff` (can be + or -)

### 1.6 Stock Impact
- **Creating a tax invoice / POS:** Decrements product stock by line quantity
- **Cancelling an invoice:** Restores stock (increments back)
- **Credit note:** Restores stock (if return)
- **Estimate / proforma / delivery challan:** No stock impact

### 1.7 Payment Linkage
- Payments can be linked to an invoice (`Payment.invoiceId`)
- Payment amount updates `Invoice.paidAmount` and `Invoice.balance`
- Status auto-updates: `paid` if balance=0, `partial` if 0 < paid < total
- Unlinked payments (no `invoiceId`) are "on-account" payments

## 2. Purchase Business Rules

### 2.1 Purchase Numbering
- **Format:** `PUR-{seq:0000}`
- **Sequence:** Per business, never reused

### 2.2 Purchase Statuses
| Status | Meaning |
|--------|---------|
| `received` | Goods received, stock updated |
| `draft` | Created, not received (planned) |
| `cancelled` | Voided; stock reversed |

### 2.3 Stock Impact
- Creating a purchase **increments** product stock
- Cancelling **decrements** stock back

### 2.4 Supplier Bill Number
- `Purchase.invoiceNumber` stores the supplier's own invoice number (for reconciliation)
- Not to be confused with MedBill's internal `Purchase.number`

## 3. Quotation Business Rules

### 3.1 Quotation Numbering
- **Format:** `QT-{seq:0000}`
- **Prefix:** Configurable (`Business.quotationPrefix`)

### 3.2 Quotation Statuses
| Status | Meaning | Transition |
|--------|---------|------------|
| `draft` | Created, not sent | → `sent` |
| `sent` | Sent to customer | → `accepted` / `rejected` / `expired` |
| `accepted` | Customer agreed | → `converted` |
| `rejected` | Customer declined | Terminal |
| `expired` | Past valid-until date | Terminal |
| `converted` | Turned into an invoice | Terminal |

### 3.3 Validity
- Default valid-until: 15 days from quotation date
- Configurable per quotation

### 3.4 Convert to Invoice
- Creates a new tax invoice with the same items, party, and totals
- **Stock is decremented** at conversion time (not at quotation creation)
- Quotation status → `converted`
- Original quotation is preserved (not deleted)

## 4. Inventory Business Rules

### 4.1 Stock Tracking
- `Product.stock` is the current available quantity
- Updated via `StockMovement` records (immutable ledger)
- Movements: `purchase` (in), `sale` (out), `transfer` (in/out), `adjustment` (in/out), `opening` (in), `return` (in)

### 4.2 Stock Adjustment
- Authorized roles: Owner, Partner, Manager, Store Keeper
- Reason/note required
- Creates a `StockMovement` record with type `adjustment`
- Stock can go negative (with warning) — represents back-order

### 4.3 Low Stock
- `Product.isLow` = `stock <= minStock`
- `Product.isOut` = `stock <= 0`
- Dashboard shows low-stock alerts
- Notifications generated when stock crosses threshold

### 4.4 Reorder
- `Product.reorderLevel` triggers reorder suggestion (planned)
- Default: same as `minStock`

### 4.5 Batch / Expiry / Serial Tracking
- **Batch:** Products with `batchTracked=true` track stock by batch number (planned UI)
- **Expiry:** Products with `expiryTracked=true` track expiry dates, FIFO picking (planned UI)
- **Serial:** Products with `serialTracked=true` track individual serial numbers (planned UI)
- Schema supports all three; UI is Phase 5+

## 5. Party Business Rules

### 5.1 Party Types
- `customer` — buys from us
- `supplier` — sells to us
- `both` — both customer and supplier

### 5.2 Outstanding Balance
- **Positive outstanding:** Party owes us (debit balance)
- **Negative outstanding:** We owe them (credit balance)
- **Zero:** Settled
- Calculated as: `openingBalance + sum(invoice.grandTotal) - sum(payments received) - sum(purchase.grandTotal) + sum(payments made)`

### 5.3 Credit Limit
- `Party.creditLimit` — max outstanding allowed
- Warning shown when creating invoice if outstanding + new total > credit limit (not blocked, just warned)
- `Party.creditDays` — default payment terms (e.g., 30 days)

### 5.4 Walk-in Customer
- A special party with no GSTIN, no credit, no address
- Used for POS counter sales
- Created in seed; can be reused

## 6. Payment Business Rules

### 6.1 Payment Types
- `receipt` — money received (customer pays us)
- `payment` — money paid (we pay supplier)

### 6.2 Payment Modes
| Mode | Use |
|------|-----|
| `cash` | Physical cash |
| `upi` | UPI transfer |
| `card` | Credit/debit card |
| `bank` | NEFT/IMPS bank transfer |
| `cheque` | Cheque (clears in 2-3 days) |
| `rtgs` | RTGS (high-value) |

### 6.3 Linked vs Unlinked
- **Linked:** `Payment.invoiceId` set → updates invoice balance/status
- **Unlinked (on-account):** No invoice → adjusts party's opening balance
- A payment can be split across multiple invoices (planned Phase 5)

### 6.4 Payment Reversal
- Deleting a payment (if allowed) reverses its effect on invoice balance
- Soft-delete recommended (see `DATABASE_AUDIT.md` §3)

## 7. GST Business Rules

### 7.1 Tax Rates
- 7 standard rates: 0%, 0.25%, 3%, 5%, 12%, 18%, 28%
- Per-business `TaxRate` records with CGST/SGST/IGST splits
- Products reference a `TaxRate` via `taxId`

### 7.2 HSN/SAC
- `Product.hsn` stores the HSN/SAC code
- Snapshotted on `InvoiceItem.hsn` at invoice time (so historical invoices aren't affected by HSN changes)
- Required for GSTR-1 filing if turnover > threshold

### 7.3 Place of Supply
- `Invoice.placeOfSupply` = recipient's state code
- Determines CGST+SGST vs IGST
- Default: party's state code

### 7.4 GSTR-1
- Monthly return of outward supplies
- MedBill generates the data (HSN summary, rate-wise, B2B invoices)
- Filing happens on the GST portal (MedBill doesn't file directly — planned Phase 6 via IRN/QR)

### 7.5 Reverse Charge (planned)
- `Invoice.reverseCharge` flag (Phase 5)
- Recipient pays tax instead of supplier
- Affects GSTR-1 reporting

## 8. Accounting Business Rules

### 8.1 Double-Entry (simplified)
MedBill uses a simplified single-entry model:
- **Debit (Dr):** Increases party's obligation to us (invoice issued)
- **Credit (Cr):** Decreases party's obligation (payment received, purchase made)

### 8.2 Ledger
- `PartyStatement` shows running balance in Dr/Cr format
- Opening balance + all transactions → closing balance
- Positive closing = Dr (they owe us); Negative = Cr (we owe them)

### 8.3 Profit & Loss
- **Revenue:** Sum of invoice taxable values (excludes tax)
- **COGS:** Sum of purchase taxable values
- **Gross Profit:** Revenue - COGS
- **Net Profit:** Gross Profit - Total Expenses
- Period: configurable date range

### 8.4 Day Book
- Chronological list of all transactions (sales, purchases, expenses, payments)
- Used for daily reconciliation

## 9. Notification Business Rules

### 9.1 Notification Kinds
| Kind | Trigger |
|------|---------|
| `stock` | Low stock, out of stock |
| `payment` | Payment received/overdue |
| `gst` | GSTR-1 due date approaching |
| `warning` | Overdue invoice |
| `info` | General (invoice created, etc.) |
| `success` | Successful operation |

### 9.2 Read State
- Unread notifications show a badge in topbar
- `PATCH /api/notifications` with `markAllRead: true` marks all as read
- Auto-expire after 30 days (planned)

## 10. Audit Log Business Rules

### 10.1 What Gets Logged
Every mutating API call (POST/PATCH/DELETE) must call `recordAudit()`:
- `action`: create, update, delete, cancel, payment, export, print
- `entity`: invoice, party, product, purchase, payment, expense, quotation, business
- `entityId`: the affected record ID
- `summary`: human-readable description
- `metadata`: JSON with relevant fields
- `userId`: from auth (currently null — Phase 3)
- `ip`: from `x-forwarded-for` header (planned)

### 10.2 Immutability
- Audit logs are **append-only** — never updated or deleted
- Schema doesn't have `updatedAt` or `deletedAt` on `AuditLog`
- Phase 5: hash chain for tamper-evidence

## 11. Business Configuration Rules

### 11.1 Modules
- `Business.modules` JSON: `{ pos, inventory, gst, payroll, crm, manufacturing, expiry, batch, serial, barcode, onlineStore }`
- Disabled modules are hidden from navigation
- Enabling a module doesn't create data; it just shows the UI

### 11.2 Industry Presets
Onboarding auto-configures modules based on industry:
| Industry | Modules enabled |
|----------|----------------|
| Medical | expiry, batch, barcode, pos, inventory, gst |
| Restaurant | pos, inventory (light), no gst |
| Salon | pos, crm, no inventory |
| Service | gst, no inventory |
| Electronics | serial, barcode, pos, inventory, gst |
| Manufacturer | manufacturing, inventory, gst |

### 11.3 Fiscal Year
- `Business.fyStartMonth` (default 4 = April)
- Used for reports and GST period defaults
- India FY: April 1 – March 31

## 12. Validation Rules (server-side — Phase 3)

### 12.1 GSTIN
- Format: `/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/`
- Optional (walk-in customers have none)
- See `11_GST_ENGINE.md` §5

### 12.2 PAN
- Format: `/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/`

### 12.3 Phone
- 10 digits (Indian mobile) or with +91 prefix
- Format: `/^(\+91)?[6-9]\d{9}$/`

### 12.4 Pincode
- 6 digits: `/^\d{6}$/`

### 12.5 Money
- Non-negative number
- Max: 99,99,99,999.99 (Decimal 12,2)

### 12.6 Quantity
- Positive number
- Can be fractional (e.g., 2.5 kg)
