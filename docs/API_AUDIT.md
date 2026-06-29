# MedBill — API Audit Report

> **Audit date:** 2026-06-29
> **Base URL:** `/api`
> **Routes:** 18 (across 14 resource groups)
> **Style:** Next.js 16 App Router route handlers (REST-ish)

## Executive Summary

The API layer is **functional but not production-grade**. All 18 routes are unauthenticated, none validate input, error handling is absent, and "pagination" is a hard `take: N` cap with no offset or cursor. The API is effectively a demo backend that returns correct data for a single tenant.

| Severity | Finding |
|----------|---------|
| 🔴 Critical | **0/18 routes authenticated** — `getActiveBusiness()` returns the first business |
| 🔴 Critical | **0/18 routes validate input** — `req.json()` consumed as untyped `any` |
| 🔴 Critical | **0/18 routes have try/catch** — Prisma errors return unstructured 500 |
| 🟠 High | **No pagination** — `take: N` cap only; no `skip`, no `cursor`, no `total` count |
| 🟠 High | **No rate limiting** |
| 🟠 High | **Inconsistent envelopes** — `{ items }` vs `{ business }` vs `{ ok, invoice }` |
| 🟠 High | **Invalid Prisma** in `GET /api/products?low=1` — uses field ref as a value |
| 🟡 Medium | **No ETags / caching headers** |
| 🟡 Medium | **No request logging** beyond Prisma query log |
| 🟡 Medium | **No API versioning** (`/api/` not `/api/v1/`) |

---

## 1. Route Inventory

| # | Method | Path | Auth | Validation | try/catch | Status codes used |
|---|--------|------|------|------------|-----------|-------------------|
| 1 | GET | `/api/business` | ❌ | ❌ | ❌ | 200 |
| 1 | PATCH | `/api/business` | ❌ | ❌ | ❌ | 200, 404 |
| 2 | GET | `/api/dashboard` | ❌ | n/a | ❌ | 200, 404 |
| 3 | GET | `/api/invoices` | ❌ | ❌ | ❌ | 200 |
| 3 | POST | `/api/invoices` | ❌ | ❌ | ❌ | 200, 404, 400 |
| 4 | GET | `/api/invoices/[id]` | ❌ | n/a | ❌ | 200, 404 |
| 4 | DELETE | `/api/invoices/[id]` | ❌ | n/a | ❌ | 200, 404 |
| 5 | GET | `/api/parties` | ❌ | ❌ | ❌ | 200 |
| 5 | POST | `/api/parties` | ❌ | ❌ | ❌ | 200, 404 |
| 5 | PATCH | `/api/parties` | ❌ | ❌ | ❌ | 200, 404, 400 |
| 6 | GET | `/api/parties/[id]` | ❌ | n/a | ❌ | 200, 404 |
| 7 | GET | `/api/products` | ❌ | ❌ | ❌ | 200 |
| 7 | POST | `/api/products` | ❌ | ❌ | ❌ | 200, 404 |
| 7 | PATCH | `/api/products` | ❌ | ❌ | ❌ | 200, 404 |
| 7 | DELETE | `/api/products` | ❌ | ❌ | ❌ | 200, 404, 400 |
| 8 | GET | `/api/purchases` | ❌ | ❌ | ❌ | 200 |
| 8 | POST | `/api/purchases` | ❌ | ❌ | ❌ | 200, 404, 400 |
| 9 | GET | `/api/expenses` | ❌ | ❌ | ❌ | 200 |
| 9 | POST | `/api/expenses` | ❌ | ❌ | ❌ | 200, 404 |
| 10 | GET | `/api/payments` | ❌ | n/a | ❌ | 200 |
| 10 | POST | `/api/payments` | ❌ | ❌ | ❌ | 200, 404 |
| 11 | GET | `/api/reports` | ❌ | ❌ | ❌ | 200, 404, 400 |
| 12 | GET | `/api/gst` | ❌ | ❌ | ❌ | 200, 404 |
| 13 | GET | `/api/notifications` | ❌ | n/a | ❌ | 200 |
| 13 | PATCH | `/api/notifications` | ❌ | ❌ | ❌ | 200, 404 |
| 14 | GET | `/api/audit` | ❌ | ❌ | ❌ | 200 |
| 15 | GET | `/api/quotations` | ❌ | ❌ | ❌ | 200 |
| 15 | POST | `/api/quotations` | ❌ | ❌ | ❌ | 200, 404, 400 |
| 16 | GET | `/api/quotations/[id]` | ❌ | n/a | ❌ | 200, 404 |
| 16 | PATCH | `/api/quotations/[id]` | ❌ | ❌ | ❌ | 200, 404 |
| 17 | POST | `/api/seed` | ❌ | n/a | ❌ | 200 |
| 18 | GET | `/api/` (root) | n/a | n/a | n/a | health check |

