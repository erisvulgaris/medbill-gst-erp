# 03 — Database Specification

> **Status:** Source of truth for the data model
> **Related:** `DATABASE_AUDIT.md`, ADR-002 (Prisma), ADR-003 (SQLite), `prisma/schema.prisma`

## 1. Overview

- **Engine:** SQLite (file: `db/custom.db`)
- **ORM:** Prisma 6.19.2
- **Models:** 22
- **Indexes:** 38 (`@@index` + `@unique`)
- **Cascade:** All child tables cascade-delete from `Business`
- **Audit fields:** `createdAt`, `updatedAt`, `deletedAt` on entity models

## 2. Entity Relationship Diagram (textual)

```
User
├── Business (owner) ────┐
│                        │
├── BusinessMember ──── Business
│                        │
│                   ├── Branch
│                   │   └── Warehouse
│                   ├── Category (self-ref tree)
│                   ├── Unit
│                   ├── TaxRate
│                   ├── Product ── Category, Unit, TaxRate
│                   │   └── StockMovement ── Warehouse
│                   ├── Party
│                   │   ├── Invoice ── Branch, Party
│                   │   │   ├── InvoiceItem ── Product
│                   │   │   └── Payment
│                   │   ├── Purchase ── Branch, Party
│                   │   │   ├── PurchaseItem ── Product
│                   │   │   └── Payment
│                   │   └── Quotation ── Party
│                   │       └── QuotationItem ── Product
│                   ├── Expense
│                   ├── Notification
│                   └── AuditLog
└── Session
```

## 3. Models

### 3.1 User
Authentication identity. One user can belong to multiple businesses.

| Field | Type | Notes |
|-------|------|-------|
| id | String @id | cuid |
| name | String | Required |
| email | String @unique | Required |
| phone | String? | Optional |
| passwordHash | String? | bcrypt (Phase 3) |
| avatarUrl | String? | |
| authProvider | String | `email` \| `google` \| `phone` |
| status | String | `active` \| `suspended` |
| createdAt, updatedAt, deletedAt | DateTime | Audit |

### 3.2 Session
JWT/session storage (for database session strategy if needed).

| Field | Type | Notes |
|-------|------|-------|
| id | String @id | |
| userId | String | FK → User |
| deviceInfo | String? | Browser/OS |
| ip | String? | |
| expiresAt | DateTime | |
| revokedAt | DateTime? | Set on logout |

### 3.3 Business
Tenant root. All data belongs to a Business.

| Field | Type | Notes |
|-------|------|-------|
| id | String @id | |
| name | String | Display name |
| legalName | String? | Legal entity name |
| gstin | String? | 15-char GSTIN (Phase 3: @unique) |
| pan | String? | 10-char PAN |
| industry | String | `retail` \| `wholesale` \| ... |
| businessType | String | `proprietorship` \| `partnership` \| ... |
| modules | String | JSON: `{ pos, inventory, gst, ... }` |
| invoicePrefix | String | Default `INV` |
| invoiceSeq | Int | Next invoice sequence |
| quotationPrefix | String | Default `QT` |
| quotationSeq | Int | |
| stateCode | String? | First 2 digits of GSTIN |
| fyStartMonth | Int | Default 4 (April) |
| ownerId | String | FK → User |

### 3.4 BusinessMember
User ↔ Business role junction.

| Field | Type | Notes |
|-------|------|-------|
| id | String @id | |
| businessId | String | FK |
| userId | String | FK |
| role | String | `owner` \| `manager` \| `cashier` \| ... (13 roles) |
| status | String | `active` \| `inactive` |

**Constraint:** `@@unique([businessId, userId])` — one membership per pair.

### 3.5 Branch
Multi-store support.

| Field | Type | Notes |
|-------|------|-------|
| id | String @id | |
| businessId | String | FK |
| name | String | |
| code | String? | e.g., `MB` |
| isHead | Boolean | Default false |
| gstin | String? | Branch-specific GSTIN |
| state, stateCode | String? | |

### 3.6 Category
Product taxonomy. Self-referencing for sub-categories.

| Field | Type | Notes |
|-------|------|-------|
| id | String @id | |
| businessId | String | FK |
| name | String | |
| parentId | String? | FK → Category (self-ref) |

**Index:** `@@index([businessId, parentId])`

### 3.7 Unit
Measurement unit (Pcs, Kg, Box, Ltr, etc.).

| Field | Type | Notes |
|-------|------|-------|
| id | String @id | |
| businessId | String | FK |
| name | String | `Pcs` |
| symbol | String? | `pc` |

