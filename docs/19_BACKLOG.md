# 19 — Backlog

> **Status:** Living document — updated every phase
> **Priority:** P0 (block production) → P3 (polish)
> **Source:** Audit reports + ADRs + worklog

## P0 — Block Production (must fix before deploy)

### AUTH-001: Implement NextAuth authentication
- **Source:** SECURITY_AUDIT §1, ADR-006
- **Effort:** Large
- **Description:** Install NextAuth v4 with JWT strategy. Providers: Credentials (email+password), Google OAuth, Phone OTP. Replace `getActiveBusiness()` with `getCurrentBusiness(req)` in all 18 routes. Add `src/middleware.ts` to protect `/api/*`.
- **Acceptance:** No API route accessible without valid JWT. Login/logout flows work. Multi-business switcher functional.

### VALID-001: Add zod validation to all 18 API routes
- **Source:** API_AUDIT §3, SECURITY_AUDIT §3
- **Effort:** Medium
- **Description:** Create `src/lib/schemas/` with zod schemas per resource (invoice, party, product, purchase, expense, payment, quotation). Validate `req.json()` in every POST/PATCH. Return 422 with zod issues on failure.
- **Acceptance:** 0 unvalidated `req.json()` calls. Every route has a corresponding schema file. Invalid input returns 422 (not 500).

### ERROR-001: Add try/catch + normalized error responses to all routes
- **Source:** API_AUDIT §4
- **Effort:** Small
- **Description:** Create `src/lib/api-error.ts` with `ApiError` class + `withErrorHandler(handler)` wrapper. Apply to all 18 routes. Standardize error envelope: `{ error: { code, message, details? }, requestId }`.
- **Acceptance:** 0 unhandled Prisma errors. All errors return structured JSON. 500s include request ID.

### TS-001: Remove `typescript.ignoreBuildErrors: true`
- **Source:** AUDIT_REPORT §4
- **Effort:** Small (after reducing `any`)
- **Description:** Set `ignoreBuildErrors: false` in `next.config.ts`. Fix all type errors that surface.
- **Acceptance:** `bunx tsc --noEmit` passes with 0 errors. `next build` succeeds without ignoring errors.

### MIGRATE-001: Initialize Prisma migration history
- **Source:** DATABASE_AUDIT §2.2
- **Effort:** Small
- **Description:** Create `prisma/migrations/0_init/migration.sql` baseline. Stop using `db:push` in production. Use `prisma migrate deploy` in CI.
- **Acceptance:** `prisma/migrations/` exists. `prisma migrate status` shows no drift. `db:push` removed from production workflow.

### MONEY-001: Migrate Float → Decimal for money columns
- **Source:** DATABASE_AUDIT §2.1
- **Effort:** Large
- **Description:** 78 Float columns store money. Migrate to `Decimal @db.Decimal(12,2)` or integer paise. Create migration + backfill script. Update all read/write paths.
- **Acceptance:** 0 Float columns storing money. Ledger balances reconcile to the penny. GST rounding matches GST portal.

---

## P1 — High Priority (this/next phase)

### RBAC-001: Enforce role-based access control
- **Source:** SECURITY_AUDIT §2, `09_PERMISSION_MATRIX.md`
- **Effort:** Medium
- **Description:** Create `requireRole(req, roles[])` middleware. Apply to every route per the permission matrix. Cashier can't access settings; accountant can't create invoices; etc.
- **Acceptance:** Every route checks role. 403 returned for unauthorized access. Audit log records who attempted what.

### REFACTOR-001: Extract shared components
- **Source:** FRONTEND_AUDIT §1.1
- **Effort:** Medium
- **Description:** Extract `StatusBadge`, `StatCard`, `Field`, `Row` to `src/components/app/`. Used in 6+ views each. Estimated ~400 LOC reduction.
- **Acceptance:** 0 duplicated `StatusBadge`/`StatCard` definitions. All views import from shared.

### REFACTOR-002: Split oversized files
- **Source:** FRONTEND_AUDIT §1.3
- **Effort:** Medium
- **Description:** Split `invoice-viewer.tsx` (521 LOC), `inventory-view.tsx` (401 LOC), `seed/route.ts` (456 LOC) into directories with sub-components.
- **Acceptance:** No file >300 LOC in `src/components/` (excluding `ui/`).

### TEST-001: Install Vitest + write GST engine tests
- **Source:** TESTING_REPORT §2.1, ADR-010
- **Effort:** Medium
- **Description:** Install Vitest + config. Write unit tests for `src/lib/gst.ts` (100% coverage target) and `src/lib/format.ts` (100%).
- **Acceptance:** `bun run test:unit` passes. Coverage report shows 100% on gst.ts and format.ts.

### TEST-002: Install Playwright + write critical e2e
- **Source:** TESTING_REPORT §2.2, ADR-010
- **Effort:** Medium
- **Description:** Install Playwright + config. Write e2e: invoice create→pay→view, POS checkout, quotation→convert, party statement.
- **Acceptance:** `bun run test:e2e` passes. 5+ e2e scenarios green.

### VIRT-001: Add @tanstack/react-virtual to large lists
- **Source:** PERFORMANCE_REPORT §3.3, ADR-008
- **Effort:** Medium
- **Description:** Install `@tanstack/react-virtual`. Apply to inventory list, invoice list, party list, audit log. Target: 120fps scroll at 5000 rows.
- **Acceptance:** Inventory view scrolls at 60fps+ with 1000 products. No jank.

