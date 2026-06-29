# 11 — GST Engine Specification

> **Status:** Source of truth for GST calculation logic
> **Implementation:** `src/lib/gst.ts`
> **Test target:** 100% line coverage (see `16_TESTING_GUIDE.md`)

## 1. Overview

The GST engine handles all Indian Goods & Services Tax calculations for MedBill. It is a **pure, side-effect-free module** — no DB access, no I/O, no state. This makes it trivially testable and reusable on both client and server.

```ts
// All exports are pure functions
export function computeLine(line: LineInput, supplyType: SupplyType): ComputedLine
export function computeDocument(lines: LineInput[], supplyType: SupplyType): { lines, totals }
export function isValidGstin(gstin?: string | null): boolean
export function stateCodeFromGstin(gstin?: string | null): string | null
export function deriveSupplyType(businessStateCode?, partyStateCode?): SupplyType
export const GST_RATES: number[]
export const INDIAN_STATES: { code, name }[]
```

## 2. GST Fundamentals (India)

### 2.1 Tax Structure

India has a dual GST structure:
- **Intra-state supply** (same state): CGST + SGST (each = rate/2)
- **Inter-state supply** (different states): IGST (= rate)

| GST Rate | CGST | SGST | IGST |
|----------|------|------|------|
| 0% | 0 | 0 | 0 |
| 0.25% | 0.125 | 0.125 | 0.25 |
| 3% | 1.5 | 1.5 | 3 |
| 5% | 2.5 | 2.5 | 5 |
| 12% | 6 | 6 | 12 |
| 18% | 9 | 9 | 18 |
| 28% | 14 | 14 | 28 |

**MedBill supported rates:** `GST_RATES = [0, 0.25, 3, 5, 12, 18, 28]`

### 2.2 Supply Type Determination

Supply type is determined by the **state codes** of the supplier (business) and recipient (party):
- Same state code → **intra** (CGST + SGST)
- Different state codes → **inter** (IGST)
- Either missing → **intra** (default — most common for retail)

```ts
export function deriveSupplyType(businessStateCode?, partyStateCode?): SupplyType {
  if (!businessStateCode || !partyStateCode) return "intra";
  return businessStateCode === partyStateCode ? "intra" : "inter";
}
```

### 2.3 State Codes

The first 2 digits of a GSTIN are the state code. India has 38 state/UT codes (01–38). See `INDIAN_STATES` constant in `gst.ts`.

## 3. Line Calculation

### 3.1 Input

```ts
interface LineInput {
  productId?: string;
  name: string;
  hsn?: string | null;
  quantity: number;
  unit?: string | null;
  price: number;          // per-unit rate (pre-tax)
  discountPct?: number;   // 0-100
  discountAmt?: number;   // absolute, applied after pct
  taxRate: number;        // %, e.g. 18
}
```

### 3.2 Algorithm

```
gross = round2(max(0, quantity) × max(0, price))

pctDiscount = round2(gross × min(100, max(0, discountPct)) / 100)
amtDiscount = max(0, discountAmt)
discountTotal = round2(pctDiscount + amtDiscount)

taxable = round2(max(0, gross - discountTotal))
rate = max(0, taxRate)

if supplyType == "intra":
  cgst = round2(taxable × rate / 200)   # half of rate%
  sgst = cgst
  igst = 0
else:
  cgst = 0
  sgst = 0
  igst = round2(taxable × rate / 100)

total = round2(taxable + cgst + sgst + igst)
```

### 3.3 Rounding

All monetary values are rounded to 2 decimal places using `r2()`:
```ts
export function r2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
```
The `Number.EPSILON` correction prevents floating-point errors like `0.1 + 0.2 = 0.30000000000000004`.

**Document-level round-off:** The grand total is rounded to the nearest rupee (integer), and the difference is recorded as `roundOff`:
```
rawGrand = round2(taxableValue + totalTax)
grandTotal = Math.round(rawGrand)         # integer
roundOff = round2(grandTotal - rawGrand)  # can be + or -
```

### 3.4 Edge Cases (tested)