**Constraint:** `@@unique([businessId, name])`

### 3.8 TaxRate
GST slab per business.

| Field | Type | Notes |
|-------|------|-------|
| id | String @id | |
| businessId | String | FK |
| name | String | `GST 18%` |
| rate | Float | 18.0 |
| cgst | Float | 9.0 |
| sgst | Float | 9.0 |
| igst | Float | 18.0 |
| isActive | Boolean | |

**Constraint:** `@@unique([businessId, name])`

### 3.9 Product
Inventory item.

| Field | Type | Notes |
|-------|------|-------|
| id | String @id | |
| businessId | String | FK |
| name | String | |
| sku | String? | |
| barcode | String? | |
| hsn | String? | HSN/SAC code |
| categoryId, unitId, taxId | String? | FKs |
| taxRate | Float | Cached GST % |
| purchasePrice | Float | Cost |
| salePrice | Float | Selling price |
| mrp, wholesalePrice | Float | |
| minStock | Float | Reorder threshold |
| reorderLevel | Float | |
| stock | Float | Current quantity |
| openingStock | Float | Initial |
| batchTracked, expiryTracked, serialTracked | Boolean | |
| isActive | Boolean | |

**Indexes:** `@@index([businessId, name])`, `[businessId, barcode]`, `[businessId, sku]`

### 3.10 Warehouse
Godown / storage location.

| Field | Type | Notes |
|-------|------|-------|
| id | String @id | |
| businessId | String | FK |
| branchId | String? | FK → Branch |
| name | String | |
| code | String? | |

### 3.11 StockMovement
Immutable stock ledger. One row per stock change.

| Field | Type | Notes |
|-------|------|-------|
| id | String @id | |
| businessId | String | FK |
| productId | String | FK → Product |
| warehouseId | String? | FK → Warehouse |
| type | String | `purchase` \| `sale` \| `transfer` \| `adjustment` \| `opening` \| `return` |
| direction | String | `in` \| `out` |
| quantity | Float | |
| refType | String? | `invoice` \| `purchase` \| `manual` |
| refId | String? | |

**Indexes:** `@@index([businessId, productId])`, `@@index([createdAt])`

### 3.12 Party
Customer / supplier (unified).

| Field | Type | Notes |
|-------|------|-------|
| id | String @id | |
| businessId | String | FK |
| type | String | `customer` \| `supplier` \| `both` |
| name | String | |
| gstin | String? | |
| phone, email, whatsapp | String? | |
| addressLine1, city, state, stateCode, pincode | String? | |
| openingBalance | Float | + = they owe us |
| creditLimit | Float | Max outstanding |
| creditDays | Int | Payment terms |
| isBlacklisted | Boolean | |

**Indexes:** `[businessId, type]`, `[businessId, name]`, `[businessId, phone]`

### 3.13 Invoice
Sales document.

| Field | Type | Notes |
|-------|------|-------|
| id | String @id | |
| businessId | String | FK |
| branchId | String? | FK |
| number | String | `INV-0001` |
| seq | Int | |
| type | String | `tax_invoice` \| `pos` \| `estimate` \| ... |
| status | String | `draft` \| `unpaid` \| `partial` \| `paid` \| `overdue` \| `cancelled` |
| partyId | String? | FK |
| partyName | String | Snapshot |
| partyGstin, partyStateCode | String? | Snapshot |
| invoiceDate | DateTime | |
| dueDate | DateTime? | |
| supplyType | String | `intra` \| `inter` |
| subtotal, discountTotal, taxableValue | Float | |
| cgstTotal, sgstTotal, igstTotal, cessTotal | Float | |
| roundOff | Float | |
| grandTotal | Float | Integer (rounded) |
| paidAmount, balance | Float | |
| notes, terms | String? | |
| placeOfSupply | String? | |

**Constraint:** `@@unique([businessId, number])`
**Indexes:** `[businessId, invoiceDate]`, `[businessId, status]`, `[businessId, partyId]`

### 3.14 InvoiceItem
Line item (snapshot at invoice time).

| Field | Type | Notes |
|-------|------|-------|
| id | String @id | |
| invoiceId | String | FK (cascade) |
| productId | String? | FK |
| name | String | Snapshot |
| hsn | String? | Snapshot |
| quantity | Float | |
| unit | String? | |
| price | Float | Per-unit |
| discountPct, discountAmt | Float | |
| taxRate | Float | |
| taxable, cgst, sgst, igst, total | Float | Computed |

