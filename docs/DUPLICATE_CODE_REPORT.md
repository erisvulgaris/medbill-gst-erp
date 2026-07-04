# Duplicate Code Report

> **Audit date:** 2026-06-30
> **Method:** grep for function definitions across files
> **Principle:** Evidence-based. Every duplicate includes file paths and line counts.

## Executive Summary

| Duplicate | Occurrences | Total LOC | Est. Savings |
|-----------|-------------|-----------|-------------|
| `StatCard` | 7 | ~140 LOC | ~110 LOC |
| `StatusBadge` | 3 | ~45 LOC | ~30 LOC |
| `Field` | 4 | ~40 LOC | ~30 LOC |
| `Row` (label+value) | 3 | ~15 LOC | ~10 LOC |
| Invoice/Quotation editor | 2 (70% similar) | ~720 LOC | ~300 LOC |
| **Total** | — | ~920 LOC | **~480 LOC** |

---

## 1. `StatCard` — 7 Duplicates

**Pattern:** Icon + label + value card with accent color.

**Found in:**
| File | LOC | Accent variants |
|------|-----|-----------------|
| `views/inventory-view.tsx` | ~12 | primary, emerald, amber, red |
| `views/parties-view.tsx` | ~12 | primary, emerald, amber, purple |
| `views/purchases-view.tsx` | ~12 | primary, amber, purple |
| `views/expenses-view.tsx` | ~12 | primary, amber, red |
| `views/reports-view.tsx` | ~15 | primary, emerald, amber, red, muted, purple |
| `views/audit-view.tsx` | ~12 | primary, emerald, amber, red |
| `views/quotations-view.tsx` | ~12 | primary, emerald, amber, purple |

**Total duplicated LOC:** ~87

**Consolidation:**
```tsx
// src/components/app/stat-card.tsx
export function StatCard({ icon: Icon, label, value, accent }: {
  icon: LucideIcon; label: string; value: string;
  accent: "primary" | "emerald" | "amber" | "red" | "purple" | "neutral";
}) {
  const map = { primary: "...", emerald: "...", ... }[accent];
  return (
    <Card className="p-4 shadow-card border-border/50">
      <div className={cn("grid place-items-center w-8 h-8 rounded-lg mb-2", map)}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-[11px] text-muted-foreground font-medium">{label}</p>
      <p className="text-[18px] font-bold tnum tracking-tight mt-0.5">{value}</p>
    </Card>
  );
}
```

**Estimated savings:** ~75 LOC (7 definitions → 1)

---

## 2. `StatusBadge` — 3 Duplicates

**Pattern:** Status text with color mapping (paid=emerald, unpaid=amber, etc.)

**Found in:**
| File | LOC | Statuses |
|------|-----|----------|
| `views/dashboard-view.tsx` | ~15 | paid, unpaid, partial, overdue, draft, cancelled |
| `views/sales-view.tsx` | ~15 | same |
| `app/invoice-viewer.tsx` | ~15 | same |

**Total duplicated LOC:** ~45

**Consolidation:**
```tsx
// src/components/app/status-badge.tsx
const STATUS_COLORS = {
  paid: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  unpaid: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
  partial: "bg-blue-500/12 text-blue-700 dark:text-blue-300",
  overdue: "bg-red-500/12 text-red-700 dark:text-red-300",
  draft: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground line-through",
};
export function StatusBadge({ status }: { status: string }) { ... }
```

**Estimated savings:** ~30 LOC

---

## 3. `Field` — 4 Duplicates

**Pattern:** Label + children + optional hint/required marker.

**Found in:**
| File | LOC |
|------|-----|
| `views/inventory-view.tsx` | ~10 |
| `views/parties-view.tsx` | ~10 |
| `views/settings-view.tsx` | ~10 |
| `app/onboarding.tsx` | ~10 |

**Total duplicated LOC:** ~40

**Consolidation:**
```tsx
// src/components/app/field.tsx
export function Field({ label, required, hint, hintTone, children, className }: {
  label: string; required?: boolean; hint?: string;
  hintTone?: "error"; children: React.ReactNode; className?: string;
}) { ... }
```

**Estimated savings:** ~30 LOC

