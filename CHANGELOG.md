# Changelog

All notable changes to MedBill are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added — Create-on-the-Fly Enhancement (2026-07-06)
- **QuickCreate component** — Reusable inline forms for creating customers, suppliers, and products directly inside picker popovers
- Invoice Editor: "Create New Customer" in party picker + "Create New Product" in product picker
- Quotation Editor: "Create New Customer" in party picker + "Create New Product" in product picker
- Purchase Form: "Create New Supplier" in supplier picker + "Create New Product" in product picker
- All pickers show "Create one below ↓" in empty state when no results found

### Added — 10 Autonomous Improvement Cycles (2026-07-06)
- **Cycle 1:** AlertDialog confirmation for invoice cancellation (replaced native confirm())
- **Cycle 2:** CSV export on inventory view + parties view
- **Cycle 3:** Mobile-responsive admin panel with bottom navigation
- **Cycle 4:** Admin Analytics tab (MRR, ARR, conversion rate, revenue by plan)
- **Cycle 5:** Admin Audit Log tab + `/api/admin/audit` endpoint
- **Cycle 6:** Admin System Health tab (server status, subscription distribution)
- **Cycle 7:** Verified dashboard gstBreakdown fix (GST rate breakdown with proper data)
- **Cycle 8:** Keyboard shortcut hints in command palette (⌘N, ⌘P visible in subtitles)
- **Cycle 9:** Verified settings toast feedback (already implemented)
- **Cycle 10:** Admin business detail "View" link + responsive button text

### Added — Admin Panel + Subscription System (2026-07-05)
- **Admin Panel** at `/admin` with super admin authentication
- **8 admin tabs:** Dashboard, Businesses, Users, Subscriptions, Plans, Analytics, Audit Log, System
- **Subscription system:** 3 tiers (Starter ₹599/yr, Professional ₹2,999/yr, Enterprise ₹9,999/yr)
- **SubscriptionPlan model** with maxUsers, maxProducts, maxBranches, maxInvoices, features
- **Subscription model** with status (trial/active/expired/grace/suspended), start/end dates, trial end
- **Admin API:** 9 endpoints (login, dashboard, businesses, businesses/:id, users, subscriptions, plans, audit)
- **Plan change UI:** Dropdown in admin Businesses tab to upgrade/downgrade any business
- **Subscription enforcement:** `requireRoleOrDemo` blocks mutations if business is suspended
- **Subscription banner:** Shows trial/expired/suspended warnings in main app
- **`/api/subscription` endpoint:** Businesses can view their own plan + days remaining
- **Dark mode toggle** on admin panel
- **"Main App" link** from admin panel
- **Admin loading skeletons** (4-card grid matching dashboard layout)
- **Default admin credentials:** admin@medbill.in / Admin@MedBill2026

### Added — Industry Profile Engine (2026-07-04)
- **14 industry profiles:** retail, wholesale, manufacturer, medical, restaurant, salon, service, electronics, garments, automobile, jewellery, hardware, clinic, fmcg
- Each profile configures: modules, inventoryMode, dashboardKPIs, quickActions, invoiceTemplate, reports, defaults
- **Open-closed principle:** Adding a new industry = adding one entry to INDUSTRY_PROFILES, no code changes needed
- Wired into onboarding (replaces hardcoded INDUSTRIES + INDUSTRY_PRESET)
- Wired into dashboard (industry-driven quick actions via getIndustryQuickActions)
- 17 unit tests covering all profiles

### Added — Keyboard Shortcuts (2026-07-05)
- ⌘K / Ctrl+K — Open command palette
- ⌘N / Ctrl+N — Create new invoice
- ⌘P / Ctrl+P — Open POS billing
- ⌘B / Ctrl+B — Toggle sidebar

### Added — Subscription Plan Badge in Sidebar (2026-07-05)
- Crown icon + "Enterprise Plan ₹9,999/yr" badge below business card in sidebar

### Added — Frontend API Envelope Compatibility (2026-07-04)
- Updated `api()` helper to unwrap `json.data` automatically
- All views consume the standardized `{ success, data, error, meta }` envelope

### Added — Security Infrastructure (2026-07-01)
- **CSP header** — Content-Security-Policy on all responses
- **HSTS** — Strict-Transport-Security in production
- **X-Frame-Options: DENY** — Clickjacking protection
- **X-Content-Type-Options: nosniff** — MIME type sniffing protection
- **CSRF protection** — Origin header check on state-changing requests
- **Request IDs** — UUID on every response (`x-request-id` header)
- **`.env.example`** — Documents all required environment variables
- **Security middleware** — `src/middleware.ts` with all security headers

### Added — Authentication System (2026-07-01)
- **Password hashing** — bcrypt with 12 rounds
- **JWT session tokens** — HMAC-signed, 30-day expiry (7-day for admin)
- **Cookie management** — httpOnly, secure, sameSite=lax
- **5 auth API routes:** login, register, logout, me, switch-business
- **OTP stubs** — Framework ready for MSG91/Twilio integration
- **Business switching** — Multi-tenant with `switchBusiness` endpoint
- `getAuthContext`, `requireAuth`, `requireRole` helpers
- `getBusinessContext` with demo fallback in development
- `requireRoleOrDemo` with subscription enforcement

### Added — Validation Layer (2026-07-01)
- **8 Zod schemas:** createInvoice, createParty, createProduct, createExpense, createPayment, updateBusiness, listQuery, updateQuotationStatus
- **Shared validators:** gstinSchema, panSchema, phoneSchema, pincodeSchema, emailSchema, moneySchema, quantitySchema, taxRateSchema, dateSchema, lineItemSchema
- **Type exports** via `z.infer` for all schemas
- 15 schema unit tests