### 3.15 Purchase, PurchaseItem, Quotation, QuotationItem
Same structure as Invoice/InvoiceItem, adjusted for purchase/quotation semantics. See schema for details.

### 3.16 Payment
Receipt or payment.

| Field | Type | Notes |
|-------|------|-------|
| id | String @id | |
| businessId | String | FK |
| type | String | `receipt` (in) \| `payment` (out) |
| mode | String | `cash` \| `upi` \| `card` \| `bank` \| `cheque` \| `rtgs` |
| amount | Float | |
| date | DateTime | |
| invoiceId | String? | FK (if linked) |
| purchaseId | String? | FK |
| partyId | String? | FK |
| reference | String? | UTR / cheque no |
| note | String? | |

**Indexes:** `[businessId, date]`, `[invoiceId]`, `[purchaseId]`

### 3.17 Expense

| Field | Type | Notes |
|-------|------|-------|
| id | String @id | |
| businessId | String | FK |
| category | String | `rent` \| `salary` \| `utilities` \| `travel` \| `marketing` \| `misc` |
| amount | Float | |
| date | DateTime | |
| mode | String | |
| vendor | String? | |
| note | String? | |

**Indexes:** `[businessId, date]`, `[businessId, category]`

### 3.18 Notification

| Field | Type | Notes |
|-------|------|-------|
| id | String @id | |
| businessId | String | FK |
| title | String | |
| body | String | |
| kind | String | `info` \| `success` \| `warning` \| `error` \| `stock` \| `payment` \| `gst` |
| link | String? | |
| read | Boolean | Default false |

**Index:** `[businessId, read, createdAt]`

### 3.19 AuditLog

| Field | Type | Notes |
|-------|------|-------|
| id | String @id | |
| businessId | String | FK |
| userId | String? | FK |
| action | String | `create` \| `update` \| `delete` \| `payment` \| ... |
| entity | String | `invoice` \| `party` \| ... |
| entityId | String? | |
| summary | String? | Human-readable |
| metadata | String? | JSON string |
| ip | String? | |

**Indexes:** `[businessId, createdAt]`, `[entity, entityId]`

**Immutable:** No `updatedAt` / `deletedAt` — append-only.

## 4. Data Types

| Prisma Type | SQLite Storage | Notes |
|-------------|----------------|-------|
| String | TEXT | |
| Int | INTEGER | |
| Float | REAL | ⚠️ Money precision risk — migrate to Decimal (P0) |
| Boolean | INTEGER (0/1) | |
| DateTime | TEXT (ISO 8601) | |
| Decimal | REAL (SQLite limitation) | Use `@db.Decimal(12,2)` |

## 5. Indexes

38 total. Key indexes:
- All `businessId` FKs indexed for tenant isolation
- `[businessId, name]` on Product/Party for search
- `[businessId, barcode]` / `[businessId, sku]` on Product for POS lookup
- `[businessId, invoiceDate]` on Invoice for date-range reports
- `[businessId, status]` on Invoice for filtered lists

## 6. Cascade Rules

All `businessId` relations use `onDelete: Cascade`. Deleting a Business cascades to all 16 child tables.

**Warning:** Never expose `DELETE /api/business` without confirmation + backup.

## 7. Migrations

**Current state:** No migration history. Schema applied via `db:push`.

**Phase 3 target:** Initialize migrations:
```bash
mkdir -p prisma/migrations/0_init
bunx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0_init/migration.sql
```

Then use `prisma migrate deploy` in production. See `DATABASE_AUDIT.md` §2.2.

## 8. Seed Data

`POST /api/seed` (idempotent) creates:
- 1 Business (Shree Balaji Traders, Mumbai)
- 1 User (Rahul Sharma, owner)
- 1 Branch + 1 Warehouse
- 6 Units, 5 TaxRates, 6 Categories
- 15 Products (realistic Indian items)
- 7 Parties (customers + suppliers)
- 16 Invoices (last 68 days, mix of paid/unpaid)
- 4 Purchases
- 8 Expenses
- 5 Notifications
- 1 AuditLog entry

## 9. Backup & Restore

**Backup:** Copy `db/custom.db` to `db/backups/{timestamp}.db`
**Restore:** Stop server, copy backup over `db/custom.db`, restart
**Schedule:** Daily cron (planned Phase 3)

## 10. Known Issues

See `DATABASE_AUDIT.md` for the full list. Critical:
1. 78 Float columns storing money (P0: migrate to Decimal)
2. No migration history (P0: initialize)
3. Missing `createdBy`/`updatedBy` FKs (P1)
4. `Business.gstin` not `@unique` (P1)
