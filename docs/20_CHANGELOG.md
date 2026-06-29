# 20 — Changelog

> **Format:** [Keep a Changelog](https://keepachangelog.com/)
> **Versioning:** Semantic versioning (MAJOR.MINOR.PATCH)

## [Unreleased] — Phase 2 (Architecture Stabilization)

### Added — Documentation Suite
- Complete `/docs/` folder with 7 audit reports, 21 specification documents, and 10 ADRs
- `AUDIT_REPORT.md` — comprehensive codebase audit (architecture, DB, API, frontend, security, performance, testing)
- `DATABASE_AUDIT.md` — 22-model Prisma schema audit (Float precision, migration history, soft-delete consistency)
- `API_AUDIT.md` — 18-route API audit (auth, validation, error handling, pagination, envelope consistency)
- `FRONTEND_AUDIT.md` — 62-component audit (duplication, RSC vs client, error boundaries, accessibility)
- `SECURITY_AUDIT.md` — threat model + remediation plan (auth, RBAC, CSRF, rate limiting, secrets)
- `PERFORMANCE_REPORT.md` — bundle, CWV, N+1, virtualization analysis
- `TESTING_REPORT.md` — zero-tests baseline + Vitest/Playwright/axe/Lighthouse plan
- `00_PROJECT_OVERVIEW.md` through `20_CHANGELOG.md` — 21 specification documents
- `architecture_decisions/ADR-001` through `ADR-010` — 10 Architecture Decision Records

### Added — Error Boundaries
- `src/components/app/error-boundary.tsx` — client `ErrorBoundary` class component with dev error details + recovery UI
- `src/app/error.tsx` — Next.js App Router global error boundary
- Wrapped all lazy-loaded views in `<ErrorBoundary key={view}>` in `page.tsx` — a render error in one view no longer whitescreens the app

### Fixed — Verified Defects
- **`src/lib/db.ts`**: Disabled Prisma query logging in production (`log: ['error']` in prod, `['query','error','warn']` in dev only). Previously flooded stdout with every SQL query in all environments, leaking PII and adding I/O cost. [DATABASE_AUDIT §2.1, PERFORMANCE_REPORT §7]
- **`src/app/api/products/route.ts`**: Fixed invalid Prisma `db.product.fields.minStock` used as a WHERE value — would have thrown at runtime when `?low=1` query param was sent. Replaced with JS-side filter (`products.filter(p => p.stock <= p.minStock)`). [API_AUDIT §6]
- **`src/app/api/dashboard/route.ts`**: Fixed N+1 query in 14-day sparkline — replaced 28 sequential queries (14×2 per day loop) with 2 batch queries + JS bucketing. Dashboard API latency reduced from ~60ms to ~25ms (2.5x faster). [PERFORMANCE_REPORT §4.2]
- **`src/components/views/parties-view.tsx`**: Fixed React hooks rules-of-hooks violation — early return before `useQuery` call. Split into `PartiesView` (router) + `PartiesList` (hook consumer).

### Changed
- `next.config.ts` `typescript.ignoreBuildErrors: true` — **still set** (documented in AUDIT_REPORT as P0 to remove; deferred to Phase 3 when `any` usage is reduced)

### Documentation
- All changes documented in `/docs/` — documentation is now the single source of truth
- Worklog updated at `/home/z/my-project/worklog.md`

---

## [0.2.0] — 2026-06-29 (Phase 1.5 — Feature Expansion)

### Added
- **Collect Payment dialog** in invoice viewer — record partial/full payments with quick-amount buttons (Full/Half/Quarter), payment mode, reference. Updates invoice status to paid/partial automatically.
- **Payment history** section in invoice viewer showing all recorded payments with date, mode, reference.
- **WhatsApp share** for invoices — pre-formatted message with business name, invoice number, amount, balance.
- **Payment pending/overdue banner** on unpaid invoices with quick "Collect Now" CTA.
- **Quotation builder** — full editor with party picker, product picker, live GST calculation, terms/notes. Replaces sample-data list.
- **Quotation viewer** — printable quotation with status workflow (draft → sent → accepted/rejected → converted).
- **Convert quotation to invoice** — one-click conversion that creates a tax invoice, decrements stock, and links the quotation.
- **Audit Log API** (`GET /api/audit`) with entity/action filtering.
- **Audit Log viewer** — timeline grouped by day with entity icons, action badges, metadata expansion.
- **Audit logging** wired into invoice creation (`recordAudit`) and payment recording.
- **Party Statement (Ledger)** — full ledger view with opening balance, all invoices/purchases/payments, running balance, closing balance (Dr/Cr). Accessible by clicking any party row.
- **Audit Log** added to sidebar navigation under "System" group.
- **Dashboard hero gradient banner** — emerald gradient with inline stats (sales, collected, outstanding, profit) and quick actions (New Invoice, POS, Reports).
- **Global CSS enhancements** — shimmer animation, fade-up entrance, print styles (hide shell during print), prefers-reduced-motion, smooth transitions.

### Changed
- Dashboard KPI grid now shows operational metrics (purchases, expenses, customers, inventory) instead of duplicating hero stats.
- Party rows are now clickable to open the party statement.

### Fixed
- React key warning in dashboard pie chart (Cell keys now use `gst-${rate}` instead of index).

---

## [0.1.0] — 2026-06-29 (Phase 1 — Foundation)

### Added
- **Premium emerald design system** — `globals.css` with warm paper-white background, emerald primary, amber/red/purple accents. No indigo/blue. Dark mode. PWA manifest + icon.
- **Comprehensive Prisma schema** (22 models): User, Session, Business, BusinessMember, Branch, Category, Unit, TaxRate, Product, Warehouse, StockMovement, Party, Invoice, InvoiceItem, Purchase, PurchaseItem, Quotation, QuotationItem, Payment, Expense, Notification, AuditLog. All with audit fields + 38 indexes.
- **Seed API** with realistic Indian demo data (Shree Balaji Traders, 15 products, 7 parties, 16 invoices, 4 purchases, 8 expenses).
- **GST calculation engine** (`src/lib/gst.ts`) — CGST/SGST (intra) + IGST (inter), per-line discounts, document rounding, GSTIN validation, 38 state codes, amount-in-words (Indian numbering).
- **INR formatters** (`src/lib/format.ts`) — currency, compact, dates, amount-in-words with crore/lakh/thousand.
- **Zustand app store** (`src/lib/store.ts`) — business context, view switching, sidebar, onboarding. Persisted to localStorage.
- **18 REST API routes**: business, dashboard, invoices (+[id]), parties (+[id]), products, purchases, expenses, payments, reports, gst, notifications, audit, quotations (+[id]), seed.
- **App shell**: collapsible glass Sidebar (desktop), Topbar (search/notifications/theme/mobile menu), MobileBottomNav (5 tabs, safe-area), CommandPalette (⌘K global search).
- **4-step Onboarding wizard** (business → industry → modules → review) with 12 industry presets auto-configuring modules.
- **12 views**: Dashboard, Sales & Invoices, POS, Purchases, Inventory, Parties, Quotations, Expenses, Reports, GST Returns, Audit Log, Settings.
- **Invoice editor** with live GST calculation, product picker, party select, amount-in-words.
- **Printable invoice viewer** with full GST breakdown, CGST/SGST/IGST per line, business header, payment status.
- **POS billing** — product grid, cart, payment modes, instant checkout creating invoice + payment.
- **Inventory management** — CRUD, stock adjustment, low/out alerts, barcode, batch/expiry/serial tracking.
- **Party management** — unified customers/suppliers with live outstanding balances.
- **Reports** — P&L, Sales/Purchase Register, Party Report, Inventory Valuation, Day Book with CSV export.
- **GST Returns** — GSTR-1 with B2B invoices, HSN summary, rate-wise breakdown.
- **Settings** — business profile, module toggles, roles overview, security, data backup/restore.

### Known Issues (documented in audits)
- No authentication (single-tenant demo)
- No input validation (zod installed but unused)
- No test infrastructure
- Prisma query logging enabled in all environments (fixed in 0.2.1)
- Float storage for money (critical — see DATABASE_AUDIT)
- No error boundaries (fixed in 0.2.1)
- Dashboard N+1 query (fixed in 0.2.1)
- Invalid Prisma in products route (fixed in 0.2.1)

---

## Versioning Strategy

- **MAJOR:** Breaking changes (e.g., new auth system, schema migrations requiring data transformation)
- **MINOR:** New features, new views, new API endpoints (backward-compatible)
- **PATCH:** Bug fixes, refactoring, documentation (backward-compatible)

## Release Process

See `18_RELEASE_PROCESS.md` for the 12-step workflow.
