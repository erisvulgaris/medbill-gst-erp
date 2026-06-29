# MedBill — Database Audit Report

> **Audit date:** 2026-06-29
> **Database:** SQLite via Prisma 6.19.2
> **Schema file:** `prisma/schema.prisma`
> **Models:** 22

## Executive Summary

The schema is **well-structured and normalized** for an MSME billing ERP. All 22 models have at least one index, foreign keys use `onDelete: Cascade` consistently for tenant isolation, and audit fields (`createdAt`, `updatedAt`, `deletedAt`) are present on entity models. However, there are **critical production concerns**:

| Severity | Finding |
|----------|---------|
| 🔴 Critical | **No migration history** — schema managed with `db:push` only; no rollback path |
| 🔴 Critical | **Money stored as `Float`** (78 columns) — floating-point rounding errors will corrupt accounting |
| 🟠 High | **No `createdBy`/`updatedBy`** on most models despite PRD requiring it |
| 🟠 High | **Soft-delete inconsistent** — 9 models lack `deletedAt` (line items, payments, audit log) |
| 🟠 High | **No DB-level CHECK constraints** — Prisma/SQLite can't enforce `quantity >= 0` or `balance >= 0` |
| 🟡 Medium | **`Business.gstin` not `@unique`** — duplicate GSTINs allowed |
| 🟡 Medium | **No composite index** on common query patterns (e.g. `[businessId, status, invoiceDate]`) |

---

## 1. Model Inventory

| # | Model | Purpose | Indexes | Soft-delete | Audit fields |
|---|-------|---------|---------|-------------|--------------|
| 1 | User | Auth identity | 1 | ✅ | ✅ |
| 2 | Session | JWT/session storage | 1 | ❌ | createdAt only |
| 3 | Business | Tenant root | 1 | ✅ | ✅ |
| 4 | BusinessMember | User↔Business role | 1 | ❌ | ✅ |
| 5 | Branch | Multi-store | 1 | ✅ | ✅ |
| 6 | Category | Product taxonomy (self-ref) | 1 | ✅ | ✅ |
| 7 | Unit | Measure unit | 0 (has @unique) | ❌ | ✅ |
| 8 | TaxRate | GST slab | 0 (has @unique) | ❌ | ✅ |
| 9 | Product | Inventory item | 3 | ✅ | ✅ |
| 10 | Warehouse | Godown | 1 | ✅ | ✅ |
| 11 | StockMovement | Stock ledger | 2 | ❌ | createdAt only |
| 12 | Party | Customer/supplier | 3 | ✅ | ✅ |
| 13 | Invoice | Sales doc | 3 | ✅ | ✅ |
| 14 | InvoiceItem | Line item | 1 | ❌ | — |
| 15 | Purchase | Purchase doc | 2 | ✅ | ✅ |
| 16 | PurchaseItem | Line item | 1 | ❌ | — |
| 17 | Quotation | Quote doc | 1 | ✅ | ✅ |
| 18 | QuotationItem | Line item | 1 | ❌ | — |
| 19 | Payment | Receipt/payment | 3 | ❌ | ✅ |
| 20 | Expense | Business spend | 2 | ✅ | ✅ |
| 21 | Notification | In-app alert | 1 | ❌ | createdAt only |
| 22 | AuditLog | Activity log | 2 | ❌ | createdAt only |

**Total:** 38 index/unique constraints across 22 models.

---

## 2. Critical Issues

### 2.1 🔴 Money Stored as `Float` (78 columns)

**Impact:** Float (IEEE 754 double) cannot represent decimal currency exactly. `0.1 + 0.2 = 0.30000000000000004`. Over thousands of invoices, rounding drift will cause ledger imbalances and GST mismatches.

**Affected columns (sample):**
- `Invoice.subtotal`, `taxableValue`, `cgstTotal`, `sgstTotal`, `igstTotal`, `grandTotal`, `paidAmount`, `balance`, `roundOff`
- `InvoiceItem.price`, `taxable`, `cgst`, `sgst`, `igst`, `total`, `discountAmt`
- `Product.purchasePrice`, `salePrice`, `mrp`, `wholesalePrice`
- `Payment.amount`, `Expense.amount`
- `Party.openingBalance`, `creditLimit`

**Fix:** Migrate all money columns to `Decimal @db.Decimal(12,2)` (Prisma `Decimal` type). For SQLite, Prisma maps `Decimal` to `REAL` natively, but storing as **integer paise** (multiply by 100) is the safest approach for SQLite. Recommended migration:
1. Add `Int` paise columns (`grandTotalPaise`, etc.)
2. Backfill from Float columns
3. Drop Float columns
4. Update all read/write paths

Alternatively, keep `Decimal` type and accept SQLite's REAL storage — acceptable for MSME scale (<10M rows) but document the limitation.

### 2.2 🔴 No Migration History