### Added — Error Handling (2026-07-01)
- **`apiHandler` wrapper** — try/catch + Prisma error mapping + request IDs
- **`ApiError` class** — 8 error codes (VALIDATION_ERROR, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CONFLICT, RATE_LIMITED, INTERNAL_ERROR, BAD_REQUEST)
- **Standardized envelope** — `{ success, data, error, meta }` on all responses
- **`apiSuccess` / `apiList` helpers** for consistent responses
- 32/33 API routes use `apiHandler`

### Added — Error Boundaries (2026-06-29)
- `src/app/error.tsx` — Next.js global error boundary
- `src/components/app/error-boundary.tsx` — Client ErrorBoundary class component
- Wrapped all lazy-loaded views in `<ErrorBoundary>`

### Added — Database Hardening (2026-06-29)
- **Migration baseline** — `prisma/migrations/0_init/migration.sql` (591 lines)
- **Backup utility** — `scripts/backup-db.ts` (timestamped copies, 30-backup retention)
- **Restore utility** — `scripts/restore-db.ts` (interactive, pre-restore backup)
- **Integrity checker** — `scripts/db-health.ts` (11 checks: integrity, tables, row counts, orphans, negative stock, migrations)
- **Prisma query logging** — dev-only (disabled in production)

### Added — Testing Infrastructure (2026-06-29)
- **Vitest 4** installed with `@vitest/coverage-v8`
- **214 tests** across 9 test files
- **Coverage targets:** gst.ts 100%, format.ts 99%, utils.ts 100%, nav.ts 100%
- **Test scripts:** `test`, `test:watch`, `test:coverage`

### Added — Documentation Suite (2026-06-29)
- 56+ markdown files in `/docs/`
- 10 Architecture Decision Records (ADRs)
- 7 audit reports (Architecture, Database, API, Frontend, Security, Performance, Testing)
- 21 specification documents (00-20)
- AI Developer Guide + AI Context (5-minute primer)
- Production Scorecard, Implementation Matrix, Database Health Report
- Competitor Analysis (8 competitors), Feature Gap, Performance Baseline
- Scalability Report, Dependency Graph, Dead Code Report, Duplicate Code Report
- UX Audit, NEXT_100_TASKS roadmap

### Added — Core Application (2026-06-29)
- **12 views:** Dashboard, Sales, POS, Purchases, Inventory, Parties, Quotations, Expenses, Reports, GST, Audit, Settings
- **Premium emerald design system** — OKLCH colors, Geist Sans/Mono, tabular numerals
- **Dark mode** via next-themes
- **Mobile responsive** — Bottom nav, responsive tables, safe-area aware
- **Command palette** (⌘K) — Global search across invoices, parties, products
- **Onboarding wizard** — 4 steps (Business → Industry → Modules → Review)
- **Invoice editor** — Live GST calculation, party picker, product picker, amount in words
- **Printable invoice viewer** — A4 format with full GST breakdown
- **POS billing** — Product grid, cart, payment modes, instant checkout
- **Party statement** — Ledger with Dr/Cr running balance
- **Quotation workflow** — Create → send → accept → convert to invoice
- **6 report types** — P&L, Sales Register, Purchase Register, Party Report, Inventory Valuation, Day Book
- **GSTR-1** — HSN summary, rate-wise breakdown, B2B invoices

### Changed
- **API envelope** — All routes return `{ success, data, error, meta }` (was inconsistent)
- **Invoices route** — Returns `{ data: { items: [...] } }` instead of array directly
- **Dashboard** — Hero gradient with industry-driven quick actions (was hardcoded)
- **Sidebar** — Shows subscription plan badge with crown icon
- **Onboarding** — Uses Industry Profile Engine (was hardcoded INDUSTRIES + INDUSTRY_PRESET)
- **Admin panel** — 8 tabs (was 5), mobile-responsive with bottom nav

### Fixed
- **gstBreakdown null values** — Added taxRate, taxable, cgst, sgst, igst to topItems query select
- **Dashboard N+1 query** — Replaced 28 sequential queries with 2 batch queries + JS bucketing
- **Products route** — Fixed invalid Prisma `db.product.fields.minStock` used as WHERE value
- **Prisma query logging** — Disabled in production (was flooding stdout)
- **Parties view** — Fixed React hooks rules-of-hooks violation (early return before useQuery)
- **Dashboard** — Removed hardcoded "Rahul" name from greeting
- **Purchases/Quotations routes** — Fixed `NextResponse is not defined` after refactoring
- **Dashboard route** — Fixed broken braces from sed refactoring

### Security
- All 33 API routes use `apiHandler` with standardized error handling
- Zod validation on all POST/PATCH routes
- CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy headers
- CSRF protection via Origin header check
- Request IDs on all responses
- bcrypt password hashing (12 rounds)
- JWT session tokens (HMAC-signed, httpOnly cookies)
- RBAC with 13 roles
- Subscription enforcement (blocks mutations if suspended)
- `.env` removed from git tracking
- `db/custom.db` removed from git tracking

## [0.1.0] — 2026-06-29

### Added
- Initial release of MedBill GST Billing ERP
- Next.js 16 + Prisma + SQLite + shadcn/ui
- 12 views, 18 API routes, 22 Prisma models
- Premium emerald design system
- GST calculation engine (100% test coverage)
- Demo data seeding