| Case | Behavior |
|------|----------|
| Quantity = 0 | gross = 0, taxable = 0, tax = 0 |
| Negative quantity | Clamped to 0 |
| Negative price | Clamped to 0 |
| Discount % > 100 | Clamped to 100 |
| Discount % < 0 | Clamped to 0 |
| Discount amount > gross | `taxable = max(0, gross - discount)` = 0 |
| Tax rate < 0 | Clamped to 0 |
| Tax rate > 100 | Not clamped (allows cess-like rates) — **document for review** |

## 4. Document Calculation

### 4.1 Input
```ts
computeDocument(lines: LineInput[], supplyType: SupplyType)
```

### 4.2 Output
```ts
{
  lines: ComputedLine[],   // each line computed
  totals: DocumentTotals
}

interface DocumentTotals {
  subtotal: number;        // sum of gross
  discountTotal: number;   // sum of line discounts
  taxableValue: number;    // sum of taxable
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  cessTotal: number;       // always 0 (cess not implemented)
  roundOff: number;
  grandTotal: number;      // integer
}
```

### 4.3 Example

**Invoice:** 2 × Aashirvaad Atta @ ₹290, 5% GST, intra-state

```
Line 1:
  gross = 2 × 290 = 580
  discount = 0
  taxable = 580
  cgst = 580 × 5 / 200 = 14.50
  sgst = 14.50
  total = 580 + 14.50 + 14.50 = 609.00

Document:
  subtotal = 580
  taxableValue = 580
  cgstTotal = 14.50
  sgstTotal = 14.50
  igstTotal = 0
  rawGrand = 580 + 29 = 609.00
  grandTotal = 609 (already integer)
  roundOff = 0.00
```

**Invoice:** 3 × Coca-Cola @ ₹40, 28% GST, inter-state (Goa customer)

```
Line 1:
  gross = 3 × 40 = 120
  taxable = 120
  igst = 120 × 28 / 100 = 33.60
  total = 120 + 33.60 = 153.60

Document:
  subtotal = 120
  taxableValue = 120
  igstTotal = 33.60
  rawGrand = 120 + 33.60 = 153.60
  grandTotal = 154 (rounded up)
  roundOff = +0.40
```

## 5. GSTIN Validation

### 5.1 Format

A GSTIN is a 15-character alphanumeric code:
```
PPAAAAANNNNAAXZC
││─────┬────││ │└┤
││     │    ││ │ └─ Checksum (0-9, A-Z)
││     │    ││ └─── Z (always 'Z')
││     │    │└───── Entity code (1-9, A-Z)
││     │└────────── PAN (5 letters + 4 digits + 1 letter)
││─────┘
│└──────────────── State code (01-38)
└───────────────── 2 digits
```

### 5.2 Regex

```ts
/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
```

### 5.3 Validation Function

```ts
export function isValidGstin(gstin?: string | null): boolean {
  if (!gstin) return true;  // optional — empty is valid
  return pattern.test(gstin.trim().toUpperCase());
}
```

**Note:** This validates **format only**, not the checksum digit. Full checksum validation (per GSTN spec) is a Phase 5 enhancement.

### 5.4 State Code Extraction

```ts
export function stateCodeFromGstin(gstin?: string | null): string | null {
  if (!gstin) return null;
  const code = gstin.trim().substring(0, 2);
  return /^\d{2}$/.test(code) ? code : null;
}
```

## 6. HSN/SAC Codes

HSN (Harmonised System of Nomenclature) is used for goods; SAC (Services Accounting Code) for services. MedBill stores HSN per product (`Product.hsn`) and per invoice line (`InvoiceItem.hsn` — snapshot at invoice time).

**Validation:** Not enforced (HSN can be 2, 4, 6, or 8 digits). The GST portal validates at filing time.

**Reporting:** The GST report (`/api/gst`) aggregates by HSN for GSTR-1 filing. See `04_API_SPECIFICATION.md` §GST.

## 7. Place of Supply