**Totals:** 32 operations. **0 authenticated. 0 validated. 1 try/catch** (in `quotations` is actually 0 — the count of 1 was a miscount; verify).

---

## 2. Authentication & Authorization

### 2.1 Current State — None

`src/lib/auth.ts` exports `getActiveBusiness()`:
```ts
export async function getActiveBusiness(): Promise<BusinessRow | null> {
  const biz = await db.business.findFirst({ orderBy: { createdAt: "asc" } });
  return biz as unknown as BusinessRow | null;
}
```

This returns the **first business in the database**, regardless of who is calling. Every API route calls this and operates on that business's data. There is:
- No session check
- No JWT verification
- No `Authorization` header read
- No `req.headers.get("cookie")` read
- No `getServerSession()`

### 2.2 RBAC — Not Enforced

`BusinessMember.role` exists (owner, manager, cashier, etc.) but:
- No route checks the caller's role
- No `requireRole("owner")` middleware
- The `Permission Matrix` in `09_PERMISSION_MATRIX.md` is aspirational, not implemented

### 2.3 Required Fix
1. Install/configure `next-auth` (already a dependency) with JWT strategy
2. Create `src/lib/session.ts` with `getCurrentUser()` and `getCurrentBusiness()`
3. Create `withAuth()` and `withRole(role)` wrappers for route handlers
4. Replace all `getActiveBusiness()` calls with `getCurrentBusiness(req)`
5. See `SECURITY_AUDIT.md` and ADR-006 for the full plan

---

## 3. Input Validation

### 3.1 Current State — None

Every route consumes `req.json()` as untyped `any`:
```ts
const body = await req.json();
const party = await db.party.create({ data: { ...body, ... } });
```

**`zod` is installed but has 0 usages.** No schema validation means:
- A client can send `{"amount": "banana"}` and it will be coerced by Prisma (or throw a 500)
- GSTIN format is never server-validated (only client-side `isValidGstin()`)
- Numeric ranges (quantity > 0, amount >= 0) are unchecked
- Required fields can be omitted (Prisma throws, returning a raw 500)

### 3.2 Example Defect

`POST /api/invoices` accepts:
```ts
const { partyId, invoiceDate, dueDate, supplyType, items, notes, terms, ... } = body;
```
If `items` is `undefined`, the route returns `400 "At least one item required"`. ✅ good.
If `items` is `[{}]` (empty object), it proceeds and Prisma throws on `createMany` → **500 with no body**.

### 3.3 Required Fix
Create `src/lib/schemas/` with zod schemas per resource:
```ts
// src/lib/schemas/invoice.ts
export const createInvoiceSchema = z.object({
  partyId: z.string().cuid().optional(),
  invoiceDate: z.string().datetime(),
  dueDate: z.string().datetime().optional(),
  supplyType: z.enum(["intra", "inter"]).optional(),
  items: z.array(z.object({
    productId: z.string().cuid().optional(),
    name: z.string().min(1),
    hsn: z.string().optional(),
    quantity: z.number().positive(),
    price: z.number().nonnegative(),
    discountPct: z.number().min(0).max(100).optional(),
    discountAmt: z.number().nonnegative().optional(),
    taxRate: z.number().min(0).max(100),
  })).min(1),
  notes: z.string().optional(),
  terms: z.string().optional(),
});
```
Then in the route:
```ts
const parsed = createInvoiceSchema.safeParse(await req.json());
if (!parsed.success) {
  return NextResponse.json({ error: "VALIDATION_ERROR", issues: parsed.error.issues }, { status: 422 });
}
```