### PAGINATION-001: Add cursor pagination to list endpoints
- **Source:** API_AUDIT §5
- **Effort:** Medium
- **Description:** Add `?limit=20&cursor=xxx` to invoices, products, parties, audit. Return `{ items, nextCursor, hasMore }`.
- **Acceptance:** No list endpoint returns unbounded results. Client implements infinite scroll.

### ENVELOPE-001: Standardize API response envelope
- **Source:** API_AUDIT §7
- **Effort:** Medium
- **Description:** Standardize: `{ items, meta }` for lists, `{ data }` for single, `{ data, ok }` for mutations, `{ error }` for errors.
- **Acceptance:** All 18 routes follow the envelope. Client `api()` helper typed to envelope.

### RATE-001: Add rate limiting
- **Source:** SECURITY_AUDIT §5
- **Effort:** Small
- **Description:** Install `@upstash/ratelimit`. Apply limits: login 5/min, list 60/min, mutation 30/min.
- **Acceptance:** 429 returned on limit exceeded. Rate limit headers present.

---

## P2 — Medium Priority (next phase)

### OFFLINE-001: Service Worker + IndexedDB cache
- **Source:** ADR-009, PERFORMANCE_REPORT
- **Effort:** Large
- **Description:** Implement PWA service worker for app shell + IndexedDB for data cache + background sync for writes.
- **Acceptance:** App loads offline. Mutations queued and synced. No data loss on network drop.

### OPTIMISTIC-001: Add useMutation + optimistic updates
- **Source:** FRONTEND_AUDIT §3.2
- **Effort:** Medium
- **Description:** Migrate inline `api()` calls in dialogs to `useMutation` with `onMutate` optimistic update + `onError` rollback.
- **Acceptance:** POS checkout, invoice save, expense add feel instant (<100ms perceived).

### BUNDLE-001: Add bundle analyzer + set budget
- **Source:** PERFORMANCE_REPORT §1
- **Effort:** Small
- **Description:** Install `@next/bundle-analyzer`. Add `analyze` script. Set budget: <200KB dashboard, <150KB other routes.
- **Acceptance:** Bundle report generated. Budget enforced in CI.

### AUDIT-001: Comprehensive audit logging
- **Source:** SECURITY_AUDIT §9
- **Effort:** Medium
- **Description:** Call `recordAudit()` in all 18 mutating routes. Capture IP + user agent. Add hash chain for tamper-evidence.
- **Acceptance:** Every create/update/delete logged. IP + UA captured. Tamper-evidence verified.

### CSP-001: Add Content Security Policy
- **Source:** SECURITY_AUDIT §7.3
- **Effort:** Small
- **Description:** Add CSP header in `next.config.ts`. Add HSTS header.
- **Acceptance:** CSP header present. No inline script violations.

### CI-001: Set up GitHub Actions CI
- **Source:** TESTING_REPORT §5
- **Effort:** Small
- **Description:** Create `.github/workflows/ci.yml` with lint, typecheck, unit, e2e, a11y, lighthouse jobs.
- **Acceptance:** PRs blocked on failing CI. All jobs green on main.

---

## P3 — Polish

### A11Y-001: Accessibility audit + fixes
- **Source:** FRONTEND_AUDIT §6
- **Effort:** Medium
- **Description:** Add `@axe-core/playwright`. Fix violations. Add skip-to-content link. Add `aria-live` to toast region.
- **Acceptance:** Lighthouse a11y score 95+. 0 axe violations.

### NOTIF-001: Pause notification polling when tab hidden
- **Source:** FRONTEND_AUDIT §3.3
- **Effort:** XS
- **Description:** Use `document.visibilityState` or `refetchIntervalInBackground: false`.
- **Acceptance:** No requests when tab hidden.

### TYPING-001: Type viewParams as discriminated union
- **Source:** FRONTEND_AUDIT §3.1, AUDIT_REPORT §1.3
- **Effort:** Small
- **Description:** Replace `Record<string, unknown>` with a discriminated union per view.
- **Acceptance:** 0 `as string` casts on viewParams. Type safety on navigation params.

### BARCODE-001: Camera barcode scanner for POS
- **Source:** Worklog next-phase
- **Effort:** Medium
- **Description:** Integrate `@zxing/browser` for camera barcode scanning in POS.
- **Acceptance:** Scan barcode → product added to cart.

### PRINT-001: Invoice/quote PDF generation
- **Source:** Worklog next-phase
- **Effort:** Medium
- **Description:** Generate PDF invoices/quotes server-side (puppeteer or react-pdf) for email/WhatsApp.
- **Acceptance:** Download PDF button works. PDF matches print layout.

---

## Deferred / Out of Scope (Phase 5+)

- Payroll module
- Manufacturing module (BOM, production orders)
- CRM module (leads, follow-ups, pipeline)
- E-invoicing (IRN/QR via NIC API)
- Multi-branch switcher UI
- Multi-tenant sharding
- GSTR-2B reconciliation
- GSTR-3B auto-generation
- Mobile app (React Native)
- API for third-party integrations
- Advanced reporting (custom report builder)
- Email notifications
- SMS notifications (beyond OTP)
- Recurring invoices
- Multi-currency
- Inventory barcode label printing
- Stock transfer between branches
- Batch/serial number tracking UI (schema exists, UI not built)
- Expiry tracking alerts UI (schema exists, UI not built)
