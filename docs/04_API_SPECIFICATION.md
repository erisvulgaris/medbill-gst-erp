# 04 — API Specification

> **Status:** Source of truth for the API contract
> **Related:** `API_AUDIT.md`, ADR-005, `03_DATABASE_SPECIFICATION.md`
> **Base URL:** `/api`

## 1. Conventions

### 1.1 HTTP Methods
| Method | Operation | Success Code |
|--------|-----------|-------------|
| GET | Read (list or single) | 200 |
| POST | Create | 201 (currently 200 — Phase 3 fix) |
| PATCH | Partial update | 200 |
| DELETE | Soft delete | 204 (currently 200) |

### 1.2 Response Envelope (Phase 3 target)
```ts
// List
{ items: T[], meta: { total, limit, cursor, hasMore } }
// Single
{ data: T }
// Mutation
{ data: T, ok: true }
// Error
{ error: { code, message, details? }, requestId }
```

**Current state:** Inconsistent (see `API_AUDIT.md` §7). Phase 3 will standardize.

### 1.3 Error Codes
| Code | HTTP | Meaning |
|------|------|---------|
| `VALIDATION_ERROR` | 422 | Zod validation failed |
| `UNAUTHORIZED` | 401 | No JWT / invalid session |
| `FORBIDDEN` | 403 | RBAC denied |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `CONFLICT` | 409 | Duplicate (e.g., invoice number) |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### 1.4 Query Parameters (list endpoints)
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `q` | string | — | Full-text search |
| `status` | string | — | Filter by status |
| `from` | date | — | Date range start (ISO) |
| `to` | date | — | Date range end (ISO) |
| `limit` | int | 100 | Max items (max 100) |
| `cursor` | string | — | Pagination cursor (Phase 3) |
| `sortBy` | string | — | Sort field (Phase 3) |
| `sortOrder` | `asc`\|`desc` | `desc` | Sort direction |

## 2. Authentication (Phase 3 — planned)

All routes except `/api/seed` and `/api/health` require a JWT:
- **Header:** `Authorization: Bearer <token>`
- **Or cookie:** `next-auth.session-token` (httpOnly)
- See ADR-006

## 3. Endpoints

### 3.1 Business

#### `GET /api/business`
Returns the active business (single-tenant demo: first business).

**Response:**
```json
{
  "business": {
    "id": "cmqyx...",
    "name": "Shree Balaji Traders",
    "gstin": "27ABCDE1234F1Z5",
    "modules": { "pos": true, "inventory": true, ... },
    ...
  }
}
```

#### `PATCH /api/business`
Update business profile / modules.

**Body:** Any subset of business fields + `modules` object.

### 3.2 Dashboard

#### `GET /api/dashboard`
Aggregated KPIs and charts. No params.

**Response:**
```json
{
  "kpis": { "monthSales", "salesGrowth", "monthPurchases", "monthExpenses", ... },
  "sparkline": [{ "date", "sales", "receipts" }, ...],  // 14 days
  "topProducts": [{ "name", "qty", "revenue" }, ...],
  "gstBreakdown": [{ "rate", "taxable", "tax" }, ...],
  "recentInvoices": [...],
  "lowStock": [...],
  "notifications": [...]
}
```

### 3.3 Invoices

#### `GET /api/invoices?q=&status=&limit=`
List invoices.

#### `POST /api/invoices`
Create a tax invoice. Decrements stock, records movements, creates notification, logs audit.

**Body:**
```json
{
  "partyId": "cmqyx...",          // optional (walk-in if omitted)
  "invoiceDate": "2026-06-29",
  "dueDate": "2026-07-29",        // optional
  "supplyType": "intra",          // optional, auto-derived
  "items": [
    { "productId": "...", "name": "...", "hsn": "1101", "quantity": 2, "price": 290, "taxRate": 5 }
  ],
  "notes": "Thank you",
  "terms": "..."
}
```

**Response:** `{ ok: true, invoice: { id, number } }`

#### `GET /api/invoices/:id`
Full invoice with items, payments, business details.

#### `DELETE /api/invoices/:id`
Cancel invoice. Restores stock, deletes linked payments, sets `status: "cancelled"`.

### 3.4 Parties

#### `GET /api/parties?q=&type=`
List parties. `type` = `customer` | `supplier` | `both`.

**Response:** `{ items: Party[] }` — each party includes computed `outstanding`.

#### `POST /api/parties`
Create party.