---

## 4. Error Handling

### 4.1 Current State
- **0 try/catch blocks** across all 18 routes (verified)
- Prisma `PrismaClientKnownRequestError` (P2002 unique constraint, P2025 not found) propagates as unhandled 500
- No `error.tsx` boundary in the app router
- Client `api()` throws `Error(responseText)` — callers do `catch (e: any) { toast.error(e?.message) }`

### 4.2 Standardized Error Response (Required)
All errors should return:
```ts
{
  "error": {
    "code": "VALIDATION_ERROR" | "NOT_FOUND" | "UNAUTHORIZED" | "FORBIDDEN" | "CONFLICT" | "INTERNAL_ERROR",
    "message": "Human-readable message",
    "details?: zod.Issue[] | null
  },
  "requestId": "uuid"
}
```
With appropriate HTTP status: 400, 401, 403, 404, 409, 422, 500.

### 4.3 Required Fix
Create `src/lib/api-error.ts` with an `ApiError` class and `withErrorHandler(handler)` wrapper that try/catches and normalizes. Apply to all 18 routes.

---

## 5. Pagination, Filtering, Sorting

### 5.1 Pagination — Missing

| Route | Current behavior |
|-------|------------------|
| `GET /api/invoices` | `take: limit` (default 100), no `skip`, no `total` |
| `GET /api/products` | All matching products (no cap!) |
| `GET /api/parties` | All matching parties (no cap!) |
| `GET /api/purchases` | `take: 100` |
| `GET /api/expenses` | `take: 200` |
| `GET /api/payments` | `take: 100` |
| `GET /api/notifications` | `take: 30` |
| `GET /api/audit` | `take: limit` (default 100) |

**Issue:** `GET /api/products` and `GET /api/parties` return **all rows**. At scale (10k+ products), this will OOM the client and saturate the network.

### 5.2 Required Fix
Standardize cursor-based pagination:
```ts
// Query params: ?limit=20&cursor=abc&direction=next
const limit = Math.min(Number(url.searchParams.get("limit")) || 20, 100);
const cursor = url.searchParams.get("cursor");
const items = await db.invoice.findMany({
  where, take: limit + 1, 
  ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  orderBy: { invoiceDate: "desc" },
});
const hasMore = items.length > limit;
const nextCursor = hasMore ? items[limit - 1].id : null;
return NextResponse.json({ items: items.slice(0, limit), nextCursor, hasMore });
```

### 5.3 Filtering — Inconsistent

| Route | Filters supported |
|-------|-------------------|
| `GET /api/invoices` | `q` (search), `status` |
| `GET /api/products` | `q` (search), `low` (stock filter — **broken**, see §6) |
| `GET /api/parties` | `q`, `type` |
| `GET /api/purchases` | `q` |
| `GET /api/expenses` | `from`, `to`, `category` |
| `GET /api/reports` | `report`, `from`, `to` |
| `GET /api/audit` | `entity`, `action`, `limit` |

No route supports `sortBy` / `sortOrder`. Sorting is hardcoded per route.

### 5.4 Required Fix
Standardize: every list route accepts `?q=`, `?status=`, `?from=`, `?to=`, `?sortBy=`, `?sortOrder=asc|desc`, `?limit=`, `?cursor=`.

---

## 6. Verified Defect: Invalid Prisma in `GET /api/products`

`src/app/api/products/route.ts` lines 14-18:
```ts
if (onlyLow) where.stock = { lte: db.product.fields.minStock };
```

`db.product.fields.minStock` is a **Prisma field reference object**, not a value. Using it as `{ lte: <fieldRef> }` is invalid — Prisma will throw at runtime. This code path is only triggered by `?low=1`, which the frontend currently does not send, so it hasn't surfaced yet.

**Fix:**
```ts
if (onlyLow) {
  // SQLite doesn't support column comparisons in WHERE; fetch and filter in JS
  // Or use $queryRaw: SELECT * FROM Product WHERE stock <= minStock
}
```