**Current state:** `prisma/migrations/` does not exist. Schema is applied with `bun run db:push`, which:
- Does not generate migration files
- Cannot roll back
- Cannot reproduce a schema state
- Cannot be used in CI/CD

**Fix:** Initialize migration baseline:
```bash
mkdir -p prisma/migrations/0_init
bunx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0_init/migration.sql
echo '{"id":"0_init","name":"init","timestamp":"20260629000000"}' > prisma/migrations/migration_lock.toml
```
Then use `bun run db:migrate` going forward. Never use `db:push` in production.

### 2.3 🟠 Missing `createdBy` / `updatedBy`

The PRD requires every table to include `created_by` and `updated_by`. Current state:
- `Invoice`, `Purchase`, `Quotation` have `createdBy String?` (a name string, not a FK to User)
- `Expense`, `Payment` have `createdBy String?`
- **No model has `updatedBy`**
- **No model links `createdBy` to `User.id` as a relation**

**Fix:** Add `createdById String?` + `createdBy User? @relation("CreatedItems")` to all entity models. Same for `updatedById`.

---

## 3. Soft-Delete Consistency

**9 models lack `deletedAt`:** Session, BusinessMember, StockMovement, InvoiceItem, PurchaseItem, QuotationItem, Payment, Notification, AuditLog.

**Assessment:**
- ✅ **Line items** (InvoiceItem, PurchaseItem, QuotationItem) — correct to omit. They cascade-delete with their parent. Soft-deleting items without the parent is meaningless.
- ✅ **StockMovement** — correct to omit. Movements are an immutable ledger; never soft-deleted.
- ✅ **AuditLog** — correct to omit. Audit logs are immutable.
- ⚠️ **Payment** — questionable. Deleting a payment restores invoice balance, but a soft-delete would keep the audit trail. Currently `DELETE /api/invoices/[id]` does `db.payment.deleteMany({ where: { invoiceId } })` — **hard deletes payments**, losing history.
- ⚠️ **Session** — acceptable; expired sessions can be purged.
- ⚠️ **BusinessMember** — should be soft-deletable to preserve "former member" history.
- ⚠️ **Notification** — acceptable; read notifications can be purged.

**Fix:** Add `deletedAt DateTime?` to `Payment` and `BusinessMember`. Update `DELETE /api/invoices/[id]` to soft-delete payments (`deletedAt: new Date()`) and reverse their effect on invoice balance instead of hard-deleting.

---

## 4. Index Analysis

### 4.1 Adequately Indexed
- `Product`: `[businessId, name]`, `[businessId, barcode]`, `[businessId, sku]` — excellent for search
- `Party`: `[businessId, type]`, `[businessId, name]`, `[businessId, phone]` — excellent
- `Invoice`: `[businessId, invoiceDate]`, `[businessId, status]`, `[businessId, partyId]` — excellent
- `Payment`: `[businessId, date]`, `[invoiceId]`, `[purchaseId]` — good
- `StockMovement`: `[businessId, productId]`, `[createdAt]` — good

### 4.2 Missing Indexes
| Table | Missing index | Query pattern |
|-------|---------------|---------------|
| Invoice | `[businessId, status, invoiceDate]` | Dashboard "recent unpaid invoices" |
| Invoice | `[businessId, dueDate]` | Overdue calculation |
| Purchase | `[businessId, partyId, invoiceDate]` | Supplier statement |
| Quotation | `[businessId, status]` | Filter by status |
| AuditLog | `[businessId, entity, action]` | Audit filtered queries |
| Expense | `[businessId, category, date]` | Category report |

### 4.3 Unique Constraints — Verified
| Constraint | Status |
|------------|--------|
| `User.email @unique` | ✅ |
| `BusinessMember [businessId, userId] @@unique` | ✅ |
| `Unit [businessId, name] @@unique` | ✅ |
| `TaxRate [businessId, name] @@unique` | ✅ |
| `Invoice [businessId, number] @@unique` | ✅ |
| `Purchase [businessId, number] @@unique` | ✅ |
| `Quotation [businessId, number] @@unique` | ✅ |

### 4.4 Missing Unique Constraints
| Field | Issue |
|-------|-------|
| `Business.gstin` | Not unique — duplicate GSTINs allowed across businesses. Should be `@unique` (nullable unique allowed in SQLite) |
| `Product.barcode` | Not unique within a business — `@@unique([businessId, barcode])` recommended |
| `Product.sku` | Not unique within a business — `@@unique([businessId, sku])` recommended |
| `Party.phone` | Not unique — acceptable (multiple parties can share a landline) |

---

## 5. Foreign Key & Cascade Review

All foreign keys use `onDelete: Cascade` from the `businessId` root. This means **deleting a Business cascades to all 16 child tables**. This is correct for tenant isolation but dangerous — a single `db.business.delete()` wipes the entire tenant.

