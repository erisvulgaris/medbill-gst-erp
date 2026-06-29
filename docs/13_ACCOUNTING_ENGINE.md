# 13 — Accounting Engine Specification

> **Status:** Source of truth for accounting logic
> **Implementation:** `src/app/api/reports/route.ts`, `src/app/api/payments/route.ts`, `src/components/app/party-statement.tsx`
> **Related:** `11_GST_ENGINE.md`, `12_INVENTORY_ENGINE.md`, `10_BUSINESS_RULES.md`

## 1. Overview

MedBill uses a **simplified single-entry accounting model** (not full double-entry). The focus is on:
- Party ledger (receivables/payables)
- Profit & Loss statement
- Day book (chronological transactions)

This is sufficient for MSME scale. Full double-entry with a chart of accounts is Phase 5+.

## 2. Accounting Model

### 2.1 Debit / Credit Convention
| Event | Debit (Dr) | Credit (Cr) | Meaning |
|-------|-----------|-------------|---------|
| Sale (invoice issued) | Party → Us | — | Party owes us more |
| Payment received | — | Party | Party owes us less |
| Purchase (bill received) | — | Supplier | We owe them more |
| Payment made | Supplier | — | We owe them less |
| Opening balance (+) | Party | — | They owe us from before |
| Opening balance (-) | — | Party | We owe them from before |

### 2.2 Running Balance
```
balance = openingBalance
        + sum(invoices)      // Dr
        - sum(payments recv) // Cr
        - sum(purchases)     // Cr
        + sum(payments made) // Dr
```

- **Positive balance** = Dr = party owes us (receivable)
- **Negative balance** = Cr = we owe them (payable)
- **Zero** = settled

## 3. Party Ledger (Statement)

### 3.1 API
`GET /api/parties/:id` returns the full ledger:

```json
{
  "party": { "id", "name", "openingBalance", ... },
  "entries": [
    { "date", "type", "ref", "refType", "debit", "credit", "balance", "note" }
  ],
  "totals": {
    "totalSales": 0,
    "totalPurchases": 0,
    "totalReceived": 0,
    "totalPaid": 0,
    "closingBalance": 0,
    "outstandingInvoices": 0
  }
}
```

### 3.2 Entry Construction
The ledger is built chronologically:
1. **Opening balance** entry (dated `party.createdAt`)
2. **Invoice** entries (dated `invoice.invoiceDate`) — debit
3. **Purchase** entries (dated `purchase.invoiceDate`) — credit
4. **Payment** entries (dated `payment.date`) — debit or credit

All entries sorted by date ascending. Running balance computed in JS.

### 3.3 Closing Balance
```
closingBalance = openingBalance + totalDebits - totalCredits
```

- `closingBalance > 0` → Dr (they owe us)
- `closingBalance < 0` → Cr (we owe them)
- Display: `formatINR(abs(closingBalance))` + "Dr" or "Cr"

## 4. Profit & Loss Statement

### 4.1 Formula
```
Revenue = Σ invoice.taxableValue (in date range)
COGS = Σ purchase.taxableValue (in date range)
Gross Profit = Revenue - COGS
Total Expenses = Σ expense.amount (in date range)
Net Profit = Gross Profit - Total Expenses
```

**Note:** Uses **taxable value** (excludes GST), because GST is a pass-through (collected for government, not revenue).

### 4.2 API
`GET /api/reports?report=profit_loss&from=&to=`

```json
{
  "title": "Profit & Loss Statement",
  "period": { "from", "to" },
  "revenue": 39752,
  "cogs": 49660,
  "grossProfit": -9908,
  "expenses": { "rent": 50000, "salary": 45000, "utilities": 3250, ... },
  "expTotal": 101550,
  "netProfit": -111458
}
```