#### `PATCH /api/parties`
Update party. Body: `{ id, ...fields }`.

#### `GET /api/parties/:id`
Party ledger: opening balance + all invoices + purchases + payments → running balance.

**Response:**
```json
{
  "party": { ... },
  "entries": [{ "date", "type", "ref", "debit", "credit", "balance", "note" }],
  "totals": { "totalSales", "totalPurchases", "totalReceived", "totalPaid", "closingBalance", "outstandingInvoices" }
}
```

### 3.5 Products

#### `GET /api/products?q=&low=`
List products. `low=1` filters low-stock items.

**Response:** `{ items, units, taxes, categories }` — 4 collections (unusual; see API_AUDIT §1.6).

#### `POST /api/products`
Create product. Records opening stock movement.

#### `PATCH /api/products`
Update product. Body: `{ id, ...fields }`.

#### `DELETE /api/products?id=`
Soft delete (sets `deletedAt`, `isActive: false`).

### 3.6 Purchases

#### `GET /api/purchases?q=`
List purchases.

#### `POST /api/purchases`
Create purchase. Increments stock, records movements.

### 3.7 Quotations

#### `GET /api/quotations?q=`
List quotations.

#### `POST /api/quotations`
Create quotation. No stock impact.

#### `GET /api/quotations/:id`
Full quotation with items + business details.

#### `PATCH /api/quotations/:id`
- `{ status: "sent"|"accepted"|"rejected" }` — update status
- `{ convertToInvoice: true }` — convert to tax invoice (decrements stock)

### 3.8 Expenses

#### `GET /api/expenses?from=&to=&category=`
List expenses. Returns `{ items, total, byCategory }`.

#### `POST /api/expenses`
Create expense.

### 3.9 Payments

#### `GET /api/payments`
List payments (receipts and payments).

#### `POST /api/payments`
Record payment. If `invoiceId` set, updates invoice balance + status.

**Body:**
```json
{
  "type": "receipt",          // receipt | payment
  "mode": "upi",              // cash | upi | card | bank | cheque | rtgs
  "amount": 500,
  "date": "2026-06-29",
  "invoiceId": "...",         // optional
  "partyId": "...",           // optional
  "reference": "UTR123",      // optional
  "note": "..."
}
```

### 3.10 Reports

#### `GET /api/reports?report=&from=&to=`
Generate a report. `report` param determines type:

| `report` | Description |
|----------|-------------|
| `sales_register` | All outward invoices with GST |
| `purchase_register` | All inward purchases |
| `profit_loss` | Revenue, COGS, expenses, net profit |
| `party_summary` | Per-party sales/purchases/balance |
| `inventory_valuation` | Stock at cost + sale value |
| `day_book` | Chronological transactions |

### 3.11 GST

#### `GET /api/gst?from=&to=`
GSTR-1 outward supplies summary.

**Response:**
```json
{
  "title": "GSTR-1 — Outward Supplies",
  "period": { "from", "to" },
  "hsnSummary": [{ "hsn", "qty", "taxable", "cgst", "sgst", "igst", "total" }],
  "rateSummary": [{ "rate", "taxable", "cgst", "sgst", "igst", "total", "count" }],
  "totals": { "taxable", "cgst", "sgst", "igst", "total", "invoiceCount" },
  "invoices": [...]
}
```

### 3.12 Audit

#### `GET /api/audit?entity=&action=&limit=`
List audit log entries. Sorted by `createdAt` desc.

### 3.13 Notifications

#### `GET /api/notifications`
List notifications (latest 30).

#### `PATCH /api/notifications`
- `{ markAllRead: true }` — mark all as read
- `{ id, read: true }` — mark single as read

### 3.14 Seed

#### `POST /api/seed`
Idempotent — seeds demo data if no business exists.

## 4. Rate Limiting (Phase 3 — planned)

| Endpoint group | Limit |
|----------------|-------|
| Auth (login/OTP) | 5/min per IP |
| List (GET) | 60/min per user |
| Mutation (POST/PATCH/DELETE) | 30/min per user |
| Seed | 1/hour per IP |

Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

## 5. Pagination (Phase 3 — planned)

Cursor-based:
```
GET /api/invoices?limit=20&cursor=abc123
→ { items: [...], nextCursor: "def456", hasMore: true }
```

## 6. Versioning

Current: no version prefix (`/api/`). When a public API is needed, add `/api/v1/` and keep internal routes as `/api/`. See ADR-005.
