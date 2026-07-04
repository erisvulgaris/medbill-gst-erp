# AI Context — 5-Minute Project Primer

> **Purpose:** Allow a new AI agent to understand MedBill within 5 minutes.
> **Read this first.** Then read `docs/AI_DEVELOPER_GUIDE.md` for coding rules.

## What Is MedBill?

MedBill is a **GST Billing ERP for Indian MSMEs** — a web app for retail shops, wholesalers, and service businesses to create GST-compliant invoices, manage inventory, track payments, and file GST returns.

## Tech Stack (30 seconds)

- **Framework:** Next.js 16 (App Router, single-route SPA at `/`)
- **Language:** TypeScript 5 (strict)
- **Database:** SQLite via Prisma 6
- **UI:** shadcn/ui (New York) + Tailwind CSS 4
- **State:** Zustand (client) + TanStack Query (server)
- **Charts:** Recharts
- **Animation:** Framer Motion
- **Design:** Emerald theme (NO indigo/blue)

## Architecture (1 minute)

```
Browser (single route /)
  ├── App Shell: Sidebar + Topbar + MobileBottomNav + CommandPalette
  ├── Views (12, lazy-loaded): Dashboard, Sales, POS, Inventory, Parties, etc.
  └── Libs: gst.ts (pure), format.ts (pure), store.ts (Zustand), api.ts (fetch)

Next.js API (18 REST routes)
  └── Prisma → SQLite (22 models)

Docs: 43 markdown files in /docs/ (source of truth)
```

**Key constraint:** Only `/` is user-visible. All "pages" are client-side view switches via Zustand `view` + `viewParams`. See ADR-001.

## Modules (1 minute)

| Module | Status | Key file |
|--------|--------|----------|
| Dashboard | ✅ | `views/dashboard-view.tsx` |
| Sales & Invoices | ✅ | `views/sales-view.tsx` + `app/invoice-editor.tsx` + `app/invoice-viewer.tsx` |
| POS Billing | ✅ | `views/pos-view.tsx` |
| Inventory | ✅ | `views/inventory-view.tsx` |
| Parties | ✅ | `views/parties-view.tsx` + `app/party-statement.tsx` |
| Purchases | ✅ | `views/purchases-view.tsx` |
| Quotations | ✅ | `views/quotations-view.tsx` + editor + viewer |
| Expenses | ✅ | `views/expenses-view.tsx` |
| Reports | ✅ | `views/reports-view.tsx` (6 report types) |
| GST Returns | ✅ | `views/gst-view.tsx` (GSTR-1) |
| Audit Log | ✅ | `views/audit-view.tsx` |
| Settings | ✅ | `views/settings-view.tsx` |

## Database (30 seconds)

22 Prisma models. Key ones:
- `Business` — tenant root (all data belongs to a business)
- `User` / `BusinessMember` — auth (Phase 4: not implemented)
- `Party` — customer/supplier (unified)
- `Product` — inventory item
- `Invoice` / `InvoiceItem` — sales document
- `Purchase` / `PurchaseItem` — purchase document
- `Quotation` / `QuotationItem` — quote (convertible to invoice)
- `Payment` — receipt/payment
- `StockMovement` — immutable stock ledger
- `AuditLog` — activity log

Schema: `prisma/schema.prisma`

## APIs (30 seconds)

18 REST endpoints under `/api/`:
- `GET/POST /api/invoices` — list/create
- `GET/DELETE /api/invoices/[id]` — view/cancel
- `GET/POST /api/products` — list/create
- `GET/POST /api/parties` — list/create
- `GET /api/parties/[id]` — ledger statement
- `POST /api/payments` — record payment
- `GET /api/dashboard` — aggregated KPIs
- `GET /api/reports?report=X` — 6 report types
- `GET /api/gst` — GSTR-1 data

**Current state:** 0/18 routes have auth, validation, or error handling. Frameworks (`apiHandler`, zod schemas) are ready but not applied.

## Coding Standards (30 seconds)

1. **TypeScript strict** — no `any` in new code (80 existing, reducing)
2. **Pure libs** (`gst.ts`, `format.ts`) — no client/server imports, 100% tested
3. **API routes** — must use `apiHandler` + zod + `recordAudit` (framework ready, 0/18 applied)
4. **Components** — shadcn/ui only, emerald theme, `tnum` on finance
5. **Tests** — Vitest, 176 tests passing (gst 100%, format 99%, schemas 38)
6. **No `db:push`** in production — use `prisma migrate deploy`

See `docs/17_CODING_STANDARDS.md`.

## Design System (15 seconds)

- **Color:** Emerald primary, amber/red/purple accents, NO indigo/blue
- **Font:** Geist Sans + Mono, `tnum` for tabular numerals
- **Shadows:** soft, card, float, glow-emerald
- **Animation:** transform+opacity only, reduced-motion respected
- **Dark mode:** via next-themes

See `docs/05_DESIGN_SYSTEM.md`.

## Current State (15 seconds)

- **Phase:** 3 (Production Hardening) — feature development frozen
- **Tests:** 176 passing, gst.ts 100% coverage
- **Docs:** 43 markdown files (complete)
- **Production readiness:** ~35% (no auth, no validation, no e2e)
- **Server:** `bun run dev` on port 3000

## Key Workflows (15 seconds)

1. **Create invoice:** Dashboard → New Invoice → select party → add products → save → printable view
2. **Collect payment:** Open invoice → Collect Payment → enter amount → status = PAID
3. **POS:** POS → tap products → cart → charge → success
4. **Quotation → Invoice:** New Quotation → save → mark sent → accept → convert

See `docs/08_USER_FLOWS.md`.

## What To Read Next

| If you want to... | Read |
|-------------------|------|
| Write code | `docs/AI_DEVELOPER_GUIDE.md` + `docs/17_CODING_STANDARDS.md` |
| Understand GST | `docs/11_GST_ENGINE.md` + `src/lib/gst.ts` |
| Add an API route | `docs/04_API_SPECIFICATION.md` + `src/lib/api-error.ts` + `src/lib/schemas/` |
| Add a view | `docs/07_UI_SCREEN_SPECIFICATION.md` + `docs/06_COMPONENT_LIBRARY.md` |
| Understand auth gap | `docs/SECURITY_AUDIT.md` + `docs/15_SECURITY_GUIDE.md` + ADR-006 |
| See what's missing | `docs/IMPLEMENTATION_MATRIX.md` + `docs/PRODUCTION_READINESS.md` |
| Find next tasks | `docs/NEXT_100_TASKS.md` + `docs/19_BACKLOG.md` |

## Critical Warnings

1. **No authentication** — `getActiveBusiness()` returns the first business. Do not deploy publicly.
2. **No input validation** — routes consume `req.json()` as `any`. Schemas exist but aren't wired.
3. **Float money** — 78 Float columns store money. Precision risk at scale.
4. **`ignoreBuildErrors: true`** — TypeScript errors are silently ignored in build.
5. **Server instability** — sandbox kills background processes; use keepalive script.

---

**You now understand MedBill. Read `docs/AI_DEVELOPER_GUIDE.md` before writing any code.**