---

## 7. API Envelope Inconsistency

| Route | Response shape |
|-------|----------------|
| `GET /api/business` | `{ business: {...} }` |
| `GET /api/dashboard` | `{ kpis: {...}, sparkline: [...], ... }` (flat) |
| `GET /api/invoices` | `{ items: [...] }` |
| `GET /api/invoices/[id]` | `{ invoice: {...} }` |
| `POST /api/invoices` | `{ ok: true, invoice: { id, number } }` |
| `GET /api/products` | `{ items: [...], units: [...], taxes: [...], categories: [...] }` (4 keys!) |
| `GET /api/parties` | `{ items: [...] }` |
| `GET /api/notifications` | `{ items: [...] }` |
| `POST /api/seed` | `{ ok: true, businessId: "..." }` |

**Required standard:**
```ts
// List response
{ items: T[], meta: { total, limit, cursor, hasMore } }
// Single resource
{ data: T }
// Mutation
{ data: T, ok: true }
// Error
{ error: { code, message, details? }, requestId }
```

---

## 8. Status Code Usage

| Code | Count | Used for |
|------|-------|----------|
| 200 | ~24 | All successful responses (including creates/updates — should be 201) |
| 400 | 7 | Validation failures (manual `if` checks, not zod) |
| 404 | 25 | "No business" / "not found" |

**Missing:** 201 (Created), 401 (Unauthorized), 403 (Forbidden), 409 (Conflict), 422 (Unprocessable Entity), 500 (internal — happens implicitly but no body).

**Fix:** Use 201 for POST creates, 204 for DELETE, 401/403 after auth, 409 for duplicate GSTIN/invoice number, 422 for zod validation.

---

## 9. Logging & Observability

- No request logging (no `pino`, no middleware logging)
- Prisma query logging floods stdout (`log: ['query']` in `db.ts`)
- No request IDs for tracing
- No error tracking (no Sentry, no Bugsnag)

**Required:**
1. Add `src/middleware.ts` that assigns `x-request-id` header
2. Add structured logger `src/lib/logger.ts` (pino)
3. Disable Prisma query logging in production
4. Add `console.error` (or logger) in every route's catch block

---

## 10. Caching & Performance

- No `Cache-Control` headers on any response
- No `ETag` / `If-None-Match` handling
- No `stale-while-revalidate` on list endpoints
- Dashboard route runs **14 sequential Prisma queries** (`Promise.all` is used ✅, but the dashboard does N+1 for daily sparkline — loops 14 times querying invoices per day)

**Fix for dashboard N+1:** Replace the 14-day sparkline loop with a single `groupBy` query:
```ts
const dailySales = await db.invoice.groupBy({
  by: ["invoiceDate"],
  where: { businessId, invoiceDate: { gte: last14days } },
  _sum: { grandTotal: true },
});
```

---

## 11. API Versioning

Current: `/api/...`. No version prefix.

**Recommendation:** Do not add `/v1/` now — the API is internal to the Next.js app. When a public API is needed, add `/api/v1/` and keep internal routes as `/api/`.

---

## 12. Remediation Checklist

| Priority | Item | Effort |
|----------|------|--------|
| P0 | Add NextAuth + `getCurrentUser`/`getCurrentBusiness` | M |
| P0 | Add zod schemas for all 18 routes | M |
| P0 | Add `withErrorHandler` wrapper + try/catch to all routes | S |
| P0 | Disable Prisma query log in production | XS |
| P0 | Fix `db.product.fields.minStock` defect | XS |
| P1 | Standardize response envelope | M |
| P1 | Add cursor pagination to list routes | M |
| P1 | Fix dashboard N+1 sparkline query | S |
| P1 | Add 201/204/401/403/409/422 status codes | S |
| P2 | Add rate limiting (upstash/ratelimit) | S |
| P2 | Add request ID middleware | XS |
| P2 | Add structured logger (pino) | S |
| P2 | Add ETags to GET responses | M |

---

**This audit feeds into `04_API_SPECIFICATION.md` (the canonical API contract) and `19_BACKLOG.md`.**