MedBill records `Invoice.placeOfSupply` (the recipient's state code) on each invoice. This is required for GSTR-1 filing.

**Current implementation:** Set to `party.stateCode` at invoice creation. Not user-editable yet.

**Phase 5:** Add editable place-of-supply for special cases (e.g., export, SEZ).

## 8. Reverse Charge

**Not implemented.** Reverse charge mechanism (RCM) is a Phase 5 feature for specific industries (transport, legal services). The `Invoice` schema will need a `reverseCharge: Boolean` field.

## 9. E-Invoicing (IRN/QR)

**Not implemented.** Mandatory for businesses with turnover >₹5 crore. Phase 6 feature. Requires:
- IRN generation via NIC portal
- QR code on invoice
- Digital signature

## 10. Cess

**Not implemented.** `DocumentTotals.cessTotal` is always 0. Cess applies to sin goods (tobacco, aerated drinks) and luxury items. Phase 5 feature.

## 11. Tax Rates Management

Tax rates are stored per-business in the `TaxRate` model:
```prisma
model TaxRate {
  id          String   @id @default(cuid())
  businessId  String
  name        String   // "GST 18%"
  rate        Float    // 18.0
  cgst        Float    @default(9.0)
  sgst        Float    @default(9.0)
  igst        Float    @default(18.0)
  isActive    Boolean  @default(true)
}
```

The seed creates 5 default rates (0%, 5%, 12%, 18%, 28%). Businesses can add custom rates (e.g., 0.25% for gold).

**Note:** The `cgst`/`sgst`/`igst` fields are stored but **not used in calculation** — `computeLine` derives them from `rate` and `supplyType`. This is a redundancy to fix in Phase 3 (either use the stored splits or drop them).

## 12. Testing Requirements

The GST engine is the **most critical business logic** in MedBill. Test coverage must be 100%.

### 12.1 Unit Test Cases (required)

**`computeLine`:**
- Intra-state: each GST rate (0, 0.25, 3, 5, 12, 18, 28)
- Inter-state: each GST rate
- With discount % only
- With discount amount only
- With both discount % and amount
- Zero quantity
- Negative quantity (clamped)
- Negative price (clamped)
- Discount % > 100 (clamped)
- Discount amount > gross (taxable = 0)
- Zero tax rate

**`computeDocument`:**
- Single line
- Multiple lines
- Mixed tax rates
- Round-off positive (rounds up)
- Round-off negative (rounds down)
- Round-off zero (already integer)
- Empty lines array (should return zero totals)

**`isValidGstin`:**
- Valid: `27ABCDE1234F1Z5`
- Valid: `29AAACI5432P1Z9`
- Invalid: wrong length
- Invalid: lowercase
- Invalid: missing Z
- Invalid: special characters
- Empty/null/undefined (returns true — optional)

**`stateCodeFromGstin`:**
- Valid GSTIN → returns first 2 chars
- Short string → returns null
- Non-digit prefix → returns null
- Empty → returns null

**`deriveSupplyType`:**
- Same state code → "intra"
- Different state codes → "inter"
- Missing business state → "intra"
- Missing party state → "intra"
- Both missing → "intra"

### 12.2 Property-Based Tests (recommended)

Use `fast-check` to verify:
- `computeLine` total >= taxable (tax is non-negative)
- `computeDocument` grandTotal = round(taxableValue + totalTax)
- `r2(r2(x) + r2(y))` is associative within 0.01 tolerance

## 13. Known Limitations

1. **No checksum validation** on GSTIN (format only)
2. **No cess** support
3. **No reverse charge** mechanism
4. **No e-invoicing** (IRN/QR)
5. **No round-off per line** (only document-level)
6. **Float storage** — see `DATABASE_AUDIT.md` §2.1. Critical to fix before scale.

## 14. Future Enhancements (Backlog)

- GSTIN checksum validation
- Cess support
- RCM (reverse charge)
- E-invoicing (IRN/QR) via NIC API
- Place of supply editor
- HSN autocomplete from master list
- GST rate lookup by HSN
- GSTR-2B reconciliation (purchase matching)
- GSTR-3B auto-generation

---

**Related:** `src/lib/gst.ts`, `04_API_SPECIFICATION.md` (GST endpoint), `10_BUSINESS_RULES.md` (GST rules)