### 4.3 Limitations
- **No accrued revenue** — only invoiced revenue counts
- **No accrued expenses** — only recorded expenses count
- **COGS is purchase value** — not actual cost of goods sold (doesn't account for opening/closing stock)
- **Phase 5:** True COGS = Opening Stock + Purchases - Closing Stock

## 5. Day Book

### 5.1 Purpose
Chronological list of all transactions for a date range. Used for daily reconciliation.

### 5.2 API
`GET /api/reports?report=day_book&from=&to=`

Returns:
- `sales` — list of invoices
- `purchases` — list of purchases
- `expenses` — list of expenses
- `payments` — list of payments

### 5.3 Summary Totals
```
Total Sales = Σ sales.grandTotal
Total Purchases = Σ purchases.grandTotal
Total Receipts = Σ payments (type=receipt).amount
Total Payments Out = Σ expenses.amount + Σ payments (type=payment).amount
```

## 6. Sales Register

### 6.1 Purpose
All outward GST invoices for a period. Used for GSTR-1 filing.

### 6.2 API
`GET /api/reports?report=sales_register&from=&to=`

Per invoice:
- Date, number, party name, GSTIN
- Supply type (intra/inter)
- Taxable value, CGST, SGST, IGST, total
- Status

### 6.3 Totals
```
Total Taxable = Σ invoice.taxableValue
Total CGST = Σ invoice.cgstTotal
Total SGST = Σ invoice.sgstTotal
Total IGST = Σ invoice.igstTotal
Grand Total = Σ invoice.grandTotal
```

## 7. Purchase Register

Same as Sales Register but for purchases. `GET /api/reports?report=purchase_register`

## 8. Payment Accounting

### 8.1 Linked Payment
When `Payment.invoiceId` is set:
```ts
const inv = await db.invoice.findUnique({ where: { id: invoiceId } });
const newPaid = inv.paidAmount + payment.amount;
const newBalance = Math.max(0, inv.grandTotal - newPaid);
const status = newBalance === 0 ? "paid" : newBalance < inv.grandTotal ? "partial" : "unpaid";
await db.invoice.update({ where: { id: inv.id }, data: { paidAmount: newPaid, balance: newBalance, status } });
```

### 8.2 Unlinked (On-Account) Payment
No `invoiceId` — adjusts party's effective balance. Will be allocated to invoices in Phase 5.

### 8.3 Payment Reversal
Deleting a payment (if allowed) reverses its effect:
```ts
const inv = await db.invoice.findUnique({ where: { id: payment.invoiceId } });
const newPaid = inv.paidAmount - payment.amount;
const newBalance = inv.grandTotal - newPaid;
const status = newBalance === 0 ? "paid" : newPaid > 0 ? "partial" : "unpaid";
await db.invoice.update({ where: { id: inv.id }, data: { paidAmount: newPaid, balance: newBalance, status } });
```

## 9. Outstanding Calculation

### 9.1 Party Outstanding
```ts
const outstandingInvoices = await db.invoice.findMany({
  where: { partyId, status: { in: ["unpaid", "partial", "overdue"] } },
  select: { balance: true },
});
const outstanding = outstandingInvoices.reduce((s, i) => s + i.balance, 0);
// Add opening balance
const totalOutstanding = outstanding + party.openingBalance;
```

### 9.2 Business-Wide Outstanding
```ts
const allUnpaid = await db.invoice.findMany({
  where: { businessId, status: { in: ["unpaid", "partial", "overdue"] } },
  select: { balance: true },
});
const totalOutstanding = allUnpaid.reduce((s, i) => s + i.balance, 0);
```

### 9.3 Overdue
```ts
const overdue = await db.invoice.findMany({
  where: { businessId, status: { in: ["unpaid", "partial"] }, dueDate: { lt: new Date() } },
});
// Phase 5: cron job to auto-set status="overdue"
```

## 10. GST Accounting

### 10.1 Tax Collected (Output Tax)
- CGST + SGST (intra) or IGST (inter) on sales invoices
- Tracked per GST rate
- Report: `GET /api/gst` — GSTR-1 outward supplies

### 10.2 Tax Paid (Input Tax)
- CGST + SGST or IGST on purchases
- Tracked per GST rate
- Report: `GET /api/reports?report=purchase_register` (Phase 5: GSTR-2B)

### 10.3 Net GST Payable
```
Net GST = Output Tax - Input Tax
```
Phase 5: GSTR-3B auto-generation.

## 11. Reporting Periods

### 11.1 Fiscal Year
- India: April 1 – March 31
- `Business.fyStartMonth` = 4 (April)
- Reports default to current month, not FY

### 11.2 GST Period
- Monthly return (GSTR-1)
- Due: 11th of following month
- MedBill: user selects date range

## 12. Known Limitations

1. **Single-entry, not double-entry** — no chart of accounts, no journal entries (Phase 5)
2. **COGS = purchases** — doesn't account for stock changes (Phase 5: true COGS)
3. **No accrued revenue/expenses** — cash-basis only (Phase 5)
4. **No balance sheet** — planned (Phase 5)
5. **No trial balance** — planned (Phase 5)
6. **No cash flow statement** — planned (Phase 5)
7. **No journal entries** — planned (Phase 5)
8. **Float precision** — money stored as Float (P0: migrate to Decimal)
9. **No multi-currency** — INR only (Phase 5+)

## 13. Testing Requirements

### 13.1 Unit Tests (planned)
- Outstanding calculation
- Payment allocation (linked/unlinked)
- P&L formula

### 13.2 Integration Tests (planned)
- Create invoice → verify party outstanding increases
- Record payment → verify outstanding decreases, status updates
- Cancel invoice → verify outstanding reverses
- P&L report matches manual calculation