---

## 4. `Row` (Label + Value) — 3 Duplicates

**Pattern:** Flex row with label on left, value on right.

**Found in:**
| File | LOC |
|------|-----|
| `app/invoice-viewer.tsx` | ~5 |
| `views/reports-view.tsx` | ~5 |
| `app/quotation-viewer.tsx` | ~5 |

**Total duplicated LOC:** ~15

**Consolidation:** Minor — could extract but low ROI.

---

## 5. Invoice Editor ↔ Quotation Editor — 70% Similar

**Pattern:** Document editor with party picker, product picker, line table, totals.

| Component | LOC | Shared with |
|-----------|-----|-------------|
| `app/invoice-editor.tsx` | 440 | Quotation editor |
| `app/quotation-editor.tsx` | 281 | Invoice editor |

**Shared structure:**
- Party combobox (identical)
- Product combobox (identical)
- Line item table (identical columns: Item, Qty, Rate, Disc%, GST%, Taxable, Tax, Total)
- Totals panel (identical: Subtotal, Taxable, CGST/SGST/IGST, RoundOff, GrandTotal)
- Notes + Terms textareas (identical)

**Differences:**
- Invoice: due date, supply type banner
- Quotation: valid-until date, subject field
- Save endpoint: `/api/invoices` vs `/api/quotations`
- Title: "Create Tax Invoice" vs "Create Quotation"

**Consolidation:**
```tsx
// src/components/app/document-editor.tsx
export function DocumentEditor({ mode }: { mode: "invoice" | "quotation" }) {
  // Shared: party picker, product picker, line table, totals
  // Mode-specific: date fields, endpoint, title
}
```

**Estimated savings:** ~300 LOC (720 → ~420)

---

## 6. Duplicated Validation Logic

**Pattern:** GSTIN, phone, email validation duplicated between client and server.

**Before Phase 5:** Client-side `isValidGstin()` in `gst.ts`, no server validation.

**After Phase 5 (partial):** `src/lib/schemas/` has zod validators, but routes don't use them yet.

**Consolidation:** Routes should use `createInvoiceSchema.safeParse()` — single source of truth.

**Status:** 🟡 Schemas created, 0/18 routes refactored.

---

## 7. Duplicated API Envelope Logic

**Pattern:** Each route manually constructs `NextResponse.json(...)`.

**Before Phase 3:** 18 routes × ~3 responses each = 54 manual response constructions.

**After Phase 3 (partial):** `apiSuccess()` and `apiList()` helpers exist, but 0/18 routes use them.

**Consolidation:** Wrap routes in `apiHandler()`, return `apiSuccess(data)`.

**Status:** 🟡 Framework created, 0/18 routes refactored.

---

## 8. Consolidation Priority

| # | Duplicate | Occurrences | Savings | Priority | Effort |
|---|-----------|-------------|---------|----------|--------|
| 1 | `StatCard` → shared | 7 | 75 LOC | P1 | S |
| 2 | `StatusBadge` → shared | 3 | 30 LOC | P1 | S |
| 3 | `Field` → shared | 4 | 30 LOC | P1 | S |
| 4 | `DocumentEditor` → shared | 2 | 300 LOC | P2 | M |
| 5 | Routes → `apiHandler` | 18 | ~100 LOC | P1 | M |
| 6 | Routes → zod schemas | 18 | ~50 LOC | P1 | M |
| 7 | `Row` → shared | 3 | 10 LOC | P3 | XS |

**Total estimated savings:** ~600 LOC (4% of codebase)

---

## 9. Measurement Commands

```bash
# Find StatCard duplicates
grep -rln "function StatCard" src/components/

# Find StatusBadge duplicates
grep -rln "function StatusBadge\|StatusPill" src/components/

# Find Field duplicates
grep -rln "function Field" src/components/

# Find apiSuccess/apiList usage (should be 0 currently)
grep -rln "apiSuccess\|apiList" src/app/api/

# Find safeParse usage (should be 0 currently)
grep -rln "safeParse" src/app/api/
```

---

**This report identifies ~480 LOC of duplicate code across 19 definitions. Consolidation is tracked as P1-P2 in `19_BACKLOG.md`.**