**Recommendation:** Add an explicit "purge business" admin flow with confirmation and a backup step. Never expose business deletion to standard API routes.

**Cascade chain verified:**
```
Business
├── Branch (Cascade)
│   ├── Warehouse (Cascade via business)
│   └── Invoice/Purchase (Cascade via business)
├── Party (Cascade)
├── Product (Cascade)
│   └── StockMovement (Cascade)
├── Invoice (Cascade)
│   ├── InvoiceItem (Cascade)
│   └── Payment (Cascade)
├── Purchase (Cascade)
│   ├── PurchaseItem (Cascade)
│   └── Payment (Cascade)
├── Quotation (Cascade)
│   └── QuotationItem (Cascade)
├── Expense (Cascade)
├── Payment (Cascade)
├── Notification (Cascade)
├── AuditLog (Cascade)
├── Category (Cascade)
├── Unit (Cascade)
├── TaxRate (Cascade)
└── BusinessMember (Cascade)
```

**Issue:** `Invoice.branchId` and `Purchase.branchId` are nullable FKs but the `Branch` model doesn't define a `branches` relation back. The relation exists one-way. This works in Prisma but is unusual.

---

## 6. Data Type Concerns

### 6.1 Float vs Decimal (see §2.1)
78 Float columns storing money. **Critical.**

### 6.2 String-encoded Enums
SQLite doesn't support native enums, so Prisma encodes them as `String` with comments:
```prisma
status String @default("unpaid") // draft | unpaid | partial | paid | cancelled | overdue
```
**Issue:** No DB-level constraint. Invalid values like `"banana"` can be written. Application logic must validate.

**Fix:** Add application-layer zod enums + consider a `CHECK` constraint via raw migration:
```sql
ALTER TABLE Invoice ADD CONSTRAINT chk_status CHECK (status IN ('draft','unpaid','partial','paid','cancelled','overdue'));
```
(Note: SQLite CHECK support is limited; validate in app layer instead.)

### 6.3 JSON in String Columns
- `Business.modules` — `String @default("{}")` storing JSON. Parsed with `JSON.parse()` in `auth.ts`. No validation that the JSON matches the `ModulesConfig` shape.
- `AuditLog.metadata` — `String?` storing JSON. Same risk.

**Fix:** Add zod schemas for these JSON blobs and validate on read/write.

### 6.4 Nullable Fields Audit
Money fields defaulting to `0` should arguably be non-nullable with `@default(0)`. Most already are. ✅

---

## 7. Naming Consistency

| Check | Status |
|-------|--------|
| All models use PascalCase | ✅ |
| All fields use camelCase | ✅ |
| All relations use singular relation name | ✅ (e.g. `business Business`, not `businesses`) |
| All `@id` fields are `String @id @default(cuid())` | ✅ |
| All date fields use `DateTime` | ✅ |
| Audit field naming (`createdAt`, `updatedAt`, `deletedAt`) | ✅ consistent |

**Inconsistency:** `Business.invoicePrefix` vs `Business.quotationPrefix` — good. But `Invoice.number` vs `Purchase.invoiceNumber` (supplier's bill number) — confusing. Consider renaming `Purchase.invoiceNumber` to `supplierBillNumber`.

---

## 8. Migration & Backup Strategy

### 8.1 Current State (Critical Gap)
- No `prisma/migrations/` directory
- Schema drift applied via `db:push`
- No seed versioning (`seed/route.ts` is a single idempotent POST)
- No backup mechanism for the SQLite file

### 8.2 Required Setup
1. **Initialize migrations** (see §2.2)
2. **Add `prisma/seed.ts`** as a standalone script (not an API route)
3. **Add backup script** `scripts/backup.ts` that copies `db/custom.db` to `db/backups/{timestamp}.db`
4. **Add `.gitignore`** entry for `db/*.db` and `db/backups/`
5. **Document restore procedure** in `03_DATABASE_SPECIFICATION.md`

---

## 9. Recommendations Summary

| Priority | Action |
|----------|--------|
| P0 | Initialize Prisma migrations; stop using `db:push` |
| P0 | Plan Float→Decimal migration for money columns |
| P0 | Add `createdById`/`updatedById` FKs to entity models |
| P1 | Add `deletedAt` to `Payment` and `BusinessMember` |
| P1 | Add missing composite indexes (§4.2) |
| P1 | Add `@@unique([businessId, barcode])` and `@@unique([businessId, sku])` to Product |
| P1 | Make `Business.gstin` `@unique` |
| P2 | Add zod validation for `Business.modules` and `AuditLog.metadata` JSON |
| P2 | Add backup script + schedule |
| P2 | Add DB-level CHECK constraints where SQLite supports |

---

**This audit feeds directly into `03_DATABASE_SPECIFICATION.md` (the canonical schema doc) and `19_BACKLOG.md` (remediation tracking).**
